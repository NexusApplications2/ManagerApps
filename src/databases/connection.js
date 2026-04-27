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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const functions_1 = require("../functions");
exports.default = () =>
  __awaiter(void 0, void 0, void 0, function* () {
    const connectionString = (0, functions_1.getEnv)("MONGO_DB_URL");
    const dbName = process.env.MANAGER_CORE_DB_NAME || "manager_core";
    yield (0, mongoose_1.connect)(connectionString, { dbName }).then(() => {
      console.log(
        `✅・Conexão com o MongoDB estabelecida com sucesso! DB: ${dbName}`,
      );
    });
  });
