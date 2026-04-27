"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const settingsSchema = new mongoose_1.Schema({
  name: { type: String, required: true },
  ownerId: { type: String, required: true },
  storeId: { type: mongoose_1.Types.ObjectId, ref: "stores", required: true },
  botId: { type: String, required: true },
  appId: { type: String, required: false },
  hostProvider: {
    type: String,
    enum: ["campos", "square"],
    required: false,
    default: null,
  },
  deliveryMode: {
    type: String,
    enum: ["shared", "private"],
    required: true,
    default: "private",
  },
  sharedEntitlementId: { type: String, required: false, default: null },
  guildId: { type: String, required: false, default: null },
  guildName: { type: String, required: false, default: null },
  claimKeyLast4: { type: String, required: false, default: null },
  inviteUrl: { type: String, required: false, default: null },
  token: { type: String, required: true },
  productId: {
    type: mongoose_1.Types.ObjectId,
    ref: "products",
    required: true,
  },
  expiresAt: { type: Date, required: false },
  version: { type: String, required: false, default: "1.0.0" },
  lifetime: { type: Boolean, required: true, default: false },
  status: {
    type: String,
    enum: ["grace_period", "active", "expired"],
    default: "active",
  },
  updateAttempts: { type: Number, required: true, default: 0 },
  errorOnUpdate: { type: Boolean, required: true, default: false },
  errorOnUpdateMessage: { type: String, required: false },
  isTrial: { type: Boolean, required: true, default: false },
});
settingsSchema.index({ storeId: 1 });
settingsSchema.index({ ownerId: 1 });
settingsSchema.index({ productId: 1 });
settingsSchema.index({ hostProvider: 1 });
settingsSchema.index({ deliveryMode: 1 });
settingsSchema.index({ sharedEntitlementId: 1 });
settingsSchema.index({ guildId: 1 });
exports.default =
  mongoose_1.models["applications"] ||
  (0, mongoose_1.model)("applications", settingsSchema);
