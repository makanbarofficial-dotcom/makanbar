// ساخت آیکن اپلیکیشن ماکان بار: کامیون لوگو روی زمینه نارنجی و جاده سرمه‌ای
// اجرا: node scripts/make-app-icons.mjs
import sharp from "sharp";

const S = 512;
const WIDTH = 488;
const ROAD_Y = 372;

const trimmed = await sharp("public/logo.png").trim().toBuffer({ resolveWithObject: true });
const truck = await sharp(trimmed.data)
  .extract({ left: 0, top: 0, width: trimmed.info.width, height: 545 })
  .toBuffer();

// خطوط سرعت نارنجی لوگو روی زمینه نارنجی دیده نمی‌شوند؛ سفید می‌شوند
const { data, info } = await sharp(truck)
  .resize({ width: WIDTH })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
for (let i = 0; i < data.length; i += 4) {
  const t = Math.max(0, Math.min(1, (data[i] - data[i + 2] - 40) / 140));
  for (let k = 0; k < 3; k++) data[i + k] = Math.round(data[i + k] * (1 - t) + 255 * t);
}
const mark = await sharp(data, { raw: info }).png().toBuffer();

// سایه نرم زیر کامیون
const shadowRaw = Buffer.from(data);
for (let i = 0; i < shadowRaw.length; i += 4) {
  shadowRaw[i] = shadowRaw[i + 1] = shadowRaw[i + 2] = 0;
  shadowRaw[i + 3] *= 0.4;
}
const shadow = await sharp(shadowRaw, { raw: info })
  .extend({ top: 12, bottom: 12, left: 12, right: 12, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .blur(10)
  .png()
  .toBuffer();

const dashes = [40, 150, 260, 370]
  .map((x) => `<rect x="${x}" y="430" width="60" height="12" rx="6" fill="#fb923c"/>`)
  .join("");
const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <defs>
    <linearGradient id="o" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fb923c"/><stop offset=".5" stop-color="#f97316"/><stop offset="1" stop-color="#c2410c"/>
    </linearGradient>
    <radialGradient id="gl" cx=".3" cy=".2" r=".7">
      <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#o)"/>
  <rect width="${S}" height="${S}" fill="url(#gl)"/>
  <rect x="0" y="${ROAD_Y}" width="${S}" height="${S - ROAD_Y}" fill="#0c1a2d"/>
  ${dashes}
</svg>`);

const left = Math.round((S - info.width) / 2);
const top = ROAD_Y - info.height + 6;
const icon = await sharp(bg)
  .composite([
    { input: shadow, left: left - 12, top: top - 4 },
    { input: mark, left, top },
  ])
  .png()
  .toBuffer();

for (const size of [512, 192]) {
  await sharp(icon).resize(size, size).png().toFile(`public/app-icons/icon-${size}.png`);
}
await sharp(icon).resize(180, 180).png().toFile("app/apple-icon.png");
console.log("ok");
