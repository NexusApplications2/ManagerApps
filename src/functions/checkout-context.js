"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CHECKOUT_CART_SCOPES = void 0;
exports.normalizeCheckoutCartScope = normalizeCheckoutCartScope;
exports.getCheckoutCartContext = getCheckoutCartContext;
exports.getCheckoutCartContextByPaymentId = getCheckoutCartContextByPaymentId;

const payment_gateways_1 = require("./payment-gateways");
const payment_service_1 = require("./payment-service");
const compat_1 = require("./hosts/compat");

const CHECKOUT_CART_SCOPES = {
  BUY: "buy",
  RENEW: "renew",
};

exports.CHECKOUT_CART_SCOPES = CHECKOUT_CART_SCOPES;

function normalizeCheckoutCartScope(scope) {
  const normalizedScope = String(scope || "")
    .trim()
    .toLowerCase();

  if (
    normalizedScope !== CHECKOUT_CART_SCOPES.BUY &&
    normalizedScope !== CHECKOUT_CART_SCOPES.RENEW
  ) {
    throw new Error("Tipo de carrinho inválido.");
  }

  return normalizedScope;
}

async function getCheckoutCartContext(scope, cartId) {
  const normalizedScope = normalizeCheckoutCartScope(scope);
  const databases = getDatabases();
  const cartModel = getCartModel(normalizedScope);
  const cart = await cartModel.findById(cartId).populate("coupon");

  if (!cart) {
    throw new Error("Carrinho não encontrado.");
  }

  const store = await databases.stores.findById(cart.storeId);

  if (!store) {
    throw new Error("Loja não encontrada.");
  }

  const ownerStoreConfig = await (0, compat_1.findStoreOwnerSettings)(
    databases,
    store,
  );

  if (!ownerStoreConfig) {
    throw new Error("Configuração do dono da loja não encontrada.");
  }

  let product = null;
  let application = null;

  if (normalizedScope === CHECKOUT_CART_SCOPES.BUY) {
    product = await databases.products.findById(cart.productId);
  } else {
    application = await databases.applications.findById(cart.applicationId);

    if (!application) {
      throw new Error("Aplicação não encontrada.");
    }

    product = await databases.products.findById(application.productId);
  }

  if (!product) {
    throw new Error("Produto não encontrado.");
  }

  const coupon = cart.coupon ? cart.coupon : null;
  const creditedAmount = getBaseAmount(cart, coupon);
  const chargeAmount =
    (0, payment_gateways_1.getChargeAmount)(cart) ||
    (0, payment_service_1.calculateAutomaticGatewayAmount)(creditedAmount);

  return {
    scope: normalizedScope,
    cart,
    store,
    ownerStoreConfig,
    product,
    application,
    coupon,
    gateway: (0, payment_gateways_1.getCartPaymentGateway)(
      cart,
      ownerStoreConfig,
    ),
    creditedAmount,
    chargeAmount,
  };
}

async function getCheckoutCartContextByPaymentId(paymentId) {
  const normalizedPaymentId = String(paymentId || "").trim();
  const databases = getDatabases();

  if (!normalizedPaymentId) {
    return null;
  }

  const buyCart = await databases.cartsBuy.findOne({
    paymentId: normalizedPaymentId,
  });

  if (buyCart) {
    return await getCheckoutCartContext(CHECKOUT_CART_SCOPES.BUY, buyCart._id);
  }

  const renewCart = await databases.cartsRenew.findOne({
    paymentId: normalizedPaymentId,
  });

  if (renewCart) {
    return await getCheckoutCartContext(
      CHECKOUT_CART_SCOPES.RENEW,
      renewCart._id,
    );
  }

  return null;
}

function getCartModel(scope) {
  const databases = getDatabases();
  return scope === CHECKOUT_CART_SCOPES.BUY
    ? databases.cartsBuy
    : databases.cartsRenew;
}

function getBaseAmount(cart, coupon) {
  const savedAmount = Number(
    cart === null || cart === void 0 ? void 0 : cart.creditedAmount,
  );

  if (Number.isFinite(savedAmount) && savedAmount > 0) {
    return Number(savedAmount.toFixed(2));
  }

  const price = Number(
    (cart === null || cart === void 0 ? void 0 : cart.price) || 0,
  );
  const discount = Number(
    (coupon === null || coupon === void 0 ? void 0 : coupon.discount) || 0,
  );

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("O carrinho não possui um valor válido para pagamento.");
  }

  return Number((price - price * (discount / 100)).toFixed(2));
}

function getDatabases() {
  return require("../databases").default;
}
