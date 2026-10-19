// ساخت فایل اپ اندروید (APK برای کافه‌بازار و مایکت) از روی سایت با سرویس PWABuilder.
// اپ یک «Trusted Web Activity» است: همان makanbar.com/app را تمام‌صفحه و بدون نوار مرورگر باز می‌کند،
// پس هر تغییری در سایت خودکار در اپ هم دیده می‌شود.
// اجرا: node scripts/build-android.mjs   (خروجی در پوشه android-release که در گیت نیست)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim()])
);

const { ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD, ANDROID_STORE_PASSWORD } = env;
if (!ANDROID_KEY_PASSWORD || !ANDROID_STORE_PASSWORD) {
  console.error("رمزهای امضای اندروید در .env.local نیست.");
  process.exit(1);
}

const OUT = "android-release";
mkdirSync(OUT, { recursive: true });

// نسخه: هر بار که فایل جدید برای بازار ساخته می‌شود باید یکی بالا برود
const versionCode = Number(process.argv[2] ?? 1);
const keystorePath = `${OUT}/signing.keystore`;
const reuseKey = existsSync(keystorePath);

const options = {
  packageId: "com.makanbar.app",
  name: "ماکان بار",
  launcherName: "ماکان بار",
  appVersion: `1.0.${versionCode - 1}`,
  appVersionCode: versionCode,
  host: "makanbar.com",
  startUrl: "/app/",
  pwaUrl: "https://makanbar.com/app/",
  webManifestUrl: "https://makanbar.com/manifest.webmanifest",
  iconUrl: "https://makanbar.com/app-icons/icon-512.png",
  maskableIconUrl: null,
  monochromeIconUrl: null,
  themeColor: "#07111f",
  themeColorDark: "#07111f",
  backgroundColor: "#07111f",
  navigationColor: "#07111f",
  navigationColorDark: "#07111f",
  navigationDividerColor: "#07111f",
  navigationDividerColorDark: "#07111f",
  display: "standalone",
  orientation: "portrait",
  fallbackType: "customtabs",
  enableNotifications: false,
  enableSiteSettingsShortcut: false,
  isChromeOSOnly: false,
  isMetaQuest: false,
  includeSourceCode: false,
  splashScreenFadeOutDuration: 300,
  shortcuts: [],
  minSdkVersion: 21,
  features: {},
  signingMode: reuseKey ? "mine" : "new",
  signing: {
    file: reuseKey ? `data:application/octet-stream;base64,${readFileSync(keystorePath).toString("base64")}` : null,
    alias: ANDROID_KEY_ALIAS || "makanbar",
    fullName: "Makan Bar",
    organization: "Makan Bar",
    organizationalUnit: "Mobile",
    countryCode: "IR",
    keyPassword: ANDROID_KEY_PASSWORD,
    storePassword: ANDROID_STORE_PASSWORD,
  },
};

console.log(`ساخت نسخه ${options.appVersion} (کد ${versionCode})، ${reuseKey ? "با کلید قبلی" : "با کلید جدید"}...`);

const response = await fetch("https://pwabuilder-cloudapk.azurewebsites.net/generateAppPackage", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(options),
});

if (!response.ok) {
  console.error(`ساخت ناموفق بود (${response.status}):\n${(await response.text()).slice(0, 2000)}`);
  process.exit(1);
}

const zip = Buffer.from(await response.arrayBuffer());
const zipPath = `${OUT}/makanbar-android-v${versionCode}.zip`;
writeFileSync(zipPath, zip);
console.log(`انجام شد: ${zipPath} (${Math.round(zip.length / 1024)} KB)`);
