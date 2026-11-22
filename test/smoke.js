// Headless smoke test for SC300-Lab-Inbox.html.  Usage: npm i jsdom && node smoke.js SC300-Lab-Inbox.html
const fs = require("fs");
const { JSDOM, VirtualConsole } = require("jsdom");

const file = process.argv[2] || require("path").join(__dirname, "..", "index.html");
const errors = [];
const vc = new VirtualConsole();
vc.on("jsdomError", e => errors.push("jsdomError: " + e.message));
vc.on("error", e => errors.push("console.error: " + e));

const dom = new JSDOM(fs.readFileSync(file, "utf8"), { runScripts: "dangerously", url: "http://localhost/", virtualConsole: vc });
const w = dom.window, d = w.document, $ = s => d.querySelector(s), $$ = s => [...d.querySelectorAll(s)];
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "PASS " : "FAIL ") + msg); if (!cond) fails++; };
const num = id => +$(id).textContent;
const click = el => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));

// 1. First record: arrives as a desk email, opens as a record, needs assignment and closed tasks.
click($("#next"));
const first = $("#list .mail");
ok(!!first, "first ticket arrives as a Service Desk email");
click(first);
ok(!!$("#openrec"), "email has an Open record button");
click($("#openrec"));
ok(!!$("#list .form") && $("#list .ftitle b").textContent === "RITM0010001", "record form opens (RITM0010001)");
const boxes = () => $$("#list table.tasks input");
ok(boxes().length > 0 && boxes().every(b => b.disabled), `${boxes().length} tasks, locked until assigned`);
ok(!$("#list .opt"), "no resolution options before assignment");
click($("#assign"));
ok(w.eval("stateOf(TK.t01)") === "In Progress", "Assign to me → In Progress");
ok(boxes().every(b => !b.disabled), "tasks unlocked after assignment");
const fulfil = () => $('#list .opt[data-k="0"]');
ok(fulfil().disabled, "Fulfil is disabled while tasks are open");
w.eval('close("t01", 0)');
ok(num("#cGood") === 0, "engine refuses to resolve with open tasks");
for (let i = 0; i < boxes().length; i++) { const b = boxes()[i]; b.checked = true; b.dispatchEvent(new w.Event("change")); }
ok(!fulfil().disabled, "Fulfil enabled after closing all tasks");
const auditBefore = $$("#audit tr").length;
click(fulfil());
ok(!!$("#send"), "picking an outcome shows a preview with Submit");
ok(num("#cGood") === 0, "nothing scored until Submit");
click($("#send"));
ok(num("#cGood") === 1, "#cGood incremented");
ok(w.eval("stateOf(TK.t01)") === "Closed Complete", "record state is Closed Complete");
ok($$("#list .act.comment").length === 1 && $$("#list .act.caller").length === 1, "activity shows your comment and the caller's reply");
ok($$("#audit tr").length > auditBefore, "evidence rows in #audit");
ok(w.eval("S.inbox.length") >= 3, "evidence mail + next ticket (auto) in inbox");

// 2. Work note.
$("#wn").value = "Checked the audit log."; click($("#wnpost"));
ok($$("#list .act.note").length === 1, "work note posted");

// 3. Refusable ticket answered wrongly → red rows + alert.
w.eval('S.auto=false; DAYS[0].tickets.forEach(t=>{ S.arrived[t.id]=S.arrived[t.id]||Date.now(); S.assigned[t.id]=S.assigned[t.id]||Date.now(); });');
w.eval('close("t03", 0)');
ok(num("#cBad") === 1 && $$("#audit tr.bad").length > 0, "wrong call on refusable ticket writes red audit rows");
ok(w.eval("S.inbox.some(i=>i.kind==='alert')"), "wrong call delivers a Security alert email");
ok(w.eval("stateOf(TK.t03)") === "Closed Complete", "complying with a trap shows as fulfilled");

// 3b. Injects: trigger from the nav, alert email + auto incident, push prompt.
w.eval('S.day=0; renderAll();');
const redBefore = $$("#audit tr.bad").length;
click($('.injb[data-x="x01"]'));
ok(w.eval("S.inbox.some(i=>i.kind==='inject'&&i.id==='x01')"), "inject delivers an alert email");
ok($$("#audit tr.bad").length > redBefore, "inject writes red trigger rows");
ok(!!$("#openrec") && !!$("#reader .tag.inj"), "inject email shows the inject tag and Open record");
click($("#openrec"));
ok($("#list .ftitle b").textContent === "INC0010501", "inject raised incident INC0010501");
click($("#assign"));
const goodBefore = num("#cGood");
click($('#list .opt[data-k="1"]')); click($("#send"));
ok(num("#cGood") === goodBefore + 1 && num("#cThreat") >= 1, "correct inject response scores and counts as a threat handled");
ok(w.eval("stateOf(TK.x01)") === "Resolved", "inject incident is Resolved");
w.eval('S.day=2; renderAll();');
click($('.injb[data-x="x21"]'));
ok(!!$("#push"), "MFA push prompt appears");
click($('#push button[data-r="deny"]'));
ok(w.eval("S.push.x21") === "deny", "denying the push is recorded");

// 4. Deliver and close every ticket on every day.
for (let day = 0; day < 5; day++) {
  w.eval(`S.day=${day}; renderAll();`);
  let guard = 0;
  while (!$("#next").disabled && guard++ < 50) click($("#next"));
  w.eval(`(DAYS[${day}].injects||[]).forEach(x=>triggerInject(x.id));`);
  w.eval(`DAYS[${day}].tickets.concat(DAYS[${day}].injects||[]).forEach(t=>{ if(S.closed[t.id]) return; assign(t.id);
    t.tasks.forEach((_,i)=>{ S.checks[t.id]=S.checks[t.id]||[]; S.checks[t.id][i]=true; });
    const k = choicesFor(t).findIndex(c=>c[1]===1); close(t.id, k); });`);
}
const total = w.eval("ALL.length");
ok(num("#cClosed") === total, `all ${total} tickets closed`);
ok(w.eval("S.inbox.filter(i=>i.kind==='summary').length") === 5, "5 day summaries delivered");

// 5. Open everything in every view.
for (const f of ["inbox", "notes", "q_group", "q_me", "q_closed", "q_all", "audit"]) {
  w.eval(`S.folder="${f}"; S.rec=null; renderAll();`);
  const n = $$("#list .mail, #list tr.rec").length;
  for (let i = 0; i < n; i++) {
    click($$("#list .mail, #list tr.rec")[i]);
    if ($("#reader [data-rec]")) click($("#reader [data-rec]"));
    w.eval(`S.folder="${f}"; S.rec=null; renderAll();`);
  }
}
w.eval('S.folder="audit"; renderAll();');
ok($$("#list table.audit tr").length > 1, "audit view shows the table");
ok(w.eval("RECS.every(t=>t.learn.every(k=>LEARN[k]))"), "all learn keys exist in LEARN");
ok(w.eval("new Set(RECS.map(t=>t.id)).size===RECS.length && new Set(RECS.map(recNo)).size===RECS.length"), "ticket ids and record numbers unique");
ok(w.eval("INJ.length===4 && THREATS.length===INJ.length+ALL.filter(t=>!t.legit).length"), "4 injects, all counted as threats");
ok(w.eval("THREATS.every(t=>t.choices&&t.choices.filter(c=>c[1]===1).length===1)"), "each refusable ticket has exactly one correct choice");
ok(w.eval("Object.values(LEARN).every(v=>v[1].startsWith('https://learn.microsoft.com/'))"), "all links go to learn.microsoft.com");

// 6. Domain swap + persistence.
$("#dom").value = "contoso123.onmicrosoft.com"; click($("#domSave"));
ok($("#audit").innerHTML.includes("contoso123.onmicrosoft.com") && !$("#audit").innerHTML.includes("{d}"), "domain substituted in audit log");
ok(JSON.parse(w.localStorage.getItem("sc300-ticket-queue-v4")).dom === "contoso123.onmicrosoft.com", "state persisted to localStorage");

ok(errors.length === 0, "no console errors" + (errors.length ? ": " + errors.join(" | ") : ""));
console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
w.close(); process.exit(fails ? 1 : 0);
