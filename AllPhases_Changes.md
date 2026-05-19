# Complete Overview — Changes relative to commit `6f05db9`

**Branch**: `fix/auth-timeout-cvut-diagnostics`
**Base commit**: `95fb117 fix(auth): reset authRecoveryTriggered guard after successful Teams load`

Each phase is implemented as an independent commit.

---

## Problem being solved: daily forced re-login

In the stable version of teams-for-linux, users are forced to re-authenticate **every day** (not just after suspend/resume — literally every 24h). The cause is a combination of two failures:

1. **Broken recovery loop**: The `authRecoveryTriggered` guard flag in `app/mainAppWindow/index.js` was set once and **never reset**, so any automatic auth recovery would only work **once** per app launch. After the first recovery, future `InteractionRequired` signals from Teams were silently ignored, forcing a manual restart each time.

2. **Unstable safeStorage after resume**: `safeStorage.isEncryptionAvailable()` in the renderer process could return `false` after a suspend/resume cycle on Linux, because the Electron renderer loses its D-Bus/keyring context. When the session expired and the app tried to decrypt stored tokens via `safeStorage`, it would fail, and Teams would reset to a fresh unauthenticated state.

### How these changes fix it

| Phase | Fix | When active |
|---|--|--|
| **Phase 1** — Diagnostic logging | Logs auth state, navigation, suspend/resume events. Timestamps allow correlating with syslog entries. PII-safe. | Opt-in (`auth.diagnosticLogging`) |
| **Phase 2** — Recovery guard reset | `authRecoveryTriggered` is reset to `false` after a successful Teams page load, so recovery can fire **multiple times** across many days. | **Always active** |
| **Phase 3** — IPC safeStorage | Token encryption/decryption moves to the main process, which retains a stable D-Bus context. Old localStorage token format is protected. | Default on (`auth.useMainProcessSafeStorage`) |

---

## Phase 1 — Diagnostic logging (commit `f8a9982`)

### New module `app/browser/tools/authDiagnosticsHelpers.js`
- `redactUrl(url)` — Strips query params and fragments from URLs, preserves hostname + pathname. Handles non-http schemes too (about:, chrome-error:).
- `redactEmail(email)` — Masks the local part of an email: `"john.doe@example.com"` → `"j***@example.com"`.
- Pure functions with no Electron dependencies — testable in isolation.

### New module `app/browser/tools/authDiagnostics.js`
- `logAuthDiagnostics(config, window)` — Logs app version, Electron version, userData path, partition, safeStorage availability.
- `logNavigationEvent(url, eventType, isMainFrame)` — Logs navigation events with redacted URLs.
- `logSuspendResume(eventType)` — Logs system suspend/resume events.
- `logCookieCleanup(result, context)` — Logs cookie cleanup with counts.
- `logRecoveryAction(action, extra)` — Logs auth recovery actions.
- **All logs are PII-safe**: no tokens, cookie values, URL query params, full emails, headers, or certificates.

### New test file `tests/unit/authDiagnostics.test.js`
- 12 tests: `redactUrl` (7 tests), `redactEmail` (5 tests) — all passing.

### Modification to `app/config/index.js`
- New option: `auth.diagnosticLogging: false` (default).

### Modification to `app/mainAppWindow/index.js`
- Startup: if `config.auth.diagnosticLogging`, runs `authDiagnostics.logAuthDiagnostics`.
- `did-navigate`: logs navigation via `logNavigationEvent`.
- `resume` event: logs via `logSuspendResume`.
- Cookie cleanup: logs via `logCookieCleanup`.
- Auth recovery trigger: logs via `logRecoveryAction`.

### Summary
| File | Action |
|---|---|
| `app/browser/tools/authDiagnosticsHelpers.js` | Created: `redactUrl()`, `redactEmail()` |
| `app/browser/tools/authDiagnostics.js` | Created: PII-safe diagnostic functions |
| `app/config/index.js` | Added `auth.diagnosticLogging: false` |
| `app/mainAppWindow/index.js` | Integrated diagnostic calls into key events |
| `tests/unit/authDiagnostics.test.js` | Created: 12 unit tests, all passing |

---

## Phase 2 — Fix one-shot recovery (commit `95fb117`)

### Problem
The `authRecoveryTriggered` flag was a local variable inside `onAppReady()`, never reset after the first recovery. If the user cancelled the login, the app would remain stuck until manually restarted.

### Solution
- **Variable hoisting**: `let authRecoveryTriggered = false` moved to module scope to persist beyond the `onAppReady()` call.
- **Conditional reset in `onDidFinishLoad()`**: after a successful Teams page load, if `authRecoveryTriggered` is `true`, resets it to `false`.

### Changes to `app/mainAppWindow/index.js`
```diff
+ let authRecoveryTriggered = false;           // module scope (was local before)
  ...
- let authRecoveryTriggered = false;             // removed from closure
  ...
+ if (authRecoveryTriggered && isTeamsDomain(currentUrl)) {
+   authRecoveryTriggered = false;
+   logRecoveryAction('guard-reset', { url: redactUrl(currentUrl) });
+ }
```

### Summary
| File | Change |
|---|---|
| `app/mainAppWindow/index.js` | authRecoveryTriggered reset after successful Teams load |

---

## Phase 3 — SafeStorage IPC (commit `in-progress`)

### Motivation
`safeStorage`, used to encrypt/decrypt tokens in localStorage, depends on the keyring/DBus. In Electron's renderer process on Linux, keyring access is not guaranteed (`safeStorage.isEncryptionAvailable()` may return false) after suspend/resume. By moving encryption logic to the main process (via IPC), we achieve:
- More stable DBus context (main process, system-level)
- Automatic localStorage fallback for edge cases

### New IPC channels (registered in `app/index.js` + `app/security/ipcValidator.js`)
- `safe-storage-check` — availability check
- `safe-storage-encrypt` — encryption
- `safe-storage-decrypt` — decryption

### Configuration
Main-process safeStorage is enabled by default. It can be disabled with:
```json
{ "auth": { "useMainProcessSafeStorage": false } }
```

### Specific changes
- `app/browser/tools/tokenCache.js`: enable/disable IPC mode via `enableIpcMode()`
- `app/browser/tools/reactHandler.js`: `init()` calls `TokenCache.enableIpcMode()` when configured
- `app/config/index.js`: new field `useMainProcessSafeStorage: true`
- `app/index.js`: three new IPC handlers
- `app/security/ipcValidator.js`: three new allowlisted channels

### Storage format compatibility
localStorage stores identical base64 strings in both paths. **No migration needed** for existing tokens.

### Summary
| File | Change |
|---|---|
| `app/browser/tools/tokenCache.js` | `enableIpcMode()`, `_useIpcSafeStorage`, IPC paths in `_getSecureItem()` and `_setSecureItem()` |
| `app/browser/tools/reactHandler.js` | `init()` enables IPC if configured |
| `app/config/index.js` | `useMainProcessSafeStorage: true` |
| `app/index.js` | IPC handlers: check / encrypt / decrypt |
| `app/security/ipcValidator.js` | New channels: `safe-storage-*` |
