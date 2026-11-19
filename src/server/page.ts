import "server-only";
import type { Role } from "@/lib/roles";
import { getDict } from "@/i18n";
import { getCurrentUser, getLang, type SessionUser } from "./session";

/** Page-level RBAC. Returns null when the persona may not see the page. */
export async function pageCtx(...roles: Role[]) {
  const [user, lang] = await Promise.all([getCurrentUser(), getLang()]);
  const t = getDict(lang);
  const allowed = !!user && (roles.length === 0 || roles.some((r) => user.roles.includes(r)));
  return { user: allowed ? (user as SessionUser) : null, lang, t, nameOf: (u: { name: string; nameAr: string }) => (lang === "ar" ? u.nameAr : u.name) };
}
