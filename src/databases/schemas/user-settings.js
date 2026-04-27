"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const settingsSchema = new mongoose_1.Schema({
  userId_discord: { type: String, required: true, unique: true },
  userId_campos: { type: String, required: false, default: null },
  token_campos: { type: String, required: false, default: null },
  hostAccounts: {
    campos: {
      accountId: { type: String, default: null },
      apiToken: { type: String, default: null },
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      lastValidatedAt: { type: Date, default: null },
    },
    square: {
      accountId: { type: String, default: null },
      apiToken: { type: String, default: null },
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      lastValidatedAt: { type: Date, default: null },
    },
  },
  efi_credentials: {
    client_id: { type: String, default: "" },
    client_secret: { type: String, default: "" },
    pix_key: { type: String, default: "" },
    cert: { type: String, default: null },
  },
  manual_payment_credentials: {
    pix_key: { type: String, default: "" },
    key_type: {
      type: String,
      enum: ["email", "cpf", "cnpj", "phone", "random"],
    },
  },
  mercado_pago_credentials: {
    access_token: { type: String, default: "" },
    public_key: { type: String, default: "" },
    webhook_url: { type: String, default: "" },
    statement_descriptor: { type: String, default: "" },
  },
  payment_gateway: {
    type: String,
    enum: ["efi", "manual", "mercado_pago"],
    default: "manual",
  },
  settings: { type: Object, default: {} },
});
settingsSchema.index({ userId_campos: 1 });
settingsSchema.index({ "hostAccounts.campos.accountId": 1 });
settingsSchema.index({ "hostAccounts.square.accountId": 1 });
exports.default =
  mongoose_1.models["user-settings"] ||
  (0, mongoose_1.model)("user-settings", settingsSchema);
