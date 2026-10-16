// اطلاعات تماس ماکان بار؛ هم در صفحه‌ها و هم در داده‌های گوگل استفاده می‌شود
export const PHONES = [
  "02155355050",
  "02155355040",
  "02155355030",
  "02155355020",
  "09125573776",
];

// نمایش خوانای شماره: 021 5535 5050 و 0912 557 3776
export function formatPhone(phone: string) {
  if (/^0\d{2}\d{8}$/.test(phone) && !phone.startsWith("09")) {
    return `${phone.slice(0, 3)} ${phone.slice(3, 7)} ${phone.slice(7)}`;
  }
  if (/^09\d{9}$/.test(phone)) {
    return `${phone.slice(0, 4)} ${phone.slice(4, 7)} ${phone.slice(7)}`;
  }
  return phone;
}

export const ADDRESS = "چهارراه ترمینال جنوب به سمت افسریه، جنب خسارت بیمه ایران";
