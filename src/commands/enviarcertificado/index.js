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
const axios_1 = __importDefault(require("axios"));
const discord_js_1 = require("discord.js");
const fast_discord_js_1 = require("fast-discord-js");
const databases_1 = __importDefault(require("@root/src/databases"));
const efi_wrapper_1 = __importDefault(
  require("@root/src/functions/efi_wrapper"),
);
new fast_discord_js_1.SlashCommand({
  name: "enviarcertificado",
  description: "Envia o certificado do banco para receber pagamentos",
  type: 1,
  options: [
    {
      name: "certificado",
      description: "certificado EFI",
      type: discord_js_1.ApplicationCommandOptionType.Attachment,
      required: true,
    },
  ],
  run: (client, interaction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      try {
        const userSettings = yield databases_1.default.userSettings.findOne({
          userId_discord: interaction.user.id,
        });
        if (!userSettings) {
          return interaction.reply({
            content: "`❌`・Você não está cadastrado!",
            flags: 64,
          });
        }
        const content = interaction.options.get("certificado");
        if (
          !((_a =
            content === null || content === void 0
              ? void 0
              : content.attachment) === null || _a === void 0
            ? void 0
            : _a.url)
        ) {
          throw new Error("O arquivo não foi recebido corretamente.");
        }
        // Fazer o download do certificado
        const response = yield axios_1.default.get(content.attachment.url, {
          responseType: "arraybuffer",
        });
        const certString = Buffer.from(response.data).toString("base64");
        if (!certString || !certString.length) {
          throw new Error("O certificado está vazio ou inválido.");
        }
        // Salvar no banco de dados
        yield databases_1.default.userSettings.updateOne(
          { userId_discord: interaction.user.id },
          { $set: { "efi_credentials.cert": certString } },
          { upsert: true },
        );
        /**
         * Vamos atualizar as credenciais no cache
         * E testar se o banco está funcionando corretamente
         * Caso não esteja, avisar o usuário
         */
        const paymentInstance = yield efi_wrapper_1.default
          .updateCredentials(interaction.user.id)
          .catch(() => null);
        if (
          !(paymentInstance === null || paymentInstance === void 0
            ? void 0
            : paymentInstance.isValid)
        ) {
          return interaction.reply({
            content:
              "`⚠️`・Certificado enviado, mas o banco não está funcionando corretamente. Verifique as credenciais e o certificado se é valido.",
            flags: 64,
          });
        }
        return interaction.reply({
          content: "`✅`・Certificado enviado com sucesso e banco funcionando.",
          flags: 64,
        });
      } catch (error) {
        return interaction.reply({
          content: `\`❌\`・${error.message}`,
          flags: 64,
        });
      }
    }),
});
