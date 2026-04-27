"use strict";

var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };

Object.defineProperty(exports, "__esModule", { value: true });
exports.startHttpServer = startHttpServer;

const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const qrcode_1 = __importDefault(require("qrcode"));
const functions_1 = require("../functions");
const mercadopago_wrapper_1 = __importDefault(
  require("../functions/mercadopago-wrapper"),
);

let httpServerInstance = null;
const CHECKOUT_PAYMENT_EXPIRES_MINUTES = 30;

function startHttpServer() {
  if (httpServerInstance) {
    return httpServerInstance;
  }

  const app = (0, express_1.default)();
  app.disable("x-powered-by");
  app.use((0, cors_1.default)(buildCorsOptions()));
  app.use(express_1.default.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      service: "manager_niox_js",
      paymentGateways: ["efi", "manual", "mercado_pago"],
    });
  });

  app.get(
    "/api/payments/mercado-pago/public-config/:cartType/:cartId",
    async (req, res) => {
      try {
        const context = await getMercadoPagoContext(
          req.params.cartType,
          req.params.cartId,
        );

        ensureCartCanReceiveAutomaticPayment(context);

        res.status(200).json({
          ok: true,
          gateway: context.gateway,
          publicKey:
            context.ownerStoreConfig.mercado_pago_credentials.public_key || "",
          statementDescriptor:
            context.ownerStoreConfig.mercado_pago_credentials
              .statement_descriptor || "",
          environment: detectMercadoPagoEnvironment(
            context.ownerStoreConfig.mercado_pago_credentials.access_token,
          ),
          payment: {
            amount: context.chargeAmount,
            creditedAmount: context.creditedAmount,
            status: context.cart.paymentStatus || null,
            mode: (context.cart.paymentMetadata || {}).payment_mode || "pix",
          },
          cart: {
            id: context.cart._id.toString(),
            scope: context.scope,
            status: context.cart.status,
            step: context.cart.step,
            expiresAt: context.cart.expiresAt,
          },
          product: {
            id: context.product._id.toString(),
            name: context.product.name,
          },
        });
      } catch (error) {
        handleHttpError(res, error);
      }
    },
  );

  app.post(
    "/api/payments/mercado-pago/transparent-checkout/:cartType/:cartId",
    async (req, res) => {
      try {
        const context = await getMercadoPagoContext(
          req.params.cartType,
          req.params.cartId,
        );

        ensureCartCanReceiveAutomaticPayment(context);

        if (context.cart.paymentId) {
          await (0, functions_1.cancelAutomaticPayment)({
            gateway: context.gateway,
            ownerDiscordUserId: context.ownerStoreConfig.userId_discord,
            paymentId: context.cart.paymentId,
          }).catch(() => null);
        }

        const payment = await (0,
        functions_1.createMercadoPagoTransparentCardPayment)({
          gateway: context.gateway,
          scope: context.scope,
          cartId: context.cart._id.toString(),
          storeId: context.store._id.toString(),
          userId: context.cart.userId,
          ownerDiscordUserId: context.ownerStoreConfig.userId_discord,
          amount: context.chargeAmount,
          baseAmount: context.creditedAmount,
          description: buildPaymentDescription(context),
          token: req.body.token,
          installments: req.body.installments,
          issuerId: req.body.issuerId,
          paymentMethodId: req.body.paymentMethodId,
          notificationUrl: req.body.notificationUrl,
          payer: {
            email: req.body.email,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            identification: {
              type: req.body.identificationType,
              number: req.body.identificationNumber,
            },
          },
          metadata: {
            origin: "http_transparent_checkout",
            application_id: context.application
              ? context.application._id.toString()
              : null,
            product_id: context.product._id.toString(),
          },
        });

        await persistCreatedPayment(context, payment);

        res.status(payment.approved ? 200 : 202).json({
          ok: true,
          approved: payment.approved,
          normalizedStatus: payment.normalizedStatus,
          paymentId: payment.paymentId,
          paymentStatus: payment.paymentStatus,
          amount: context.chargeAmount,
          creditedAmount: context.creditedAmount,
        });
      } catch (error) {
        handleHttpError(res, error);
      }
    },
  );

  app.get(
    "/api/payments/mercado-pago/status/:cartType/:cartId",
    async (req, res) => {
      try {
        const context = await getMercadoPagoContext(
          req.params.cartType,
          req.params.cartId,
        );

        if (!context.cart.paymentId) {
          throw new Error(
            "O carrinho ainda não possui um pagamento vinculado.",
          );
        }

        const paymentStatus = await (0, functions_1.getAutomaticPaymentStatus)({
          gateway: context.gateway,
          ownerDiscordUserId: context.ownerStoreConfig.userId_discord,
          paymentId: context.cart.paymentId,
        });

        if (paymentStatus.rawData) {
          await persistMercadoPagoSnapshot(context, paymentStatus.rawData);
        }

        res.status(200).json({
          ok: true,
          paymentId: context.cart.paymentId,
          normalizedStatus: paymentStatus.normalizedStatus,
          rawStatus: paymentStatus.rawStatus,
        });
      } catch (error) {
        handleHttpError(res, error);
      }
    },
  );

  app.post("/webhooks/mercado-pago", async (req, res) => {
    try {
      const paymentId = extractMercadoPagoPaymentId(req);

      if (!paymentId) {
        return res.status(202).json({
          ok: true,
          ignored: true,
          reason: "payment_id_not_found",
        });
      }

      const context = await (0, functions_1.getCheckoutCartContextByPaymentId)(
        paymentId,
      );

      if (!context) {
        return res.status(202).json({
          ok: true,
          ignored: true,
          reason: "cart_not_found",
        });
      }

      ensureMercadoPagoGateway(context);

      const payment = await mercadopago_wrapper_1.default
        .getPayment(context.ownerStoreConfig.userId_discord, paymentId)
        .catch(() => null);

      if (!payment) {
        return res.status(202).json({
          ok: true,
          ignored: true,
          reason: "payment_not_found",
        });
      }

      await persistMercadoPagoSnapshot(context, payment, {
        isWebhook: true,
      });

      return res.status(200).json({
        ok: true,
        paymentId,
      });
    } catch (error) {
      console.error("Erro ao processar webhook do Mercado Pago:", error);
      return res.status(200).json({
        ok: false,
        error: error.message,
      });
    }
  });

  const port = Number(process.env.PORT || process.env.HTTP_PORT || 3000);
  httpServerInstance = app.listen(port, () => {
    console.log(`🌐・HTTP online na porta ${port}`);
  });

  return httpServerInstance;
}

function buildCorsOptions() {
  const allowedOrigins = String(process.env.CHECKOUT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!allowedOrigins.length) {
    return { origin: true, credentials: true };
  }

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origem não autorizada para o checkout."));
    },
  };
}

async function getMercadoPagoContext(cartType, cartId, options = {}) {
  const context = await (0, functions_1.getCheckoutCartContext)(
    cartType,
    cartId,
  );

  ensureMercadoPagoGateway(context, options);

  return context;
}

function ensureMercadoPagoGateway(context, options = {}) {
  if (context.gateway !== functions_1.PAYMENT_GATEWAYS.MERCADO_PAGO) {
    throw new Error(
      "O carrinho selecionado não está configurado para Mercado Pago.",
    );
  }

  const gatewayErrors = (0, functions_1.validateSelectedPaymentGateway)(
    context.ownerStoreConfig,
    context.gateway,
    options,
  );

  if (gatewayErrors.length) {
    throw new Error(gatewayErrors[0]);
  }
}

function ensureCartCanReceiveAutomaticPayment(context) {
  if (context.cart.status !== "opened") {
    throw new Error(
      "Somente carrinhos abertos podem receber novos pagamentos.",
    );
  }

  if (context.cart.step === "payment-confirmed") {
    throw new Error("Esse carrinho já teve o pagamento confirmado.");
  }

  if (
    context.cart.expiresAt &&
    new Date(context.cart.expiresAt).getTime() <= Date.now()
  ) {
    throw new Error("Esse carrinho expirou e não pode mais ser pago.");
  }

  if (context.creditedAmount <= 0) {
    throw new Error("O carrinho não possui um valor válido para cobrança.");
  }
}

async function persistCreatedPayment(context, payment) {
  if (context.scope === functions_1.CHECKOUT_CART_SCOPES.BUY) {
    context.cart.automaticPayment = true;
  }

  context.cart.step = "waiting-payment";
  context.cart.paymentGateway = functions_1.PAYMENT_GATEWAYS.MERCADO_PAGO;
  context.cart.paymentStatus = payment.paymentStatus;
  context.cart.paymentId = payment.paymentId;
  context.cart.finalPrice = context.chargeAmount;
  context.cart.creditedAmount = context.creditedAmount;
  context.cart.paymentMetadata = {
    ...(context.cart.paymentMetadata || {}),
    ...(payment.paymentMetadata || {}),
    last_synced_at: new Date().toISOString(),
  };
  context.cart.pix_qrcode = payment.pixQrCode || null;
  context.cart.pix_copy_and_paste = payment.pixCopyAndPaste || null;
  context.cart.expiresAt = new Date(
    Date.now() + CHECKOUT_PAYMENT_EXPIRES_MINUTES * 60000,
  );
  await context.cart.save();
}

async function persistMercadoPagoSnapshot(context, payment, options = {}) {
  const transactionData =
    payment === null || payment === void 0
      ? void 0
      : payment.point_of_interaction === null ||
          payment.point_of_interaction === void 0
        ? void 0
        : payment.point_of_interaction.transaction_data;
  const qrCode =
    transactionData === null || transactionData === void 0
      ? void 0
      : transactionData.qr_code;
  const qrCodeBase64 =
    (transactionData === null || transactionData === void 0
      ? void 0
      : transactionData.qr_code_base64) ||
    (!context.cart.pix_qrcode && qrCode
      ? await buildQrCodeBase64(qrCode)
      : null);
  const paymentMode =
    payment.payment_method_id === "pix" ||
    payment.payment_type_id === "bank_transfer"
      ? "pix"
      : "transparent_card";

  if (context.scope === functions_1.CHECKOUT_CART_SCOPES.BUY) {
    context.cart.automaticPayment = true;
  }

  context.cart.paymentGateway = functions_1.PAYMENT_GATEWAYS.MERCADO_PAGO;
  context.cart.paymentStatus =
    payment.status || context.cart.paymentStatus || "pending";
  context.cart.paymentId = String(payment.id || context.cart.paymentId || "");
  context.cart.finalPrice =
    normalizeOptionalAmount(payment.transaction_amount) || context.chargeAmount;
  context.cart.creditedAmount = context.creditedAmount;
  context.cart.paymentMetadata = {
    ...(context.cart.paymentMetadata || {}),
    payment_mode: paymentMode,
    external_reference:
      payment.external_reference ||
      (context.cart.paymentMetadata || {}).external_reference ||
      null,
    status_detail: payment.status_detail || null,
    payment_method_id: payment.payment_method_id || null,
    payment_type_id: payment.payment_type_id || null,
    installments: payment.installments || null,
    date_created: payment.date_created || null,
    date_approved: payment.date_approved || null,
    date_of_expiration: payment.date_of_expiration || null,
    payer_email:
      (payment.payer === null || payment.payer === void 0
        ? void 0
        : payment.payer.email) || null,
    payer_identification:
      (payment.payer === null || payment.payer === void 0
        ? void 0
        : payment.payer.identification) || null,
    transaction_details: payment.transaction_details || null,
    base_amount: context.creditedAmount,
    charged_amount:
      normalizeOptionalAmount(payment.transaction_amount) ||
      context.chargeAmount,
    webhook_last_received_at: options.isWebhook
      ? new Date().toISOString()
      : (context.cart.paymentMetadata || {}).webhook_last_received_at || null,
    last_synced_at: new Date().toISOString(),
  };

  if (paymentMode === "pix") {
    context.cart.pix_qrcode = qrCodeBase64 || context.cart.pix_qrcode || null;
    context.cart.pix_copy_and_paste =
      qrCode || context.cart.pix_copy_and_paste || null;
  } else {
    context.cart.pix_qrcode = null;
    context.cart.pix_copy_and_paste = null;
  }

  await context.cart.save();
}

function buildPaymentDescription(context) {
  return context.scope === functions_1.CHECKOUT_CART_SCOPES.BUY
    ? `Compra do produto ${context.product.name}`
    : `Renovação do produto ${context.product.name}`;
}

function detectMercadoPagoEnvironment(accessToken) {
  const normalizedToken = String(accessToken || "")
    .trim()
    .toUpperCase();

  if (normalizedToken.startsWith("TEST-")) {
    return "sandbox";
  }

  if (normalizedToken.startsWith("APP_USR-")) {
    return "production";
  }

  return "unknown";
}

function extractMercadoPagoPaymentId(req) {
  const body = req.body || {};
  const query = req.query || {};

  return String(
    (body.data && body.data.id) ||
      body.payment_id ||
      body.id ||
      query["data.id"] ||
      query.id ||
      query.payment_id ||
      "",
  ).trim();
}

function normalizeOptionalAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Number(amount.toFixed(2)) : 0;
}

async function buildQrCodeBase64(value) {
  const qrCodeDataUrl = await qrcode_1.default.toDataURL(value, {
    errorCorrectionLevel: "M",
  });
  return qrCodeDataUrl.split(",")[1];
}

function handleHttpError(res, error) {
  const statusCode = inferHttpStatusCode(error);
  res.status(statusCode).json({
    ok: false,
    error: error.message,
  });
}

function inferHttpStatusCode(error) {
  const message = String(
    (error === null || error === void 0 ? void 0 : error.message) || "",
  ).toLowerCase();

  if (
    message.includes("não encontrado") ||
    message.includes("nao encontrado")
  ) {
    return 404;
  }

  if (
    message.includes("expirou") ||
    message.includes("já teve o pagamento confirmado") ||
    message.includes("ja teve o pagamento confirmado") ||
    message.includes("somente carrinhos abertos")
  ) {
    return 409;
  }

  if (
    message.includes("obrigatório") ||
    message.includes("obrigatorio") ||
    message.includes("inválido") ||
    message.includes("invalido") ||
    message.includes("não configurado") ||
    message.includes("nao configurado")
  ) {
    return 400;
  }

  return 500;
}
