// ساخت آیکن سه اپلیکیشن (صاحب بار، راننده، متصدی) از لوگوی سایت
// اجرا: node scripts/make-app-icons.mjs
import sharp from "sharp";
import { copyFileSync, mkdirSync } from "node:fs";
const APPS = [
  { id: "customer", label: "صاحب بار", c1: "#fb923c", c2: "#ea580c", c3: "#9a3412" },
  { id: "driver", label: "راننده", c1: "#60a5fa", c2: "#2563eb", c3: "#1e3a8a" },
  { id: "employee", label: "متصدی", c1: "#34d399", c2: "#059669", c3: "#064e3b" },
];
const S = 512;
const trimmed = await sharp("public/logo.png").trim().toBuffer({ resolveWithObject: true });
const truck = await sharp(trimmed.data).extract({ left: 0, top: 0, width: trimmed.info.width, height: 545 }).toBuffer();

async function makeIcon(app) {
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${app.c1}"/><stop offset=".55" stop-color="${app.c2}"/><stop offset="1" stop-color="${app.c3}"/>
    </linearGradient>
    <radialGradient id="glow" cx=".22" cy=".12" r=".7">
      <stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef3fa"/>
    </linearGradient>
    <filter id="blur" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="tblur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#g)"/>
  <circle cx="470" cy="470" r="190" fill="#fff" opacity=".07"/>
  <circle cx="470" cy="470" r="120" fill="#fff" opacity=".06"/>
  <circle cx="40" cy="60" r="110" fill="#fff" opacity=".05"/>
  <rect width="${S}" height="${S}" fill="url(#glow)"/>
  <rect x="78" y="86" width="356" height="236" rx="58" fill="#000" opacity=".28" filter="url(#blur)"/>
  <rect x="72" y="66" width="368" height="244" rx="58" fill="url(#card)"/>
  <rect x="120" y="262" width="272" height="6" rx="3" fill="#cbd5e1"/>
  <rect x="150" y="262" width="34" height="6" fill="#fff"/><rect x="236" y="262" width="34" height="6" fill="#fff"/><rect x="322" y="262" width="34" height="6" fill="#fff"/>
  <text x="256" y="428" text-anchor="middle" font-family="Tahoma" font-weight="bold" font-size="80" fill="#000" opacity=".25" filter="url(#tblur)">${app.label}</text>
  <text x="256" y="422" text-anchor="middle" font-family="Tahoma" font-weight="bold" font-size="80" fill="#ffffff">${app.label}</text>
  <text x="256" y="472" text-anchor="middle" font-family="Tahoma" font-weight="bold" font-size="30" fill="#ffffff" opacity=".8">ماکان بار</text>
  </svg>`);
  const t = await sharp(truck).resize({ width: 300 }).toBuffer();
  return sharp(bg).composite([{ input: t, left: 100, top: 92 }]).png().toBuffer();
}

for (const app of APPS) {
  const icon = await makeIcon(app);
  mkdirSync(`public/apps/${app.id}`, { recursive: true });
  for (const size of [512, 192, 180]) {
    await sharp(icon).resize(size, size).png().toFile(`public/apps/${app.id}/icon-${size}.png`);
  }
  copyFileSync(`public/apps/${app.id}/icon-180.png`, `app/${app.id}/apple-icon.png`);
}
console.log("ok");
