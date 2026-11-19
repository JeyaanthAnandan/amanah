# Privacy, safety and governance

Amanah is designed around **informed choice**. It supports understanding and access to counselling; it never tells anyone whether to marry, and it never reports an individual couple to any authority.

## 1. Threat model

| Adversary | Goal | Mitigations in the prototype |
|---|---|---|
| **Curious server / operator** | Learn who carries what | PSI on devices: the server stores only blinded ristretto255 points, padded to 48, shuffled, and unlinkable across checks; plus booleans. A test proves no gene symbol exists in any app table except the simulated `LabRecord`; the live "What our server sees" view re-runs that scan. Lab issuer is a separate (simulated) system. |
| **Curious family / initiator** | Learn the result or who declined | Initiator sees only Waiting → Complete ("results sent privately to …") or "could not be completed". Declines and withdrawals never change `Check.status`; notifications to the initiator are identical for decline vs timeout (tested). Results go only to the two participants. |
| **Probing participant** | Learn the other's genes by repeated checks | Mutual consent per check; rate limit of 3 checks per person per 30 days and 3 per initiator; fresh scalars and checkId-bound hashing per check; only a boolean is posted; Stage 2 reveal needs both consents; all actions audited. Residual: semi-honest model (see limitations). |
| **Family coercion** | Pressure someone to accept, or to share | Consent is individual and private; "No, thank you" is equal-weight and invisible to others; withdrawal is possible until the result; sharing results with family needs **both** participants; shares expire after 30 days and can be revoked; neutral rate-limit message. |
| **Counsellor overreach** | See more than needed | Counsellor sees only referrals and only what the participant consented to share (condition only if revealed and consented); every console load is written to each subject's audit log. |
| **Analyst / health system** | Re-identify couples | Dashboard is aggregate only; counts and rates with a numerator or denominator under 10 show "<10"; no marriage decisions are recorded at all. |
| **LLM provider** | Receive personal data | Ask Amanah sends only the redacted question (phones, Emirates IDs and emails stripped), UI language, FAQ and generic condition card. No names, IDs or wallet contents. Off by default. |

## 2. Consent design and decline indistinguishability

- Each participant sees: who requested, who the other person is, what will and won't happen (§6.3 copy), and three buttons with equal prominence: **Yes, I agree** · **No, thank you** · **I have a question**.
- Accepting runs that person's PSI step **on their device**; declining sends nothing about their genes.
- **A decline looks exactly like no response.** The decision is stored only on that person's `Consent` row. `Check.status` stays `AWAITING_CONSENT` until expiry, then `EXPIRED` → "Check could not be completed". The requester view is derived only from `Check.status`, and the participant view never includes the other person's decision. Tested in `tests/checks.test.ts` ("a decline is indistinguishable from no response").
- Either participant can withdraw before the result is computed; the check then quietly expires.
- **Stage 2 (condition reveal)** needs both participants. If either chooses "I prefer not to know", both keep only the binary result (right not to know).
- **Joint result, joint consent to share:** sharing the result (or the condition) with family needs one participant to propose and the other to approve. "Check completed" only can be shared by one.

## 3. Data minimisation, retention and audit

| Data | Where | Retention (prototype → production intent) |
|---|---|---|
| Carrier genes | Simulated lab system; participant device wallet | Device: until the user deletes the wallet (Privacy centre). Lab: DoH system of record. |
| PSI scalars | Device wallet only | Deleted when the check closes / after the Stage 2 decision (`WalletAgent`). |
| Blinded points | App DB (`PsiMessage`) | Prototype: kept for the transparency view. Production: delete 30 days after check closure. |
| Result boolean, condition ID | App DB (`Check`) | Production: 12 months, then aggregate-only. |
| Consent rows | App DB | Production: as required for audit (e.g. 5 years). |
| Referral data, counsellor notes | App DB | Clinical record retention per DoH policy. |
| Audit events | App DB, SHA-256 hash chain | Append-only; "Verify audit log" recomputes the chain. Production: WORM store. |

Audit events record actor, subject, action, check and time. Participants see their own events ("Who has seen my data"), including counsellor and family views.

## 4. RBAC matrix

| Capability | family_initiator | participant | family_member | counsellor | doh_analyst |
|---|---|---|---|---|---|
| Start a check | ✓ | own checks only | – | – | – |
| See check status (Waiting/Complete/Not completed) | own requests | own checks | – | – | – |
| Consent / decline / withdraw | – | ✓ (self) | – | – | – |
| Load wallet, run PSI | – | ✓ (own device) | – | – | – |
| See result | – | ✓ (own checks) | if both shared | if consented | – |
| See condition | – | if both revealed | if both shared level (c) | if revealed + consented | – |
| Request counsellor / "I'm worried" | – | ✓ | – | – | – |
| Counsellor queue, notes, booking | – | – | – | ✓ | – |
| Server transparency view | – | ✓ (own checks) | – | – | – |
| Privacy centre / audit verify | – | ✓ | – | – | – |
| Aggregate dashboard | – | – | – | – | ✓ |

Enforced server-side by `requireUser(...roles)` in every route handler, by `pageCtx(...roles)` on pages, and by `src/middleware.ts` as a coarse gate. Wallet PSI endpoints use a per-wallet HMAC device token.

## 5. Alignment (design intent, not certification)

- **UAE Federal Law No. 2 of 2019** (ICT in health fields): health data stays in the UAE. The target deployment is UAE-resident hosting, with an in-country LLM. The prototype stores nothing outside the container.
- **ADHICS** (Abu Dhabi Healthcare Information and Cyber Security Standard): access control by role, audit logging, data minimisation, encryption in transit and at rest (production), key management in HSM.
- **DoH premarital screening programme**: Amanah complements, and does not replace, the official screening and certificate.

## 6. Responsible-AI guardrails (Ask Amanah)

1. Rule-based pre-classifier in English and Arabic (`src/lib/ask-rules.ts`). Marriage decisions, religious rulings, termination, treatment/medication, current pregnancy, distress, and prompt-injection attempts → **ESCALATE** with a fixed, kind response and the "Talk to a counsellor" button. Distress also sets the referral priority flag.
2. The LLM (optional) answers EDUCATION only from FAQ and condition cards, and DECISION_SUPPORT only by listing the options neutrally; structured JSON output; ≤120 words; the user's language.
3. Post-checks: banned-phrase filter (§6.1, en + ar); any LLM ESCALATE, refusal, error or banned phrase → scripted fallback.
4. Red-team set of 20 prompts (`tests/ai-redteam.json`); `npm run eval:ai` prints a pass-rate table (scripted mode: 20/20). Also run in `npm test`.
5. Copy rules enforced by test: no banned phrase in `src/i18n/*`, content files or the system prompt.

## 7. Why Amanah never alerts authorities about individuals

Mandatory or punitive reporting would turn a voluntary, early, private check into surveillance. That would discourage use, push couples away from counselling, and risk coercion and stigma, especially for women. Public-health value comes from **earlier understanding and faster counselling**, which aggregate metrics can track without identifying anyone. Amanah therefore has no code path that sends individual results to any authority, and it does not record marriage decisions at all.
