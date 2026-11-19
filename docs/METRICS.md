# Metrics

**Amanah does not track marriage decisions.** Success means understanding and access to counselling, not any particular choice. No field anywhere records whether a couple married, cancelled or changed plans.

All metrics are computed by `src/server/metrics.ts` and shown on the DoH dashboard (`/dashboard`, role `doh_analyst`). **Suppression:** any count, or any rate whose numerator or denominator is under 10, is shown as `<10`. Medians need at least 10 values. The dashboard currently includes 400 simulated checks and says so.

| Challenge outcome | Metric | Definition |
|---|---|---|
| Earlier awareness | Checks started | Count of checks created |
| | Consent completion rate | Checks completed ÷ (completed + expired + withdrawn) |
| | Median time from request to result | Median of `completedAt − createdAt` (hours) |
| Risk identified | Shared-risk rate | Completed checks with a shared risk ÷ completed checks |
| Access to counselling | Shared-risk couples requesting counselling | Shared-risk checks with ≥1 referral ÷ shared-risk checks |
| | Median hours to first counsellor contact | Median of `firstContactAt − createdAt` over referrals |
| | Contacted within 72 hours | Referrals contacted ≤72 h ÷ referrals that were contacted or are past 72 h |
| Understanding | Teach-back mean score, by language (en/ar) and by mode (read vs listened) | Correct answers ÷ answers. Mode is "listen" if read-aloud was used for that check in the session. |
| Informed choice | SURE "informed" rate | SURE responses with all four "yes" ÷ SURE responses |
| Family involvement (by consent) | Family-share rate | Completed checks with ≥1 approved share ÷ completed checks |
| Equity | Language gap, mode gap | Absolute difference in teach-back score (percentage points); flagged when >10 points |

## Pilot KPI targets (proposed)

- ≥70% consent completion
- ≥80% of shared-risk couples request counselling
- ≥90% first contact within 72 h
- Teach-back ≥85% in both languages, with an equity gap ≤5 points
- SURE informed ≥75%

## What is deliberately not measured

- Marriage outcomes, engagement cancellations or reproductive choices
- Any per-couple or per-family report to authorities
- Who declined a check
