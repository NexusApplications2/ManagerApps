"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDedicatedBotEnvironmentVariables =
  exports.readManagedServiceReleaseBuffer =
  exports.resolveManagedServiceSourcePath =
    void 0;

const path_1 = require("path");
const promises_1 = require("fs/promises");
const adm_zip_1 = require("adm-zip");
const service_product_1 = require("./service-product");

const DEFAULT_IGNORE_SEGMENTS = new Set([
  ".git",
  "node_modules",
  ".cache",
  ".turbo",
]);

function resolveManagedServiceSourcePath(product) {
  return (
    (((product || {}).tiers || {}).private || {}).sourcePath ||
    process.env.MANAGED_SERVICE_SOURCE_PATH ||
    process.env.SHARED_BOT_SOURCE_DIR ||
    ""
  );
}
exports.resolveManagedServiceSourcePath = resolveManagedServiceSourcePath;

async function readManagedServiceReleaseBuffer(product) {
  const releaseChannel = (0, service_product_1.getProductReleaseChannel)(product);

  if (
    releaseChannel === service_product_1.RELEASE_CHANNELS.PRODUCT_RELEASE &&
    product.currentReleaseVersion
  ) {
    const releasePath = (0, path_1.resolve)(
      process.cwd(),
      "releases",
      String(product._id),
      `${product.currentReleaseVersion}.zip`,
    );
    return promises_1.readFile(releasePath);
  }

  const sourcePath = resolveManagedServiceSourcePath(product);
  if (!sourcePath) {
    throw new Error(
      "A pasta do bot privado não foi configurada. Defina a origem na configuração rápida do produto ou use MANAGED_SERVICE_SOURCE_PATH.",
    );
  }

  const zip = new adm_zip_1.default();
  await addDirectoryToZip(zip, sourcePath, sourcePath);
  return zip.toBuffer();
}
exports.readManagedServiceReleaseBuffer = readManagedServiceReleaseBuffer;

function buildDedicatedBotEnvironmentVariables(input) {
  return [
    { key: "BOT_TOKEN", value: input.botToken },
    { key: "BOT_OWNER_ID", value: input.ownerId },
    { key: "APPLICATION_ID", value: input.applicationId },
    { key: "DEPLOYMENT_MODE", value: input.deploymentMode || "private" },
    { key: "MONGO_URI", value: input.mongoUri },
    {
      key: "MONGO_DB_NAME",
      value: (0, service_product_1.buildDedicatedBotDatabaseName)(input.applicationId),
    },
    {
      key: "MANAGER_BRIDGE_MONGO_URI",
      value: input.bridgeMongoUri || input.mongoUri,
    },
    {
      key: "MANAGER_BRIDGE_DB_NAME",
      value: process.env.MANAGER_BRIDGE_DB_NAME || "manager_bridge",
    },
  ].filter((item) => item.value);
}
exports.buildDedicatedBotEnvironmentVariables = buildDedicatedBotEnvironmentVariables;

async function addDirectoryToZip(zip, rootPath, currentPath) {
  const entries = await promises_1.readdir(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    if (DEFAULT_IGNORE_SEGMENTS.has(entry.name)) {
      continue;
    }

    const fullPath = (0, path_1.join)(currentPath, entry.name);
    const relativePath = (0, path_1.relative)(rootPath, fullPath).replace(/\\/g, "/");

    if (
      relativePath === "token.json" ||
      relativePath.startsWith(".git/") ||
      relativePath.startsWith("node_modules/") ||
      relativePath.startsWith(".cache/")
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, rootPath, fullPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const fileBuffer = await promises_1.readFile(fullPath);
    zip.addFile(relativePath, fileBuffer);
  }
}
