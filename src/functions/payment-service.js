"use strict";

var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };

Object.defineProperty(exports, "__esModule", { value: true });
exports.PIX_TAX_PERCENTAGE = void 0;
exports.calculateAutomaticGatewayAmount = calculateAutomaticGatewayAmount;
exports.calculateManualGatewayAmount = calculateManualGatewayAmount;
exports.createAutomaticPixPayment = createAutomaticPixPayment;
exports.createMercadoPagoTransparentCardPayment =
  createMercadoPagoTransparentCardPayment;
exports.getAutomaticPaymentStatus = getAutomaticPaymentStatus;
exports.cancelAutomaticPayment = cancelAutomaticPayment;
exports.validateSelectedPaymentGateway = validateSelectedPaymentGateway;
exports.buildCartPaymentSummary = buildCartPaymentSummary;

const crypto_1 = __importDefault(require("crypto"));
const qrcode_1 = __importDefault(require("qrcode"));
const payment_gateways_1 = require("./payment-gateways");

const PIX_TAX_PERCENTAGE = 1.2;
exports.PIX_TAX_PERCENTAGE = PIX_TAX_PERCENTAGE;

function calculateAutomaticGatewayAmount(baseAmount) {
  const normalizedAmount = normalizeAmount(baseAmount);
  return Number((normalizedAmount / (1 - PIX_TAX_PERCENTAGE / 100)).toFixed(2));
}

function calculateManualGatewayAmount(baseAmount) {
  return normalizeAmount(baseAmount);
}

async function createAutomaticPixPayment(input) {
  const gateway = input.gateway;

  if (!(0, payment_gateways_1.isAutomaticPaymentGateway)(gateway)) {
    throw new Error("O gateway selecionado não suporta pagamento automático.");
  }

  const chargedAmount = normalizeAmount(input.amount);
  const baseAmount = normalizeAmount(input.baseAmount || chargedAmount);
  const expirationDate = input.expirationDate || new Date(Date.now() + 3600000);
  const expirationSeconds = Math.max(
    60,
    Math.floor((expirationDate.getTime() - Date.now()) / 1000),
  );
  const externalReference =
    input.externalReference ||
    buildExternalReference({
      scope: input.scope,
      cartId: input.cartId,
      storeId: input.storeId,
      userId: input.userId,
    });

  if (gateway === payment_gateways_1.PAYMENT_GATEWAYS.EFI) {
    const efiInstance = await getEfiWrapper().getInstance(
      input.ownerDiscordUserId,
    );

    if (!efiInstance || !efiInstance.isValid) {
      throw new Error(
        "Não foi possível conectar-se ao gateway EFI. Verifique as credenciais configuradas.",
      );
    }

    const txid = crypto_1.default.randomBytes(16).toString("hex").slice(0, 26);
    const payment = await efiInstance.instance.pixCreateCharge(
      { txid },
      {
        calendario: {
          expiracao: expirationSeconds,
        },
        valor: {
          original: chargedAmount.toFixed(2),
        },
        chave: efiInstance.pixKey,
        solicitacaoPagador: String(input.description || "").slice(0, 140),
      },
    );

    if (
      !(payment === null || payment === void 0 ? void 0 : payment.pixCopiaECola)
    ) {
      throw new Error("A EFI não retornou um código PIX válido.");
    }

    return {
      gateway,
      paymentId: payment.txid,
      paymentStatus: payment.status || "ATIVA",
      normalizedStatus: normalizeAutomaticStatus(gateway, payment.status),
      pixCopyAndPaste: payment.pixCopiaECola,
      pixQrCode: await buildQrCodeBase64(payment.pixCopiaECola),
      approved: false,
      paymentMetadata: {
        payment_mode: "pix",
        gateway_reference: {
          txid: payment.txid,
          loc_id:
            (payment === null || payment === void 0 ? void 0 : payment.loc) &&
            typeof payment.loc === "object"
              ? payment.loc.id || null
              : payment.loc || null,
        },
        external_reference: externalReference,
        base_amount: baseAmount,
        charged_amount: chargedAmount,
        expires_at: expirationDate.toISOString(),
      },
    };
  }

  if (gateway === payment_gateways_1.PAYMENT_GATEWAYS.MERCADO_PAGO) {
    const mercadoPagoPayment = await getMercadoPagoWrapper().createPixPayment(
      input.ownerDiscordUserId,
      {
        amount: chargedAmount,
        description: input.description,
        externalReference,
        dateOfExpiration: expirationDate.toISOString(),
        notificationUrl: input.notificationUrl,
        idempotencyKey: input.idempotencyKey || crypto_1.default.randomUUID(),
        statementDescriptor: input.statementDescriptor,
        payer: buildSyntheticPayer(input.userId),
        metadata: {
          cart_scope: input.scope,
          cart_id: input.cartId,
          store_id: input.storeId,
          buyer_user_id: input.userId,
          base_amount: baseAmount,
          charged_amount: chargedAmount,
          payment_mode: "pix",
          ...(input.metadata || {}),
        },
      },
    );

    return normalizeMercadoPagoPayment({
      payment: mercadoPagoPayment,
      chargedAmount,
      baseAmount,
      externalReference,
      paymentMode: "pix",
      fallbackPixQrCode: true,
    });
  }

  throw new Error("Gateway automático não suportado.");
}

async function createMercadoPagoTransparentCardPayment(input) {
  const gateway =
    input.gateway || payment_gateways_1.PAYMENT_GATEWAYS.MERCADO_PAGO;

  if (gateway !== payment_gateways_1.PAYMENT_GATEWAYS.MERCADO_PAGO) {
    throw new Error(
      "Checkout transparente por cartão está disponível somente no Mercado Pago.",
    );
  }

  const chargedAmount = normalizeAmount(input.amount);
  const baseAmount = normalizeAmount(input.baseAmount || chargedAmount);
  const installments = Number(input.installments);

  if (
    !Number.isInteger(installments) ||
    installments < 1 ||
    installments > 24
  ) {
    throw new Error("A quantidade de parcelas informada é inválida.");
  }

  if (!String(input.token || "").trim()) {
    throw new Error("O token do cartão não foi informado.");
  }

  if (!String(input.paymentMethodId || "").trim()) {
    throw new Error("O identificador do meio de pagamento não foi informado.");
  }

  const externalReference =
    input.externalReference ||
    buildExternalReference({
      scope: input.scope,
      cartId: input.cartId,
      storeId: input.storeId,
      userId: input.userId,
    });

  const payer = normalizeTransparentPayer(input.payer);
  const mercadoPagoPayment =
    await getMercadoPagoWrapper().createTransparentCardPayment(
      input.ownerDiscordUserId,
      {
        amount: chargedAmount,
        token: String(input.token).trim(),
        description: input.description,
        installments,
        issuerId:
          input.issuerId === undefined || input.issuerId === null
            ? undefined
            : String(input.issuerId).trim() || undefined,
        paymentMethodId: String(input.paymentMethodId).trim(),
        externalReference,
        notificationUrl: input.notificationUrl,
        idempotencyKey: input.idempotencyKey || crypto_1.default.randomUUID(),
        statementDescriptor: input.statementDescriptor,
        payer,
        metadata: {
          cart_scope: input.scope,
          cart_id: input.cartId,
          store_id: input.storeId,
          buyer_user_id: input.userId,
          base_amount: baseAmount,
          charged_amount: chargedAmount,
          payment_mode: "transparent_card",
          ...(input.metadata || {}),
        },
      },
    );

  return normalizeMercadoPagoPayment({
    payment: mercadoPagoPayment,
    chargedAmount,
    baseAmount,
    externalReference,
    paymentMode: "transparent_card",
    payer,
  });
}

async function getAutomaticPaymentStatus(input) {
  const gateway = input.gateway;

  if (!(0, payment_gateways_1.isAutomaticPaymentGateway)(gateway)) {
    return {
      normalizedStatus: "unsupported",
      rawStatus: null,
      rawData: null,
    };
  }

  if (!input.paymentId) {
    return {
      normalizedStatus: "missing_payment",
      rawStatus: null,
      rawData: null,
    };
  }

  if (gateway === payment_gateways_1.PAYMENT_GATEWAYS.EFI) {
    const efiInstance = await getEfiWrapper().getInstance(
      input.ownerDiscordUserId,
    );

    if (!efiInstance || !efiInstance.isValid) {
      return {
        normalizedStatus: "gateway_error",
        rawStatus: null,
        rawData: null,
      };
    }

    const payment = await efiInstance.instance
      .pixDetailCharge({ txid: input.paymentId })
      .catch(() => null);

    if (!payment) {
      return {
        normalizedStatus: "not_found",
        rawStatus: null,
        rawData: null,
      };
    }

    return {
      normalizedStatus: normalizeAutomaticStatus(gateway, payment.status),
      rawStatus: payment.status || null,
      rawData: payment,
    };
  }

  const payment = await getMercadoPagoWrapper()
    .getPayment(input.ownerDiscordUserId, input.paymentId)
    .catch(() => null);

  if (!payment) {
    return {
      normalizedStatus: "not_found",
      rawStatus: null,
      rawData: null,
    };
  }

  return {
    normalizedStatus: normalizeAutomaticStatus(gateway, payment.status),
    rawStatus: payment.status || null,
    rawData: payment,
  };
}

async function cancelAutomaticPayment(input) {
  if (
    !(0, payment_gateways_1.isAutomaticPaymentGateway)(input.gateway) ||
    !input.paymentId
  ) {
    return null;
  }

  if (input.gateway === payment_gateways_1.PAYMENT_GATEWAYS.MERCADO_PAGO) {
    return await getMercadoPagoWrapper().cancelPayment(
      input.ownerDiscordUserId,
      input.paymentId,
    );
  }

  return null;
}

function validateSelectedPaymentGateway(settingsDB, gateway, options = {}) {
  const errors = [];

  if (gateway === payment_gateways_1.PAYMENT_GATEWAYS.EFI) {
    const efiSettings =
      (settingsDB === null || settingsDB === void 0
        ? void 0
        : settingsDB.efi_credentials) || {};

    if (!efiSettings.client_id) {
      errors.push("Client ID da EFI não configurado.");
    }

    if (!efiSettings.client_secret) {
      errors.push("Client Secret da EFI não configurado.");
    }

    if (!efiSettings.pix_key) {
      errors.push("Chave PIX da EFI não configurada.");
    }

    if (!efiSettings.cert) {
      errors.push("Certificado da EFI não configurado.");
    }
  }

  if (gateway === payment_gateways_1.PAYMENT_GATEWAYS.MANUAL) {
    const manualSettings =
      (settingsDB === null || settingsDB === void 0
        ? void 0
        : settingsDB.manual_payment_credentials) || {};

    if (!manualSettings.pix_key) {
      errors.push("Chave PIX do pagamento manual não configurada.");
    }

    if (!manualSettings.key_type) {
      errors.push("Tipo de chave do pagamento manual não configurado.");
    }
  }

  if (gateway === payment_gateways_1.PAYMENT_GATEWAYS.MERCADO_PAGO) {
    const mercadoPagoSettings =
      (settingsDB === null || settingsDB === void 0
        ? void 0
        : settingsDB.mercado_pago_credentials) || {};

    if (!mercadoPagoSettings.access_token) {
      errors.push("Access Token do Mercado Pago não configurado.");
    }
  }

  return errors;
}

function buildCartPaymentSummary(cart, ownerStoreConfig) {
  const gateway = (0, payment_gateways_1.getCartPaymentGateway)(
    cart,
    ownerStoreConfig,
  );
  const creditedAmount = (0, payment_gateways_1.getCreditedAmount)(cart);
  const paymentAmount = (0, payment_gateways_1.getChargeAmount)(cart);
  const paymentMetadata =
    (cart === null || cart === void 0 ? void 0 : cart.paymentMetadata) || {};

  return {
    gateway,
    gatewayLabel: (0, payment_gateways_1.getPaymentGatewayLabel)(gateway),
    creditedAmount,
    paymentAmount,
    paymentMode:
      paymentMetadata.payment_mode || inferPaymentMode(cart, gateway),
    isAutomatic: (0, payment_gateways_1.isAutomaticPaymentGateway)(gateway),
    isManual: (0, payment_gateways_1.isManualPaymentGateway)(gateway),
  };
}

function normalizeAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("O valor do pagamento é inválido.");
  }

  return Number(amount.toFixed(2));
}

function buildExternalReference(input) {
  const rawValue = `niox:${input.scope}:${input.cartId}:${input.storeId}:${input.userId}`;
  return rawValue.slice(0, 64);
}

function buildSyntheticPayer(userId) {
  return {
    email: `discord-user-${userId}@example.com`,
    firstName: "Discord",
    lastName: String(userId),
  };
}

async function buildQrCodeBase64(value) {
  const qrCodeDataUrl = await qrcode_1.default.toDataURL(value, {
    errorCorrectionLevel: "M",
  });

  return qrCodeDataUrl.split(",")[1];
}

function normalizeAutomaticStatus(gateway, rawStatus) {
  if (!rawStatus) {
    return "unknown";
  }

  if (gateway === payment_gateways_1.PAYMENT_GATEWAYS.EFI) {
    if (rawStatus === "CONCLUIDA") {
      return "approved";
    }

    if (
      ["REMOVIDA_PELO_USUARIO_RECEBEDOR", "REMOVIDA_PELO_PSP"].includes(
        rawStatus,
      )
    ) {
      return "cancelled";
    }

    return "pending";
  }

  const normalized = String(rawStatus).toLowerCase();

  if (normalized === "approved") {
    return "approved";
  }

  if (
    ["cancelled", "rejected", "refunded", "charged_back"].includes(normalized)
  ) {
    return "cancelled";
  }

  if (
    ["pending", "in_process", "in_mediation", "authorized"].includes(normalized)
  ) {
    return "pending";
  }

  return "unknown";
}

function normalizeTransparentPayer(payer) {
  const email = String(
    (payer === null || payer === void 0 ? void 0 : payer.email) || "",
  )
    .trim()
    .toLowerCase();
  const firstName = String(
    (payer === null || payer === void 0 ? void 0 : payer.firstName) || "",
  ).trim();
  const lastName = String(
    (payer === null || payer === void 0 ? void 0 : payer.lastName) || "",
  ).trim();
  const identificationType = String(
    (payer === null || payer === void 0
      ? void 0
      : payer.identification === null || payer.identification === void 0
        ? void 0
        : payer.identification.type) || "",
  )
    .trim()
    .toUpperCase();
  const identificationNumber = String(
    (payer === null || payer === void 0
      ? void 0
      : payer.identification === null || payer.identification === void 0
        ? void 0
        : payer.identification.number) || "",
  )
    .replace(/\D/g, "")
    .trim();

  if (!email || !email.includes("@")) {
    throw new Error("O e-mail do pagador é obrigatório para cartão.");
  }

  if (!identificationType || !identificationNumber) {
    throw new Error(
      "Os dados de identificação do pagador são obrigatórios para cartão.",
    );
  }

  return {
    email,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    identification: {
      type: identificationType,
      number: identificationNumber,
    },
  };
}

function inferPaymentMode(cart, gateway) {
  if (gateway === payment_gateways_1.PAYMENT_GATEWAYS.MANUAL) {
    return "manual_pix";
  }

  if (cart === null || cart === void 0 ? void 0 : cart.pix_copy_and_paste) {
    return "pix";
  }

  return "unknown";
}

function getEfiWrapper() {
  return require("./efi_wrapper").default;
}

function getMercadoPagoWrapper() {
  return require("./mercadopago-wrapper").default;
}

async function normalizeMercadoPagoPayment(input) {
  const { payment, chargedAmount, baseAmount, externalReference, paymentMode } =
    input;
  const normalizedStatus = normalizeAutomaticStatus(
    payment_gateways_1.PAYMENT_GATEWAYS.MERCADO_PAGO,
    payment === null || payment === void 0 ? void 0 : payment.status,
  );
  const transactionData =
    payment === null || payment === void 0
      ? void 0
      : payment.point_of_interaction === null ||
          payment.point_of_interaction === void 0
        ? void 0
        : payment.point_of_interaction.transaction_data;
  const pixCopyAndPaste =
    transactionData === null || transactionData === void 0
      ? void 0
      : transactionData.qr_code;
  const shouldBuildFallbackPixQrCode =
    input.fallbackPixQrCode && Boolean(pixCopyAndPaste);
  const pixQrCode =
    paymentMode === "pix"
      ? (transactionData === null || transactionData === void 0
          ? void 0
          : transactionData.qr_code_base64) ||
        (shouldBuildFallbackPixQrCode
          ? await buildQrCodeBase64(pixCopyAndPaste)
          : null)
      : null;

  if (paymentMode === "pix" && !pixCopyAndPaste) {
    throw new Error(
      "O Mercado Pago não retornou um código PIX para esta cobrança.",
    );
  }

  return {
    gateway: payment_gateways_1.PAYMENT_GATEWAYS.MERCADO_PAGO,
    paymentId: String(
      (payment === null || payment === void 0 ? void 0 : payment.id) || "",
    ),
    paymentStatus:
      (payment === null || payment === void 0 ? void 0 : payment.status) ||
      "pending",
    normalizedStatus,
    approved: normalizedStatus === "approved",
    pixCopyAndPaste: paymentMode === "pix" ? pixCopyAndPaste || null : null,
    pixQrCode: paymentMode === "pix" ? pixQrCode : null,
    paymentMetadata: {
      payment_mode: paymentMode,
      external_reference:
        (payment === null || payment === void 0
          ? void 0
          : payment.external_reference) || externalReference,
      status_detail:
        (payment === null || payment === void 0
          ? void 0
          : payment.status_detail) || null,
      payment_method_id:
        (payment === null || payment === void 0
          ? void 0
          : payment.payment_method_id) || null,
      payment_type_id:
        (payment === null || payment === void 0
          ? void 0
          : payment.payment_type_id) || null,
      installments:
        (payment === null || payment === void 0
          ? void 0
          : payment.installments) || null,
      date_of_expiration:
        (payment === null || payment === void 0
          ? void 0
          : payment.date_of_expiration) || null,
      date_created:
        (payment === null || payment === void 0
          ? void 0
          : payment.date_created) || null,
      date_approved:
        (payment === null || payment === void 0
          ? void 0
          : payment.date_approved) || null,
      payer_email:
        (payment === null || payment === void 0
          ? void 0
          : payment.payer === null || payment.payer === void 0
            ? void 0
            : payment.payer.email) ||
        (input.payer === null || input.payer === void 0
          ? void 0
          : input.payer.email) ||
        null,
      payer_identification:
        (payment === null || payment === void 0
          ? void 0
          : payment.payer === null || payment.payer === void 0
            ? void 0
            : payment.payer.identification) ||
        (input.payer === null || input.payer === void 0
          ? void 0
          : input.payer.identification) ||
        null,
      transaction_details:
        (payment === null || payment === void 0
          ? void 0
          : payment.transaction_details) || null,
      gateway_reference: {
        id:
          (payment === null || payment === void 0 ? void 0 : payment.id) ||
          null,
      },
      base_amount: baseAmount,
      charged_amount: chargedAmount,
    },
  };
}
