"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_HOST_MEMORY_MB =
  exports.HOST_DASHBOARD_URLS =
  exports.HOST_WORKSPACE_LABELS =
  exports.HOST_LABELS =
  exports.HOST_PROVIDERS =
    void 0;
exports.createHostAdapter = createHostAdapter;
exports.getHostAdapterForStore = getHostAdapterForStore;
exports.getHostAdapterForApplication = getHostAdapterForApplication;
exports.getRemoteApplicationState = getRemoteApplicationState;

var compat_1 = require("./compat");
Object.defineProperty(exports, "HOST_PROVIDERS", {
  enumerable: true,
  get: function () {
    return compat_1.HOST_PROVIDERS;
  },
});
Object.defineProperty(exports, "HOST_LABELS", {
  enumerable: true,
  get: function () {
    return compat_1.HOST_LABELS;
  },
});
Object.defineProperty(exports, "HOST_WORKSPACE_LABELS", {
  enumerable: true,
  get: function () {
    return compat_1.HOST_WORKSPACE_LABELS;
  },
});
Object.defineProperty(exports, "HOST_DASHBOARD_URLS", {
  enumerable: true,
  get: function () {
    return compat_1.HOST_DASHBOARD_URLS;
  },
});
Object.keys(compat_1).forEach((key) => {
  if (!(key in exports) && key !== "default") {
    exports[key] = compat_1[key];
  }
});

const compat_2 = require("./compat");
const campos_1 = require("./campos");
const square_1 = require("./square");

var release_1 = require("./release");
Object.defineProperty(exports, "DEFAULT_HOST_MEMORY_MB", {
  enumerable: true,
  get: function () {
    return release_1.DEFAULT_HOST_MEMORY_MB;
  },
});
Object.keys(release_1).forEach((key) => {
  if (!(key in exports) && key !== "default") {
    exports[key] = release_1[key];
  }
});
const runtime_1 = require("./runtime");
Object.keys(runtime_1).forEach((key) => {
  if (!(key in exports) && key !== "default") {
    exports[key] = runtime_1[key];
  }
});

async function createHostAdapter(options) {
  const provider = (0, compat_2.normalizeHostProvider)(options.provider);

  if (provider === compat_2.HOST_PROVIDERS.SQUARE) {
    if (!options.apiToken) {
      throw new Error("Token da Square Cloud não configurado.");
    }

    return new square_1.SquareHostAdapter(options);
  }

  return new campos_1.CamposHostAdapter(options);
}

async function getHostAdapterForStore(databases, store) {
  const ownerSettings = await (0, compat_2.findStoreOwnerSettings)(databases, store);

  if (!ownerSettings) {
    throw new Error("Configuração do dono da loja não encontrada.");
  }

  const provider = (0, compat_2.getStoreHostProvider)(store);
  const account = (0, compat_2.getUserHostAccount)(ownerSettings, provider);

  if (!account.apiToken) {
    throw new Error(
      `Conta ${ (0, compat_2.getHostLabel)(provider) } não configurada.`,
    );
  }

  const ownerDiscordId =
    (0, compat_2.getStoreOwnerDiscordId)(store) || ownerSettings.userId_discord;

  return {
    adapter: await createHostAdapter({
      provider,
      ownerDiscordUserId: ownerDiscordId,
      apiToken: account.apiToken,
    }),
    ownerSettings,
    provider,
    ownerDiscordId,
  };
}

async function getHostAdapterForApplication(databases, application, populatedStore) {
  const store =
    populatedStore ||
    (await databases.stores.findById(application.storeId).catch(() => null));

  if (!store) {
    throw new Error("Loja não encontrada.");
  }

  const host = await getHostAdapterForStore(databases, store);
  return Object.assign(Object.assign({}, host), { store });
}

async function getRemoteApplicationState(databases, application, populatedStore) {
  const host = await getHostAdapterForApplication(
    databases,
    application,
    populatedStore,
  );
  const remoteApplication = await host.adapter.getApplication(application.appId);
  const remoteStatus = remoteApplication
    ? await host.adapter.getApplicationStatus(application.appId)
    : null;

  return Object.assign(Object.assign({}, host), {
    remoteApplication,
    remoteStatus,
  });
}
