"use client";
import { useState } from "react";
import { createSupabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Alert, AuthShell, ui } from "@/components/ui";
import {
  EMPTY_BIRTH_DATE,
  IdentityFields,
  formatBirthDate,
  identityError,
} from "@/components/identity-fields";

const supabase = createSupabase();

function toEnglishDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

function normalizePhone(value: string) {
  let phone = toEnglishDigits(value).replace(/[\s\-()]/g, "");

  if (phone.startsWith("0098")) {
    phone = "+98" + phone.substring(4);
  } else if (phone.startsWith("09")) {
    phone = "+98" + phone.substring(1);
  } else if (phone.startsWith("9")) {
    phone = "+98" + phone;
  }

  return phone;
}

const vehicleOptions: Record<string, string[]> = {
  "تریلی": [
    "چادری",
    "کمپرسی",
    "بغلدار",
    "کفی",
    "تیغه",
    "تانکر (مخزن‌دار)",
    "یخچالی",
  ],
  "جفت": ["روباز", "مسقف", "کمپرسی", "یخچالی"],
  "تک": ["روباز", "مسقف", "کمپرسی", "یخچالی"],
  "خاور و کامیونت": ["روباز", "مسقف", "کمپرسی", "یخچالی"],
  "وانت و نیسان": ["وانت", "نیسان"],
  "پیک موتوری": ["موتور با باکس", "موتور بدون باکس"],
};

const MOTOR = "پیک موتوری";

// خودروهای سنگین باید شماره هوشمند ناوگان داشته باشند (driver-send-otp هم همین فهرست را دارد)
const FLEET_CARD_TYPES = ["تریلی", "جفت", "تک", "خاور و کامیونت"];

const plateLetters = [
  "الف", "ب", "پ", "ت", "ث", "ج", "چ", "ح", "خ", "د", "ذ", "ر",
  "ز", "ژ", "س", "ش", "ص", "ض", "ط", "ظ", "ع", "غ", "ف", "ق",
  "ک", "گ", "ل", "م", "ن", "و", "ه", "ی",
];

const inputStyle = `mt-2 ${ui.input}`;

// وقتی تابع با کد خطا جواب می‌دهد، پیام فارسی داخل بدنه‌ی پاسخ است
async function readFunctionMessage(error: unknown): Promise<string | null> {
  try {
    const response = (error as { context?: Response }).context;
    const body = await response?.json();
    return body?.message || body?.error || null;
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  if (error && typeof error === "object") {
    const item = error as {
      message?: string;
      context?: { status?: number; statusText?: string };
    };

    if (item.message) {
      const status = item.context?.status;
      return status
        ? `${item.message} (HTTP ${status})`
        : item.message;
    }
  }

  return "خطای ناشناخته رخ داد.";
}

export default function DriverRegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [nationalCode, setNationalCode] = useState("");
  const [birth, setBirth] = useState(EMPTY_BIRTH_DATE);

  const [vehicleType, setVehicleType] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");

  const [plateFirst, setPlateFirst] = useState("");
  const [plateLetter, setPlateLetter] = useState("");
  const [plateMiddle, setPlateMiddle] = useState("");
  const [plateIran, setPlateIran] = useState("");

  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // پلاک موتور: ۳ رقم بالا (کد شهر) و ۵ رقم پایین، بدون حرف
  const [motorCode, setMotorCode] = useState("");
  const [motorNumber, setMotorNumber] = useState("");
  const isMotor = vehicleType === MOTOR;
  const [fleetNumber, setFleetNumber] = useState("");
  const needsFleetNumber = FLEET_CARD_TYPES.includes(vehicleType);

  const vehiclePlate = isMotor
    ? `${motorCode}-${motorNumber}`
    : `${toEnglishDigits(plateFirst)}${plateLetter}` +
      `${toEnglishDigits(plateMiddle)} ایران ${toEnglishDigits(plateIran)}`;

  async function sendOtp() {
    setError("");
    setMessage("");

    if (
      !name.trim() ||
      !phone.trim() ||
      !password ||
      !vehicleType ||
      !vehicleModel ||
      (isMotor
        ? !motorCode || !motorNumber
        : !plateFirst || !plateLetter || !plateMiddle || !plateIran)
    ) {
      setError("لطفاً تمام فیلدها را کامل کنید.");
      return;
    }

    if (password.length < 6) {
      setError("رمز عبور باید حداقل ۶ کاراکتر باشد.");
      return;
    }

    const identityProblem = identityError(nationalCode, birth);
    if (identityProblem) {
      setError(identityProblem);
      return;
    }

    if (needsFleetNumber && !/^\d{5,10}$/.test(fleetNumber)) {
      setError("شماره هوشمند ناوگان را درست وارد کنید (فقط رقم).");
      return;
    }

    if (
      isMotor
        ? !/^\d{3}$/.test(motorCode) || !/^\d{5}$/.test(motorNumber)
        : !/^\d{2}$/.test(toEnglishDigits(plateFirst)) ||
          !/^\d{3}$/.test(toEnglishDigits(plateMiddle)) ||
          !/^\d{2}$/.test(toEnglishDigits(plateIran))
    ) {
      setError("شماره پلاک را به‌درستی وارد کنید.");
      return;
    }

    const normalized = normalizePhone(phone);

    if (!/^\+989\d{9}$/.test(normalized)) {
      setError("شماره موبایل معتبر نیست.");
      return;
    }

    setLoading(true);

    try {
      const result = await supabase.functions.invoke(
        "driver-send-otp",
        {
          body: {
            fullName: name.trim(),
            phone: normalized,
            nationalCode,
            birthDate: formatBirthDate(birth),
            password,
            vehicleType,
            vehicleModel,
            vehiclePlate,
            fleetNumber: needsFleetNumber ? fleetNumber : "",
          },
        }
      );

      if (result.error) {
        console.error("driver-send-otp error:", result.error);
        setError((await readFunctionMessage(result.error)) || "خطای ارسال کد: " + getErrorMessage(result.error));
        return;
      }

      if (!result.data?.success) {
        setError(
          result.data?.message ||
            "ارسال کد تأیید ناموفق بود."
        );
        return;
      }

      setOtpStep(true);
      setMessage("کد تأیید برای شما ارسال شد.");
    } catch (e) {
      console.error("driver-send-otp error:", e);
      setError("خطای ارسال کد: " + getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError("");
    setMessage("");

    const code = toEnglishDigits(otp).trim();

    if (!/^\d{6}$/.test(code)) {
      setError("کد تأیید باید ۶ رقم باشد.");
      return;
    }

    setLoading(true);

    try {
      const result = await supabase.functions.invoke(
        "driver-verify-otp",
        {
          body: {
            phone: normalizePhone(phone),
            otp: code,
          },
        }
      );

      if (result.error) {
        console.error("driver-verify-otp error:", result.error);
        setError((await readFunctionMessage(result.error)) || "خطای تأیید کد: " + getErrorMessage(result.error));
        return;
      }

      if (!result.data?.success) {
        setError(
          result.data?.message || "کد تأیید صحیح نیست."
        );
        return;
      }

      setMessage(
        "ثبت‌نام انجام شد؛ در حال انتقال به صفحه ورود..."
      );

      // بعد از ثبت‌نام، ورود از صفحه مستقل راننده انجام می‌شود.
      window.setTimeout(() => {
        router.replace("/driver/login");
      }, 1000);
    } catch (e) {
      console.error("driver-verify-otp error:", e);
      setError("خطای تأیید کد: " + getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      badge="پنل رانندگان"
      title={otpStep ? "تأیید شماره موبایل" : "ثبت‌نام راننده"}
      subtitle={otpStep ? "کد پیامکی را وارد کنید." : "اطلاعات خود و خودرو را وارد کنید."}
      footer={
        !otpStep && (
          <p>
            قبلاً ثبت‌نام کرده‌اید؟{" "}
            <Link href="/driver/login" className={ui.link}>
              ورود
            </Link>
          </p>
        )
      }
    >
        <section className="space-y-5">
          {!otpStep ? (
            <>
              <label className="block text-sm text-fg/70">
                نام و نام خانوادگی
                <input
                  className={inputStyle}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="نام کامل"
                  autoComplete="name"
                  required
                />
              </label>

              <label className="block text-sm text-fg/70">
                شماره موبایل
                <input
                  className={inputStyle}
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                  autoComplete="tel"
                  required
                />
              </label>

              <IdentityFields
                nationalCode={nationalCode}
                onNationalCodeChange={setNationalCode}
                birth={birth}
                onBirthChange={setBirth}
              />

              <label className="block text-sm text-fg/70">
                رمز عبور
                <input
                  className={inputStyle}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="حداقل ۶ کاراکتر"
                  autoComplete="new-password"
                  required
                />
              </label>

              <label className="block text-sm text-fg/70">
                نوع خودرو
                <select
                  className={inputStyle}
                  value={vehicleType}
                  onChange={(e) => {
                    setVehicleType(e.target.value);
                    setVehicleModel("");
                  }}
                  required
                >
                  <option value="">نوع خودرو را انتخاب کنید</option>
                  {Object.keys(vehicleOptions).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm text-fg/70">
                مدل / نوع بارگیر
                <select
                  className={inputStyle}
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  disabled={!vehicleType}
                  required
                >
                  <option value="">نوع بارگیر را انتخاب کنید</option>
                  {(vehicleOptions[vehicleType] || []).map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </label>

              {needsFleetNumber && (
                <label className="block text-sm text-fg/70">
                  شماره هوشمند ناوگان
                  <input
                    className={`${inputStyle} text-right`}
                    dir="ltr"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={fleetNumber}
                    onChange={(e) =>
                      setFleetNumber(toEnglishDigits(e.target.value).replace(/\D/g, "").slice(0, 10))
                    }
                    placeholder="شماره روی کارت هوشمند"
                    required
                  />
                </label>
              )}

              {isMotor ? (
                <div className="text-sm text-fg/70">
                  <p>شماره پلاک موتور</p>

                  <div className="mx-auto mt-2 w-48 overflow-hidden rounded-xl border-2 border-fg/30 bg-white text-black">
                    <input
                      className="w-full border-b border-gray-300 p-2 text-center text-lg tracking-widest"
                      value={motorCode}
                      onChange={(e) =>
                        setMotorCode(toEnglishDigits(e.target.value).replace(/\D/g, "").slice(0, 3))
                      }
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="۱۲۳"
                      aria-label="سه رقم بالای پلاک موتور"
                      required
                    />
                    <input
                      className="w-full p-2 text-center text-lg tracking-widest"
                      value={motorNumber}
                      onChange={(e) =>
                        setMotorNumber(toEnglishDigits(e.target.value).replace(/\D/g, "").slice(0, 5))
                      }
                      inputMode="numeric"
                      maxLength={5}
                      placeholder="۴۵۶۷۸"
                      aria-label="پنج رقم پایین پلاک موتور"
                      required
                    />
                  </div>

                  <p className="mt-2 text-center text-xs text-fg/60">
                    بالا: ۳ رقم · پایین: ۵ رقم
                  </p>
                </div>
              ) : (
              <div className="text-sm text-fg/70">
                <p>شماره پلاک خودرو</p>

                <div
                  dir="ltr"
                  className="mt-2 grid grid-cols-[1fr_1fr_1.2fr_0.8fr] gap-2 rounded-xl border-2 border-fg/30 bg-white p-3"
                >
                  <input
                    className="min-w-0 rounded-lg border border-gray-300 p-2 text-center text-lg text-black"
                    value={plateFirst}
                    onChange={(e) =>
                      setPlateFirst(
                        toEnglishDigits(e.target.value)
                          .replace(/\D/g, "")
                          .slice(0, 2)
                      )
                    }
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="۱۲"
                    aria-label="دو رقم اول پلاک"
                    required
                  />

                  <select
                    className="min-w-0 rounded-lg border border-gray-300 bg-white p-2 text-center text-black"
                    value={plateLetter}
                    onChange={(e) => setPlateLetter(e.target.value)}
                    aria-label="حرف پلاک"
                    required
                  >
                    <option value="">حرف</option>
                    {plateLetters.map((letter) => (
                      <option key={letter} value={letter}>
                        {letter}
                      </option>
                    ))}
                  </select>

                  <input
                    className="min-w-0 rounded-lg border border-gray-300 p-2 text-center text-lg text-black"
                    value={plateMiddle}
                    onChange={(e) =>
                      setPlateMiddle(
                        toEnglishDigits(e.target.value)
                          .replace(/\D/g, "")
                          .slice(0, 3)
                      )
                    }
                    inputMode="numeric"
                    maxLength={3}
                    placeholder="۳۴۵"
                    aria-label="سه رقم بعدی پلاک"
                    required
                  />

                  <div className="flex min-w-0 flex-col items-center justify-center rounded-lg border border-gray-300 text-black">
                    <span className="text-xs">ایران</span>
                    <input
                      className="w-full min-w-0 bg-transparent p-1 text-center text-black"
                      value={plateIran}
                      onChange={(e) =>
                        setPlateIran(
                          toEnglishDigits(e.target.value)
                            .replace(/\D/g, "")
                            .slice(0, 2)
                        )
                      }
                      inputMode="numeric"
                      maxLength={2}
                      placeholder="۶۷"
                      aria-label="کد ایران"
                      required
                    />
                  </div>
                </div>

                <p className="mt-2 text-xs text-fg/60">
                  اعداد را وارد کنید و حرف پلاک را انتخاب کنید.
                </p>
              </div>
              )}

              <button
                type="button"
                onClick={sendOtp}
                disabled={loading}
                className={ui.btnPrimary}
              >
                {loading ? "در حال ارسال..." : "ارسال کد تأیید"}
              </button>

            </>
          ) : (
            <>
              <p className="text-center text-fg/70">
                کد ۶ رقمی ارسال‌شده به شماره زیر را وارد کنید:
              </p>

              <p dir="ltr" className="text-center text-orange-700">
                {normalizePhone(phone)}
              </p>

              <input
                className={inputStyle}
                type="tel"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(
                    toEnglishDigits(e.target.value)
                      .replace(/\D/g, "")
                      .slice(0, 6)
                  )
                }
                placeholder="کد ۶ رقمی"
              />

              <button
                type="button"
                onClick={verifyOtp}
                disabled={loading}
                className={ui.btnPrimary}
              >
                {loading ? "در حال بررسی..." : "تأیید کد"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setOtpStep(false);
                  setOtp("");
                  setError("");
                  setMessage("");
                }}
                disabled={loading}
                className={ui.btnSecondary}
              >
                بازگشت و اصلاح اطلاعات
              </button>
            </>
          )}

          {message && (
            <Alert tone="success">{message}</Alert>
          )}

          {error && (
            <Alert tone="error">{error}</Alert>
          )}
        </section>
    </AuthShell>
  );
}