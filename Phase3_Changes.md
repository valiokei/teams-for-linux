# Phase 3 — SafeStorage IPC: Changes relative to commit `95fb117`

**Reference commit**: `95fb117 fix(auth): reset authRecoveryTriggered guard after successful Teams load`

## Summary

Phase 3 moves safeStorage encryption/decryption from renderer-side to the main process via IPC, addressing potential keyring/DBus access issues after suspend/resume on Linux.

## 1. `app/browser/tools/tokenCache.js`

### New method `enableIpcMode()`
Allows activating IPC mode once the `auth.useMainProcessSafeStorage` config has been loaded. This mode is enabled by default.

### `require('electron')` now includes `ipcRenderer`
Before: `const { safeStorage } = require('electron');`
After: `const { safeStorage, ipcRenderer } = require('electron');`

### `_useIpcSafeStorage` state flag
Added `_useIpcSafeStorage = false` field to track active mode.

### `_getSecureItem()` — IPC path
Before using `safeStorage.decryptString()` directly, checks if `_useIpcSafeStorage` is true. If so, invokes `ipcRenderer.invoke('safe-storage-decrypt', encryptedData)` from the main process.

### `_setSecureItem()` — IPC path
Before using `safeStorage.encryptString()` directly, checks `_useIpcSafeStorage`. If true, invokes `ipcRenderer.invoke('safe-storage-encrypt', value)` and saves the result in localStorage.

### Storage format preserved
localStorage always saves identical base64 strings in both paths. **No migration needed** for existing data.

## 2. `app/browser/tools/reactHandler.js`

### `init()` now propagates the IPC flag
```javascript
if (config?.auth?.useMainProcessSafeStorage) {
  TokenCache.enableIpcMode();
}
```

## 3. `app/config/index.js`

New configuration option: `auth.useMainProcessSafeStorage` (default `true`).

## 4. `app/index.js`

Three new IPC handlers registered in the main process:
- **`safe-storage-check`**: checks safeStorage availability
- **`safe-storage-encrypt`**: encrypts a string with `safeStorage.encryptString()` and returns base64
- **`safe-storage-decrypt`**: decrypts a string with `safeStorage.decryptString(Buffer.from(ciphertext, 'base64'))`

## 5. `app/security/ipcValidator.js`

Three new allowlisted channels:
```
'safe-storage-check'
'safe-storage-encrypt'
'safe-storage-decrypt'
```

## 6. `CLAUDE.md`

Documentation fixes and updates:
- Added missing commands to Development and Utility sections
- Added "Log Sanitization" section referencing `app/utils/logSanitizer.js`
- Updated Critical Module Initialization to reflect use of `Set` with `has()` instead of `Array.includes()`

---

## Summary table

| File | Changes |
|---|---|
| `app/browser/tools/tokenCache.js` | IPC mode + enableIpcMode() |
| `app/browser/tools/reactHandler.js` | enableIpcMode() called from init() |
| `app/config/index.js` | useMainProcessSafeStorage flag |
| `app/index.js` | 3 IPC handlers (check, encrypt, decrypt) |
| `app/security/ipcValidator.js` | 3 new channels |
| `CLAUDE.md` | Doc updates |
