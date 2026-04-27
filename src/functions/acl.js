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
exports.getUserHasPermissionOnStore =
  exports.getUserHasPermissionOnBOT =
  exports.list =
  exports.PermissionsStore =
    void 0;
const databases_1 = __importDefault(require("../databases"));
const compat_1 = require("./hosts/compat");
var PermissionsStore;
(function (PermissionsStore) {
  PermissionsStore["ADMIN"] = "admin";
  PermissionsStore["MANAGE_PRODUCTS"] = "manage-products";
  PermissionsStore["MANAGE_SALES"] = "manage-sales";
  PermissionsStore["MANAGE_LOGS"] = "manage-logs";
  PermissionsStore["USE_CONFIG"] = "use-config";
  PermissionsStore["USE_MANAGER"] = "use-manager";
  PermissionsStore["DELETE_APPLICATION"] = "delete-application";
  PermissionsStore["TOGGLE_APPLICATION"] = "toggle-application";
  PermissionsStore["VIEW_APPLICATION_LOGS"] = "view-application-logs";
  PermissionsStore["TRANSFER_APPLICATION_OWNERSHIP"] =
    "transfer-application-ownership";
  PermissionsStore["CHANGE_APPLICATION_DURATION"] =
    "change-application-duration";
  PermissionsStore["SEE_BALANCE"] = "see-balance";
})(PermissionsStore || (exports.PermissionsStore = PermissionsStore = {}));
exports.list = [
  {
    label: "Administrador",
    value: PermissionsStore.ADMIN,
    description: "Permissão total sobre o bot",
  },
  // {
  //     label: "Gerenciar Produtos",
  //     value: Permissions.MANAGE_PRODUCTS,
  //     description: "Permite adicionar, remover e editar produtos"
  // },
  // {
  //     label: "Gerenciar Vendas",
  //     value: Permissions.MANAGE_SALES,
  //     description: "Permite visualizar e editar vendas"
  // },
  // {
  //     label: "Gerenciar Logs",
  //     value: Permissions.MANAGE_LOGS,
  //     description: "Permite visualizar e editar logs"
  // },
  // {
  //     label: "Usar /config",
  //     value: Permissions.USE_CONFIG,
  //     description: "Permite usar o comando /config"
  // },
  // {
  //     label: "Usar /manager",
  //     value: Permissions.USE_MANAGER,
  //     description: "Permite usar o comando /manager"
  // },
  // {
  //     label: "Deletar Aplicações",
  //     value: Permissions.DELETE_APPLICATION,
  //     description: "Permite deletar aplicações"
  // },
  // {
  //     label: "Alternar Aplicações",
  //     value: Permissions.TOGGLE_APPLICATION,
  //     description: "Permite alternar aplicações"
  // },
  // {
  //     label: "Visualizar Logs de Aplicações",
  //     value: Permissions.VIEW_APPLICATION_LOGS,
  //     description: "Permite visualizar logs de aplicações"
  // },
  // {
  //     label: "Transferir Propriedade de Aplicações",
  //     value: Permissions.TRANSFER_APPLICATION_OWNERSHIP,
  //     description: "Permite transferir a propriedade de aplicações"
  // },
  // {
  //     label: "Alterar Duração de Aplicações",
  //     value: Permissions.CHANGE_APPLICATION_DURATION,
  //     description: "Permite alterar a duração de aplicações"
  // },
  // {
  //     label: "Ver Saldo",
  //     value: Permissions.SEE_BALANCE,
  //     description: "Permite ver o saldo do bot"
  // }
];
const permissionsModule = {
  get: () => [...exports.list],
};
const getUserHasPermissionOnBOT = (userId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (userId === process.env.OWNER_ID) {
      return true;
    } else {
      return false;
    }
  });
exports.getUserHasPermissionOnBOT = getUserHasPermissionOnBOT;
const getUserHasPermissionOnStore = (_a) =>
  __awaiter(void 0, [_a], void 0, function* ({ userId, storeId, permission }) {
    var _b;
    const storeConfig = yield databases_1.default.stores
      .findOne(
        { _id: storeId },
        { permissions: 1, ownerId_campos: 1, ownerDiscordId: 1, hostProvider: 1, hostOwnerId: 1 },
      )
      .catch(() => null);
    if (!storeConfig) return false;
    const userSettings = yield databases_1.default.userSettings.findOne(
      { userId_discord: userId },
      { userId_campos: 1, hostAccounts: 1, userId_discord: 1 },
    );
    const isStoreOwner = (0, compat_1.isStoreOwner)(storeConfig, userSettings);
    if (isStoreOwner) {
      return true;
    }
    // Verifica as permissões do usuário na loja.
    const userPermission =
      (_b = storeConfig.permissions.find((perm) => perm.userId === userId)) ===
        null || _b === void 0
        ? void 0
        : _b.permissions;
    if (!userPermission) {
      return false;
    }
    // Se possuir a permissão de "Admin", o usuário tem a permissão máxima.
    if (userPermission.includes(PermissionsStore.ADMIN)) {
      return true;
    }
    // Se o usuário permite a permissão específica, retorna true.
    const hasPermission = userPermission.includes(permission);
    if (hasPermission) {
      return true;
    }
    return false;
  });
exports.getUserHasPermissionOnStore = getUserHasPermissionOnStore;
exports.default = permissionsModule;
