// ساخت آیکن اپلیکیشن ماکان بار: همان لوگوی سایت (کامیون و نوشته) روی زمینه سفید
// اجرا: node scripts/make-app-icons.mjs
import sharp from "sharp";

const S = 512;
const WIDTH = 440;

const logo = await sharp("public/logo.png").trim().resize({ width: WIDTH }).toBuffer({ resolveWithObject: true });

const icon = await sharp({
  create: { width: S, height: S, channels: 4, background: "#ffffff" },
})
  .composite([
    {
      input: logo.data,
      left: Math.round((S - logo.info.width) / 2),
      top: Math.round((S - logo.info.height) / 2),
    },
  ])
  .flatten({ background: "#ffffff" })
  .png()
  .toBuffer();

for (const size of [512, 192]) {
  await sharp(icon).resize(size, size).png().toFile(`public/app-icons/icon-${size}.png`);
}
await sharp(icon).resize(180, 180).png().toFile("app/apple-icon.png");
console.log("ok");
