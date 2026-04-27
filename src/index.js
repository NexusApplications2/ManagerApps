"use strict";
require("module-alias/register");
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
const fast_discord_js_1 = require("fast-discord-js");
require("./cronjobs");
require("./databases");
const server_1 = require("./http/server");
/**
 * TODO: Sistema de pagamento manual, para o cliente pagar via chave PIX e mandar o comprovante.
 */
const client = new fast_discord_js_1.Client({
  autoImport: ["./src/commands", "./src/events"],
});
(0, server_1.startHttpServer)();
client.login(process.env.BOT_TOKEN);
client.on("clientReady", (client) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const invite = `https://discord.com/api/oauth2/authorize?client_id=${(_a = client.user) === null || _a === void 0 ? void 0 : _a.id}&permissions=8&scope=bot%20applications.commands`;
    console.log(
      `✅・Bot Online como ${(_b = client.user) === null || _b === void 0 ? void 0 : _b.tag}`,
    );
    console.log(`🔗・Convite: ${invite}`);
    console.log(`👥・Servidores: ${client.guilds.cache.size}`);
    console.log(`📊・Usuários: ${client.users.cache.size}`);
  }),
);
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
exports.default = client;
