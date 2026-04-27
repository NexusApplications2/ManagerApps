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
const sdk_1 = __importDefault(require("@camposcloud/sdk"));
function getDatabases() {
  return require("../databases").default;
}
class SDKWrapper {
  constructor() {
    this.instances = new Map();
  }
  /**
   * Retorna a instância do SDK para o usuário
   */
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
   * Cria ou atualiza as credenciais do SDK no cache
   */
  updateCredentials(userId) {
    return __awaiter(this, void 0, void 0, function* () {
      const databases = getDatabases();
      const settingsDB = yield databases.userSettings.findOne({
        userId_discord: userId,
      });
      const legacySettings =
        (settingsDB === null || settingsDB === void 0
          ? void 0
          : settingsDB.settings) || {};
      const camposToken =
        (settingsDB === null || settingsDB === void 0
          ? void 0
          : settingsDB.token_campos) || legacySettings.token_campos;
      if (!settingsDB || !camposToken) {
        console.error(`CamposCloud token not found for user ${userId}.`);
        return null;
      }
      const instance = new sdk_1.default({
        apiToken: camposToken,
      });
      const userSDKInstance = {
        instance,
        isValid: yield this.checkIsValidConfig(userId, instance),
      };
      this.instances.set(userId, userSDKInstance);
      return userSDKInstance;
    });
  }
  /**
   * Testa se o token/config do usuário é válido
   */
  checkIsValidConfig(userId, sdkInstance) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        yield sdkInstance.getMe();
        return true;
      } catch (error) {
        console.error(
          `Error testing CamposCloud SDK for user ${userId}:`,
          error,
        );
        return false;
      }
    });
  }
  /**
   * Obtém o uso de memória do plano do usuário
   */
  getPlanUsage(userId) {
    return __awaiter(this, void 0, void 0, function* () {
      const sdkInstance =
        this.instances.get(userId) || (yield this.getInstance(userId));
      if (!sdkInstance) return null;
      const sdk = sdkInstance.instance;
      const userData = yield sdk.getMe().catch(() => null);
      if (!userData || !userData.currentSubscription) return null;
      const applications = yield sdk.getApplications().catch(() => null);
      if (!applications) return null;
      const currentSubscription = userData.currentSubscription;
      const currentUserPlan = currentSubscription.planReference;
      let planMemoryMB;
      if (currentUserPlan) {
        if (["business", "customized"].includes(currentUserPlan.type)) {
          planMemoryMB = currentSubscription.allocatedMemoryMB;
        } else {
          planMemoryMB = currentUserPlan.ramMB;
        }
      }
      if (planMemoryMB === undefined) return null;
      const usedMemoryMB = Number(applications.totalUsedRAM) || 0;
      const freeMemoryMB = planMemoryMB - usedMemoryMB;
      const utilizedMemoryPercentage =
        planMemoryMB > 0
          ? Number(((usedMemoryMB / planMemoryMB) * 100).toFixed(2))
          : 0;
      return {
        planReference: currentUserPlan,
        totalMemory: planMemoryMB,
        usedMemoryMB,
        freeMemoryMB,
        utilizedMemoryPercentage,
        endAt: currentSubscription.endAt,
      };
    });
  }
  clearInstance(userId) {
    this.instances.delete(userId);
  }
}
const sdkWrapper = new SDKWrapper();
exports.default = sdkWrapper;
