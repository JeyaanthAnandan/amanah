"use client";
/**
 * Runs pending PSI steps for every wallet stored on this device (§8.1 step 3,
 * §8.3). Each wallet authenticates with its own device token, so steps run
 * even when another demo persona is signed in — this browser simulates each
 * participant's phone. Also deletes PSI secrets once a check closes.
 */
import * as React from "react";
import { listWallets, saveWallet, walletHeaders, type Wallet } from "@/lib/wallet";
import { p1Finish, p1Reveal, p2RevealOrdered, type P1State, type P2State } from "@/lib/psi";
import { conditionForGene } from "@/lib/conditions";
import type { WalletTask } from "@/server/checks";
import { signalRefresh } from "@/lib/use-poll";

async function post(w: Wallet, url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...walletHeaders(w) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`wallet step failed: ${res.status}`);
}

async function runFor(w: Wallet): Promise<boolean> {
  const res = await fetch("/api/wallet/tasks", { headers: walletHeaders(w), cache: "no-store" });
  if (!res.ok) return false;
  const { tasks, closed } = (await res.json()) as { tasks: WalletTask[]; closed: string[] };
  let changed = false;
  for (const task of tasks) {
    const st = w.psi[task.checkId];
    if (!st) continue;
    try {
      if (task.kind === "COMPUTE_RESULT" && st.role === "P1") {
        await post(w, "/api/wallet/result", { checkId: task.checkId, sharedRisk: p1Finish(st as P1State, task.Y, task.Z) });
      } else if (task.kind === "POST_Y_ORDERED" && st.role === "P2") {
        await post(w, "/api/wallet/y-ordered", { checkId: task.checkId, payload: p2RevealOrdered(st as P2State, task.X) });
      } else if (task.kind === "COMPUTE_REVEAL" && st.role === "P1") {
        const genes = p1Reveal(st as P1State, task.yOrdered, task.Z);
        const conditionIds = genes.map((g) => conditionForGene(g)?.id).filter((x): x is string => !!x);
        await post(w, "/api/wallet/reveal", { checkId: task.checkId, conditionIds });
      }
      changed = true;
    } catch (e) {
      console.warn(e);
    }
  }
  for (const id of closed) {
    if (w.psi[id]) {
      delete w.psi[id]; // §8.1 step 5: scalars deleted when the check closes
      saveWallet(w);
    }
  }
  return changed;
}

export function WalletAgent() {
  React.useEffect(() => {
    let busy = false;
    const tick = async () => {
      if (busy) return;
      busy = true;
      try {
        let changed = false;
        for (const w of listWallets()) changed = (await runFor(w)) || changed;
        if (changed) signalRefresh();
      } finally {
        busy = false;
      }
    };
    tick();
    const t = setInterval(tick, 3000);
    window.addEventListener("amanah:wallet-tick", tick);
    return () => {
      clearInterval(t);
      window.removeEventListener("amanah:wallet-tick", tick);
    };
  }, []);
  return null;
}
