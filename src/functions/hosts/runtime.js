"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.buildManagerEnvironmentVariables = buildManagerEnvironmentVariables;
exports.assertStoreHasAvailableMemory = assertStoreHasAvailableMemory;
exports.createManagedApplication = createManagedApplication;
exports.updateManagedApplicationEnvironment =
  updateManagedApplicationEnvironment;
exports.commitManagedApplicationRelease = commitManagedApplicationRelease;

const index_1 = require("./index");
const release_1 = require("./release");
const service_product_1 = require("../service-product");
const service_release_1 = require("../service-release");

function buildManagerEnvironmentVariables(input) {
  const base = [
    { key: "BOT_TOKEN", value: input.botToken },
    { key: "OWNER_ID", value: input.ownerId },
    { key: "APPLICATION_ID", value: input.applicationId },
  ];
  const extra = Array.isArray(input.extraEnvironmentVariables)
    ? input.extraEnvironmentVariables
    : [];
  const merged = new Map();

  [...base, ...extra].forEach((item) => {
    if (!item || !item.key) {
      return;
    }
    merged.set(String(item.key), {
      key: String(item.key),
      value: String(item.value == null ? "" : item.value),
    });
  });

  return [...merged.values()];
}
function buildAutomaticExtraEnvironmentVariables(options) {
  if (
    !(0, service_product_1.isManagedServiceProduct)(options.product) ||
    (options.tier || service_product_1.PRODUCT_DELIVERY_MODES.PRIVATE) !==
      service_product_1.PRODUCT_DELIVERY_MODES.PRIVATE
  ) {
    return [];
  }

  return (0, service_release_1.buildDedicatedBotEnvironmentVariables)({
    botToken: options.botToken,
    ownerId: options.ownerId,
    applicationId: options.applicationId,
    mongoUri: process.env.DEDICATED_BOT_MONGO_URI || process.env.MONGO_DB_URL,
    bridgeMongoUri:
      process.env.LICENSE_BRIDGE_MONGO_URI || process.env.MONGO_DB_URL,
  });
}

async function assertStoreHasAvailableMemory(
  databases,
  store,
  requiredMemoryMB = release_1.DEFAULT_HOST_MEMORY_MB,
) {
  const host = await (0, index_1.getHostAdapterForStore)(databases, store);
  const planUsage = await host.adapter.getPlanUsage();

  if (!planUsage) {
    throw new Error("Não foi possível obter os dados do plano do host.");
  }

  if (Number(planUsage.freeMemoryMB || 0) < requiredMemoryMB) {
    throw new Error(
      `O dono da loja não possui memória RAM suficiente em ${(0, index_1.getHostLabel)(host.provider)} para adicionar novos bots.`,
    );
  }

  return Object.assign(Object.assign({}, host), { planUsage });
}

async function createManagedApplication(databases, options) {
  const host = await (0, index_1.getHostAdapterForStore)(
    databases,
    options.store,
  );
  return host.adapter.createApplication({
    appName: options.appName,
    memoryMB: release_1.DEFAULT_HOST_MEMORY_MB,
    runtimeEnvironment: (0, service_product_1.getProductRuntimeEnvironment)(
      options.product,
      options.tier,
    ),
    startupCommand: (0, service_product_1.getProductRunCommand)(
      options.product,
      options.tier,
    ),
    workspaceId: (0, index_1.getStoreHostWorkspaceId)(options.store),
    environmentVariables: buildManagerEnvironmentVariables({
      botToken: options.botToken,
      ownerId: options.ownerId,
      applicationId: options.applicationId,
      extraEnvironmentVariables: [
        ...buildAutomaticExtraEnvironmentVariables(options),
        ...(options.extraEnvironmentVariables || []),
      ],
    }),
    file: options.file,
    product: options.product,
  });
}

async function updateManagedApplicationEnvironment(databases, options) {
  const host = await (0, index_1.getHostAdapterForApplication)(
    databases,
    options.application,
    options.store,
  );
  const remoteStatus = await host.adapter
    .getApplicationStatus(options.application.appId)
    .catch(() => null);
  const wasRunning = Boolean(
    remoteStatus === null || remoteStatus === void 0
      ? void 0
      : remoteStatus.running,
  );

  if (wasRunning) {
    await host.adapter
      .stopApplication(options.application.appId)
      .catch(() => null);
  }

  await host.adapter.overwriteEnvironment(options.application.appId, {
    runtimeEnvironment: (0, service_product_1.getProductRuntimeEnvironment)(
      options.product,
      options.tier,
    ),
    startupCommand: (0, service_product_1.getProductRunCommand)(
      options.product,
      options.tier,
    ),
    environmentVariables: buildManagerEnvironmentVariables({
      botToken: options.botToken,
      ownerId: options.ownerId,
      applicationId: options.application._id.toString(),
      extraEnvironmentVariables: [
        ...buildAutomaticExtraEnvironmentVariables({
          applicationId: options.application._id.toString(),
          product: options.product,
          ownerId: options.ownerId,
          botToken: options.botToken,
          tier: options.tier,
        }),
        ...(options.extraEnvironmentVariables || []),
      ],
    }),
  });

  await host.adapter
    .startApplication(options.application.appId)
    .catch(() => null);
  return true;
}

async function commitManagedApplicationRelease(databases, options) {
  const host = await (0, index_1.getHostAdapterForApplication)(
    databases,
    options.application,
    options.store,
  );
  const remoteStatus = await host.adapter
    .getApplicationStatus(options.application.appId)
    .catch(() => null);
  const wasRunning = Boolean(
    remoteStatus === null || remoteStatus === void 0
      ? void 0
      : remoteStatus.running,
  );

  if (wasRunning) {
    await host.adapter
      .stopApplication(options.application.appId)
      .catch(() => null);
  }

  await host.adapter.commitApplication(
    options.application.appId,
    (0, release_1.filterProtectedFilesFromRelease)(
      options.file,
      options.product.protectedFiles || [],
    ),
    options.product,
  );

  if (wasRunning) {
    await host.adapter
      .startApplication(options.application.appId)
      .catch(() => null);
  }

  return true;
}
