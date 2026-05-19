/**
 * Authentication Diagnostics Module
 *
 * Provides non-PII diagnostic logging for auth/session troubleshooting.
 * All log output is designed to be safe to share publicly — no tokens,
 * cookie values, authorization headers, refresh tokens, query parameters,
 * or full email addresses are ever emitted.
 *
 * Enabled via config: auth.diagnosticLogging (default false)
 */

const { app, safeStorage } = require("electron");
const { redactUrl, redactEmail } = require("./authDiagnosticsHelpers");

// Microsoft auth-related domains for cookie counting
const AUTH_DOMAIN_PATTERNS = [
  "login.microsoftonline.com",
  "login.microsoft.com",
  "teams.microsoft.com",
  "teams.cloud.microsoft",
  "teams.live.com",
  "microsoft.com",
  "office.com",
  "office365.com",
  "live.com",
  "microsoftonline.com",
];

/**
 * Log the current authentication-related state of the application.
 * Safe to call on startup.
 *
 * @param {object} config — app startup config
 * @param {Electron.BrowserWindow|null} window — main window (may be null early)
 */
async function logAuthDiagnostics(config, window) {
  const partition = config?.partition || "[not-set]";
  const isPersistent = typeof partition === "string" && partition.startsWith("persist:");
  let safeStorageAvailable = false;
  try {
    safeStorageAvailable = safeStorage.isEncryptionAvailable();
  } catch {
    safeStorageAvailable = false;
  }

  console.info("[AUTH_DIAG] Application auth state", {
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
    platform: process.platform,
    userDataPath: app.getPath("userData"),
    partition: partition,
    partitionPersistent: isPersistent,
    safeStorageAvailable: safeStorageAvailable,
    mainProcessSafeStorage: config?.auth?.useMainProcessSafeStorage !== false,
    emulateWinChromiumPlatform: config?.emulateWinChromiumPlatform || false,
    intuneEnabled: config?.auth?.intune?.enabled || config?.ssoInTuneEnabled || false,
    multiAccountEnabled: config?.multiAccount?.enabled || false,
    cacheManagementEnabled: config?.cacheManagement?.enabled || false,
  });

  if (window && !window.isDestroyed()) {
    try {
      const session = window.webContents.session;
      const allCookies = await session.cookies.get({});
      const domainCounts = {};
      for (const cookie of allCookies) {
        const domain = (cookie.domain || "").replace(/^\./, "");
        const isAuthDomain = AUTH_DOMAIN_PATTERNS.some(
          (d) => domain === d || domain.endsWith("." + d)
        );
        if (isAuthDomain) {
          domainCounts[domain] = (domainCounts[domain] || 0) + 1;
        }
      }
      console.info("[AUTH_DIAG] Auth domain cookie counts", {
        totalAuthCookies: Object.values(domainCounts).reduce((a, b) => a + b, 0),
        perDomain: domainCounts,
      });
    } catch (err) {
      console.warn("[AUTH_DIAG] Failed to count cookies:", err.message);
    }
  }
}

/**
 * Log a navigation event with the URL redacted.
 *
 * @param {string} url
 * @param {string} eventType — e.g. "did-navigate", "did-navigate-in-page"
 * @param {boolean} isMainFrame
 */
function logNavigationEvent(url, eventType, isMainFrame = true) {
  const redacted = redactUrl(url);
  const frameType = isMainFrame ? "main" : "sub";
  console.debug(`[AUTH_DIAG] Navigation ${eventType} (${frameType}): ${redacted}`);
}

/**
 * Log a suspend/resume event.
 *
 * @param {string} eventType — "suspend" or "resume"
 */
function logSuspendResume(eventType) {
  console.info(`[AUTH_DIAG] System ${eventType}`);
}

/**
 * Log cookie cleanup results.
 *
 * @param {object} result — { cleaned, total, expired }
 * @param {string} context — e.g. "startup", "resume", "recovery"
 */
function logCookieCleanup(result, context) {
  console.info(`[AUTH_DIAG] Cookie cleanup (${context})`, {
    cleaned: result.cleaned,
    total: result.total,
    expired: result.expired,
  });
}

/**
 * Log token cache injection status.
 *
 * @param {object} status — { injected: boolean, canRetry: boolean }
 */
function logTokenCacheStatus(status) {
  console.info("[AUTH_DIAG] Token cache status", {
    injected: status.injected,
    canRetry: status.canRetry,
  });
}

/**
 * Log that an auth recovery action was triggered.
 *
 * @param {string} action — e.g. "triggered", "completed", "failed"
 * @param {object} extra — optional extra safe fields
 */
function logRecoveryAction(action, extra = {}) {
  console.info(`[AUTH_DIAG] Auth recovery ${action}`, extra);
}

module.exports = {
  redactUrl,
  redactEmail,
  logAuthDiagnostics,
  logNavigationEvent,
  logSuspendResume,
  logCookieCleanup,
  logTokenCacheStatus,
  logRecoveryAction,
};
