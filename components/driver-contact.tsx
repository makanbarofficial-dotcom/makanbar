import { CallButton } from "@/components/call-button";
import type { DriverContact } from "@/lib/driver-contacts";

// کادر «راننده‌ی این بار»: فقط نام و نام خانوادگی و دکمه‌ی تماس
export function DriverContactBox({ contact }: { contact: DriverContact | undefined }) {
  if (!contact) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-400/25 bg-sky-500/10 px-4 py-3 text-sm">
      <span>
        <span className="text-fg/60">🚚 راننده: </span>
        <span className="font-black">{contact.full_name || "—"}</span>
      </span>
      {contact.phone && <CallButton phone={contact.phone} />}
    </div>
  );
}
