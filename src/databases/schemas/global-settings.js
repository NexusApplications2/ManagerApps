"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const globalSettingsSchema = new mongoose_1.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose_1.Schema.Types.Mixed, required: true },
});
exports.default =
  mongoose_1.models["global-settings"] ||
  (0, mongoose_1.model)("global-settings", globalSettingsSchema);
