"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.ENTITLEMENT_STATUSES = void 0;
exports.ensureBridgeIndexes = ensureBridgeIndexes;
exports.createClaimKey = createClaimKey;
exports.hashClaimKey = hashClaimKey;
exports.getEntitlementCollection = getEntitlementCollection;
exports.getEntitlementAuditCollection = getEntitlementAuditCollection;
exports.findEntitlementByApplicationId = findEntitlementByApplicationId;
exports.findEntitlementByClaimKey = findEntitlementByClaimKey;
exports.createSharedEntitlement = createSharedEntitlement;
exports.createPrivateActivationEntitlement = createPrivateActivationEntitlement;
exports.upsertPrivateEntitlement = upsertPrivateEntitlement;
exports.syncEntitlementLifecycle = syncEntitlementLifecycle;
exports.regenerateEntitlementClaimKey = regenerateEntitlementClaimKey;
exports.regenerateSharedClaimKey = regenerateSharedClaimKey;
exports.auditEntitlementEvent = auditEntitlementEvent;

const crypto_1 = require("crypto");
const bridge_1 = require("../databases/bridge");

const ENTITLEMENT_STATUSES = {
  PENDING_BIND: "pending_bind",
  ACTIVE: "active",
  GRACE_PERIOD: "grace_period",
  EXPIRED: "expired",
};

exports.ENTITLEMENT_STATUSES = ENTITLEMENT_STATUSES;

let ensuredIndexesPromise = null;

async function ensureBridgeIndexes() {
  if (ensuredIndexesPromise) {
    return ensuredIndexesPromise;
  }

  ensuredIndexesPromise = (async () => {
    const entitlements = await (0, bridge_1.getBridgeCollection)("entitlements");
    const audit = await (0, bridge_1.getBridgeCollection)("entitlement_audit");

    await Promise.all([
      entitlements.createIndex({ applicationId: 1 }, { unique: true }),
      entitlements.createIndex({ claimKeyHash: 1 }, { unique: true, sparse: true }),
      entitlements.createIndex({ boundGuildId: 1 }),
      entitlements.createIndex({ buyerDiscordId: 1 }),
      entitlements.createIndex({ status: 1, expiresAt: 1 }),
      audit.createIndex({ entitlementId: 1, createdAt: -1 }),
    ]);
  })().catch((error) => {
    ensuredIndexesPromise = null;
    throw error;
  });

  return ensuredIndexesPromise;
}

function createClaimKey() {
  return `LIC-${(0, crypto_1.randomBytes)(4).toString("hex").toUpperCase()}-${(0, crypto_1.randomBytes)(4).toString("hex").toUpperCase()}`;
}

function hashClaimKey(claimKey) {
  return (0, crypto_1.createHash)("sha256")
    .update(String(claimKey || "").trim().toUpperCase())
    .digest("hex");
}

async function getEntitlementCollection() {
  await ensureBridgeIndexes();
  return (0, bridge_1.getBridgeCollection)("entitlements");
}

async function getEntitlementAuditCollection() {
  return (0, bridge_1.getBridgeCollection)("entitlement_audit");
}

async function findEntitlementByApplicationId(applicationId) {
  const collection = await getEntitlementCollection();
  return collection.findOne({ applicationId: String(applicationId) });
}

async function findEntitlementByClaimKey(claimKey) {
  const collection = await getEntitlementCollection();
  return collection.findOne({ claimKeyHash: hashClaimKey(claimKey) });
}

async function createSharedEntitlement(input) {
  const metadata = Object.assign(
    {
      storeId: String(input.storeId || ""),
      applicationName: String(input.applicationName || ""),
      inviteUrl: input.inviteUrl || null,
      isTrial: Boolean(input.isTrial),
    },
    input.metadata || {},
  );
  const { claimKey, document } = buildClaimableEntitlementDocument({
    applicationId: String(input.applicationId),
    entitlementType: "shared",
    productId: String(input.productId),
    buyerDiscordId: String(input.buyerDiscordId),
    tier: "shared",
    status: input.status || ENTITLEMENT_STATUSES.PENDING_BIND,
    expiresAt: input.expiresAt || null,
    graceEndsAt: input.graceEndsAt || null,
    profile: {
      nickname: input.nickname || input.applicationName || "",
      avatarUrl: "",
      version: 1,
    },
    privateDeployment: null,
    metadata,
  });

  const collection = await getEntitlementCollection();
  await collection.insertOne(document);
  await auditEntitlementEvent(
    document.applicationId,
    "shared_entitlement_created",
    {
      buyerDiscordId: document.buyerDiscordId,
      claimKeyLast4: document.claimKeyLast4,
      productId: document.productId,
      isTrial: Boolean(metadata.isTrial),
    },
  );

  return {
    entitlement: document,
    claimKey,
  };
}

async function createPrivateActivationEntitlement(input) {
  const collection = await getEntitlementCollection();
  const metadata = Object.assign(
    {
      storeId: String(input.storeId || ""),
      applicationName: String(input.applicationName || ""),
      inviteUrl: input.inviteUrl || null,
      isTrial: Boolean(input.isTrial),
    },
    input.metadata || {},
  );
  const { claimKey, document } = buildClaimableEntitlementDocument({
    applicationId: String(input.applicationId),
    entitlementType: "private",
    productId: String(input.productId),
    buyerDiscordId: String(input.buyerDiscordId),
    tier: "private",
    status: input.status || ENTITLEMENT_STATUSES.PENDING_BIND,
    expiresAt: input.expiresAt || null,
    graceEndsAt: input.graceEndsAt || null,
    profile: {
      nickname: input.nickname || input.applicationName || "",
      avatarUrl: "",
      version: 1,
    },
    privateDeployment: {
      hostProvider: input.hostProvider || null,
      appId: input.appId || null,
      botId: input.botId || null,
    },
    metadata,
  });
  await collection.insertOne(document);
  await auditEntitlementEvent(
    document.applicationId,
    "private_activation_entitlement_created",
    {
      buyerDiscordId: document.buyerDiscordId,
      claimKeyLast4: document.claimKeyLast4,
      productId: document.productId,
      isTrial: Boolean(metadata.isTrial),
    },
  );

  return {
    entitlement: document,
    claimKey,
  };
}

async function upsertPrivateEntitlement(input) {
  const collection = await getEntitlementCollection();
  const now = new Date();
  const update = {
    $set: {
      entitlementType: "private",
      productId: String(input.productId),
      buyerDiscordId: String(input.buyerDiscordId),
      tier: "private",
      status: input.status || ENTITLEMENT_STATUSES.ACTIVE,
      expiresAt: input.expiresAt || null,
      graceEndsAt: input.graceEndsAt || null,
      updatedAt: now,
      privateDeployment: {
        hostProvider: input.hostProvider || null,
        appId: input.appId || null,
        botId: input.botId || null,
      },
      metadata: {
        storeId: String(input.storeId || ""),
        applicationName: String(input.applicationName || ""),
      },
    },
    $setOnInsert: {
      applicationId: String(input.applicationId),
      createdAt: now,
      profile: {
        nickname: input.applicationName || "",
        avatarUrl: "",
        version: 1,
      },
    },
    $unset: {
      claimKeyHash: "",
      claimKeyLast4: "",
      boundGuildId: "",
      boundGuildName: "",
      boundAt: "",
    },
  };

  await collection.updateOne(
    { applicationId: String(input.applicationId) },
    update,
    { upsert: true },
  );

  const entitlement = await collection.findOne({
    applicationId: String(input.applicationId),
  });

  await auditEntitlementEvent(
    String(input.applicationId),
    "private_entitlement_upserted",
    {
      hostProvider: input.hostProvider || null,
      appId: input.appId || null,
      botId: input.botId || null,
    },
  );

  return entitlement;
}

async function syncEntitlementLifecycle(input) {
  const collection = await getEntitlementCollection();
  const update = {
    $set: {
      status: input.status,
      expiresAt: input.expiresAt || null,
      graceEndsAt: input.graceEndsAt || null,
      updatedAt: new Date(),
    },
  };

  if (input.privateDeployment) {
    update.$set.privateDeployment = Object.assign({}, input.privateDeployment);
  }

  await collection.updateOne(
    { applicationId: String(input.applicationId) },
    update,
  );
}

async function regenerateSharedClaimKey(applicationId) {
  return regenerateEntitlementClaimKey(applicationId);
}

async function regenerateEntitlementClaimKey(applicationId) {
  const collection = await getEntitlementCollection();
  const claimKey = createClaimKey();
  await collection.updateOne(
    {
      applicationId: String(applicationId),
      boundGuildId: null,
    },
    {
      $set: {
        claimKeyHash: hashClaimKey(claimKey),
        claimKeyLast4: claimKey.slice(-4),
        updatedAt: new Date(),
      },
    },
  );

  await auditEntitlementEvent(
    String(applicationId),
    "entitlement_claim_key_regenerated",
    { claimKeyLast4: claimKey.slice(-4) },
  );

  return claimKey;
}

async function auditEntitlementEvent(applicationId, event, payload = {}) {
  const collection = await getEntitlementAuditCollection();
  await collection.insertOne({
    applicationId: String(applicationId),
    entitlementId: String(applicationId),
    event,
    payload,
    createdAt: new Date(),
  });
}

function buildClaimableEntitlementDocument(input) {
  const now = new Date();
  const claimKey = createClaimKey();
  const document = {
    applicationId: String(input.applicationId),
    entitlementType: input.entitlementType,
    productId: String(input.productId),
    buyerDiscordId: String(input.buyerDiscordId),
    tier: String(input.tier),
    status: input.status || ENTITLEMENT_STATUSES.PENDING_BIND,
    claimKeyHash: hashClaimKey(claimKey),
    claimKeyLast4: claimKey.slice(-4),
    boundGuildId: null,
    boundGuildName: null,
    boundAt: null,
    expiresAt: input.expiresAt || null,
    graceEndsAt: input.graceEndsAt || null,
    profile: Object.assign(
      {
        nickname: "",
        avatarUrl: "",
        version: 1,
      },
      input.profile || {},
    ),
    privateDeployment: input.privateDeployment || null,
    metadata: Object.assign({}, input.metadata || {}),
    createdAt: now,
    updatedAt: now,
  };

  return { claimKey, document };
}
