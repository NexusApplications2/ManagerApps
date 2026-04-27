"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_HOST_MEMORY_MB = void 0;
exports.prepareSquareCloudRelease = prepareSquareCloudRelease;
exports.buildSquareCloudAppConfig = buildSquareCloudAppConfig;
exports.filterProtectedFilesFromRelease = filterProtectedFilesFromRelease;

const AdmZip = require("adm-zip");
const ignore = require("ignore");

const DEFAULT_HOST_MEMORY_MB = 256;

exports.DEFAULT_HOST_MEMORY_MB = DEFAULT_HOST_MEMORY_MB;

function prepareSquareCloudRelease(input) {
  const zip = input instanceof AdmZip ? input : new AdmZip(input.buffer);
  const existingConfig =
    zip.getEntry("squarecloud.app") || zip.getEntry("squarecloud.config");

  if (!existingConfig) {
    zip.addFile(
      "squarecloud.app",
      Buffer.from(buildSquareCloudAppConfig(input.product), "utf8"),
    );
  }

  return zip;
}

function buildSquareCloudAppConfig(product) {
  const mainFile = inferMainFile(product);
  const runtime = product.runtimeEnvironment === "python" ? "python" : "nodejs";

  return [
    `DISPLAY_NAME=${sanitizeValue(product.name || "Manager App")}`,
    `MAIN=${mainFile}`,
    `AUTORESTART=true`,
    `STARTUP=${sanitizeValue(product.runCommand || inferDefaultStartup(runtime))}`,
    `MEMORY=${DEFAULT_HOST_MEMORY_MB}`,
    `VERSION=recommended`,
    `RUNTIME=${runtime}`,
  ].join("\n");
}

function filterProtectedFilesFromRelease(buffer, protectedFiles = []) {
  if (!protectedFiles.length) {
    return buffer;
  }

  const zip = buffer instanceof AdmZip ? buffer : new AdmZip(buffer);
  const ig = ignore().add(protectedFiles);

  zip.getEntries().forEach((entry) => {
    if (ig.ignores(entry.entryName)) {
      zip.deleteFile(entry.entryName);
    }
  });

  return zip.toBuffer();
}

function inferMainFile(product) {
  const runtime = product.runtimeEnvironment === "python" ? "python" : "nodejs";
  const runCommand = String(product.runCommand || "").trim();

  if (runtime === "python") {
    return runCommand.includes("src/") ? "src/main.py" : "main.py";
  }

  if (runCommand.includes("src/index.js")) {
    return "src/index.js";
  }

  return "index.js";
}

function inferDefaultStartup(runtime) {
  return runtime === "python" ? "python main.py" : "node index.js";
}

function sanitizeValue(value) {
  return String(value || "")
    .replace(/\r?\n/g, " ")
    .trim();
}
