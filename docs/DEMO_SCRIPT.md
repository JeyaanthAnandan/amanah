# 3-minute demo script

Setup: `npm run db:reset && npm run dev` with `DEMO_FAST=1`. Open `/demo` and press **Reset demo data**. Use a phone-width window (390 px). Steps 1–3 must happen within the 3-minute consent window.

| Time | Step (§9) | What to show | Talking point → judging criterion |
|---|---|---|---|
| 0:00 | Intro | Home page | 570-gene premarital screening happens late and there are about 9 counsellors in the UAE. Amanah moves understanding earlier. → **Health impact & clinical relevance** |
| 0:15 | 1 | **Mariam** → Start a check → Ahmed + Fatima (050 000 0005) → "Waiting", countdown | The initiator learns only Waiting / Complete. → **Responsible AI, safety & governance** |
| 0:30 | 2 | **Ahmed** → Inbox (SMS preview "Demo — nothing sent") → consent screen → **Load my results** → **Yes, I agree** | Individual consent. The wallet verifies the lab's Ed25519 signature on the device, and PSI step 1 runs in the browser. → **Technical depth** |
| 0:50 | 3 | **Fatima** → load wallet → accept | "If she had said no, nobody would ever know: it looks exactly like a timeout (tested)." |
| 1:00 | 4 | **Mariam** → "Complete. Results have been sent privately to Ahmed and Fatima." | Family never sees the result without both agreeing. |
| 1:10 | 5 | **Ahmed** → interstitial → shared-risk result → icon array, tap **Next pregnancy** twice → options grid → **Read aloud** in Arabic (switch to العربية) → teach-back | Frequencies with icons, never red, neutral options, no default. Read vs listen is logged for equity. → **Demo quality** |
| 1:50 | 6 | Ahmed taps **Show which condition** → Fatima agrees → HBB card appears | Right not to know: both must agree; the reveal also runs on the devices. |
| 2:10 | 7 | Ahmed → **Talk to a counsellor** → **Dr Layla**'s queue: priority + SLA timer → **Mark contacted** | One tap to a human; 72-hour SLA; the counsellor sees only what was consented; every view is audited. → **Scalability / path to pilot** |
| 2:30 | 8 | Ahmed → **What our server sees** | Only blinded points, padded to 48, and "Gene names in this database: 0", checked live. → **Technical depth / governance** |
| 2:45 | 9 | **Omar** → dashboard with `<10` suppression, equity panel (Arabic-listen gap flagged) | Success = understanding and access, not cancelled marriages. → **Commercial viability** (B2G KPIs) |
| (bonus) | 10 | **Saeed** → Khalid × Noura → no shared risk; a third check where Noura declines → after 3 min "could not be completed" | Decline indistinguishability live. |

Backup if time is short: run `npm test` to show 26 passing tests (PSI, decline indistinguishability, no gene names in app tables, audit tamper detection, red-team set). Run `npm run eval:ai` to show the AI escalation table.
