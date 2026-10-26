<?php
// =====================================================================
// رله‌ی Supabase روی هاست تهران
//   مرورگر کاربران فقط با makanbar.com/sb/... (داخل ایران) حرف می‌زند و این فایل
//   درخواست را بی‌کم‌وکاست به Supabase (خارج از ایران) می‌فرستد و جواب را برمی‌گرداند.
//   دلیل: بعضی اینترنت‌های ایران ارتباط مستقیم گوشی با Supabase را قطع می‌کنند،
//   ولی ارتباط سرور به سرور (دیتاسنتر تهران ← Supabase) پایدار است.
//   این فایل هیچ دسترسی اضافه‌ای نمی‌دهد؛ همان کلید و توکن کاربر را جلو می‌برد.
// =====================================================================

const SUPABASE_URL = 'https://zuyzbxytfguuuojlydfb.supabase.co';
// فقط همین بخش‌های Supabase رد می‌شوند
const ALLOWED_PREFIXES = ['rest/v1/', 'auth/v1/', 'functions/v1/', 'storage/v1/'];
// سربرگ‌هایی که از مرورگر به Supabase فرستاده نمی‌شوند
const SKIP_REQUEST_HEADERS = ['host', 'cookie', 'content-length', 'accept-encoding', 'connection', 'origin', 'referer', 'x-relay-method'];
// فایروال هاست درخواست‌های PATCH و DELETE و PUT را می‌بندد (403)؛ مرورگر آن‌ها را با POST
// و سربرگ X-Relay-Method می‌فرستد و این‌جا به روش اصلی برگردانده می‌شوند (lib/supabase.ts)
const RELAY_METHODS = ['PATCH', 'DELETE', 'PUT'];
// سربرگ‌هایی که از جواب Supabase به مرورگر برنمی‌گردند
const SKIP_RESPONSE_HEADERS = ['transfer-encoding', 'content-encoding', 'content-length', 'connection', 'set-cookie', 'alt-svc', 'strict-transport-security'];

set_time_limit(90);

// مسیر بعد از /sb/ (همراه با query string)
$uri = $_SERVER['REQUEST_URI'] ?? '';
$pos = strpos($uri, '/sb/');
$path = $pos === false ? '' : substr($uri, $pos + 4);

$allowed = false;
foreach (ALLOWED_PREFIXES as $prefix) {
  if (strncmp($path, $prefix, strlen($prefix)) === 0) {
    $allowed = true;
    break;
  }
}
if (!$allowed) {
  http_response_code(404);
  header('Content-Type: application/json');
  echo '{"error":"not found"}';
  exit;
}

// سربرگ‌های درخواست؛ Authorization را بعضی هاست‌ها جدا می‌گذارند
$headers = [];
$incoming = function_exists('getallheaders') ? getallheaders() : [];
if (!$incoming) {
  foreach ($_SERVER as $key => $value) {
    if (strncmp($key, 'HTTP_', 5) === 0) {
      $incoming[str_replace('_', '-', substr($key, 5))] = $value;
    }
  }
}
$hasAuth = false;
foreach ($incoming as $name => $value) {
  $lower = strtolower($name);
  if (in_array($lower, SKIP_REQUEST_HEADERS, true)) continue;
  if ($lower === 'authorization') $hasAuth = true;
  $headers[] = $name . ': ' . $value;
}
if (!$hasAuth) {
  $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
  if ($auth !== '') $headers[] = 'Authorization: ' . $auth;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$relayMethod = strtoupper($_SERVER['HTTP_X_RELAY_METHOD'] ?? '');
if ($method === 'POST' && in_array($relayMethod, RELAY_METHODS, true)) {
  $method = $relayMethod;
}
$body = file_get_contents('php://input');

// ارتباط هاست با Supabase گاهی چند ثانیه بی‌جواب می‌ماند؛ به‌جای ۸۰ ثانیه انتظار، زود قطع
// و دوباره فرستاده می‌شود. درخواستی که به Supabase نرسیده همیشه دوباره فرستاده می‌شود، ولی
// درخواستی که شاید رسیده باشد فقط وقتی تکرارش بی‌خطر است (خواندن، ویرایش، حذف، ورود)؛
// ثبت بار یا پیامک دوباره فرستاده نمی‌شود تا دوتا نشود.
$repeatable = in_array($method, ['GET', 'HEAD', 'PATCH', 'DELETE', 'PUT'], true)
  || strncmp($path, 'auth/v1/token', 13) === 0
  || strncmp($path, 'functions/v1/admin-list-customers', 33) === 0
  || strncmp($path, 'functions/v1/delete-staff-user', 30) === 0;

for ($attempt = 1; $attempt <= 3; $attempt++) {
  $responseHeaders = [];
  $ch = curl_init(SUPABASE_URL . '/' . $path);
  curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_ENCODING => '',
    CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
    CURLOPT_CONNECTTIMEOUT => 6,
    CURLOPT_TIMEOUT => 25,
    CURLOPT_HEADERFUNCTION => function ($curl, $line) use (&$responseHeaders) {
      $parts = explode(':', $line, 2);
      if (count($parts) === 2) {
        $name = trim($parts[0]);
        if (!in_array(strtolower($name), SKIP_RESPONSE_HEADERS, true)) {
          $responseHeaders[] = $name . ': ' . trim($parts[1]);
        }
      }
      return strlen($line);
    },
  ]);
  if ($body !== '' && $method !== 'GET' && $method !== 'HEAD') {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
  }

  $result = curl_exec($ch);
  if ($result !== false) break;

  $sent = curl_getinfo($ch, CURLINFO_PRETRANSFER_TIME) > 0;
  if ($sent && !$repeatable) break;
  if ($attempt < 3) usleep(500000);
}

if ($result === false) {
  http_response_code(502);
  header('Content-Type: application/json');
  echo json_encode(['error' => 'upstream unavailable', 'message' => 'اتصال به سرور برقرار نشد؛ دوباره تلاش کنید.']);
  exit;
}

http_response_code(curl_getinfo($ch, CURLINFO_HTTP_CODE));
foreach ($responseHeaders as $line) {
  header($line, false);
}
header('Cache-Control: no-store');
echo $result;
