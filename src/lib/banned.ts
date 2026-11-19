/** §6.1 banned phrases (English + Arabic equivalents). Checked in tests and on AI output. */
export const BANNED_EN = [
  "incompatible couple", "defective", "bad genes", "faulty gene", "abnormal", "you should",
  "we recommend that you", "avoid this marriage", "dangerous marriage", "risky marriage",
  "cousin marriage causes", "your fault",
];
export const BANNED_AR = [
  "زوجان غير متوافقين", "معيب", "جينات سيئة", "جين معطوب", "غير طبيعي", "يجب عليك", "يجب أن",
  "ننصحك", "نوصي بأن", "تجنب هذا الزواج", "زواج خطير", "زواج محفوف بالمخاطر",
  "زواج الأقارب يسبب", "ذنبك", "خطؤك",
];
export const BANNED = [...BANNED_EN, ...BANNED_AR];

export function findBanned(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED.filter((p) => lower.includes(p.toLowerCase()));
}
