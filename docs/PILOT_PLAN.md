# Pilot plan (one page)

**Goal:** show that private, early compatibility checks improve understanding and time-to-counselling for Emirati couples, without coercion, in a 6-month pilot with DoH premarital screening centres.

## Setting
- 2–3 DoH-licensed premarital screening centres in Abu Dhabi and Al Ain, plus their existing genetic counselling services and tele-counselling.
- Target: about 1,000 couples who already have screening results or Emirati Genome Programme data, recruited through the centres and TAMM.

## Integration path
1. **Identity:** UAE PASS OIDC replaces the persona switcher.
2. **Results:** DoH issues carrier results as signed verifiable credentials to the citizen's device. This replaces the simulated lab issuer; Amanah's server never receives plaintext.
3. **Notifications:** TAMM / government SMS gateway, with content-free messages.
4. **Counselling:** referral feed into the counselling service queue, plus a Malaffi summary only with explicit consent.
5. **Hosting:** UAE-resident cloud (Postgres, Key Vault/HSM, WORM audit), an in-country LLM for Ask Amanah, and ADHICS controls review.
6. **Security:** independent cryptographic review of the PSI; consider threshold PSI or an enclave so that only the boolean is revealed.

## Phases
| Month | Activity |
|---|---|
| 0–1 | Ethics/IRB, DPIA, ADHICS gap review; native-speaker and counsellor review of all Arabic and condition content |
| 1–2 | Integrations (UAE PASS, credential issuance, notifications) in staging; usability testing with 20 couples |
| 2–5 | Live pilot in 2–3 centres; weekly safety review of escalations and complaints |
| 5–6 | Evaluation against KPIs and an equity analysis; go/no-go for scale-up |

## Pilot KPIs (see METRICS.md)
- Consent completion ≥70%
- ≥80% of shared-risk couples request counselling
- ≥90% contacted within 72 h
- Teach-back ≥85% in Arabic and English, gap ≤5 points
- SURE informed ≥75%
- Zero privacy incidents
- **Not measured: marriage decisions**

## Business model
- **B2G licence to DoH**: annual platform licence covering hosting in the UAE, maintenance, content updates and the counsellor console. Or a **per-check fee** paid by the health system or insurer as part of premarital care.
- Value case: earlier counselling, efficient use of scarce counsellor time (triage, SLA, scripted education), and avoided lifetime costs of severe recessive conditions through informed choice. This is measured as access and understanding, not outcomes of marriage decisions.

## Risks and mitigations
| Risk | Mitigation |
|---|---|
| Family coercion | Individual consent, invisible decline, joint sharing, counsellor escalation |
| Counsellor capacity | Triage priority, tele-counselling, scripted education for routine questions |
| Content accuracy / cultural fit | Clinical and native-speaker review; religious-scholar advisory input on options wording |
| Crypto / implementation flaws | External audit; trusted-mode fallback behind the same interface |
