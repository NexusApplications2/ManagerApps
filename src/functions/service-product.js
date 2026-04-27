"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.RELEASE_CHANNELS =
  exports.DEFAULT_RUN_COMMAND =
  exports.DEFAULT_RUNTIME =
  exports.PRODUCT_TYPES =
  exports.PRODUCT_DELIVERY_MODES =
    void 0;
exports.normalizeDeliveryMode = normalizeDeliveryMode;
exports.normalizeProductType = normalizeProductType;
exports.isManagedServiceProduct = isManagedServiceProduct;
exports.getProductDeliveryConfig = getProductDeliveryConfig;
exports.getProductTierConfig = getProductTierConfig;
exports.getConfiguredDeliveryModes = getConfiguredDeliveryModes;
exports.getConfiguredTierKeys = getConfiguredTierKeys;
exports.getProductPriceTable = getProductPriceTable;
exports.getPriceFromTable = getPriceFromTable;
exports.getDeliveryDurationOptions = getDeliveryDurationOptions;
exports.getTierDurationOptions = getTierDurationOptions;
exports.getProductRuntimeEnvironment = getProductRuntimeEnvironment;
exports.getProductRunCommand = getProductRunCommand;
exports.getProductReleaseChannel = getProductReleaseChannel;
exports.buildDedicatedBotDatabaseName = buildDedicatedBotDatabaseName;
exports.getSharedBotInvitePermissions = getSharedBotInvitePermissions;
exports.resolveSharedBotClientId = resolveSharedBotClientId;
exports.buildSharedBotInviteUrl = buildSharedBotInviteUrl;

const fs_1 = require("fs");
const path_1 = require("path");

const PRODUCT_DELIVERY_MODES = {
  SHARED: "shared",
  PRIVATE: "private",
};
exports.PRODUCT_DELIVERY_MODES = PRODUCT_DELIVERY_MODES;

const PRODUCT_TYPES = {
  LEGACY_HOSTED: "legacy_hosted",
  MANAGED_SERVICE: "managed_service",
};
exports.PRODUCT_TYPES = PRODUCT_TYPES;

const DEFAULT_RUNTIME = "nodejs";
exports.DEFAULT_RUNTIME = DEFAULT_RUNTIME;

const DEFAULT_RUN_COMMAND = "node src/index.js";
exports.DEFAULT_RUN_COMMAND = DEFAULT_RUN_COMMAND;

const RELEASE_CHANNELS = {
  LOCAL_SOURCE: "local_source",
  PRODUCT_RELEASE: "product_release",
};
exports.RELEASE_CHANNELS = RELEASE_CHANNELS;

function normalizeDeliveryMode(
  deliveryMode,
  fallback = PRODUCT_DELIVERY_MODES.PRIVATE,
) {
  const normalized = String(deliveryMode || "")
    .trim()
    .toLowerCase();

  if (normalized === PRODUCT_DELIVERY_MODES.SHARED) {
    return PRODUCT_DELIVERY_MODES.SHARED;
  }

  if (normalized === PRODUCT_DELIVERY_MODES.PRIVATE) {
    return PRODUCT_DELIVERY_MODES.PRIVATE;
  }

  return fallback;
}

function normalizeProductType(productType) {
  return String(productType || "").trim().toLowerCase() ===
    PRODUCT_TYPES.MANAGED_SERVICE
    ? PRODUCT_TYPES.MANAGED_SERVICE
    : PRODUCT_TYPES.LEGACY_HOSTED;
}

function isManagedServiceProduct(product) {
  return (
    normalizeProductType(product === null || product === void 0 ? void 0 : product.productType) ===
    PRODUCT_TYPES.MANAGED_SERVICE
  );
}

function getProductDeliveryConfig(product, deliveryMode) {
  const normalizedMode = normalizeDeliveryMode(deliveryMode);

  if (!isManagedServiceProduct(product)) {
    if (normalizedMode !== PRODUCT_DELIVERY_MODES.PRIVATE) {
      return null;
    }

    return {
      key: PRODUCT_DELIVERY_MODES.PRIVATE,
      enabled: true,
      prices: product === null || product === void 0 ? void 0 : product.prices,
      runtimeEnvironment: product === null || product === void 0 ? void 0 : product.runtimeEnvironment,
      runCommand: product === null || product === void 0 ? void 0 : product.runCommand,
      releaseChannel: RELEASE_CHANNELS.PRODUCT_RELEASE,
      accessBot: null,
      sourcePath: "",
    };
  }

  const serviceConfig =
    ((product === null || product === void 0 ? void 0 : product.tiers) || {})[normalizedMode] || {};
  const prices =
    serviceConfig.prices ||
    (normalizedMode === PRODUCT_DELIVERY_MODES.PRIVATE
      ? product.prices || {}
      : {});
  const enabledByPrice = Object.values(prices || {}).some(
    (value) => Number(value) > 0,
  );
  const enabled =
    serviceConfig.enabled === undefined
      ? normalizedMode === PRODUCT_DELIVERY_MODES.PRIVATE
        ? enabledByPrice || Boolean(product.currentReleaseVersion)
        : enabledByPrice
      : Boolean(serviceConfig.enabled);

  return {
    key: normalizedMode,
    enabled,
    prices,
    runtimeEnvironment:
      serviceConfig.runtimeEnvironment ||
      product.runtimeEnvironment ||
      DEFAULT_RUNTIME,
    runCommand:
      serviceConfig.runCommand || product.runCommand || DEFAULT_RUN_COMMAND,
    releaseChannel:
      serviceConfig.releaseChannel || RELEASE_CHANNELS.LOCAL_SOURCE,
    accessBot:
      normalizedMode === PRODUCT_DELIVERY_MODES.SHARED
        ? Object.assign(
            {},
            serviceConfig.accessBot || serviceConfig.sharedBot || {},
          )
        : null,
    sourcePath: serviceConfig.sourcePath || "",
  };
}

function getConfiguredDeliveryModes(product) {
  if (!isManagedServiceProduct(product)) {
    return [PRODUCT_DELIVERY_MODES.PRIVATE];
  }

  return [
    PRODUCT_DELIVERY_MODES.SHARED,
    PRODUCT_DELIVERY_MODES.PRIVATE,
  ].filter((deliveryMode) => {
    const config = getProductDeliveryConfig(product, deliveryMode);
    return Boolean(config === null || config === void 0 ? void 0 : config.enabled);
  });
}

function getProductTierConfig(product, deliveryMode) {
  return getProductDeliveryConfig(product, deliveryMode);
}

function getConfiguredTierKeys(product) {
  return getConfiguredDeliveryModes(product);
}

function getProductPriceTable(product, deliveryMode) {
  const config = getProductDeliveryConfig(product, deliveryMode);
  return (config === null || config === void 0 ? void 0 : config.prices) || {};
}

function getPriceFromTable(priceTable, durationKey) {
  const amount = Number((priceTable || {})[durationKey]);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function getDeliveryDurationOptions(product, deliveryMode) {
  const priceTable = getProductPriceTable(product, deliveryMode);
  return ["weekly", "biweekly", "monthly", "lifetime"]
    .filter((key) => getPriceFromTable(priceTable, key) > 0)
    .map((key) => ({
      key,
      price: getPriceFromTable(priceTable, key),
    }));
}

function getTierDurationOptions(product, deliveryMode) {
  return getDeliveryDurationOptions(product, deliveryMode);
}

function getProductRuntimeEnvironment(
  product,
  deliveryMode = PRODUCT_DELIVERY_MODES.PRIVATE,
) {
  const config = getProductDeliveryConfig(product, deliveryMode);
  return (config === null || config === void 0 ? void 0 : config.runtimeEnvironment) || DEFAULT_RUNTIME;
}

function getProductRunCommand(
  product,
  deliveryMode = PRODUCT_DELIVERY_MODES.PRIVATE,
) {
  const config = getProductDeliveryConfig(product, deliveryMode);
  return (config === null || config === void 0 ? void 0 : config.runCommand) || DEFAULT_RUN_COMMAND;
}

function getProductReleaseChannel(product) {
  const config = getProductDeliveryConfig(
    product,
    PRODUCT_DELIVERY_MODES.PRIVATE,
  );
  return (config === null || config === void 0 ? void 0 : config.releaseChannel) || RELEASE_CHANNELS.PRODUCT_RELEASE;
}

function buildDedicatedBotDatabaseName(applicationId) {
  return `managed_service_app_${String(applicationId || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase()}`;
}

function getSharedBotInvitePermissions(product) {
  const sharedBotConfig =
    ((((product || {}).tiers || {}).shared || {}).accessBot || {}).invitePermissions ||
    ((((product || {}).tiers || {}).shared || {}).sharedBot || {}).invitePermissions;

  return String(
    sharedBotConfig || process.env.SHARED_BOT_INVITE_PERMISSIONS || "8",
  );
}

function resolveSharedBotClientId(product) {
  const directClientId =
    ((((product || {}).tiers || {}).shared || {}).accessBot || {}).clientId ||
    ((((product || {}).tiers || {}).shared || {}).sharedBot || {}).clientId ||
    process.env.SHARED_BOT_CLIENT_ID ||
    "";

  if (directClientId) {
    return String(directClientId);
  }

  const configuredToken = process.env.SHARED_BOT_TOKEN;
  if (configuredToken) {
    return decodeDiscordTokenClientId(configuredToken);
  }

  const sourcePath =
    process.env.SHARED_BOT_SOURCE_DIR ||
    process.env.MANAGED_SERVICE_SOURCE_PATH ||
    "";
  if (!sourcePath) {
    return "";
  }

  const tokenPath = (0, path_1.join)(sourcePath, "token.json");
  if (!(0, fs_1.existsSync)(tokenPath)) {
    return "";
  }

  try {
    const tokenConfig = JSON.parse((0, fs_1.readFileSync)(tokenPath, "utf8"));
    return decodeDiscordTokenClientId(tokenConfig.token || "");
  } catch (_error) {
    return "";
  }
}

function buildSharedBotInviteUrl(input = {}) {
  const clientId =
    input.clientId || resolveSharedBotClientId(input.product);

  if (!clientId) {
    return null;
  }

  const permissions =
    input.permissions || getSharedBotInvitePermissions(input.product);
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=${permissions}&scope=bot%20applications.commands`;
}

function decodeDiscordTokenClientId(token) {
  const firstSegment = String(token || "").trim().split(".")[0];
  if (!firstSegment) {
    return "";
  }

  try {
    return Buffer.from(firstSegment, "base64").toString("utf8");
  } catch (_error) {
    return "";
  }
}
