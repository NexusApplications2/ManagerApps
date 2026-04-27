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
const databases_1 = __importDefault(require("@root/src/databases"));
const camposcloud_sdk_1 = __importDefault(
  require("@root/src/functions/camposcloud-sdk"),
);
const functions_1 = require("@root/src/functions");
const fast_discord_js_1 = require("fast-discord-js");
new fast_discord_js_1.InteractionHandler({
  customId: "config-api",
  run: (client, interaction, providerOrAction, maybeAction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const settingsDB = yield databases_1.default.userSettings.findOne({
        userId_discord: interaction.user.id,
      });
      let provider = providerOrAction;
      let action = maybeAction;
      if (!action) {
        action = providerOrAction;
        provider = functions_1.HOST_PROVIDERS.CAMPOS;
      }
      provider = (0, functions_1.normalizeHostProvider)(provider);
      const currentAccount = (0, functions_1.getUserHostAccount)(
        settingsDB,
        provider,
      );
      const providerLabel = (0, functions_1.getHostLabel)(provider);
      if (action === "show-modal") {
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: `Configurar API - ${providerLabel}`,
          customId: `config-api:${provider}:submit-modal`,
          inputs: [
            {
              label: "API Token",
              required: false,
              style: 1,
              placeholder: "API Token",
              customId: "new-api-token",
              value: currentAccount.apiToken || "",
            },
          ],
        });
        modal.show(interaction);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        const newApiToken =
          interaction.fields.getTextInputValue("new-api-token");
        if (newApiToken) {
          let userData = null;
          if (provider === functions_1.HOST_PROVIDERS.CAMPOS) {
            const sdk = new sdk_1.default({ apiToken: newApiToken });
            userData = yield sdk.getMe().catch(() => null);
          } else {
            const adapter = yield (0, functions_1.createHostAdapter)({
              provider,
              ownerDiscordUserId: interaction.user.id,
              apiToken: newApiToken,
            });
            const validation = yield adapter
              .validateCredentials()
              .catch(() => null);
            userData = validation === null || validation === void 0 ? void 0 : validation.account;
          }
          if (!userData || !userData.id && !userData._id) {
            return yield interaction.reply({
              content: `\`❌\`・Token inválido do ${providerLabel}, verifique e tente novamente!`,
              flags: 64,
            });
          }
          const accountId = userData._id || userData.id;
          const updateSet = (0, functions_1.buildHostAccountSetOperation)(
            provider,
            {
              accountId,
              apiToken: newApiToken,
              name: userData.name || "",
              email: userData.email || "",
              lastValidatedAt: new Date(),
            },
          );
          yield databases_1.default.userSettings.updateMany(
            {
              [`hostAccounts.${provider}.accountId`]: accountId,
              userId_discord: { $ne: interaction.user.id },
            },
            {
              $unset: (0, functions_1.buildHostAccountUnsetOperation)(provider),
            },
          );
          yield databases_1.default.userSettings.updateOne(
            { userId_discord: interaction.user.id },
            {
              $set: Object.assign({ userId_discord: interaction.user.id }, updateSet),
            },
            { upsert: true },
          );
          if (provider === functions_1.HOST_PROVIDERS.CAMPOS) {
            camposcloud_sdk_1.default.clearInstance(interaction.user.id);
          }
        } else {
          yield databases_1.default.userSettings.updateOne(
            { userId_discord: interaction.user.id },
            {
              $unset: (0, functions_1.buildHostAccountUnsetOperation)(provider),
            },
          );
          if (provider === functions_1.HOST_PROVIDERS.CAMPOS) {
            camposcloud_sdk_1.default.clearInstance(interaction.user.id);
          }
        }
        yield client.invokeInteraction("config", interaction);
        return interaction.followUp({
          content: `\`✅\`・Token do ${providerLabel} atualizado com sucesso!`,
          flags: 64,
        });
      }
    }),
});
