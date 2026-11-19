export const ROLES = [
  "family_initiator",
  "participant",
  "family_member",
  "counsellor",
  "doh_analyst",
] as const;
export type Role = (typeof ROLES)[number];
