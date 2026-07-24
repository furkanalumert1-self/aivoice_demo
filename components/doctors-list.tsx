"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, Clock, Plus, Pencil, Trash2, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/language-provider";
import { t, type Locale } from "@/lib/i18n";

type WorkingHours = Record<string, string | null>;

type Doctor = {
  id: string;
  fullName: string;
  specialization: string;
  workingHours: unknown;
  active: boolean | null;
  createdAt: Date | null;
};

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function getDayLabels(locale: Locale) {
  return {
    mon: t(locale, "dayMon"),
    tue: t(locale, "dayTue"),
    wed: t(locale, "dayWed"),
    thu: t(locale, "dayThu"),
    fri: t(locale, "dayFri"),
    sat: t(locale, "daySat"),
    sun: t(locale, "daySun"),
  };
}

function getDayShort(locale: Locale) {
  return {
    mon: t(locale, "dayMonShort"),
    tue: t(locale, "dayTueShort"),
    wed: t(locale, "dayWedShort"),
    thu: t(locale, "dayThuShort"),
    fri: t(locale, "dayFriShort"),
    sat: t(locale, "daySatShort"),
    sun: t(locale, "daySunShort"),
  };
}

type FormState = {
  fullName: string;
  specialization: string;
  active: boolean;
  hours: Record<string, { enabled: boolean; range: string }>;
};

function emptyForm(): FormState {
  return {
    fullName: "",
    specialization: "",
    active: true,
    hours: Object.fromEntries(DAY_KEYS.map((k) => [k, { enabled: false, range: "09:00-17:00" }])),
  };
}

function doctorToForm(doc: Doctor): FormState {
  const wh = (doc.workingHours as WorkingHours) ?? {};
  return {
    fullName: doc.fullName,
    specialization: doc.specialization,
    active: doc.active ?? true,
    hours: Object.fromEntries(
      DAY_KEYS.map((k) => [k, { enabled: !!wh[k], range: wh[k] ?? "09:00-17:00" }])
    ),
  };
}

function formToWorkingHours(form: FormState): WorkingHours {
  return Object.fromEntries(
    DAY_KEYS.map((k) => [k, form.hours[k].enabled ? form.hours[k].range : null])
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function DoctorModal({
  doctor,
  onClose,
  onSaved,
  locale,
}: {
  doctor: Doctor | null;
  onClose: () => void;
  onSaved: () => void;
  locale: Locale;
}) {
  const [form, setForm] = useState<FormState>(doctor ? doctorToForm(doctor) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!doctor;
  const dayLabels = getDayLabels(locale);

  const save = async () => {
    if (!form.fullName.trim() || !form.specialization.trim()) {
      setError(t(locale, "fieldRequired"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        specialization: form.specialization.trim(),
        active: form.active,
        workingHours: formToWorkingHours(form),
      };
      const res = await fetch(
        isEdit ? `/api/admin/doctors?id=${doctor!.id}` : "/api/admin/doctors",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({}));
        throw new Error(msg ?? t(locale, "dbError"));
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "dbError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl animate-float-up"
        style={{ boxShadow: "var(--shadow-pop)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-semibold text-gray-900">
            {isEdit ? t(locale, "editDoctor") : t(locale, "addDoctorModal")}
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">{t(locale, "fullName")} *</label>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Dr. Ayşe Yılmaz"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">{t(locale, "specializationLabel")} *</label>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={form.specialization}
                onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
                placeholder="Kardiyoloji"
              />
            </div>
          </div>

          {/* Working hours */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-2">{t(locale, "workingHours")}</label>
            <div className="space-y-2">
              {DAY_KEYS.map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        hours: { ...f.hours, [k]: { ...f.hours[k], enabled: !f.hours[k].enabled } },
                      }))
                    }
                    className={cn(
                      "flex w-24 shrink-0 items-center justify-center rounded-lg py-1 text-xs font-medium transition-colors",
                      form.hours[k].enabled
                        ? "bg-teal-500 text-white"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    {dayLabels[k]}
                  </button>
                  {form.hours[k].enabled && (
                    <input
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      value={form.hours[k].range}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          hours: { ...f.hours, [k]: { ...f.hours[k], range: e.target.value } },
                        }))
                      }
                      placeholder="09:00-17:00"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">{t(locale, "active")}</span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                form.active ? "bg-teal-500" : "bg-gray-200"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                  form.active ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {t(locale, "cancelBtn")}
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors disabled:opacity-60"
          >
            {saving ? t(locale, "savingBtn") : isEdit ? t(locale, "updateBtn") : t(locale, "addBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete confirm ─────────────────────────────────────────────────────────────
function DeleteConfirm({
  doctor,
  onClose,
  onDeleted,
  locale,
}: {
  doctor: Doctor;
  onClose: () => void;
  onDeleted: () => void;
  locale: Locale;
}) {
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    try {
      await fetch(`/api/admin/doctors?id=${doctor.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-float-up">
        <p className="text-[15px] font-semibold text-gray-900 mb-2">{t(locale, "deleteDoctorTitle")}</p>
        <p className="text-sm text-gray-500 mb-6">
          <strong>{doctor.fullName}</strong> {t(locale, "deleteWarning")}
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            {t(locale, "cancelBtn")}
          </button>
          <button onClick={confirm} disabled={loading} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60">
            {loading ? t(locale, "deletingBtn") : t(locale, "deleteBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main list component ────────────────────────────────────────────────────────
export default function DoctorsList({ initial }: { initial: Doctor[] }) {
  const router = useRouter();
  const { locale } = useLanguage();
  const [doctors, setDoctors] = useState<Doctor[]>(initial);
  const [modal, setModal] = useState<{ mode: "add" | "edit"; doctor: Doctor | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Doctor | null>(null);
  const dayShort = getDayShort(locale);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/doctors");
      if (res.ok) setDoctors(await res.json());
    } catch { /* ignore */ }
    router.refresh();
  }, [router]);

  const onSaved = () => {
    setModal(null);
    refresh();
  };

  const onDeleted = () => {
    setDeleteTarget(null);
    refresh();
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t(locale, "doctors")}</h1>
          <p className="mt-0.5 text-sm text-gray-500">{t(locale, "doctorsSub")}</p>
        </div>
        <button
          onClick={() => setModal({ mode: "add", doctor: null })}
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {t(locale, "addDoctor")}
        </button>
      </div>

      {/* Grid */}
      {doctors.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center">
          <Stethoscope className="h-10 w-10 mx-auto mb-3 text-gray-200" />
          <p className="text-sm text-gray-400">{t(locale, "noDoctors")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doc) => {
            const wh = (doc.workingHours as WorkingHours) ?? {};
            const activeDays = Object.entries(wh).filter(([, v]) => v);
            return (
              <div
                key={doc.id}
                className="group relative rounded-2xl border border-gray-100 bg-white p-5 hover:shadow-md transition-shadow"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                {/* Actions */}
                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setModal({ mode: "edit", doctor: doc })}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(doc)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                    <Stethoscope className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-[14px]">{doc.fullName}</p>
                    <p className="text-xs text-gray-500">{doc.specialization}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-xs">{t(locale, "colStatus")}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        doc.active
                          ? "bg-teal-50 text-teal-700"
                          : "bg-red-50 text-red-700"
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", doc.active ? "bg-teal-500" : "bg-red-500")} />
                      {doc.active ? t(locale, "active") : t(locale, "doctorInactive")}
                    </span>
                  </div>

                  {activeDays.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
                        <Clock className="h-3 w-3" />
                        {t(locale, "workingHours")}
                      </div>
                      <div className="space-y-0.5 pl-4">
                        {activeDays.map(([day, hours]) => (
                          <div key={day} className="flex justify-between text-[11px]">
                            <span className="text-gray-400 w-8">{dayShort[day as keyof typeof dayShort] ?? day}</span>
                            <span className="text-gray-700 tnum">{hours}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {modal && (
        <DoctorModal
          doctor={modal.mode === "edit" ? modal.doctor : null}
          onClose={() => setModal(null)}
          onSaved={onSaved}
          locale={locale}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          doctor={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={onDeleted}
          locale={locale}
        />
      )}
    </>
  );
}
