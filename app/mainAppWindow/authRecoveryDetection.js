const AUTH_FAILURE_PATTERNS = [
  {
    name: "InteractionRequired",
    pattern: /InteractionRequired/i,
  },
  {
    name: "login_required",
    pattern: /login_required/i,
  },
  {
    name: "AADSTS50058",
    pattern: /AADSTS50058/i,
  },
  {
    name: "AuthFailed",
    pattern: /AuthFailed/i,
  },
];

const TRUSTED_AUTH_SOURCES = [
  "teams.cloud.microsoft",
  "teams.microsoft.com",
  "teams.live.com",
  "login.microsoftonline.com",
  "login.microsoft.com",
  "statics.teams.cdn.office.net",
];

function getAuthSignalText(signal = {}) {
  return [
    signal.message,
    signal.stack,
    signal.errorStack,
    signal.reason?.message,
    signal.reason?.stack,
  ]
    .filter(Boolean)
    .map(String)
    .join("\n");
}

function getAuthSignalSource(signal = {}) {
  return [
    signal.sourceId,
    signal.filename,
    signal.stack,
    signal.errorStack,
  ]
    .filter(Boolean)
    .map(String)
    .join("\n");
}

function getAuthFailureReason(signal = {}) {
  const text = getAuthSignalText(signal);
  const match = AUTH_FAILURE_PATTERNS.find(({ pattern }) => pattern.test(text));
  return match?.name || null;
}

function hasAuthFailureSignal(signal = {}) {
  return getAuthFailureReason(signal) !== null;
}

function hasTrustedAuthSource(signal = {}) {
  const source = getAuthSignalSource(signal);
  if (!source) {
    return false;
  }
  return TRUSTED_AUTH_SOURCES.some((trustedSource) =>
    source.includes(trustedSource)
  );
}

function isWorkerAuthSignal(signal = {}) {
  return getAuthSignalSource(signal).includes("/worker/");
}

module.exports = {
  getAuthFailureReason,
  hasAuthFailureSignal,
  hasTrustedAuthSource,
  isWorkerAuthSignal,
};
