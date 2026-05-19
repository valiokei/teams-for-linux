const DEFAULT_TOKEN_REFRESH_RESOURCES = [
  "https://teams.cloud.microsoft",
  "https://teams.microsoft.com",
  "https://api.spaces.skype.com",
  "https://ic3.teams.office.com",
  "https://chatsvcagg.teams.microsoft.com",
  "https://presence.teams.microsoft.com",
  "https://substrate.office.com",
  "https://graph.microsoft.com",
];

function normalizeTokenRefreshResources(config = {}, currentOrigin = "") {
  const configuredResources = config.tokenRefresh?.resources || config.auth?.tokenRefresh?.resources;
  const resources = [
    currentOrigin,
    config.url,
    ...(Array.isArray(configuredResources) ? configuredResources : []),
    ...DEFAULT_TOKEN_REFRESH_RESOURCES,
  ];

  return [...new Set(resources.filter(isValidHttpsUrl).map((resource) => {
    const url = new URL(resource);
    return url.origin;
  }))];
}

function getResourceLabel(resource) {
  try {
    return new URL(resource).hostname;
  } catch {
    return "[invalid-resource]";
  }
}

function isValidHttpsUrl(value) {
  if (typeof value !== "string" || !value) {
    return false;
  }

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

module.exports = {
  DEFAULT_TOKEN_REFRESH_RESOURCES,
  getResourceLabel,
  normalizeTokenRefreshResources,
};
