"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const couponSchema = new mongoose_1.Schema({
  storeId: {
    type: mongoose_1.Schema.Types.ObjectId,
    ref: "stores",
    required: true,
  },
  code: { type: String, required: true, unique: true },
  discount: { type: Number, required: true },
  remainingUses: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
  roles: { type: [String], required: false },
  products: { type: [String], required: false, default: ["all"] },
});
couponSchema.index({ storeId: 1 });
exports.default =
  mongoose_1.models["coupons"] ||
  (0, mongoose_1.model)("coupons", couponSchema);
