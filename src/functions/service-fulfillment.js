"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSharedPurchaseInstructions = buildSharedPurchaseInstructions;
exports.buildInviteBasedPurchaseInstructions = buildSharedPurchaseInstructions;
exports.ensureSharedCartEntitlement = ensureSharedCartEntitlement;
exports.ensureInviteBasedCartLicense = ensureSharedCartEntitlement;
exports.upsertApplicationEntitlement = upsertApplicationEntitlement;
exports.upsertApplicationLicense = upsertApplicationEntitlement;
exports.syncApplicationEntitlementStatus = syncApplicationEntitlementStatus;
exports.syncApplicationLicenseStatus = syncApplicationEntitlementStatus;

const databases_1 = require("../databases");
const license_bridge_1 = require("./license-bridge");
const service_product_1 = require("./service-product");

async function ensureSharedCartEntitlement(databases, cartDocument) {
  const populatedCart =
    cartDocument.productId && cartDocument.storeId && cartDocument.userId
      ? cartDocument
      : await databases.cartsBuy
          .findById(cartDocument._id || cartDocument)
          .populate("productId")
          .populate("storeId");

  if (!populatedCart) {
    throw new Error("Carrinho nao encontrado para gerar a licenca do bot pronto.");
  }

  const product = populatedCart.productId;
  const store = populatedCart.storeId;
  if (!(0, service_product_1.isManagedServiceProduct)(product)) {
    return null;
  }

  if (
    (0, service_product_1.normalizeDeliveryMode)(populatedCart.selectedTier) !==
    service_product_1.PRODUCT_DELIVERY_MODES.SHARED
  ) {
    return null;
  }

  let application = populatedCart.sharedApplicationId
    ? await databases.applications
        .findById(populatedCart.sharedApplicationId)
        .catch(() => null)
    : null;

  const sharedClientId = (0, service_product_1.resolveSharedBotClientId)(product);
  const inviteUrl = (0, service_product_1.buildSharedBotInviteUrl)({
    product,
    clientId: sharedClientId,
  });

  if (!application) {
    application = await databases.applications.create({
      storeId: store._id,
      productId: product._id,
      name: `[BOT PRONTO] ${product.name}`,
      ownerId: populatedCart.userId,
      botId: sharedClientId || "shared",
      appId: null,
      hostProvider: null,
      deliveryMode: service_product_1.PRODUCT_DELIVERY_MODES.SHARED,
      token: `shared:${populatedCart.userId}:${product._id}`,
      expiresAt: populatedCart.lifetime
        ? null
        : buildCartExpiration(populatedCart),
      lifetime: Boolean(populatedCart.lifetime),
      status: "active",
      inviteUrl,
    });
  }

  const existingEntitlement = await (0,
  license_bridge_1.findEntitlementByApplicationId)(application._id.toString());
  let plainClaimKey = null;
  let entitlement = existingEntitlement;

  if (!existingEntitlement) {
    const createdEntitlement = await (0, license_bridge_1.createSharedEntitlement)(
      {
        applicationId: application._id.toString(),
        productId: product._id.toString(),
        buyerDiscordId: populatedCart.userId,
        storeId: store._id.toString(),
        expiresAt: application.expiresAt || null,
        applicationName: application.name,
        inviteUrl,
      },
    );
    plainClaimKey = createdEntitlement.claimKey;
    entitlement = createdEntitlement.entitlement;
  }

  application.sharedEntitlementId = application._id.toString();
  application.claimKeyLast4 = entitlement.claimKeyLast4 || null;
  application.inviteUrl = inviteUrl || application.inviteUrl || null;
  await application.save();

  populatedCart.sharedApplicationId = application._id;
  populatedCart.sharedClaimKeyLast4 = entitlement.claimKeyLast4 || null;
  populatedCart.sharedInviteUrl = inviteUrl || null;
  populatedCart.delivered = true;
  populatedCart.status = "closed";
  await populatedCart.save();

  return {
    cart: populatedCart,
    application,
    entitlement,
    claimKey: plainClaimKey,
    inviteUrl,
  };
}

async function upsertApplicationEntitlement(application, context = {}) {
  const product =
    context.product ||
    (await databases_1.default.products.findById(application.productId));

  if (!product) {
    return null;
  }

  if (
    application.deliveryMode === service_product_1.PRODUCT_DELIVERY_MODES.SHARED ||
    (0, service_product_1.normalizeDeliveryMode)(context.selectedTier) ===
      service_product_1.PRODUCT_DELIVERY_MODES.SHARED
  ) {
    const entitlement = await (0, license_bridge_1.findEntitlementByApplicationId)(
      application._id.toString(),
    );

    if (!entitlement) {
      return null;
    }

    await (0, license_bridge_1.syncEntitlementLifecycle)({
      applicationId: application._id.toString(),
      status: mapApplicationStatusToEntitlement(application.status),
      expiresAt: application.expiresAt || null,
      graceEndsAt:
        application.status === "grace_period"
          ? application.expiresAt || null
          : null,
    });

    return {
      entitlement,
      claimKey: null,
      inviteUrl: application.inviteUrl || null,
    };
  }

  const inviteUrl =
    context.inviteUrl ||
    application.inviteUrl ||
    buildDiscordBotInviteUrl(application.botId);
  const requiresGuildBind = Boolean(context.requiresGuildBind);
  const existingEntitlement = await (0,
  license_bridge_1.findEntitlementByApplicationId)(application._id.toString());

  if (requiresGuildBind) {
    if (!existingEntitlement) {
      const createdEntitlement = await (0,
      license_bridge_1.createPrivateActivationEntitlement)({
        applicationId: application._id.toString(),
        productId: product._id.toString(),
        buyerDiscordId: application.ownerId,
        storeId: String(application.storeId),
        expiresAt: application.expiresAt || null,
        graceEndsAt:
          application.status === "grace_period"
            ? application.expiresAt || null
            : null,
        status: license_bridge_1.ENTITLEMENT_STATUSES.PENDING_BIND,
        hostProvider: application.hostProvider || null,
        appId: application.appId || null,
        botId: application.botId || null,
        applicationName: application.name,
        inviteUrl,
      });

      application.claimKeyLast4 =
        createdEntitlement.entitlement.claimKeyLast4 || null;
      application.inviteUrl = inviteUrl || application.inviteUrl || null;
      await application.save();

      return {
        entitlement: createdEntitlement.entitlement,
        claimKey: createdEntitlement.claimKey,
        inviteUrl,
      };
    }

    await (0, license_bridge_1.syncEntitlementLifecycle)({
      applicationId: application._id.toString(),
      status: existingEntitlement.boundGuildId
        ? mapApplicationStatusToEntitlement(application.status)
        : license_bridge_1.ENTITLEMENT_STATUSES.PENDING_BIND,
      expiresAt: application.expiresAt || null,
      graceEndsAt:
        application.status === "grace_period"
          ? application.expiresAt || null
          : null,
      privateDeployment: {
        hostProvider: application.hostProvider || null,
        appId: application.appId || null,
        botId: application.botId || null,
      },
    });

    application.claimKeyLast4 =
      existingEntitlement.claimKeyLast4 || application.claimKeyLast4 || null;
    application.inviteUrl = inviteUrl || application.inviteUrl || null;
    await application.save();

    return {
      entitlement: existingEntitlement,
      claimKey: null,
      inviteUrl,
    };
  }

  const legacyEntitlement = await (0, license_bridge_1.upsertPrivateEntitlement)({
    applicationId: application._id.toString(),
    productId: product._id.toString(),
    buyerDiscordId: application.ownerId,
    storeId: String(application.storeId),
    expiresAt: application.expiresAt || null,
    graceEndsAt:
      application.status === "grace_period"
        ? application.expiresAt || null
        : null,
    status: mapApplicationStatusToEntitlement(application.status),
    hostProvider: application.hostProvider || null,
    appId: application.appId || null,
    botId: application.botId || null,
    applicationName: application.name,
  });

  application.claimKeyLast4 = null;
  application.inviteUrl = inviteUrl || application.inviteUrl || null;
  await application.save();

  return {
    entitlement: legacyEntitlement,
    claimKey: null,
    inviteUrl,
  };
}

async function syncApplicationEntitlementStatus(application) {
  const entitlement = await (0, license_bridge_1.findEntitlementByApplicationId)(
    application._id.toString(),
  );

  if (!entitlement) {
    return null;
  }

  await (0, license_bridge_1.syncEntitlementLifecycle)({
    applicationId: application._id.toString(),
    status: mapApplicationStatusToEntitlement(application.status),
    expiresAt: application.expiresAt || null,
    graceEndsAt:
      application.status === "grace_period"
        ? application.expiresAt || null
        : null,
    privateDeployment:
      application.deliveryMode === service_product_1.PRODUCT_DELIVERY_MODES.PRIVATE
        ? {
            hostProvider: application.hostProvider || null,
            appId: application.appId || null,
            botId: application.botId || null,
          }
        : null,
  });
  return true;
}

function buildSharedPurchaseInstructions(input) {
  const lines = [
    `Ola <@${input.userId}>, seu pagamento foi confirmado!`,
    "",
    "1. Convide o bot do produto para o seu servidor.",
    "2. Execute o comando `/resgatar-key` no servidor onde voce convidou o bot.",
    "3. Conclua a configuracao inicial no mesmo fluxo.",
  ];

  if (input.inviteUrl) {
    lines.push("", `Link de convite: ${input.inviteUrl}`);
  }

  if (input.claimKey) {
    lines.push(`Key de ativacao: \`${input.claimKey}\``);
  } else if (input.claimKeyLast4) {
    lines.push(`Key ativa: final \`${input.claimKeyLast4}\``);
  }

  lines.push("", "Cada key funciona em apenas 1 servidor.");
  return lines.join("\n");
}

function buildCartExpiration(cart) {
  if (cart.lifetime) {
    return null;
  }

  const totalDays = Number(cart.days || 0);
  if (totalDays <= 0) {
    return null;
  }

  return new Date(Date.now() + totalDays * 24 * 60 * 60 * 1000);
}

function mapApplicationStatusToEntitlement(status) {
  if (status === "grace_period") {
    return license_bridge_1.ENTITLEMENT_STATUSES.GRACE_PERIOD;
  }

  if (status === "expired") {
    return license_bridge_1.ENTITLEMENT_STATUSES.EXPIRED;
  }

  return license_bridge_1.ENTITLEMENT_STATUSES.ACTIVE;
}

function buildDiscordBotInviteUrl(botId) {
  const normalizedBotId = String(botId || "").trim();
  if (!normalizedBotId) {
    return null;
  }

  return `https://discord.com/api/oauth2/authorize?client_id=${normalizedBotId}&permissions=8&scope=bot%20applications.commands`;
}
