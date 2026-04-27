"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const productsSchema = new mongoose_1.Schema({
  storeId: {
    type: mongoose_1.Schema.Types.ObjectId,
    ref: "stores",
    required: true,
  },
  productType: {
    type: String,
    enum: ["legacy_hosted", "managed_service"],
    required: true,
    default: "legacy_hosted",
  },
  name: { type: String, required: true },
  runtimeEnvironment: {
    type: String,
    enum: ["python", "nodejs"],
    required: false,
    default: "nodejs",
  },
  runCommand: { type: String, required: false, default: "node index.js" }, // e.g., "node index.js", "python app.py"
  needToUpdateApplications: { type: Boolean, required: true, default: false },
  messageSettings: {
    channelId: { type: String, required: false },
    messageId: { type: String, required: false },
    buttonName: { type: String, required: true, default: "Comprar" },
    panelMode: {
      type: String,
      enum: ["content", "embed", "container"],
      required: false,
      default: "content",
    },
    selectPlaceholder: {
      type: String,
      required: false,
      default: "🛒  Selecione um plano para comprar",
    },
    learnMoreButtonLabel: {
      type: String,
      required: false,
      default: "Saiba Mais",
    },
    video: { type: String, required: false },
    banner: { type: String, required: false },
    description: { type: String, required: false },
    saibaMais: { type: String, required: false },
  },
  redeemSettings: {
    active: { type: Boolean, required: true, default: false },
    days: { type: Number, required: false, default: 1 },
    webhook: { type: String, required: false },
    trialTitle: { type: String, required: false, default: "" },
    trialDesc: { type: String, required: false, default: "" },
    trialChannelId: { type: String, required: false, default: "" },
    trialMessageId: { type: String, required: false, default: "" },
    logsChannelId: { type: String, required: false, default: "" },
  },
  prices: {
    weekly: { type: Number, required: false },
    biweekly: { type: Number, required: false },
    monthly: { type: Number, required: false },
    lifetime: { type: Number, required: false },
  },
  tiers: {
    shared: {
      enabled: { type: Boolean, default: false },
      prices: {
        weekly: { type: Number, required: false },
        biweekly: { type: Number, required: false },
        monthly: { type: Number, required: false },
        lifetime: { type: Number, required: false },
      },
      allowTrial: { type: Boolean, default: false },
      accessBot: {
        clientId: { type: String, default: "" },
        invitePermissions: { type: String, default: "8" },
      },
      sharedBot: {
        clientId: { type: String, default: "" },
        invitePermissions: { type: String, default: "8" },
      },
    },
    private: {
      enabled: { type: Boolean, default: false },
      prices: {
        weekly: { type: Number, required: false },
        biweekly: { type: Number, required: false },
        monthly: { type: Number, required: false },
        lifetime: { type: Number, required: false },
      },
      runtimeEnvironment: {
        type: String,
        enum: ["python", "nodejs"],
        required: false,
      },
      runCommand: { type: String, required: false },
      releaseChannel: {
        type: String,
        enum: ["local_source", "product_release"],
        default: "local_source",
      },
      sourcePath: { type: String, default: "" },
    },
  },
  protectedFiles: { type: [String], required: false, default: [] },
  currentReleaseVersion: { type: String, required: false },
  lastReleaseCreatedVersion: { type: String, required: true, default: "0.0.0" },
  releases: [
    {
      _id: {
        type: mongoose_1.Schema.Types.ObjectId,
        default: () => new mongoose_1.default.Types.ObjectId(),
      },
      version: { type: String, required: true },
      date: { type: Date, required: true, default: Date.now },
      path: { type: String, required: true },
    },
  ],
});
productsSchema.index({ _id: 1, storeId: 1 });
productsSchema.index({ storeId: 1 });
productsSchema.index({ productType: 1 });
exports.default =
  mongoose_1.models["products"] ||
  (0, mongoose_1.model)("products", productsSchema);
