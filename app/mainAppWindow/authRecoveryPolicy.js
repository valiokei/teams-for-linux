function shouldClearAuthStateOnRecovery(config = {}) {
  return config?.auth?.clearStorageOnAuthFailure === true;
}

function getAuthRecoveryMode(config = {}) {
  return shouldClearAuthStateOnRecovery(config) ? "clear-and-reload" : "reload-only";
}

module.exports = {
  getAuthRecoveryMode,
  shouldClearAuthStateOnRecovery,
};
