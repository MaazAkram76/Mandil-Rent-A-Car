<?php
/**
 * Mandil Rent A Car - lead capture endpoint.
 *
 * The website's forms POST JSON here. This file creates the contact in
 * GoHighLevel and attaches the trip details as a note.
 *
 * The API token is NOT in this file. It lives in config.php, which sits
 * next to this one on the server and is never committed to git.
 * PHP source is executed, never sent to the browser, so neither file's
 * contents can be read by a visitor.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function reply($ok, $msg, $status = 200) {
    http_response_code($status);
    echo json_encode(['ok' => $ok, 'message' => $msg]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    reply(false, 'Method not allowed.', 405);
}

$configPath = __DIR__ . '/config.php';
if (!is_file($configPath)) {
    error_log('Mandil lead.php: config.php is missing');
    reply(false, 'Booking is temporarily unavailable. Please call or WhatsApp us.', 500);
}
$cfg = require $configPath;

if (empty($cfg['token']) || empty($cfg['location_id'])
    || strpos($cfg['token'], 'PASTE_') === 0 || strpos($cfg['location_id'], 'PASTE_') === 0) {
    error_log('Mandil lead.php: config.php still has placeholder values');
    reply(false, 'Booking is temporarily unavailable. Please call or WhatsApp us.', 500);
}

/* ---------- Read the request ---------- */
$raw = file_get_contents('php://input');
if (strlen($raw) > 8000) reply(false, 'Request too large.', 413);
$in = json_decode($raw, true);
if (!is_array($in)) reply(false, 'Malformed request.', 400);

/* ---------- Spam filters ---------- */

// Honeypot: a field hidden from humans. Bots fill it in.
// Answer 200/ok so the bot believes it succeeded and does not retry.
if (!empty($in['company'])) reply(true, 'Thank you.');

// Submitted impossibly fast? Almost certainly automated.
$elapsed = isset($in['elapsed']) ? (int) $in['elapsed'] : 9999;
if ($elapsed < 2000) reply(true, 'Thank you.');

// Simple per-IP rate limit: 5 submissions per 10 minutes.
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$bucket = sys_get_temp_dir() . '/mandil_rl_' . sha1($ip);
$now = time();
$hits = is_file($bucket) ? array_filter((array) json_decode(file_get_contents($bucket), true),
                                        function ($t) use ($now) { return $t > $now - 600; })
                         : [];
if (count($hits) >= 5) reply(false, 'Too many requests. Please try again shortly, or WhatsApp us.', 429);
$hits[] = $now;
@file_put_contents($bucket, json_encode(array_values($hits)), LOCK_EX);

/* ---------- Validate ---------- */
function clean($v, $max) {
    if (!is_scalar($v)) return '';
    $s = (string) $v;
    // Drop control characters. The /u pass returns null on invalid UTF-8,
    // so fall back to a byte-wise strip in that case.
    $stripped = preg_replace('/[\x00-\x1F\x7F]/u', '', $s);
    if ($stripped === null) $stripped = preg_replace('/[\x00-\x1F\x7F]/', '', $s);
    $stripped = trim((string) $stripped);
    return function_exists('mb_substr')
        ? mb_substr($stripped, 0, $max, 'UTF-8')
        : substr($stripped, 0, $max);
}

function len($s) {
    return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s);
}

$name  = clean($in['name']  ?? '', 80);
$phone = clean($in['phone'] ?? '', 30);
$email = clean($in['email'] ?? '', 120);
$type  = clean($in['type']  ?? 'Enquiry', 40);

$isNewsletter = !empty($in['newsletter']);

if ($isNewsletter) {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) reply(false, 'Please enter a valid email address.', 400);
} else {
    if (len($name) < 2) reply(false, 'Please enter your name.', 400);
    if (preg_match_all('/\d/', $phone) < 9) reply(false, 'Please enter a valid phone number.', 400);
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        reply(false, 'That email address does not look right.', 400);
    }
}

// Normalise Pakistani numbers to E.164 so GHL can dial and WhatsApp them.
function e164($raw) {
    $d = preg_replace('/\D/', '', $raw);
    if ($d === '') return '';
    if (strpos($d, '00') === 0) $d = substr($d, 2);
    if (strpos($d, '92') === 0)  return '+' . $d;
    if (strpos($d, '0') === 0)   return '+92' . substr($d, 1);
    if (strlen($d) === 10 && $d[0] === '3') return '+92' . $d;
    return '+' . $d;
}
$phoneE164 = $phone !== '' ? e164($phone) : '';

$parts = preg_split('/\s+/', $name, 2);
$first = $parts[0] ?? '';
$last  = $parts[1] ?? '';

/* ---------- Call GoHighLevel ---------- */
function ghl($cfg, $method, $path, $payload = null) {
    $ch = curl_init('https://services.leadconnectorhq.com' . $path);
    $opts = [
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 15,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $cfg['token'],
            'Version: 2021-07-28',
            'Content-Type: application/json',
            'Accept: application/json',
        ],
    ];
    if ($payload !== null) $opts[CURLOPT_POSTFIELDS] = json_encode($payload);
    curl_setopt_array($ch, $opts);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    return [$code, json_decode($body, true), $err, $body];
}

$contact = [
    'locationId' => $cfg['location_id'],
    'firstName'  => $first,
    'lastName'   => $last,
    'source'     => 'rentacar.mandilpk.com',
    'tags'       => $isNewsletter ? ['website', 'newsletter'] : ['website', 'booking-enquiry'],
];
if ($phoneE164 !== '') $contact['phone'] = $phoneE164;
if ($email !== '')     $contact['email'] = $email;

list($code, $res, $err, $rawBody) = ghl($cfg, 'POST', '/contacts/', $contact);

// A duplicate contact is a success from the customer's point of view.
$duplicateId = $res['meta']['contactId'] ?? null;
$contactId   = $res['contact']['id'] ?? $duplicateId;

if ($err) {
    error_log('Mandil lead.php: curl error - ' . $err);
    reply(false, 'We could not send that just now. Please WhatsApp us on +92 313 5251392.', 502);
}
if (($code < 200 || $code >= 300) && !$duplicateId) {
    error_log('Mandil lead.php: GHL returned ' . $code . ' - ' . substr((string) $rawBody, 0, 500));
    reply(false, 'We could not send that just now. Please WhatsApp us on +92 313 5251392.', 502);
}

/* ---------- Attach the trip details as a note ---------- */
if ($contactId && !$isNewsletter) {
    $lines = ["Website enquiry - " . $type];
    foreach ([
        'Pickup'      => $in['pickup']  ?? '',
        'Drop-off'    => $in['dropoff'] ?? '',
        'Date & time' => $in['datetime'] ?? '',
        'Message'     => $in['message'] ?? '',
    ] as $label => $value) {
        $value = clean($value, 500);
        if ($value !== '') $lines[] = $label . ': ' . $value;
    }
    $lines[] = 'Submitted: ' . date('Y-m-d H:i') . ' PKT';

    ghl($cfg, 'POST', '/contacts/' . rawurlencode($contactId) . '/notes', [
        'body' => implode("\n", $lines),
    ]);
}

reply(true, $isNewsletter
    ? 'You are on the list. Thank you.'
    : 'Thank you. We will confirm your quote shortly.');
