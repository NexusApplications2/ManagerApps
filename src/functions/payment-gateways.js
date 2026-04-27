"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.PAYMENT_GATEWAY_LABELS = exports.PAYMENT_GATEWAYS = void 0;
exports.getPaymentGatewayLabel = getPaymentGatewayLabel;
exports.isAutomaticPaymentGateway = isAutomaticPaymentGateway;
exports.isManualPaymentGateway = isManualPaymentGateway;
exports.getCartPaymentGateway = getCartPaymentGateway;
exports.getChargeAmount = getChargeAmount;
exports.getCreditedAmount = getCreditedAmount;

const PAYMENT_GATEWAYS = {
  EFI: "efi",
  MANUAL: "manual",
  MERCADO_PAGO: "mercado_pago",
};

exports.PAYMENT_GATEWAYS = PAYMENT_GATEWAYS;

const PAYMENT_GATEWAY_LABELS = {
  [PAYMENT_GATEWAYS.EFI]: "Banco (EFI)",
  [PAYMENT_GATEWAYS.MANUAL]: "Pagamento manual",
  [PAYMENT_GATEWAYS.MERCADO_PAGO]: "Mercado Pago",
};

exports.PAYMENT_GATEWAY_LABELS = PAYMENT_GATEWAY_LABELS;

function getPaymentGatewayLabel(gateway) {
  return PAYMENT_GATEWAY_LABELS[gateway] || "Desconhecido";
}

function isAutomaticPaymentGateway(gateway) {
  return (
    gateway === PAYMENT_GATEWAYS.EFI ||
    gateway === PAYMENT_GATEWAYS.MERCADO_PAGO
  );
}

function isManualPaymentGateway(gateway) {
  return gateway === PAYMENT_GATEWAYS.MANUAL;
}

function getCartPaymentGateway(cart, ownerStoreConfig) {
  return (
    (cart === null || cart === void 0 ? void 0 : cart.paymentGateway) ||
    (ownerStoreConfig === null || ownerStoreConfig === void 0
      ? void 0
      : ownerStoreConfig.payment_gateway) ||
    PAYMENT_GATEWAYS.MANUAL
  );
}

function getChargeAmount(cart) {
  return getNormalizedAmount(
    (cart === null || cart === void 0 ? void 0 : cart.finalPrice) ||
      (cart === null || cart === void 0
        ? void 0
        : cart.paymentMetadata === null || cart.paymentMetadata === void 0
          ? void 0
          : cart.paymentMetadata.charged_amount) ||
      (cart === null || cart === void 0 ? void 0 : cart.creditedAmount) ||
      (cart === null || cart === void 0 ? void 0 : cart.price) ||
      0,
  );
}

function getCreditedAmount(cart) {
  return getNormalizedAmount(
    (cart === null || cart === void 0 ? void 0 : cart.creditedAmount) ||
      (cart === null || cart === void 0
        ? void 0
        : cart.paymentMetadata === null || cart.paymentMetadata === void 0
          ? void 0
          : cart.paymentMetadata.base_amount) ||
      (cart === null || cart === void 0 ? void 0 : cart.price) ||
      (cart === null || cart === void 0 ? void 0 : cart.finalPrice) ||
      0,
  );
}

function getNormalizedAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Number(amount.toFixed(2));
}
