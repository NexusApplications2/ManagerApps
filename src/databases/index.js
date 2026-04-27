"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = __importDefault(require("./connection"));
const applications_1 = __importDefault(require("./schemas/applications"));
const carts_buy_1 = __importDefault(require("./schemas/carts-buy"));
const carts_renew_1 = __importDefault(require("./schemas/carts-renew"));
const coupons_1 = __importDefault(require("./schemas/coupons"));
const extracts_1 = __importDefault(require("./schemas/extracts"));
const products_1 = __importDefault(require("./schemas/products"));
const user_settings_1 = __importDefault(require("./schemas/user-settings"));
const global_settings_1 = __importDefault(require("./schemas/global-settings"));
const stores_1 = __importDefault(require("./schemas/stores"));
const bridge_1 = require("./bridge");
const migration_1 = require("../functions/hosts/migration");
const license_bridge_1 = require("../functions/license-bridge");
const databases = {
  userSettings: user_settings_1.default,
  globalSettings: global_settings_1.default,
  products: products_1.default,
  coupons: coupons_1.default,
  cartsBuy: carts_buy_1.default,
  applications: applications_1.default,
  extracts: extracts_1.default,
  stores: stores_1.default,
  cartsRenew: carts_renew_1.default,
};
(0, connection_1.default)().then(() => {
  (0, bridge_1.connectBridgeDatabase)()
    .then(() => (0, license_bridge_1.ensureBridgeIndexes)())
    .catch(() => null);
  (0, migration_1.runMultiHostBackfill)(databases).catch(() => null);
});
exports.default = databases;
