<?php
// Contact form endpoint: emails each message to the site owner through Gmail SMTP.
// The mail password is never in this repo. The deploy workflow writes App_Data/contact-config.php
// from a GitHub secret; locally, set the MAIL_PASSWORD environment variable instead.

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const MAIL_TO = 'gmcloud45@gmail.com';
const MAIL_USERNAME = 'info.mymailnoreply@gmail.com';
const MAIL_FROM_NAME = 'Admin Mail';
const SMTP_HOST = 'smtp.gmail.com';
const SMTP_PORT = 587;
const SUBJECT_PREFIX = '[Portfolio Website] ';
const MAX_PER_HOUR = 5;

function reply(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body);
    exit;
}

// Single-line text: no control characters, so nothing a visitor types can become a mail header.
function clean(string $value): string
{
    return trim(preg_replace('/[\x00-\x1F\x7F]+/', ' ', $value) ?? '');
}

function encodeSubject(string $subject): string
{
    return function_exists('mb_encode_mimeheader')
        ? mb_encode_mimeheader($subject, 'UTF-8', 'B', "\r\n", 9)
        : '=?UTF-8?B?' . base64_encode($subject) . '?=';
}

// Allows a few messages per visitor per hour. If the temp folder can't be used, the form still works.
function overLimit(string $ip): bool
{
    $file = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'portfolio_contact_' . sha1($ip);
    $recent = [];
    if (is_file($file)) {
        $saved = json_decode((string) @file_get_contents($file), true);
        $recent = array_filter(is_array($saved) ? $saved : [], fn ($time) => $time > time() - 3600);
    }
    if (count($recent) >= MAX_PER_HOUR) {
        return true;
    }
    $recent[] = time();
    @file_put_contents($file, json_encode(array_values($recent)), LOCK_EX);
    return false;
}

function smtpSend(string $password, string $message): void
{
    $context = stream_context_create(['ssl' => ['peer_name' => SMTP_HOST, 'verify_peer' => true, 'verify_peer_name' => true]]);
    $socket = @stream_socket_client('tcp://' . SMTP_HOST . ':' . SMTP_PORT, $errorCode, $errorText, 15, STREAM_CLIENT_CONNECT, $context);
    if (!$socket) {
        throw new RuntimeException("connect failed: $errorText");
    }
    stream_set_timeout($socket, 20);

    // Errors report the status code only, so a failed login can't write the password to a log.
    $step = function (?string $command, int ...$expected) use ($socket): void {
        if ($command !== null) {
            fwrite($socket, $command . "\r\n");
        }
        $response = '';
        while (($line = fgets($socket, 1024)) !== false) {
            $response .= $line;
            if (strlen($line) < 4 || $line[3] === ' ') {
                break;
            }
        }
        if (!in_array((int) substr($response, 0, 3), $expected, true)) {
            throw new RuntimeException('unexpected SMTP status ' . substr($response, 0, 3));
        }
    };

    try {
        $step(null, 220);
        $step('EHLO portfolio-website', 250);
        $step('STARTTLS', 220);
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT)) {
            throw new RuntimeException('TLS failed');
        }
        $step('EHLO portfolio-website', 250);
        $step('AUTH LOGIN', 334);
        $step(base64_encode(MAIL_USERNAME), 334);
        $step(base64_encode($password), 235);
        $step('MAIL FROM:<' . MAIL_USERNAME . '>', 250);
        $step('RCPT TO:<' . MAIL_TO . '>', 250);
        $step('DATA', 354);
        // The body is base64 and the headers are fixed or validated, so no line can start with a dot.
        $step($message . "\r\n.", 250);
        $step('QUIT', 221);
    } finally {
        fclose($socket);
    }
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    reply(405, ['ok' => false, 'error' => 'Method not allowed.']);
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== strtok($_SERVER['HTTP_HOST'] ?? '', ':')) {
    reply(403, ['ok' => false, 'error' => 'Not allowed.']);
}

// Bots fill the hidden field, or post without running the page's script. They get a normal-looking answer and nothing is sent.
if (($_POST['website'] ?? '') !== '' || (int) ($_POST['elapsed'] ?? 0) < 2000) {
    reply(200, ['ok' => true]);
}

$name = clean((string) ($_POST['name'] ?? ''));
$email = clean((string) ($_POST['email'] ?? ''));
$subject = clean((string) ($_POST['subject'] ?? ''));
$body = trim((string) ($_POST['message'] ?? ''));

foreach ([$name, $email, $subject, $body] as $field) {
    if (!preg_match('//u', $field)) {
        reply(400, ['ok' => false, 'error' => 'Your message contains characters that could not be read.']);
    }
}
if ($name === '' || strlen($name) > 100) {
    reply(400, ['ok' => false, 'error' => 'Please enter your name.']);
}
if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    reply(400, ['ok' => false, 'error' => 'Please enter a valid email address.']);
}
if (strlen($subject) > 150) {
    reply(400, ['ok' => false, 'error' => 'Please shorten the subject.']);
}
if ($body === '' || strlen($body) > 5000) {
    reply(400, ['ok' => false, 'error' => 'Please enter a message of up to 5,000 characters.']);
}

$configFile = __DIR__ . '/App_Data/contact-config.php';
$config = is_file($configFile) ? require $configFile : ['password' => (string) getenv('MAIL_PASSWORD')];
if (empty($config['password'])) {
    error_log('Contact form: no mail password is configured.');
    reply(503, ['ok' => false, 'error' => 'The form is not available right now.']);
}

if (overLimit($_SERVER['REMOTE_ADDR'] ?? 'unknown')) {
    reply(429, ['ok' => false, 'error' => 'That is a lot of messages. Please email me directly instead.']);
}

$text = "New message from your portfolio website\r\n\r\n"
    . "Name: $name\r\nEmail: $email\r\nSubject: " . ($subject !== '' ? $subject : '(none)') . "\r\n\r\n"
    . "Message:\r\n" . preg_replace('/\r\n|\r|\n/', "\r\n", $body) . "\r\n\r\n"
    . "--\r\nReply to this email to answer them directly.\r\n";

$headers = [
    'From: "' . MAIL_FROM_NAME . '" <' . MAIL_USERNAME . '>',
    'To: <' . MAIL_TO . '>',
    'Reply-To: <' . $email . '>',
    'Subject: ' . encodeSubject(SUBJECT_PREFIX . ($subject !== '' ? $subject : "New inquiry from $name")),
    'Date: ' . date('r'),
    'Message-ID: <' . bin2hex(random_bytes(12)) . '@portfolio-website>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
];

try {
    smtpSend($config['password'], implode("\r\n", $headers) . "\r\n\r\n" . rtrim(chunk_split(base64_encode($text), 76, "\r\n")));
} catch (Throwable $error) {
    error_log('Contact form: ' . $error->getMessage());
    reply(502, ['ok' => false, 'error' => 'Your message could not be sent.']);
}

reply(200, ['ok' => true]);
