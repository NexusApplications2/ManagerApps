"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const extractsSchema = new mongoose_1.Schema(
  {
    origin: { type: String, enum: ["sales", "manual"], required: true },
    action: { type: String, enum: ["add", "remove"], required: true },
    description: { type: String, required: false },
    storeId: { type: String, required: true },
    amount: { type: Number, required: true },
  },
  {
    timestamps: true,
  },
);
exports.default =
  mongoose_1.models["extracts"] ||
  (0, mongoose_1.model)("extracts", extractsSchema);
