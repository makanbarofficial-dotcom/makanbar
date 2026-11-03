"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Alert, ui } from "@/components/ui";
import {
  EMPTY_BIRTH_DATE,
  IdentityFields,
  formatBirthDate,
  identityError,
} from "@/components/identity-fields";
import { normalizeDigits } from "@/lib/shipments";

// خودروهای سنگین باید شماره هوشمند ناوگان داشته باشند (مثل app/driver/register)
export const FLEET_CARD_TYPES = ["تریلی", "جفت", "تک", "خاور و کامیونت"];

type Missing = {
  vehicle_type: string | null;
  national_code: string | null;
  birth_date: string | null;
  fleet_smart_number: string | null;
};

export function needsProfileCompletion(profile: Missing) {
  return (
    !profile.national_code ||
    !profile.birth_date ||
    (FLEET_CARD_TYPES.includes(profile.vehicle_type ?? "") && !profile.fleet_smart_number)
  );
}

// رانندگانی که قبل از اضافه شدن این فیلدها ثبت‌نام کرده‌اند، اینجا تکمیلشان می‌کنند (تابع complete_driver_profile)
export function CompleteProfile({
  supabase,
  profile,
  onDone,
}: {
  supabase: SupabaseClient;
  profile: Missing;
  onDone: () => void;
}) {
  const needsFleet = FLEET_CARD_TYPES.includes(profile.vehicle_type ?? "");
  const [nationalCode, setNationalCode] = useState(profile.national_code ?? "");
  const [birth, setBirth] = useState(EMPTY_BIRTH_DATE);
  const [fleetNumber, setFleetNumber] = useState(profile.fleet_smart_number ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");

    const problem = identityError(nationalCode, birth);
    if (problem) {
      setError(problem);
      return;
    }

    if (needsFleet && !/^\d{5,10}$/.test(fleetNumber)) {
      setError("شماره هوشمند ناوگان را درست وارد کنید (فقط رقم).");
      return;
    }

    setSaving(true);
    const { error: saveError } = await supabase.rpc("complete_driver_profile", {
      p_national_code: nationalCode,
      p_birth_date: formatBirthDate(birth),
      p_fleet_number: needsFleet ? fleetNumber : null,
    });
    setSaving(false);

    if (saveError) {
      setError(saveError.message || "ذخیره انجام نشد؛ دوباره تلاش کنید.");
      return;
    }

    onDone();
  }

  return (
    <section className="mb-5 rounded-2xl border-2 border-amber-400/50 bg-amber-500/10 p-5">
      <h2 className="text-lg font-black">تکمیل اطلاعات راننده</h2>
      <p className="mt-1 text-sm leading-7 text-fg/70">
        {needsFleet
          ? "لطفاً کد ملی، تاریخ تولد و شماره هوشمند ناوگان خود را وارد کنید."
          : "لطفاً کد ملی و تاریخ تولد خود را وارد کنید."}
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="mt-4 space-y-4"
      >
        <IdentityFields
          nationalCode={nationalCode}
          onNationalCodeChange={setNationalCode}
          birth={birth}
          onBirthChange={setBirth}
        />

        {needsFleet && (
          <div>
            <label htmlFor="fleetNumber" className={ui.label}>
              شماره هوشمند ناوگان
            </label>
            <input
              id="fleetNumber"
              type="tel"
              dir="ltr"
              inputMode="numeric"
              maxLength={10}
              value={fleetNumber}
              onChange={(e) =>
                setFleetNumber(normalizeDigits(e.target.value).replace(/\D/g, "").slice(0, 10))
              }
              placeholder="شماره روی کارت هوشمند"
              className={`${ui.input} text-right`}
            />
          </div>
        )}

        {error && <Alert tone="error">{error}</Alert>}

        <button type="submit" disabled={saving} className={ui.btnPrimary}>
          {saving ? "در حال ذخیره..." : "ذخیره اطلاعات"}
        </button>
      </form>
    </section>
  );
}
