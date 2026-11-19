"use client";
import * as React from "react";
import { useI18n } from "./providers";
import { Volume2, Square } from "lucide-react";

const LISTEN_KEY = (scope: string) => `amanah:listened:${scope}`;

/** True if the user used read-aloud anywhere in this scope (e.g. a check) this session. */
export function usedReadAloud(scope: string) {
  try {
    return sessionStorage.getItem(LISTEN_KEY(scope)) === "1";
  } catch {
    return false;
  }
}

/** Browser SpeechSynthesis only — no text leaves the device. */
export function ReadAloud({ text, scope }: { text: string; scope: string }) {
  const { t, lang } = useI18n();
  const [speaking, setSpeaking] = React.useState(false);
  const [supported, setSupported] = React.useState(false);
  React.useEffect(() => setSupported(typeof window !== "undefined" && "speechSynthesis" in window), []);
  React.useEffect(() => () => { if (speaking) window.speechSynthesis.cancel(); }, [speaking]);
  if (!supported) return null;

  function toggle() {
    const s = window.speechSynthesis;
    if (speaking) {
      s.cancel();
      setSpeaking(false);
      return;
    }
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "ar" ? "ar-SA" : "en-GB";
    const voice = s.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang));
    if (voice) u.voice = voice;
    u.rate = 0.92;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    try { sessionStorage.setItem(LISTEN_KEY(scope), "1"); } catch {}
    s.speak(u);
    setSpeaking(true);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-2.5 text-xs font-semibold text-primary hover:bg-primary-soft"
      aria-pressed={speaking}
    >
      {speaking ? <Square className="size-3.5" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
      {speaking ? t.common.stopReading : t.common.readAloud}
    </button>
  );
}

export function Section({ id, title, speak, scope, children }: { id?: string; title: string; speak: string; scope: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        <ReadAloud text={`${title}. ${speak}`} scope={scope} />
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
