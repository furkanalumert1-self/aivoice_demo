"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Plus, Pencil, Trash2, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number | null;
  price: string | null;
  active: boolean | null;
};

type FormState = {
  name: string;
  description: string;
  durationMinutes: number;
  price: string;
  active: boolean;
};

function emptyForm(): FormState {
  return { name: "", description: "", durationMinutes: 30, price: "", active: true };
}

function serviceToForm(s: Service): FormState {
  return {
    name: s.name,
    description: s.description ?? "",
    durationMinutes: s.durationMinutes ?? 30,
    price: s.price ?? "",
    active: s.active ?? true,
  };
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function ServiceModal({
  service,
  onClose,
  onSaved,
}: {
  service: Service | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(service ? serviceToForm(service) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!service;

  const save = async () => {
    if (!form.name.trim()) { setError("Hizmet adı gerekli"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(
        isEdit ? `/api/admin/services?id=${service!.id}` : "/api/admin/services",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim() || null,
            durationMinutes: Number(form.durationMinutes),
            price: form.price ? form.price : null,
            active: form.active,
          }),
        }
      );
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({}));
        throw new Error(msg ?? "Kayıt başarısız");
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl animate-float-up" style={{ boxShadow: "var(--shadow-pop)" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-semibold text-gray-900">
            {isEdit ? "Hizmeti Düzenle" : "Yeni Hizmet Ekle"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Hizmet Adı *</label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Kardiyoloji"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Açıklama</label>
            <input
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Kalp ve damar hastalıkları"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Süre (dk)</label>
              <input
                type="number"
                min={5}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={form.durationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Ücret (₺)</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Aktif</span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                form.active ? "bg-teal-500" : "bg-gray-200"
              )}
            >
              <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", form.active ? "translate-x-6" : "translate-x-1")} />
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">İptal</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-60">
            {saving ? "Kaydediliyor…" : isEdit ? "Güncelle" : "Ekle"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm ─────────────────────────────────────────────────────────────
function DeleteConfirm({ service, onClose, onDeleted }: { service: Service; onClose: () => void; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false);
  const confirm = async () => {
    setLoading(true);
    await fetch(`/api/admin/services?id=${service.id}`, { method: "DELETE" });
    setLoading(false);
    onDeleted();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-float-up">
        <p className="text-[15px] font-semibold text-gray-900 mb-2">Hizmeti Sil</p>
        <p className="text-sm text-gray-500 mb-6"><strong>{service.name}</strong> silinecek. Bu işlem geri alınamaz.</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">İptal</button>
          <button onClick={confirm} disabled={loading} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60">
            {loading ? "Siliniyor…" : "Sil"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ServicesList({ initial }: { initial: Service[] }) {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>(initial);
  const [modal, setModal] = useState<{ service: Service | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/services");
      if (res.ok) setServices(await res.json());
    } catch { /* ignore */ }
    router.refresh();
  }, [router]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Hizmetler</h1>
          <p className="mt-0.5 text-sm text-gray-500">Kliniğimizin sunduğu tıbbi hizmetler</p>
        </div>
        <button
          onClick={() => setModal({ service: null })}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Yeni Hizmet
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white" style={{ boxShadow: "var(--shadow-soft)" }}>
        {services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Wrench className="h-10 w-10 mb-3 text-gray-200" />
            <p className="text-sm text-gray-400">Henüz hizmet kaydı yok</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70">
                  {["Hizmet Adı", "Açıklama", "Süre", "Ücret", "Durum", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left label-mono text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                          <Wrench className="h-3 w-3 text-indigo-500" />
                        </div>
                        <span className="font-medium text-gray-900">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 max-w-xs truncate">{s.description ?? "—"}</td>
                    <td className="px-5 py-3.5 tnum text-gray-600">{s.durationMinutes ? `${s.durationMinutes} dk` : "—"}</td>
                    <td className="px-5 py-3.5 tnum text-gray-600">{s.price ? `₺${Number(s.price).toLocaleString("tr-TR")}` : "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold", s.active ? "bg-teal-50 text-teal-700" : "bg-gray-100 text-gray-500")}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", s.active ? "bg-teal-500" : "bg-gray-400")} />
                        {s.active ? "Aktif" : "Pasif"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setModal({ service: s })} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && (
        <ServiceModal service={modal.service} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
      )}
      {deleteTarget && (
        <DeleteConfirm service={deleteTarget} onClose={() => setDeleteTarget(null)} onDeleted={() => { setDeleteTarget(null); refresh(); }} />
      )}
    </>
  );
}
