# Changelog

- Phase 0: Next.js 15 scaffold, Tailwind theme, shadcn-style UI, Prisma/SQLite schema, seed (9 personas + 400 simulated checks), mock UAE PASS persona switcher, en/ar i18n with RTL, app shell.
- Phase 1: PSI over ristretto255 (src/lib/psi.ts) with tests; simulated lab issuer with Ed25519-signed credentials; on-device wallet; MATCHING_MODE=trusted fallback.
- Phase 2: check creation, rate limits, consent state machine with expiry, decline/withdraw indistinguishability, wallet agent (device-token auth), notifications with 3 s polling, RBAC guards, hash-chained audit log; integration tests.
