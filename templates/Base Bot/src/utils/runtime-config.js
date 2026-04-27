"use strict";

require("dotenv").config();

function getEnv(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function getFirstEnv(names, fallback = "") {
  for (const name of names) {
    const value = getEnv(name);
    if (value) {
      return value;
    }
  }

  return String(fallback || "").trim();
}

function getBooleanEnv(name, fallback = false) {
  const raw = getEnv(name);
  if (!raw) {
    return Boolean(fallback);
  }

  return ["1", "true", "yes", "sim", "on"].includes(raw.toLowerCase());
}

function getManagerBridgeMongoUri() {
  return getFirstEnv(
    [
      "MANAGER_BRIDGE_MONGO_URI",
      "LICENSE_BRIDGE_MONGO_URI",
      "MONGO_DB_URL",
      "MONGO_URI",
    ],
    "mongodb://127.0.0.1:27017",
  );
}

function getManagerBridgeDbName() {
  return getFirstEnv(
    ["MANAGER_BRIDGE_DB_NAME", "LICENSE_BRIDGE_DB_NAME"],
    "manager_bridge",
  );
}

function shouldAutoEnsureBridgeIndexes() {
  return getBooleanEnv("AUTO_ENSURE_BRIDGE_INDEXES", false);
}

function shouldApplyGlobalAvatarFromLicense() {
  return getBooleanEnv("APPLY_LICENSE_AVATAR", false);
}

module.exports = {
  getEnv,
  getFirstEnv,
  getBooleanEnv,
  getManagerBridgeMongoUri,
  getManagerBridgeDbName,
  shouldAutoEnsureBridgeIndexes,
  shouldApplyGlobalAvatarFromLicense,
};
