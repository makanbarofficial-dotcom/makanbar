// ساخت آیکن اپلیکیشن ماکان بار از لوگوی سایت
// اجرا: node scripts/make-app-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const S = 512;
const logo = await sharp("public/logo.png").trim().toBuffer();

const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fb923c"/><stop offset=".55" stop-color="#ea580c"/><stop offset="1" stop-color="#9a3412"/>
    </linearGradient>
    <radialGradient id="glow" cx=".22" cy=".12" r=".7">
      <stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef3fa"/>
    </linearGradient>
    <filter id="blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="16"/></filter>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#g)"/>
  <circle cx="470" cy="470" r="190" fill="#fff" opacity=".07"/>
  <circle cx="470" cy="470" r="120" fill="#fff" opacity=".06"/>
  <circle cx="40" cy="60" r="110" fill="#fff" opacity=".05"/>
  <rect width="${S}" height="${S}" fill="url(#glow)"/>
  <rect x="48" y="104" width="416" height="340" rx="64" fill="#000" opacity=".28" filter="url(#blur)"/>
  <rect x="40" y="80" width="432" height="352" rx="64" fill="url(#card)"/>
</svg>`);

const mark = await sharp(logo).resize({ width: 372 }).toBuffer({ resolveWithObject: true });
const icon = await sharp(bg)
  .composite([{ input: mark.data, left: 70, top: Math.round(80 + (352 - mark.info.height) / 2) }])
  .png()
  .toBuffer();

mkdirSync("public/app-icons", { recursive: true });
for (const size of [512, 192]) {
  await sharp(icon).resize(size, size).png().toFile(`public/app-icons/icon-${size}.png`);
}
await sharp(icon).resize(180, 180).png().toFile("app/apple-icon.png");
console.log("ok");
