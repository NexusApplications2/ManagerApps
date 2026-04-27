"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const cartsSchema = new mongoose_1.Schema({
  userId: { type: String, required: true },
  applicationId: {
    type: mongoose_1.Types.ObjectId,
    ref: "applications",
    required: true,
  },
  storeId: { type: mongoose_1.Types.ObjectId, ref: "stores", required: true },
  price: { type: Number, required: false },
  delivered: { type: Boolean, default: false },
  finalPrice: { type: Number, required: false },
  creditedAmount: { type: Number, required: false },
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
      "select-days",
      "waiting-payment",
      "payment-confirmed",
      "select-coupons",
    ],
    default: "select-days",
  },
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
exports.default =
  mongoose_1.models["carts-renew"] ||
  (0, mongoose_1.model)("carts-renew", cartsSchema);
