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
const __1 = __importDefault(require(".."));
const databases_1 = __importDefault(require("../databases"));
const compat_1 = require("../functions/hosts/compat");
__1.default.on("interactionCreate", (interaction) =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (!interaction.isAutocomplete()) return;
    if (interaction.commandName === "apps") {
      const focused = interaction.options.getFocused(true);
      if (focused.name === "store") {
        const userApplications = yield databases_1.default.applications
          .find({ ownerId: interaction.user.id })
          .populate("productId")
          .populate("storeId");
        if (!userApplications || userApplications.length === 0) {
          return interaction.respond([
            {
              name: "❌ Você não possui aplicação em nenhuma loja.",
              value: "not_found",
            },
          ]);
        }
        const storeList = [];
        userApplications.map((app) => {
          const store = app.storeId;
          if (
            store &&
            !storeList.some((s) => s.value === store._id.toString())
          ) {
            storeList.push({ name: store.name, value: store._id.toString() });
          }
        });
        return interaction.respond(storeList.slice(0, 25)); // máximo de 25
      }
    }
  }),
);
__1.default.on("interactionCreate", (interaction) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!interaction.isAutocomplete()) return;
    // Se for o comando "enviar-release"
    if (interaction.commandName === "enviar-release") {
      const focused = interaction.options.getFocused(true); // pega o campo em foco (store ou product)
      if (focused.name === "store") {
        const userData = yield databases_1.default.userSettings.findOne(
          { userId_discord: interaction.user.id },
          { userId_campos: 1, hostAccounts: 1 },
        );
        const stores = yield databases_1.default.stores
          .find(
            (0, compat_1.buildStoreLookupQueryForUser)(
              userData,
              interaction.user.id,
            ),
            { name: 1, _id: 1 },
          )
          .catch(() => []);
        if (!stores || stores.length === 0) {
          return interaction.respond([
            { name: "❌ Nenhuma loja encontrada", value: "not_found" },
          ]);
        }
        const choices = stores.map((s) => ({
          name: s.name,
          value: s._id.toString(),
        }));
        return interaction.respond(choices.slice(0, 25)); // máximo de 25
      }
      if (focused.name === "product") {
        const storeId =
          (_a = interaction.options.get("store")) === null || _a === void 0
            ? void 0
            : _a.value;
        if (!storeId) {
          return interaction.respond([
            { name: "❌ Nenhuma loja encontrada", value: "not_found" },
          ]);
        }
        const products = yield databases_1.default.products.find(
          { storeId },
          { name: 1 },
        );
        if (!products || products.length === 0) {
          return interaction.respond([
            { name: "❌ Nenhum produto encontrado", value: "not_found" },
          ]);
        }
        const choices = products.map((p) => ({
          name: p.name,
          value: p._id.toString(),
        }));
        return interaction.respond(choices.slice(0, 25));
      }
    }
  }),
);
