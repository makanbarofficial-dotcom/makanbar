// بارگذاری نسخه ساخته‌شده (out/) روی هاست ایرانی از طریق FTP امن.
// اجرا: npm run deploy:host   (اطلاعات ورود از .env.local خوانده می‌شود)
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { spawnSync } from "node:child_process";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z_]+=/.test(line))
    .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1).trim()])
);

const { HOST_IP, HOST_USER, HOST_PASSWORD } = env;
if (!HOST_IP || !HOST_USER || !HOST_PASSWORD) {
  console.error("HOST_IP / HOST_USER / HOST_PASSWORD در .env.local تنظیم نشده است.");
  process.exit(1);
}

const OUT = "out";
const REMOTE = `ftp://${HOST_IP}/public_html`;
const auth = ["--ssl-reqd", "-k", "--user", `${HOST_USER}:${HOST_PASSWORD}`, "-s", "-S", "--retry", "2"];

function curl(args, cwd) {
  const result = spawnSync("curl", [...auth, ...args], { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`curl failed (${result.status}): ${result.stderr.trim()}`);
  }
  return result.stdout;
}

// تنظیمات PHP که cPanel در .htaccess هاست نوشته حفظ می‌شود
const remoteHtaccess = (() => {
  try {
    return curl([`${REMOTE}/.htaccess`]);
  } catch {
    return "";
  }
})();
const cpanelBlock =
  remoteHtaccess.match(/# BEGIN cPanel-generated[\s\S]*?# END cPanel-generated[^\n]*\n?/)?.[0] ?? "";
if (cpanelBlock) {
  const ours = readFileSync(join(OUT, ".htaccess"), "utf8");
  if (!ours.includes("# BEGIN cPanel-generated")) {
    writeFileSync(join(OUT, ".htaccess"), `${ours.trimEnd()}\n\n${cpanelBlock}`);
  }
}

// فایل‌ها پوشه‌به‌پوشه و با یک اتصال برای هر پوشه بارگذاری می‌شوند
function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

const byDir = new Map();
for (const file of walk(OUT)) {
  const rel = relative(OUT, file).split(sep);
  const dir = rel.slice(0, -1).join("/");
  if (!byDir.has(dir)) byDir.set(dir, []);
  byDir.get(dir).push(rel[rel.length - 1]);
}

let count = 0;
for (const [dir, names] of byDir) {
  const target = dir ? `${REMOTE}/${dir}/` : `${REMOTE}/`;
  curl(["--ftp-create-dirs", "-T", `{${names.join(",")}}`, target], join(OUT, ...dir.split("/").filter(Boolean)));
  count += names.length;
  process.stdout.write(`\r${count} فایل بارگذاری شد`);
}

console.log(`\nانجام شد: ${count} فایل در ${byDir.size} پوشه روی ${HOST_IP}`);
