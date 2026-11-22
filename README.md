# SC-300 Lab Inbox

A service-desk simulator for practising **Microsoft Entra ID identity and access administration** (exam SC-300).

Lab guides tell you what to click. Real IAM work starts with a request from a person, and the hard part is deciding whether to do it at all. The Lab Inbox turns each lab exercise into a service-desk ticket. You do the work in your own Entra lab tenant, close the ticket, and find the audit-log evidence your change left behind. Some tickets are traps you should refuse.

**[Try it live](https://notwalnomad.github.io/sc300-lab-inbox/)** · **[Setup guide](docs/setup-guide.html)**

> Training simulation. Every person, company and sender is fictional. The app runs entirely in your browser and never connects to a real tenant.

## What's inside

- **30 scenarios across five lab days**, delivered as incident (INC), requested item (RITM) and change (CHG) records with tasks, priority from impact × urgency, an SLA timer and an activity history.
- **Legitimate work:** joiners, movers and leavers, scoped admin roles with administrative units, B2B guests, MFA evidence, Conditional Access in report-only mode, SAML SSO, app registrations, PIM, access reviews and access packages.
- **Requests to refuse:** fake billing emails, "just make me Global Admin", MFA-removal phone calls, risky admin-consent requests and a 2 a.m. privileged-role activation.
- **4 surprise injects** you or an instructor can trigger, including an MFA-fatigue attack with a simulated Authenticator prompt.
- **Evidence for every decision:** a correct call delivers the notifications and audit-log rows a real tenant would produce. A wrong call delivers the security alert and red audit rows it would cause.
- **Lab Mail:** a mail client for notifications, with external-sender warnings.
- **Setup guide** (`docs/setup-guide.html`): step-by-step portal paths, what you should see, why each step matters, self-check questions and a glossary.

## How to use it

1. Open `index.html` in a browser (or the live link above). No install and no build step.
2. Open **Settings and help** and enter your lab tenant's domain. Usernames in every ticket update to match.
3. Click **Get next ticket**, open the record, assign it to yourself, and work its tasks in your real lab tenant.
4. Choose an outcome and submit. Then find the same evidence in your tenant's audit and sign-in logs.

Progress is saved in your browser's local storage.

## Run the tests

```bash
npm install
npm test
```

The smoke test loads the app in jsdom, works a record from assignment to resolution, triggers an inject, closes every scenario on every day, and fails on any console error.

## Built with

Plain HTML, CSS and JavaScript in a single self-contained file. No frameworks, no external requests. Audit activity names follow Microsoft Entra's wording, and all reference links go to Microsoft Learn.

Built by Roger D. Lawton with an AI coding assistant (Claude Code). I designed the scenarios and lab flow, and reviewed and tested each change.
