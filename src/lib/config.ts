export const PAD = 48;
export const PANEL_VERSION = "v1";
export const PANEL_GENE_COUNT = 570;

export const demoFast = () => process.env.DEMO_FAST === "1";
/** Consent window: 7 days, or 3 minutes with DEMO_FAST=1. */
export const consentWindowMs = () =>
  demoFast() ? 3 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
export const matchingMode = (): "psi" | "trusted" =>
  process.env.MATCHING_MODE === "trusted" ? "trusted" : "psi";

export const RATE_LIMIT = { maxChecks: 3, windowDays: 30 };
export const SHARE_DEFAULT_DAYS = 30;
export const COUNSELLOR_SLA_HOURS = 72;
export const SMALL_CELL = 10;
