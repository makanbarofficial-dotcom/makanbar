"use client";

import { ui } from "@/components/ui";

// کد ملی و تاریخ تولد شمسی در فرم‌های ثبت‌نام صاحب بار و راننده

export type BirthDate = { year: string; month: string; day: string };

export const EMPTY_BIRTH_DATE: BirthDate = { year: "", month: "", day: "" };

const MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

// سال‌های شمسی از ۱۵ سال پیش تا ۱۰۰ سال پیش؛ سال جاری شمسی از تاریخ میلادی حساب می‌شود
const CURRENT_YEAR = new Date().getFullYear() - 621;
const YEARS = Array.from({ length: 86 }, (_, i) => String(CURRENT_YEAR - 15 - i));

function toEnglishDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

// الگوریتم رقم کنترل کد ملی ایران
export function isValidNationalCode(value: string) {
  const code = toEnglishDigits(value).trim();
  if (!/^\d{10}$/.test(code) || /^(\d)\1{9}$/.test(code)) return false;
  const sum = [...code.slice(0, 9)].reduce((total, digit, i) => total + Number(digit) * (10 - i), 0);
  const remainder = sum % 11;
  const check = Number(code[9]);
  return remainder < 2 ? check === remainder : check === 11 - remainder;
}

// خروجی: «۱۳۷۰/۰۵/۱۲» با رقم انگلیسی، یا رشته خالی اگر کامل نباشد
export function formatBirthDate(birth: BirthDate) {
  if (!birth.year || !birth.month || !birth.day) return "";
  return `${birth.year}/${birth.month.padStart(2, "0")}/${birth.day.padStart(2, "0")}`;
}

// پیام خطای فارسی، یا null اگر هر دو درست باشند
export function identityError(nationalCode: string, birth: BirthDate) {
  if (!nationalCode.trim()) return "لطفاً کد ملی را وارد کنید.";
  if (!isValidNationalCode(nationalCode)) return "کد ملی معتبر نیست؛ ۱۰ رقم را دوباره بررسی کنید.";
  if (!formatBirthDate(birth)) return "لطفاً تاریخ تولد (روز، ماه و سال) را کامل انتخاب کنید.";
  return null;
}

export function IdentityFields({
  nationalCode,
  onNationalCodeChange,
  birth,
  onBirthChange,
}: {
  nationalCode: string;
  onNationalCodeChange: (value: string) => void;
  birth: BirthDate;
  onBirthChange: (value: BirthDate) => void;
}) {
  // ماه‌های ۱ تا ۶ سی‌ویک روزه، ۷ تا ۱۱ سی روزه، اسفند حداکثر ۳۰ روز
  const dayCount = Number(birth.month) > 0 && Number(birth.month) <= 6 ? 31 : 30;

  return (
    <>
      <div>
        <label htmlFor="nationalCode" className={ui.label}>
          کد ملی
        </label>
        <input
          id="nationalCode"
          type="tel"
          dir="ltr"
          inputMode="numeric"
          maxLength={10}
          value={nationalCode}
          onChange={(event) =>
            onNationalCodeChange(toEnglishDigits(event.target.value).replace(/\D/g, "").slice(0, 10))
          }
          placeholder="0012345678"
          className={`${ui.input} text-right`}
        />
      </div>

      <div>
        <span className={ui.label}>تاریخ تولد</span>
        <div className="grid grid-cols-[1fr_1.4fr_1.2fr] gap-2">
          <select
            aria-label="روز تولد"
            value={birth.day}
            onChange={(event) => onBirthChange({ ...birth, day: event.target.value })}
            className={`${ui.select} px-2`}
          >
            <option value="">روز</option>
            {Array.from({ length: dayCount }, (_, i) => String(i + 1)).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
          <select
            aria-label="ماه تولد"
            value={birth.month}
            onChange={(event) => {
              const month = event.target.value;
              const maxDay = Number(month) > 0 && Number(month) <= 6 ? 31 : 30;
              onBirthChange({ ...birth, month, day: Number(birth.day) > maxDay ? "" : birth.day });
            }}
            className={`${ui.select} px-2`}
          >
            <option value="">ماه</option>
            {MONTHS.map((name, i) => (
              <option key={name} value={String(i + 1)}>
                {name}
              </option>
            ))}
          </select>
          <select
            aria-label="سال تولد"
            value={birth.year}
            onChange={(event) => onBirthChange({ ...birth, year: event.target.value })}
            className={`${ui.select} px-2`}
          >
            <option value="">سال</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
