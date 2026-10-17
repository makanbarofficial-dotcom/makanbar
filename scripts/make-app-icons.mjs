// ساخت آیکن سه اپلیکیشن (صاحب بار، راننده، متصدی) از لوگوی سایت
// اجرا: node scripts/make-app-icons.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const APPS = [
  { id: "customer", label: "صاحب بار", color: "#f97316" },
  { id: "driver", label: "راننده", color: "#1d4ed8" },
  { id: "employee", label: "متصدی", color: "#059669" },
];

const SIZE = 512;
const logo = await sharp("app/icon.png").resize(400, 400).png().toBuffer();

for (const app of APPS) {
  const band = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
    <rect width="${SIZE}" height="${SIZE}" fill="#ffffff"/>
    <rect y="392" width="${SIZE}" height="120" fill="${app.color}"/>
    <text x="256" y="474" text-anchor="middle" font-family="Tahoma, Segoe UI, Arial" font-weight="bold"
      font-size="70" fill="#ffffff" direction="rtl">${app.label}</text>
  </svg>`);

  const icon = await sharp(band)
    .composite([{ input: logo, top: -8, left: 56 }])
    .png()
    .toBuffer();

  mkdirSync(`public/apps/${app.id}`, { recursive: true });
  for (const size of [512, 192, 180]) {
    await sharp(icon).resize(size, size).png().toFile(`public/apps/${app.id}/icon-${size}.png`);
  }
}
console.log("ok");
