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
const bytes_1 = __importDefault(require("bytes"));
const fast_discord_js_1 = require("fast-discord-js");
const functions_1 = require("@root/src/functions");
const databases_1 = __importDefault(require("@root/src/databases"));
new fast_discord_js_1.SlashCommand({
  name: "config",
  description: "Configuração do manager",
  type: 1,
  run: (client, interaction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      client.invokeInteraction("config", interaction);
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "config",
  run: (_client, interaction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const userSettings = yield databases_1.default.userSettings.findOne({
        userId_discord: interaction.user.id,
      });
      const contents = [
        `# Configurando lojas`,
        `- Aqui você poderá configurar suas lojas!\n`,
      ];
      for (const provider of [
        functions_1.HOST_PROVIDERS.CAMPOS,
        functions_1.HOST_PROVIDERS.SQUARE,
      ]) {
        const account = (0, functions_1.getUserHostAccount)(
          userSettings,
          provider,
        );
        const providerLabel = (0, functions_1.getHostLabel)(provider);
        const dashboardUrl = (0, functions_1.getHostDashboardBaseUrl)(provider);
        if (!account.connected) {
          contents.push(`> ${providerLabel}: \`Não conectado\``);
          continue;
        }
        const adapter = yield (0, functions_1.createHostAdapter)({
          provider,
          ownerDiscordUserId: interaction.user.id,
          apiToken: account.apiToken,
        }).catch(() => null);
        const accountData = adapter
          ? yield adapter.getAccount().catch(() => null)
          : null;
        const planUsage = adapter
          ? yield adapter.getPlanUsage().catch(() => null)
          : null;
        contents.push(
          `> Suas informações da [${providerLabel}](<${dashboardUrl}>)`,
        );
        contents.push(
          `- Nome: \`${(accountData === null || accountData === void 0 ? void 0 : accountData.name) || account.name || "N/A"}\``,
        );
        contents.push(
          `- Email: \`${(accountData === null || accountData === void 0 ? void 0 : accountData.email) || account.email || "N/A"}\``,
        );
        if (planUsage) {
          const emoji =
            planUsage.utilizedMemoryPercentage > 80
              ? "🟥"
              : planUsage.utilizedMemoryPercentage > 50
                ? "🟡"
                : "🟢";
          contents.push(
            `- RAM: \`${(0, bytes_1.default)(planUsage.totalMemory * 1024 * 1024, { unitSeparator: " " })} (${planUsage.utilizedMemoryPercentage}% utilizado) ${emoji}\``,
          );
        }
        if (
          planUsage === null || planUsage === void 0 ? void 0 : planUsage.endAt
        ) {
          const expirationDate = new Date(planUsage.endAt);
          if (!Number.isNaN(expirationDate.getTime())) {
            const formated = expirationDate.toLocaleDateString("pt-BR", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            });
            const days = Math.ceil(
              (expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            );
            const emoji = days <= 7 ? "🟡" : "🟢";
            contents.push(
              `- Data de expiração: \`${formated} (${days} dias) ${emoji}\``,
            );
          }
        }
        contents.push("");
      }
      const storesOptions = [];
      const stores = yield databases_1.default.stores
        .find(
          (0, functions_1.buildStoreLookupQueryForUser)(
            userSettings,
            interaction.user.id,
          ),
          { name: 1, _id: 1 },
        )
        .catch(() => []);
      stores.map((store) => {
        storesOptions.push({
          label: store.name,
          value: store._id.toString(),
          description: "Clique para editar",
          emoji: functions_1.emojis.config,
        });
      });
      const components = [
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Adicionar loja",
            style: 1,
            customId: "add-store:show-provider",
            emoji: functions_1.emojis.add,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "API Campos",
            style: 1,
            customId: `config-api:${functions_1.HOST_PROVIDERS.CAMPOS}:show-modal`,
            emoji: functions_1.emojis.config,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "API Square",
            style: 1,
            customId: `config-api:${functions_1.HOST_PROVIDERS.SQUARE}:show-modal`,
            emoji: functions_1.emojis.config,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Configurar Pagamento",
            style: 1,
            customId: "config-payment",
            emoji: functions_1.emojis.bank,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Atualizar painel",
            style: 2,
            customId: "config",
            emoji: functions_1.emojis.reload,
          }),
        ]),
      ];
      if (storesOptions.length > 0) {
        const select =
          new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
            customId: "config-store",
            placeholder: "Selecione uma loja",
            getValueInLastParam: true,
            options: storesOptions,
          });
        components.unshift((0, fast_discord_js_1.CreateRow)([select]));
      }
      if (interaction.isCommand()) {
        return yield interaction.reply({
          content: contents.join("\n"),
          components,
          flags: 64,
        });
      } else {
        yield interaction.update({
          content: contents.join("\n"),
          files: [],
          components,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "add-store",
  run: (client, interaction, providerOrAction, maybeAction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const settingsDB = yield databases_1.default.userSettings.findOne({
        userId_discord: interaction.user.id,
      });
      let provider = providerOrAction;
      let action = maybeAction;
      if (!action) {
        action = providerOrAction;
        provider = null;
      }
      if (action === "show-provider") {
        return yield interaction.reply({
          content: "Escolha o host da nova loja:",
          flags: 64,
          components: [
            (0, fast_discord_js_1.CreateRow)([
              (0, fast_discord_js_1.CreateButton)({
                label: "Campos Cloud",
                style: 1,
                customId: `add-store:${functions_1.HOST_PROVIDERS.CAMPOS}:show-modal`,
                emoji: functions_1.emojis.add,
              }),
              (0, fast_discord_js_1.CreateButton)({
                label: "Square Cloud",
                style: 1,
                customId: `add-store:${functions_1.HOST_PROVIDERS.SQUARE}:show-modal`,
                emoji: functions_1.emojis.add,
              }),
            ]),
          ],
        });
      }
      provider = (0, functions_1.normalizeHostProvider)(provider);
      const hostAccount = (0, functions_1.getUserHostAccount)(
        settingsDB,
        provider,
      );
      if (!settingsDB || !hostAccount.apiToken) {
        return yield interaction.reply({
          content: `\`❌\`・API do ${(0, functions_1.getHostLabel)(provider)} não configurada!`,
          flags: 64,
        });
      }
      if (action === "show-modal") {
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: `add-store:${provider}:submit-modal`,
          title: `Adicionando loja - ${(0, functions_1.getHostLabel)(provider)}`,
          inputs: [
            {
              customId: "store_name",
              label: "Nome da loja",
              placeholder: "Digite o nome da sua loja",
              required: true,
            },
          ],
        });
        modal.show(interaction);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        const store_name = interaction.fields.getTextInputValue("store_name");
        const adapter = yield (0, functions_1.createHostAdapter)({
          provider,
          ownerDiscordUserId: interaction.user.id,
          apiToken: hostAccount.apiToken,
        }).catch(() => null);
        const accountData = adapter
          ? yield adapter.getAccount().catch(() => null)
          : null;
        if (!accountData) {
          return yield interaction.reply({
            content: `\`❌\`・Ocorreu um erro ao obter os dados da conta ${(0, functions_1.getHostLabel)(provider)}. Verifique o token e tente novamente!`,
            flags: 64,
          });
        }
        yield databases_1.default.stores.create({
          name: store_name,
          ...(0, functions_1.buildStoreHostSetOperation)({
            provider,
            ownerDiscordId: interaction.user.id,
            hostOwnerId: accountData.id,
            hostWorkspaceId: null,
          }),
        });
        yield client.invokeInteraction("config", interaction);
        return yield interaction.followUp({
          content: `\`✅\`・Loja adicionada com sucesso!`,
          flags: 64,
        });
      }
    }),
});
