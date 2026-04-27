"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeBalance = void 0;
const databases_1 = __importDefault(require("../databases"));
const changeBalance = (data) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const { amount, origin, action, description, storeId } = data;
    if (action !== "add" && action !== "remove") {
      throw new Error("Ação inválida. Use 'add' ou 'remove'.");
    }
    const balanceUpdate =
      action === "add"
        ? { $inc: { balance: amount } }
        : { $inc: { balance: -amount } };
    const update = yield databases_1.default.stores.updateOne(
      { _id: storeId },
      balanceUpdate,
      { upsert: true },
    );
    if (update.modifiedCount === 0) {
      throw new Error("Loja não encontrada ou saldo insuficiente.");
    }
    const extractData = {
      origin,
      action,
      amount,
      description,
      storeId,
    };
    yield databases_1.default.extracts.create(extractData);
  });
exports.changeBalance = changeBalance;
