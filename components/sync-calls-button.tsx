"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

export function SyncCallsButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const sync = async () => {
    setState("loading");
    setMessage("");
    try {
      const res = await fetch("/api/admin/sync-calls", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Hata");
      setMessage(data.message ?? `${data.imported} çağrı içe aktarıldı`);
      setState("done");
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Senkronizasyon başarısız");
      setState("error");
    }
  };

  return (
    <div className="flex items-center gap-2">
      {state === "done" && (
        <span className="flex items-center gap-1 text-[12px] text-teal-600 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" />{message}
        </span>
      )}
      {state === "error" && (
        <span className="flex items-center gap-1 text-[12px] text-red-600 font-medium">
          <AlertCircle className="h-3.5 w-3.5" />{message}
        </span>
      )}
      <button
        onClick={sync}
        disabled={state === "loading"}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${state === "loading" ? "animate-spin" : ""}`} />
        {state === "loading" ? "Senkronize ediliyor…" : "VAPI'den Senkronize Et"}
      </button>
    </div>
  );
}
