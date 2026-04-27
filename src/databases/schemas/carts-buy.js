"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const cartsSchema = new mongoose_1.Schema({
  channelId: { type: String, required: true },
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  storeId: { type: mongoose_1.Types.ObjectId, ref: "stores", required: true },
  productId: {
    type: mongoose_1.Types.ObjectId,
    ref: "products",
    required: true,
  },
  price: { type: Number, required: false },
  finalPrice: { type: Number, required: false },
  creditedAmount: { type: Number, required: false },
  automaticPayment: { type: Boolean, required: true },
  paymentGateway: {
    type: String,
    enum: ["efi", "manual", "mercado_pago"],
    default: "manual",
  },
  paymentStatus: { type: String, required: false, default: null },
  coupon: { type: mongoose_1.Types.ObjectId, ref: "coupons", required: false },
  step: {
    type: String,
    enum: [
      "select-tier",
      "select-days",
      "waiting-payment",
      "payment-confirmed",
      "select-coupons",
      "trial-send-token",
      "trial-redeem-key",
    ],
    default: "select-days",
  },
  selectedTier: {
    type: String,
    enum: ["shared", "private"],
    required: false,
    default: null,
  },
  isTrial: { type: Boolean, default: false },
  sharedApplicationId: { type: mongoose_1.Types.ObjectId, ref: "applications" },
  sharedClaimKeyLast4: { type: String, required: false, default: null },
  sharedInviteUrl: { type: String, required: false, default: null },
  delivered: { type: Boolean, default: false },
  pix_qrcode: { type: String, required: false },
  pix_copy_and_paste: { type: String, required: false },
  days: { type: Number, required: false },
  lifetime: { type: Boolean, required: false, default: false },
  paymentId: { type: String, required: false },
  paymentMetadata: { type: Object, required: false, default: {} },
  expiresAt: { type: Date, required: true },
  status: {
    type: String,
    enum: ["opened", "closed", "processing", "cancelled", "expired"],
    default: "opened",
  },
});
cartsSchema.index({ channelId: 1 });
exports.default =
  mongoose_1.models["carts-buy"] ||
  (0, mongoose_1.model)("carts-buy", cartsSchema);
