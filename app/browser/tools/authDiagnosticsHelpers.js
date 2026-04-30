/**
 * Pure helper functions for auth diagnostics.
 * No Electron dependencies — safe to import in unit tests.
 */

/**
 * Redact query parameters and fragments from a URL.
 * Preserves the origin and pathname only.
 *
 * @param {string} url
 * @returns {string}
 */
function redactUrl(url) {
  if (typeof url !== "string" || url.length === 0) {
    return "[empty]";
  }
  try {
    const parsed = new URL(url);
    // For standard HTTP(S) URLs: keep protocol, hostname, pathname
    // For non-standard schemes (about:, chrome-error:, etc.): preserve as-is
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      let redacted = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
      // Collapse multiple slashes in pathname only for http(s)
      redacted = redacted.replace(/\/+/g, "/");
      // Restore the double slash after protocol
      redacted = redacted.replace("http:/", "http://").replace("https:/", "https://");
      return redacted;
    }
    // Non-standard scheme: preserve hostname if present (e.g. chrome-error://chromewebdata/)
    if (parsed.hostname) {
      return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
    }
    return `${parsed.protocol}${parsed.pathname}`;
  } catch {
    // If URL parsing fails, return a truncated version
    return `[unparseable:${url.substring(0, 40)}]`;
  }
}

/**
 * Redact an email address by showing only the first character of the local
 * part and the domain.  e.g. "j***@example.com"
 *
 * @param {string} str
 * @returns {string}
 */
function redactEmail(str) {
  if (typeof str !== "string" || str.length === 0) {
    return "[empty]";
  }
  const atIndex = str.indexOf("@");
  if (atIndex <= 0) {
    return "[not-an-email]";
  }
  const local = str.substring(0, atIndex);
  const domain = str.substring(atIndex + 1);
  const maskedLocal = local.charAt(0) + "***";
  return `${maskedLocal}@${domain}`;
}

module.exports = {
  redactUrl,
  redactEmail,
};
