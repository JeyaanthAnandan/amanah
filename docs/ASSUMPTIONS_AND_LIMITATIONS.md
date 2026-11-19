# Assumptions and limitations

## Assumptions

- Participants already hold carrier results from the **DoH premarital screening programme** or the **Emirati Genome Programme**, and the DoH can issue them as a signed credential to the citizen's device.
- Matching is **gene-level** for **autosomal recessive** conditions: a shared risk means both carry a change in the same gene.
- A couple's two participants are adults who can consent for themselves.
- Genetic counselling capacity exists (or can be added through tele-counselling) to meet a 72-hour first-contact target.

## Limitations

### Data and simulation
- **Synthetic data only.** All personas, phone numbers and carrier lists are invented. No real names, Emirates IDs or genomic data are used.
- **The lab issuer is simulated** (`src/server/lab-issuer.ts`, `LabRecord`). In the demo its Ed25519 signing key and the wallet-token secret are derived from fixed strings (overridable by `LAB_ISSUER_SECRET` / `APP_SECRET`). Production keys belong in an HSM, held by the issuer.
- **400 simulated background checks** (`simulated = true`) populate the dashboard; the dashboard shows an "Includes simulated data" badge. Their distributions (e.g. the teach-back gap between Arabic-listen and English-read) are made up to demonstrate the equity panel.

### Cryptography and matching
- **Semi-honest PSI.** The protocol assumes participants follow it. A malicious participant could post crafted points, lie about the boolean, or probe with fake gene lists. Mitigations: mutual consent, rate limits, audit logs. Production options: threshold or circuit PSI, verifiable credentials bound into the protocol, or a DoH-run secure enclave.
- **Cardinality leakage to P1's client.** P1's device computes the intersection size internally; only the boolean is posted or shown. A modified client could learn the count.
- **Stage 2** reveals to P1's device which index matched. This happens only after both participants consent to reveal.
- **Demo device simulation.** One browser holds every persona's wallet in `localStorage` (`amanah:wallet:<personaId>`). The background agent runs pending PSI steps for each wallet using that wallet's own device token. Browser storage is not a secure enclave; production would use the platform keystore.
- **`MATCHING_MODE=trusted`** is a fallback that reads the simulated lab system server-side. It gives up the "server never sees genes" property (only the isolated module does) and is documented, not default.

### Clinical scope
- **Recessive-only, gene-level matching.** X-linked and dominant conditions are excluded. Variant-level interpretation, compound heterozygosity nuances, variable severity, de novo variants and conditions outside the panel are not modelled.
- **No clinical validation.** Condition cards (`content/conditions.json`) are short demo summaries marked "DEMO – requires review by a genetics professional" and shown with a "Demo content" badge. The severity tier is used only for triage and is never shown to users.
- **Not a diagnosis.** Amanah does not replace the official DoH premarital screening certificate or a counsellor.

### Language and content
- **Arabic copy is machine-assisted** Modern Standard Arabic. `src/i18n/ar.ts` is marked `// TODO: native speaker review`. The Arabic fields in `content/conditions.json` and `content/faq.json` (JSON allows no comments) are covered by this note. All of them need review by a native Gulf Arabic speaker and a genetic counsellor.
- **Comprehension instruments are not psychometrically validated in Arabic.** The teach-back questions are bespoke. The SURE test (O'Connor & Légaré, 2008) is used as a 4-item yes/no screen; its licence for this use and its Arabic translation must be checked before any real deployment.
- Read-aloud uses the browser's SpeechSynthesis; Arabic voice availability depends on the device.

### AI
- **Ask Amanah is not validated.** In scripted mode it answers from a 27-item FAQ with keyword matching. In LLM mode (optional, `ANTHROPIC_API_KEY`) it uses Claude with redaction and guardrails. The 20-prompt red-team set is small. Production would use an **in-country hosted model** and a much larger, clinician-reviewed evaluation.

### Platform
- **UAE PASS and notifications are mocked.** Login is a persona switcher; SMS/WhatsApp messages are preview cards labelled "Demo — nothing sent"; clients poll every 3 seconds instead of receiving push notifications.
- **Demo timings are accelerated.** With `DEMO_FAST=1` the consent window is 3 minutes instead of 7 days. The counsellor calendar is a mock.
- SQLite, a single process and an in-process audit-append lock are prototype choices. Production needs Postgres, a WORM audit store and horizontal scaling.
- Counsellor notes are free text and could, in principle, contain gene names typed by a clinician. They are part of the clinical record, not the matching database. The automated gene scan would flag them.
- Rate limiting is per participant and initiator within the app; there is no device- or network-level abuse protection.
