"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const settingsSchema = new mongoose_1.Schema({
  name: { type: String, required: true },
  ownerId_campos: { type: String, required: false, default: null },
  teamId_campos: { type: String, default: null },
  ownerDiscordId: { type: String, required: false, default: null },
  hostProvider: {
    type: String,
    enum: ["campos", "square"],
    default: "campos",
  },
  hostOwnerId: { type: String, required: false, default: null },
  hostWorkspaceId: { type: String, required: false, default: null },
  balance: { type: Number, default: 0 },
  logsAndRoles: {
    sales: { type: String, default: null },
    renovations: { type: String, default: null },
    transferOwnership: { type: String, default: null },
    expiredApplication: { type: String, default: null },
    customerRole: { type: String, default: null },
  },
  permissions: [
    {
      userId: { type: String, required: true },
      permissions: { type: [String], default: [] },
    },
  ],
});
settingsSchema.index({ ownerId_campos: 1 });
settingsSchema.index({ ownerDiscordId: 1 });
settingsSchema.index({ hostProvider: 1, hostOwnerId: 1 });
exports.default =
  mongoose_1.models["stores"] ||
  (0, mongoose_1.model)("stores", settingsSchema);
