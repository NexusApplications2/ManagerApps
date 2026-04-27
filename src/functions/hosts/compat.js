"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.HOST_DASHBOARD_URLS =
  exports.HOST_WORKSPACE_LABELS =
  exports.HOST_LABELS =
  exports.HOST_PROVIDERS =
    void 0;
exports.normalizeHostProvider = normalizeHostProvider;
exports.getHostLabel = getHostLabel;
exports.getHostWorkspaceLabel = getHostWorkspaceLabel;
exports.getHostDashboardBaseUrl = getHostDashboardBaseUrl;
exports.getStoreHostProvider = getStoreHostProvider;
exports.getStoreOwnerDiscordId = getStoreOwnerDiscordId;
exports.getStoreHostOwnerId = getStoreHostOwnerId;
exports.getStoreHostWorkspaceId = getStoreHostWorkspaceId;
exports.getApplicationHostProvider = getApplicationHostProvider;
exports.getUserHostAccount = getUserHostAccount;
exports.hasUserConnectedHost = hasUserConnectedHost;
exports.buildHostAccountSetOperation = buildHostAccountSetOperation;
exports.buildHostAccountUnsetOperation = buildHostAccountUnsetOperation;
exports.buildStoreHostSetOperation = buildStoreHostSetOperation;
exports.findUserSettingsByHostAccount = findUserSettingsByHostAccount;
exports.findStoreOwnerSettings = findStoreOwnerSettings;
exports.isStoreOwner = isStoreOwner;
exports.buildStoreLookupQueryForUser = buildStoreLookupQueryForUser;

const HOST_PROVIDERS = {
  CAMPOS: "campos",
  SQUARE: "square",
};

exports.HOST_PROVIDERS = HOST_PROVIDERS;

const HOST_LABELS = {
  [HOST_PROVIDERS.CAMPOS]: "Campos Cloud",
  [HOST_PROVIDERS.SQUARE]: "Square Cloud",
};

exports.HOST_LABELS = HOST_LABELS;

const HOST_WORKSPACE_LABELS = {
  [HOST_PROVIDERS.CAMPOS]: "Team",
  [HOST_PROVIDERS.SQUARE]: "Workspace",
};

exports.HOST_WORKSPACE_LABELS = HOST_WORKSPACE_LABELS;

const HOST_DASHBOARD_URLS = {
  [HOST_PROVIDERS.CAMPOS]: "https://www.camposcloud.com/dashboard/applications",
  [HOST_PROVIDERS.SQUARE]: "https://squarecloud.app/dashboard",
};

exports.HOST_DASHBOARD_URLS = HOST_DASHBOARD_URLS;

function normalizeHostProvider(provider, fallback = HOST_PROVIDERS.CAMPOS) {
  const normalized = String(provider || "")
    .trim()
    .toLowerCase();

  if (normalized === HOST_PROVIDERS.SQUARE) {
    return HOST_PROVIDERS.SQUARE;
  }

  if (normalized === HOST_PROVIDERS.CAMPOS) {
    return HOST_PROVIDERS.CAMPOS;
  }

  return fallback;
}

function getHostLabel(provider) {
  return HOST_LABELS[normalizeHostProvider(provider)] || "Host";
}

function getHostWorkspaceLabel(provider) {
  return HOST_WORKSPACE_LABELS[normalizeHostProvider(provider)] || "Workspace";
}

function getHostDashboardBaseUrl(provider) {
  return HOST_DASHBOARD_URLS[normalizeHostProvider(provider)] || "";
}

function getStoreHostProvider(store) {
  if (!store) {
    return HOST_PROVIDERS.CAMPOS;
  }

  return normalizeHostProvider(
    store.hostProvider || (store.ownerId_campos ? HOST_PROVIDERS.CAMPOS : null),
  );
}

function getStoreOwnerDiscordId(store) {
  return (
    (store === null || store === void 0 ? void 0 : store.ownerDiscordId) || null
  );
}

function getStoreHostOwnerId(store) {
  return (
    (store === null || store === void 0 ? void 0 : store.hostOwnerId) ||
    (store === null || store === void 0 ? void 0 : store.ownerId_campos) ||
    null
  );
}

function getStoreHostWorkspaceId(store) {
  return (
    (store === null || store === void 0 ? void 0 : store.hostWorkspaceId) ||
    (store === null || store === void 0 ? void 0 : store.teamId_campos) ||
    null
  );
}

function getApplicationHostProvider(application, store) {
  return normalizeHostProvider(
    application === null || application === void 0
      ? void 0
      : application.hostProvider,
    getStoreHostProvider(store),
  );
}

function getUserHostAccount(userSettings, provider) {
  const normalizedProvider = normalizeHostProvider(provider);
  const hostAccounts =
    (userSettings === null || userSettings === void 0
      ? void 0
      : userSettings.hostAccounts) || {};
  const providerAccount = hostAccounts[normalizedProvider] || {};
  const fallbackAccountId =
    normalizedProvider === HOST_PROVIDERS.CAMPOS
      ? userSettings === null || userSettings === void 0
        ? void 0
        : userSettings.userId_campos
      : null;
  const fallbackApiToken =
    normalizedProvider === HOST_PROVIDERS.CAMPOS
      ? userSettings === null || userSettings === void 0
        ? void 0
        : userSettings.token_campos
      : null;

  const account = {
    provider: normalizedProvider,
    accountId: providerAccount.accountId || fallbackAccountId || null,
    apiToken: providerAccount.apiToken || fallbackApiToken || null,
    name: providerAccount.name || "",
    email: providerAccount.email || "",
    lastValidatedAt: providerAccount.lastValidatedAt || null,
  };

  return Object.assign(account, {
    connected: Boolean(account.accountId && account.apiToken),
  });
}

function hasUserConnectedHost(userSettings, provider) {
  const account = getUserHostAccount(userSettings, provider);
  return account.connected;
}

function buildHostAccountSetOperation(provider, payload = {}) {
  const normalizedProvider = normalizeHostProvider(provider);
  const setOperation = {};
  const basePath = `hostAccounts.${normalizedProvider}`;

  setOperation[`${basePath}.accountId`] = payload.accountId || null;
  setOperation[`${basePath}.apiToken`] = payload.apiToken || null;
  setOperation[`${basePath}.name`] = payload.name || "";
  setOperation[`${basePath}.email`] = payload.email || "";
  setOperation[`${basePath}.lastValidatedAt`] = payload.lastValidatedAt || null;

  if (normalizedProvider === HOST_PROVIDERS.CAMPOS) {
    setOperation.userId_campos = payload.accountId || null;
    setOperation.token_campos = payload.apiToken || null;
    setOperation["settings.token_campos"] = payload.apiToken || null;
  }

  return setOperation;
}

function buildHostAccountUnsetOperation(provider) {
  const normalizedProvider = normalizeHostProvider(provider);
  const unsetOperation = {
    [`hostAccounts.${normalizedProvider}.accountId`]: "",
    [`hostAccounts.${normalizedProvider}.apiToken`]: "",
    [`hostAccounts.${normalizedProvider}.name`]: "",
    [`hostAccounts.${normalizedProvider}.email`]: "",
    [`hostAccounts.${normalizedProvider}.lastValidatedAt`]: "",
  };

  if (normalizedProvider === HOST_PROVIDERS.CAMPOS) {
    unsetOperation.userId_campos = "";
    unsetOperation.token_campos = "";
    unsetOperation["settings.token_campos"] = "";
  }

  return unsetOperation;
}

function buildStoreHostSetOperation(payload = {}) {
  const provider = normalizeHostProvider(payload.provider);
  const setOperation = {
    ownerDiscordId: payload.ownerDiscordId || null,
    hostProvider: provider,
    hostOwnerId: payload.hostOwnerId || null,
    hostWorkspaceId: payload.hostWorkspaceId || null,
  };

  if (provider === HOST_PROVIDERS.CAMPOS) {
    setOperation.ownerId_campos = payload.hostOwnerId || null;
    setOperation.teamId_campos = payload.hostWorkspaceId || null;
  }

  return setOperation;
}

async function findUserSettingsByHostAccount(databases, provider, accountId) {
  const normalizedProvider = normalizeHostProvider(provider);
  const normalizedAccountId = String(accountId || "").trim();

  if (!normalizedAccountId) {
    return null;
  }

  if (normalizedProvider === HOST_PROVIDERS.CAMPOS) {
    return databases.userSettings.findOne({
      $or: [
        { "hostAccounts.campos.accountId": normalizedAccountId },
        { userId_campos: normalizedAccountId },
      ],
    });
  }

  return databases.userSettings.findOne({
    [`hostAccounts.${normalizedProvider}.accountId`]: normalizedAccountId,
  });
}

async function findStoreOwnerSettings(databases, store) {
  if (!store) {
    return null;
  }

  const ownerDiscordId = getStoreOwnerDiscordId(store);

  if (ownerDiscordId) {
    const ownerSettings = await databases.userSettings.findOne({
      userId_discord: ownerDiscordId,
    });

    if (ownerSettings) {
      return ownerSettings;
    }
  }

  const hostOwnerId = getStoreHostOwnerId(store);
  const provider = getStoreHostProvider(store);

  if (!hostOwnerId) {
    return null;
  }

  return findUserSettingsByHostAccount(databases, provider, hostOwnerId);
}

function isStoreOwner(store, userSettings) {
  if (!store || !userSettings) {
    return false;
  }

  const ownerDiscordId = getStoreOwnerDiscordId(store);

  if (ownerDiscordId) {
    return ownerDiscordId === userSettings.userId_discord;
  }

  const provider = getStoreHostProvider(store);
  const account = getUserHostAccount(userSettings, provider);

  return Boolean(
    account.accountId && account.accountId === getStoreHostOwnerId(store),
  );
}

function buildStoreLookupQueryForUser(userSettings, discordUserId) {
  const camposAccountId = getUserHostAccount(
    userSettings,
    HOST_PROVIDERS.CAMPOS,
  ).accountId;
  const squareAccountId = getUserHostAccount(
    userSettings,
    HOST_PROVIDERS.SQUARE,
  ).accountId;

  return {
    $or: [
      { ownerDiscordId: discordUserId },
      { "permissions.userId": discordUserId },
      ...(camposAccountId ? [{ ownerId_campos: camposAccountId }] : []),
      ...(camposAccountId
        ? [
            {
              hostProvider: HOST_PROVIDERS.CAMPOS,
              hostOwnerId: camposAccountId,
            },
          ]
        : []),
      ...(squareAccountId
        ? [
            {
              hostProvider: HOST_PROVIDERS.SQUARE,
              hostOwnerId: squareAccountId,
            },
          ]
        : []),
    ],
  };
}
