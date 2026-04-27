"use strict";

const crypto = require("crypto");
const { MongoClient } = require("mongodb");
const runtimeConfig = require("./runtime-config");

const LICENSE_STATUS = {
  PENDING_BIND: "pending_bind",
  ACTIVE: "active",
  GRACE_PERIOD: "grace_period",
  EXPIRED: "expired",
};

let clientPromise = null;
let indexesPromise = null;

function hashClaimKey(claimKey) {
  return crypto
    .createHash("sha256")
    .update(String(claimKey || "").trim().toUpperCase())
    .digest("hex");
}

async function getBridgeDatabase() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = new MongoClient(
        runtimeConfig.getManagerBridgeMongoUri(),
        {
          family: 4,
          maxPoolSize: 5,
        },
      );

      await client.connect();
      return client.db(runtimeConfig.getManagerBridgeDbName());
    })();
  }

  return clientPromise;
}

async function getEntitlementCollection() {
  const db = await getBridgeDatabase();
  return db.collection("entitlements");
}

async function getAuditCollection() {
  const db = await getBridgeDatabase();
  return db.collection("entitlement_audit");
}

async function ensureBridgeIndexes() {
  if (indexesPromise) {
    return indexesPromise;
  }

  indexesPromise = (async () => {
    const entitlements = await getEntitlementCollection();
    const audit = await getAuditCollection();

    await Promise.all([
      entitlements.createIndex({ applicationId: 1 }, { unique: true }),
      entitlements.createIndex(
        { claimKeyHash: 1 },
        { unique: true, sparse: true },
      ),
      entitlements.createIndex({ boundGuildId: 1 }),
      entitlements.createIndex({ status: 1, expiresAt: 1 }),
      audit.createIndex({ applicationId: 1, createdAt: -1 }),
    ]);
  })().catch((error) => {
    indexesPromise = null;
    throw error;
  });

  return indexesPromise;
}

async function maybeEnsureBridgeIndexes() {
  if (!runtimeConfig.shouldAutoEnsureBridgeIndexes()) {
    return;
  }

  await ensureBridgeIndexes();
}

async function auditEntitlementEvent(applicationId, event, payload = {}) {
  const audit = await getAuditCollection();

  await audit.insertOne({
    applicationId: String(applicationId || ""),
    entitlementId: String(applicationId || ""),
    event,
    payload,
    createdAt: new Date(),
  });
}

function isExpiredByDate(license) {
  if (!license || !license.expiresAt) {
    return false;
  }

  return new Date(license.expiresAt).getTime() <= Date.now();
}

async function getLicenseByGuildId(guildId) {
  await maybeEnsureBridgeIndexes();
  const collection = await getEntitlementCollection();

  return collection.findOne({
    entitlementType: "shared",
    boundGuildId: String(guildId),
  });
}

async function getClaimableLicenseByKey(claimKey) {
  await maybeEnsureBridgeIndexes();
  const collection = await getEntitlementCollection();

  return collection.findOne({
    entitlementType: "shared",
    claimKeyHash: hashClaimKey(claimKey),
  });
}

async function bindClaimKeyToGuild({ guildId, guildName, claimKey, userId }) {
  const collection = await getEntitlementCollection();
  const normalizedGuildId = String(guildId || "");
  const normalizedGuildName = String(guildName || "");
  const license = await getClaimableLicenseByKey(claimKey);

  if (!license) {
    return { ok: false, reason: "claim_not_found" };
  }

  if (
    license.boundGuildId &&
    String(license.boundGuildId) !== normalizedGuildId
  ) {
    return { ok: false, reason: "claim_already_used", entitlement: license };
  }

  if (
    license.status === LICENSE_STATUS.EXPIRED ||
    isExpiredByDate(license)
  ) {
    return { ok: false, reason: "claim_expired", entitlement: license };
  }

  const existingGuildLicense = await getLicenseByGuildId(normalizedGuildId);

  if (
    existingGuildLicense &&
    String(existingGuildLicense.applicationId) !== String(license.applicationId)
  ) {
    return {
      ok: false,
      reason: "guild_already_bound",
      entitlement: existingGuildLicense,
    };
  }

  const now = new Date();
  const updateResult = await collection.updateOne(
    {
      _id: license._id,
      $or: [
        { boundGuildId: null },
        { boundGuildId: { $exists: false } },
        { boundGuildId: normalizedGuildId },
      ],
    },
    {
      $set: {
        boundGuildId: normalizedGuildId,
        boundGuildName: normalizedGuildName,
        boundAt: license.boundAt || now,
        status: LICENSE_STATUS.ACTIVE,
        updatedAt: now,
      },
      $unset: {
        claimKeyHash: "",
      },
    },
  );

  if (!updateResult.matchedCount) {
    return { ok: false, reason: "claim_already_used", entitlement: license };
  }

  const updatedLicense = await collection.findOne({ _id: license._id });

  await auditEntitlementEvent(
    updatedLicense.applicationId,
    "shared_entitlement_bound_by_base_bot",
    {
      guildId: normalizedGuildId,
      guildName: normalizedGuildName,
      userId: String(userId || ""),
      claimKeyLast4: updatedLicense.claimKeyLast4 || null,
    },
  ).catch(() => null);

  return { ok: true, entitlement: updatedLicense };
}

module.exports = {
  LICENSE_STATUS,
  hashClaimKey,
  ensureBridgeIndexes,
  getEntitlementCollection,
  getLicenseByGuildId,
  getClaimableLicenseByKey,
  bindClaimKeyToGuild,
  isExpiredByDate,
};
