# Changelog

- Phase 0: Next.js 15 scaffold, Tailwind theme, shadcn-style UI, Prisma/SQLite schema, seed (9 personas + 400 simulated checks), mock UAE PASS persona switcher, en/ar i18n with RTL, app shell.
- Phase 1: PSI over ristretto255 (src/lib/psi.ts) with tests; simulated lab issuer with Ed25519-signed credentials; on-device wallet; MATCHING_MODE=trusted fallback.
- Phase 2: check creation, rate limits, consent state machine with expiry, decline/withdraw indistinguishability, wallet agent (device-token auth), notifications with 3 s polling, RBAC guards, hash-chained audit log; integration tests.
- Phase 3: result interstitial (shown for every outcome), shared-risk / no-shared-risk screens, icon array with independent "next pregnancy", neutral options grid, read-aloud (SpeechSynthesis), teach-back logging (read vs listened), Stage 2 reveal via PSI, condition cards.
- Phase 4: counsellor referral form, "I'm feeling worried" priority flag, counsellor console (priority + SLA badges, notes, mock calendar, audited views).
- Phase 5: server transparency view with live gene scan, DoH dashboard (<10 suppression, equity panel, 400 simulated checks), privacy centre (audit chain verify, revoke, withdraw, delete wallet), family sharing with two-party approval.
- Phase 6: Ask Amanah (rule pre-classifier, scripted FAQ of 27 Q&As, optional Claude with redaction and safety post-checks), red-team eval (npm run eval:ai), SURE test; banned-phrase test.
