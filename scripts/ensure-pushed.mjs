// پیش از بارگذاری روی هاست: همه تغییرات باید در گیت ثبت و روی گیت‌هاب فرستاده شده باشند
// تا نسخه روی هاست همیشه همان نسخه گیت‌هاب باشد.
import { spawnSync } from "node:child_process";

function git(...args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`git ${args.join(" ")} انجام نشد:\n${result.stderr.trim()}`);
    process.exit(1);
  }
  return result.stdout.trim();
}

const changes = git("status", "--porcelain");
if (changes) {
  console.error(
    `تغییرات ثبت‌نشده وجود دارد؛ اول آن‌ها را در گیت ثبت (commit) کنید، بعد دوباره اجرا کنید:\n${changes}`
  );
  process.exit(1);
}

const branch = git("rev-parse", "--abbrev-ref", "HEAD");
if (branch !== "main") {
  console.error(`فقط شاخه main روی هاست می‌رود؛ شاخه فعلی: ${branch}`);
  process.exit(1);
}

git("fetch", "-q", "origin", "main");
const [behind, ahead] = git("rev-list", "--left-right", "--count", "origin/main...HEAD")
  .split(/\s+/)
  .map(Number);

if (behind > 0) {
  console.error("گیت‌هاب تغییراتی دارد که اینجا نیست؛ اول git pull کنید.");
  process.exit(1);
}

if (ahead > 0) {
  console.log(`فرستادن ${ahead} تغییر به گیت‌هاب...`);
  git("push", "-q", "origin", "main");
}

console.log(`گیت‌هاب به‌روز است (${git("rev-parse", "--short", "HEAD")})؛ ادامه بارگذاری روی هاست.`);
