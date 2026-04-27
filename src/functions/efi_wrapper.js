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
const sdk_node_apis_efi_1 = __importDefault(require("sdk-node-apis-efi"));
const databases_1 = __importDefault(require("../databases"));
class EFI_Wrapper {
  constructor() {
    this.instances = new Map();
  }
  getInstance(userId) {
    return __awaiter(this, void 0, void 0, function* () {
      if (this.instances.has(userId)) {
        return this.instances.get(userId);
      }
      // Cria ou atualiza credenciais
      return yield this.updateCredentials(userId);
    });
  }
  /**
   * Atualiza/Cria as credenciais do usuário no cache
   */
  updateCredentials(userId) {
    return __awaiter(this, void 0, void 0, function* () {
      const settingsDB = yield databases_1.default.userSettings.findOne({
        userId_discord: userId,
      });
      if (!settingsDB) {
        console.error(`Bank settings not found for user ${userId}.`);
        return null;
      }
      const efiSettings = settingsDB.efi_credentials || {};
      if (
        !efiSettings.client_id ||
        !efiSettings.client_secret ||
        !efiSettings.pix_key ||
        !efiSettings.cert
      ) {
        console.error(`EFI bank settings are incomplete for user ${userId}.`);
        return null;
      }
      const instance = new sdk_node_apis_efi_1.default({
        client_id: efiSettings.client_id,
        client_secret: efiSettings.client_secret,
        certificate: efiSettings.cert,
        cert_base64: true,
        sandbox: process.env.NODE_ENV === "development",
      });
      const userEfiInstance = {
        instance,
        pixKey: efiSettings.pix_key,
        isValid: yield this.checkIsValidConfig(userId, instance),
      };
      this.instances.set(userId, userEfiInstance);
      return userEfiInstance;
    });
  }
  /**
   * Testa se a instância do usuário está funcionando
   */
  checkIsValidConfig(userId, efiInstance) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        yield efiInstance.getAccountBalance();
        return true;
      } catch (error) {
        console.error(`Error testing EFI instance for user ${userId}:`, error);
        return false;
      }
    });
  }
}
const efiWrapper = new EFI_Wrapper();
exports.default = efiWrapper;
