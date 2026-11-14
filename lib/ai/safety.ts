import "server-only";

const REDACTED = "[REDACTED SECRET]";

/** Removes common credential formats before project records are sent to an AI provider. */
export function redactSecrets(value: string) {
  return value
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, REDACTED)
    .replace(/\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g, REDACTED)
    .replace(/\b(?:gh[oprsu]_[A-Za-z0-9]{20,}|vck_[A-Za-z0-9_-]{20,}|AKIA[A-Z0-9]{16})\b/g, REDACTED)
    .replace(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g, REDACTED)
    .replace(/\b(API_KEY|ACCESS_TOKEN|AUTH_TOKEN|PASSWORD|PRIVATE_KEY|SECRET(?:_KEY)?)\s*[:=]\s*[^\s,;]+/gi, `$1=${REDACTED}`);
}

