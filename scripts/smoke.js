"use strict";

require("module-alias/register");

const path = require("path");
const mongoose = require("mongoose");
const AdmZip = require("adm-zip");

const stderrChunks = [];
const originalStderrWrite = process.stderr.write.bind(process.stderr);

process.stderr.write = (chunk, encoding, callback) => {
  stderrChunks.push(String(chunk));
  return originalStderrWrite(chunk, encoding, callback);
};

const {
  moneyFormatter,
  formatUptime,
  getRemainingTimeFormated,
} = require("../src/functions/utils");
const {
  PAYMENT_GATEWAYS,
  getPaymentGatewayLabel,
  isAutomaticPaymentGateway,
  getChargeAmount,
  getCreditedAmount,
} = require("../src/functions/payment-gateways");
const {
  calculateAutomaticGatewayAmount,
  calculateManualGatewayAmount,
  validateSelectedPaymentGateway,
} = require("../src/functions/payment-service");
const {
  PRODUCT_DELIVERY_MODES,
  getConfiguredTierKeys,
  getConfiguredDeliveryModes,
  getProductTierConfig,
  getProductDeliveryConfig,
  getTierDurationOptions,
  getDeliveryDurationOptions,
} = require("../src/functions/service-product");
const {
  normalizeCheckoutCartScope,
} = require("../src/functions/checkout-context");
const PageSystem = require("../src/functions/pages").default;
const { emojis } = require("../src/functions/emojis");
const {
  generateChartBuffer,
  ChartType,
  ChartColor,
} = require("../src/functions/chart");
const hosts = require("../src/functions/hosts");
const {
  buildStoreLookupQueryForUser,
  findStoreOwnerSettings,
  HOST_PROVIDERS,
} = require("../src/functions/hosts/compat");
const { runMultiHostBackfill } = require("../src/functions/hosts/migration");
const {
  buildSquareCloudAppConfig,
  prepareSquareCloudRelease,
  filterProtectedFilesFromRelease,
  DEFAULT_HOST_MEMORY_MB,
} = require("../src/functions/hosts/release");

[
  "../src/databases/schemas/applications",
  "../src/databases/schemas/carts-buy",
  "../src/databases/schemas/carts-renew",
  "../src/databases/schemas/coupons",
  "../src/databases/schemas/extracts",
  "../src/databases/schemas/global-settings",
  "../src/databases/schemas/products",
  "../src/databases/schemas/stores",
  "../src/databases/schemas/user-settings",
].forEach((schemaPath) => require(schemaPath));

function setByPath(target, pathExpression, value) {
  const keys = pathExpression.split(".");
  let cursor = target;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }

  cursor[keys[keys.length - 1]] = value;
}

function createBackfillCollection(documents) {
  return {
    documents,
    find() {
      return {
        lean: async () =>
          documents.map((document) => JSON.parse(JSON.stringify(document))),
      };
    },
    async updateOne(filter, update) {
      const document = documents.find(
        (item) => String(item._id) === String(filter._id),
      );
      if (!document) {
        return;
      }
      Object.entries((update && update.$set) || {}).forEach(([key, value]) => {
        setByPath(document, key, value);
      });
    },
  };
}

(async () => {
  const resolvedAlias = require.resolve("@root/src/databases");
  const expectedAliasTarget = path.join("src", "databases", "index.js");

  if (!resolvedAlias.endsWith(expectedAliasTarget)) {
    throw new Error(`Alias @root nao resolveu para ${expectedAliasTarget}`);
  }

  if (moneyFormatter(123456) !== "1234") {
    throw new Error("moneyFormatter failed");
  }

  if (!formatUptime(90061000).includes("1d")) {
    throw new Error("formatUptime failed");
  }

  if (getRemainingTimeFormated(new Date(Date.now() + 1000)) === "Expirado") {
    throw new Error("getRemainingTimeFormated failed");
  }

  if (
    getPaymentGatewayLabel(PAYMENT_GATEWAYS.MERCADO_PAGO) !== "Mercado Pago"
  ) {
    throw new Error("Payment gateway label failed");
  }

  if (!isAutomaticPaymentGateway(PAYMENT_GATEWAYS.MERCADO_PAGO)) {
    throw new Error("Mercado Pago should be automatic");
  }

  if (calculateAutomaticGatewayAmount(10) <= 10) {
    throw new Error("Automatic gateway amount calculation failed");
  }

  if (calculateManualGatewayAmount(10) !== 10) {
    throw new Error("Manual gateway amount calculation failed");
  }

  const mercadoPagoGatewayErrors = validateSelectedPaymentGateway(
    {
      mercado_pago_credentials: {
        access_token: "APP_USR-token",
      },
    },
    PAYMENT_GATEWAYS.MERCADO_PAGO,
    { requirePublicKey: true },
  );

  if (mercadoPagoGatewayErrors.length) {
    throw new Error(
      "Mercado Pago deveria validar somente com Access Token.",
    );
  }

  const managedProduct = {
    productType: "managed_service",
    currentReleaseVersion: "1.0.0",
    tiers: {
      shared: {
        enabled: true,
        prices: {
          monthly: 19.9,
        },
      },
      private: {
        enabled: true,
        prices: {
          monthly: 29.9,
          lifetime: 99.9,
        },
      },
    },
  };

  const configuredModes = getConfiguredDeliveryModes(managedProduct);
  if (configuredModes.join(",") !== "shared,private") {
    throw new Error("Configured delivery modes failed");
  }

  if (
    JSON.stringify(getConfiguredTierKeys(managedProduct)) !==
    JSON.stringify(configuredModes)
  ) {
    throw new Error("Configured tier key alias failed");
  }

  const privateConfig = getProductDeliveryConfig(
    managedProduct,
    PRODUCT_DELIVERY_MODES.PRIVATE,
  );
  const privateTierConfig = getProductTierConfig(
    managedProduct,
    PRODUCT_DELIVERY_MODES.PRIVATE,
  );

  if (JSON.stringify(privateTierConfig) !== JSON.stringify(privateConfig)) {
    throw new Error("Product tier config alias failed");
  }

  const privateDurationOptions = getDeliveryDurationOptions(
    managedProduct,
    PRODUCT_DELIVERY_MODES.PRIVATE,
  );
  if (
    JSON.stringify(getTierDurationOptions(managedProduct, "private")) !==
    JSON.stringify(privateDurationOptions)
  ) {
    throw new Error("Tier duration options alias failed");
  }

  if (getChargeAmount({ finalPrice: 12.34, creditedAmount: 12 }) !== 12.34) {
    throw new Error("Charge amount calculation failed");
  }

  if (getCreditedAmount({ creditedAmount: 10, finalPrice: 10.12 }) !== 10) {
    throw new Error("Credited amount calculation failed");
  }

  if (normalizeCheckoutCartScope("BUY") !== "buy") {
    throw new Error("Checkout cart scope normalization failed");
  }

  const storeLookupQuery = buildStoreLookupQueryForUser(
    {
      userId_discord: "discord-1",
      hostAccounts: {
        campos: { accountId: "campos-1" },
        square: { accountId: "square-1" },
      },
    },
    "discord-1",
  );
  const queryVariants = storeLookupQuery.$or || [];
  if (
    !queryVariants.some((item) => item.ownerDiscordId === "discord-1") ||
    !queryVariants.some((item) => item.ownerId_campos === "campos-1") ||
    !queryVariants.some(
      (item) =>
        item.hostProvider === HOST_PROVIDERS.CAMPOS &&
        item.hostOwnerId === "campos-1",
    ) ||
    !queryVariants.some(
      (item) =>
        item.hostProvider === HOST_PROVIDERS.SQUARE &&
        item.hostOwnerId === "square-1",
    )
  ) {
    throw new Error("buildStoreLookupQueryForUser failed");
  }

  const fallbackOwnerSettings = await findStoreOwnerSettings(
    {
      userSettings: {
        async findOne(query) {
          if (query.userId_discord === "missing-user") {
            return null;
          }
          if (query["hostAccounts.square.accountId"] === "square-owner") {
            return {
              userId_discord: "discord-owner",
              hostAccounts: { square: { accountId: "square-owner" } },
            };
          }
          return null;
        },
      },
    },
    {
      ownerDiscordId: "missing-user",
      hostProvider: HOST_PROVIDERS.SQUARE,
      hostOwnerId: "square-owner",
    },
  );
  if (
    !fallbackOwnerSettings ||
    fallbackOwnerSettings.userId_discord !== "discord-owner"
  ) {
    throw new Error("findStoreOwnerSettings fallback failed");
  }

  const fakeDatabases = {
    userSettings: createBackfillCollection([
      {
        _id: "user-1",
        userId_discord: "discord-owner",
        userId_campos: "campos-owner",
        token_campos: "campos-token",
      },
    ]),
    stores: createBackfillCollection([
      {
        _id: "store-1",
        ownerId_campos: "campos-owner",
        teamId_campos: "team-1",
      },
    ]),
    applications: createBackfillCollection([
      { _id: "app-1", storeId: "store-1" },
    ]),
    products: createBackfillCollection([]),
  };
  await runMultiHostBackfill(fakeDatabases);
  if (
    fakeDatabases.userSettings.documents[0].hostAccounts.campos.accountId !==
      "campos-owner" ||
    fakeDatabases.userSettings.documents[0].hostAccounts.campos.apiToken !==
      "campos-token" ||
    fakeDatabases.stores.documents[0].hostProvider !== HOST_PROVIDERS.CAMPOS ||
    fakeDatabases.stores.documents[0].ownerDiscordId !== "discord-owner" ||
    fakeDatabases.stores.documents[0].hostWorkspaceId !== "team-1" ||
    fakeDatabases.applications.documents[0].hostProvider !==
      HOST_PROVIDERS.CAMPOS
  ) {
    throw new Error("runMultiHostBackfill failed");
  }

  const pager = new PageSystem({ data: [1, 2, 3, 4, 5], maxItemPerPage: 2 });

  if (pager.totalPages !== 3) {
    throw new Error("PageSystem totalPages failed");
  }

  if (pager.getPage(2).join(",") !== "3,4") {
    throw new Error("PageSystem getPage failed");
  }

  if (!emojis.config) {
    throw new Error("Emojis map failed");
  }

  const squareConfig = buildSquareCloudAppConfig({
    name: "Teste",
    runtimeEnvironment: "nodejs",
    runCommand: "node src/main.js",
  });
  if (
    !squareConfig.includes("MAIN=index.js") ||
    !squareConfig.includes("STARTUP=node src/main.js") ||
    !squareConfig.includes(`MEMORY=${DEFAULT_HOST_MEMORY_MB}`) ||
    !squareConfig.includes("VERSION=recommended")
  ) {
    throw new Error("buildSquareCloudAppConfig failed");
  }

  const releaseZip = new AdmZip();
  releaseZip.addFile("index.js", Buffer.from("console.log('ok');", "utf8"));
  const preparedRelease = prepareSquareCloudRelease({
    product: {
      name: "Teste",
      runtimeEnvironment: "nodejs",
      runCommand: "node index.js",
    },
    buffer: releaseZip.toBuffer(),
  });
  if (!preparedRelease.getEntry("squarecloud.app")) {
    throw new Error("prepareSquareCloudRelease fallback failed");
  }
  const existingConfigZip = new AdmZip();
  existingConfigZip.addFile(
    "squarecloud.app",
    Buffer.from("MAIN=custom.js", "utf8"),
  );
  const preparedExistingConfigRelease = prepareSquareCloudRelease({
    product: {
      name: "Teste",
      runtimeEnvironment: "nodejs",
      runCommand: "node index.js",
    },
    buffer: existingConfigZip.toBuffer(),
  });
  if (
    preparedExistingConfigRelease
      .getEntry("squarecloud.app")
      .getData()
      .toString("utf8") !== "MAIN=custom.js"
  ) {
    throw new Error("prepareSquareCloudRelease existing config failed");
  }

  const releaseWithProtectedFiles = new AdmZip();
  releaseWithProtectedFiles.addFile("index.js", Buffer.from("1", "utf8"));
  releaseWithProtectedFiles.addFile(
    "config/private.json",
    Buffer.from("2", "utf8"),
  );
  const filteredReleaseBuffer = filterProtectedFilesFromRelease(
    releaseWithProtectedFiles.toBuffer(),
    ["config/**"],
  );
  const filteredRelease = new AdmZip(filteredReleaseBuffer);
  if (
    filteredRelease.getEntry("config/private.json") ||
    !filteredRelease.getEntry("index.js")
  ) {
    throw new Error("filterProtectedFilesFromRelease failed");
  }

  const axiosModuleId = require.resolve("axios");
  const mercadoPagoWrapperModuleId = require.resolve(
    "../src/functions/mercadopago-wrapper",
  );
  const originalAxiosModule = require.cache[axiosModuleId].exports;
  const capturedMercadoPagoRequests = [];
  require.cache[axiosModuleId].exports = async (config) => {
    capturedMercadoPagoRequests.push(config);
    return { data: { ok: true } };
  };
  delete require.cache[mercadoPagoWrapperModuleId];
  const mercadoPagoWrapper = require("../src/functions/mercadopago-wrapper").default;
  await mercadoPagoWrapper.request(
    { accessToken: "token-123" },
    {
      method: "POST",
      url: "/v1/payments",
      headers: { "X-Idempotency-Key": "idempotency-1" },
    },
  );
  require.cache[axiosModuleId].exports = originalAxiosModule;
  delete require.cache[mercadoPagoWrapperModuleId];

  if (
    !capturedMercadoPagoRequests.length ||
    capturedMercadoPagoRequests[0].headers.Authorization !== "Bearer token-123" ||
    capturedMercadoPagoRequests[0].headers["X-Idempotency-Key"] !==
      "idempotency-1"
  ) {
    throw new Error("Mercado Pago header merge failed");
  }

  const originalGetHostAdapterForStore = hosts.getHostAdapterForStore;
  const originalGetHostAdapterForApplication =
    hosts.getHostAdapterForApplication;
  const runtimeCalls = [];
  let capturedCreateOptions = null;
  let capturedEnvironmentOptions = null;
  let capturedCommit = null;
  const fakeAdapter = {
    async getPlanUsage() {
      return { freeMemoryMB: DEFAULT_HOST_MEMORY_MB };
    },
    async createApplication(options) {
      capturedCreateOptions = options;
      runtimeCalls.push("create");
      return { id: "remote-app-1" };
    },
    async getApplicationStatus() {
      return { running: true };
    },
    async stopApplication() {
      runtimeCalls.push("stop");
      return true;
    },
    async overwriteEnvironment(appId, options) {
      capturedEnvironmentOptions = { appId, options };
      runtimeCalls.push("overwrite-env");
      return true;
    },
    async startApplication() {
      runtimeCalls.push("start");
      return true;
    },
    async commitApplication(appId, file, product) {
      capturedCommit = { appId, file, product };
      runtimeCalls.push("commit");
      return true;
    },
  };

  hosts.getHostAdapterForStore = async () => ({
    adapter: fakeAdapter,
    provider: HOST_PROVIDERS.SQUARE,
  });
  hosts.getHostAdapterForApplication = async () => ({
    adapter: fakeAdapter,
    provider: HOST_PROVIDERS.SQUARE,
  });

  await hosts.assertStoreHasAvailableMemory({}, { hostProvider: "square" });
  await hosts.createManagedApplication(
    {},
    {
      store: { hostProvider: "square", hostWorkspaceId: "workspace-1" },
      appName: "Managed App",
      ownerId: "discord-owner",
      applicationId: "local-app-1",
      botToken: "bot-token",
      file: Buffer.from("zip", "utf8"),
      product: {
        runtimeEnvironment: "nodejs",
        runCommand: "node index.js",
      },
    },
  );
  if (
    !capturedCreateOptions ||
    capturedCreateOptions.workspaceId !== "workspace-1" ||
    capturedCreateOptions.memoryMB !== DEFAULT_HOST_MEMORY_MB ||
    !capturedCreateOptions.environmentVariables.some(
      (item) => item.key === "BOT_TOKEN" && item.value === "bot-token",
    )
  ) {
    throw new Error("createManagedApplication failed");
  }

  await hosts.updateManagedApplicationEnvironment(
    {},
    {
      application: { _id: "local-app-1", appId: "remote-app-1" },
      store: { hostProvider: "square" },
      product: {
        runtimeEnvironment: "nodejs",
        runCommand: "node index.js",
      },
      ownerId: "discord-owner",
      botToken: "new-token",
    },
  );
  if (
    !capturedEnvironmentOptions ||
    capturedEnvironmentOptions.appId !== "remote-app-1" ||
    !capturedEnvironmentOptions.options.environmentVariables.some(
      (item) => item.key === "BOT_TOKEN" && item.value === "new-token",
    ) ||
    runtimeCalls.filter((item) => item === "stop").length < 1 ||
    runtimeCalls.filter((item) => item === "start").length < 1
  ) {
    throw new Error("updateManagedApplicationEnvironment failed");
  }

  const commitZip = new AdmZip();
  commitZip.addFile("index.js", Buffer.from("console.log('ok');", "utf8"));
  commitZip.addFile("config/private.json", Buffer.from("secret", "utf8"));
  await hosts.commitManagedApplicationRelease(
    {},
    {
      application: { _id: "local-app-1", appId: "remote-app-1" },
      store: { hostProvider: "square" },
      product: {
        runtimeEnvironment: "nodejs",
        runCommand: "node index.js",
        protectedFiles: ["config/**"],
      },
      file: commitZip.toBuffer(),
    },
  );
  hosts.getHostAdapterForStore = originalGetHostAdapterForStore;
  hosts.getHostAdapterForApplication = originalGetHostAdapterForApplication;
  if (!capturedCommit || capturedCommit.appId !== "remote-app-1") {
    throw new Error("commitManagedApplicationRelease failed");
  }
  const committedZip = new AdmZip(capturedCommit.file);
  if (
    committedZip.getEntry("config/private.json") ||
    !committedZip.getEntry("index.js")
  ) {
    throw new Error("commitManagedApplicationRelease protected files failed");
  }

  const buffer = await generateChartBuffer({
    labels: ["A", "B"],
    values: [1, 2],
    type: ChartType.BAR,
    chartColor: ChartColor.BLUE,
    width: 320,
    height: 180,
  });

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Chart buffer generation failed");
  }

  const modelNames = mongoose.modelNames();
  const expectedModels = [
    "applications",
    "carts-buy",
    "carts-renew",
    "coupons",
    "extracts",
    "global-settings",
    "products",
    "stores",
    "user-settings",
  ];
  const missingModels = expectedModels.filter(
    (name) => !modelNames.includes(name),
  );

  if (missingModels.length > 0) {
    throw new Error(`Missing mongoose models: ${missingModels.join(", ")}`);
  }

  const stderrOutput = stderrChunks.join("");
  const disallowedWarnings = [
    /couldn't load font/i,
    /duplicate schema index/i,
  ].filter((pattern) => pattern.test(stderrOutput));

  if (disallowedWarnings.length > 0) {
    throw new Error(
      `Warnings encontrados durante smoke test:\n${stderrOutput}`,
    );
  }

  console.log("Smoke tests passed.");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.stderr.write = originalStderrWrite;
  });
