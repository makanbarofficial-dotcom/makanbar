// دکمه‌ی بزرگ تماس؛ روی گوشی با یک لمس شماره گرفته می‌شود
export function CallButton({ phone, label, className = "" }: { phone: string; label?: string; className?: string }) {
  return (
    <a
      href={`tel:${phone}`}
      className={`inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-sm font-black text-emerald-700 transition hover:bg-emerald-500/20 ${className}`}
    >
      📞 <span dir="ltr">{label ?? phone}</span>
    </a>
  );
}
