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
exports.getCartMessageRenew = void 0;
const databases_1 = __importDefault(require("@root/src/databases"));
const axios_1 = __importDefault(require("axios"));
const bytes_1 = __importDefault(require("bytes"));
const functions_1 = require("@root/src/functions");
const discord_js_1 = require("discord.js");
const fast_discord_js_1 = require("fast-discord-js");
const cronjobs_1 = require("@root/src/cronjobs");
const RENEW_CART_EXPIRES_MINUTES = 30;
function getRemoteRunning(remoteStatus) {
  return Boolean(remoteStatus === null || remoteStatus === void 0 ? void 0 : remoteStatus.running);
}
function getRemoteMemoryLabel(remoteStatus) {
  if (!getRemoteRunning(remoteStatus)) {
    return "N/A";
  }
  if (
    Number.isFinite(remoteStatus === null || remoteStatus === void 0 ? void 0 : remoteStatus.memoryBytes) &&
    Number.isFinite(remoteStatus === null || remoteStatus === void 0 ? void 0 : remoteStatus.memoryLimitBytes)
  ) {
    return `${(0, bytes_1.default)(remoteStatus.memoryBytes, { unitSeparator: " " }) || "0"} / ${(0, bytes_1.default)(remoteStatus.memoryLimitBytes, { unitSeparator: " " })}`;
  }
  if (remoteStatus === null || remoteStatus === void 0 ? void 0 : remoteStatus.ram) {
    return String(remoteStatus.ram);
  }
  return "N/A";
}
function getRemoteUptimeLabel(remoteStatus) {
  if (!getRemoteRunning(remoteStatus) || !(remoteStatus === null || remoteStatus === void 0 ? void 0 : remoteStatus.uptime)) {
    return "`N/A`";
  }
  return `<t:${Math.floor(Date.now() / 1000 - remoteStatus.uptime)}:R>`;
}
function getApplicationTierLabel(application) {
  return application.deliveryMode === functions_1.PRODUCT_DELIVERY_MODES.SHARED
    ? "Bot pronto no servidor"
    : "Bot privado só seu";
}
function getApplicationPriceTable(product, application) {
  return (0, functions_1.getProductPriceTable)(
    product,
    application.deliveryMode || functions_1.PRODUCT_DELIVERY_MODES.PRIVATE,
  );
}
new fast_discord_js_1.SlashCommand({
  name: "apps",
  description: "Liste suas aplicações",
  type: 1,
  options: [
    {
      name: "store",
      description: "Selecione a loja",
      type: discord_js_1.ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
  ],
  run: (client, interaction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const storeId = interaction.options.get("store");
      if (!storeId || !storeId.value) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Nenhuma loja selecionada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      return client.invokeInteraction(
        `invoke-apps:${storeId.value}`,
        interaction,
      );
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "invoke-apps",
  run: (_client, interaction, storeId, appId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      const storeConfig = yield databases_1.default.stores
        .findById(storeId)
        .catch(() => null);
      if (!storeConfig) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Loja não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const userApplications = yield databases_1.default.applications
        .find({ ownerId: interaction.user.id, storeId: storeConfig._id })
        .populate("productId");
      if (!userApplications.length) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Você não possui nenhuma aplicação.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const currentApplication = appId
        ? userApplications.find((app) => app._id.toString() === appId)
        : null;
      // Se não há appId, mostra tela de seleção de aplicação primeiro
      if (!currentApplication && !appId) {
        const selectApplications = userApplications.map((app) => {
          const product = app.productId;
          return {
            label: app.name,
            value: app.id,
            description: `${product.name} • ${getApplicationTierLabel(app)}`,
            emoji: functions_1.emojis.foldder,
          };
        });
        const selectEmbed = new discord_js_1.EmbedBuilder()
          .setTitle("🤖 Gerenciar Aplicações")
          .setDescription("Selecione a aplicação que deseja gerenciar.")
          .setColor(0x5865f2)
          .setTimestamp();
        const selectComponents = [
          (0, fast_discord_js_1.CreateRow)([
            new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
              customId: `invoke-apps:${storeConfig._id}`,
              options: selectApplications,
              placeholder: "Selecione uma aplicação",
              getValueInLastParam: true,
            }),
          ]),
        ];
        if (interaction.isCommand()) {
          return interaction.reply({
            embeds: [selectEmbed],
            components: selectComponents,
            flags: 64,
          });
        } else if (interaction.replied || interaction.deferred) {
          return interaction.editReply({
            embeds: [selectEmbed],
            components: selectComponents,
            files: [],
          });
        } else {
          // Botão do canal público: abre seleção em ephemeral
          return interaction.reply({
            embeds: [selectEmbed],
            components: selectComponents,
            flags: 64,
          });
        }
      }
      if (!currentApplication) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Aplicação não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const currentProduct = currentApplication.productId;
      if (
        currentApplication.deliveryMode ===
        functions_1.PRODUCT_DELIVERY_MODES.SHARED
      ) {
        const entitlement = yield (0, functions_1.findEntitlementByApplicationId)(
          currentApplication._id.toString(),
        ).catch(() => null);
        const selectApplications = userApplications.map((app) => {
          const product = app.productId;
          return {
            label: app.name,
            value: app.id,
            description: `${product.name} • ${getApplicationTierLabel(app)}`,
            emoji: functions_1.emojis.foldder,
          };
        });
        const statusDict = {
          active: "Ativo・🟢",
          grace_period: "Período de carência・🟠",
          expired: "Expirado・🔴",
        };
        const embed = new discord_js_1.EmbedBuilder()
          .setTitle(`🌐 ${currentApplication.name}`)
          .setDescription(
            "Esta compra usa o formato de bot pronto no servidor. A ativação acontece no `/resgatar-key`; depois use `/gerenciar` no bot convidado.",
          )
          .addFields(
            {
              name: "📦 Produto",
              value: `\`${currentProduct.name}\``,
              inline: true,
            },
            {
              name: "🧭 Plano",
              value: `\`${getApplicationTierLabel(currentApplication)}\``,
              inline: true,
            },
            {
              name: "📋 Status",
              value:
                statusDict[currentApplication.status] ||
                currentApplication.status ||
                "N/A",
              inline: true,
            },
            {
              name: "🏷️ Guild vinculada",
              value: entitlement === null || entitlement === void 0 ? void 0 : entitlement.boundGuildName
                ? `\`${entitlement.boundGuildName}\``
                : "`Aguardando vínculo`",
              inline: true,
            },
            {
              name: "🔑 Key",
              value: currentApplication.claimKeyLast4
                ? `Final \`${currentApplication.claimKeyLast4}\``
                : "`Gerada no carrinho`",
              inline: true,
            },
            {
              name: "📅 Expiração",
              value: currentApplication.lifetime
                ? "`♾️ Lifetime`"
                : currentApplication.expiresAt
                  ? `<t:${Math.floor(currentApplication.expiresAt.getTime() / 1000)}:R>`
                  : "`N/A`",
              inline: true,
            },
          )
          .setColor(0x5865f2)
          .setTimestamp();
        const components = [
          (0, fast_discord_js_1.CreateRow)([
            new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
              customId: `invoke-apps:${storeConfig._id}`,
              options: selectApplications,
              placeholder: "Selecione uma aplicação",
              getValueInLastParam: true,
            }),
          ]),
          (0, fast_discord_js_1.CreateRow)([
            (0, fast_discord_js_1.CreateButton)({
              customId: `renew-app:${currentApplication._id}`,
              label: "Renovar licença",
              style: discord_js_1.ButtonStyle.Secondary,
              emoji: functions_1.emojis.cart,
              disabled: currentApplication.lifetime,
            }),
            (0, fast_discord_js_1.CreateButton)({
              customId: `settings-app:${currentApplication._id}`,
              label: "Detalhes",
              style: discord_js_1.ButtonStyle.Secondary,
              emoji: functions_1.emojis.config,
            }),
            (0, fast_discord_js_1.CreateButton)({
              customId: `invoke-apps:${storeId}:${currentApplication._id}`,
              label: "Atualizar painel",
              style: discord_js_1.ButtonStyle.Secondary,
              emoji: functions_1.emojis.reload,
            }),
          ]),
        ];
        if (currentApplication.inviteUrl) {
          components.push(
            (0, fast_discord_js_1.CreateRow)([
              (0, fast_discord_js_1.CreateButton)({
                label: "Convidar bot",
                style: discord_js_1.ButtonStyle.Link,
                url: currentApplication.inviteUrl,
                customId: "",
                emoji: functions_1.emojis.user,
              }),
            ]),
          );
        }
        if (interaction.isCommand()) {
          return interaction.reply({
            embeds: [embed],
            components,
            flags: 64,
          });
        } else if (interaction.replied || interaction.deferred) {
          return interaction.editReply({
            embeds: [embed],
            components,
            files: [],
          });
        } else if (interaction.isAnySelectMenu()) {
          return interaction.update({ embeds: [embed], components, files: [] });
        }
        return interaction.reply({
          embeds: [embed],
          components,
          flags: 64,
        });
      }
      const remoteState = yield (0, functions_1.getRemoteApplicationState)(
        databases_1.default,
        currentApplication,
        storeConfig,
      ).catch(() => null);
      const selectApplications = userApplications.map((app) => {
        const product = app.productId;
        return {
          label: app.name,
          value: app.id,
          description: `${product.name} • ${getApplicationTierLabel(app)}`,
          emoji: functions_1.emojis.foldder,
        };
      });
      const applicationMetrics = remoteState
        ? remoteState.remoteStatus
        : null;
      const memoryUsedLabel = getRemoteMemoryLabel(applicationMetrics);
      const statusDict = {
        active: "Ativo・🟢",
        grace_period: "Período de carência・🟠",
        expired: "Expirado・🔴",
      };
      const versionLabel =
        currentProduct.currentReleaseVersion !== currentApplication.version
          ? "Será atualizado em breve ⚠️"
          : "🟢";
      const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`🤖 ${currentApplication.name}`)
        .setDescription("Aqui estão as informações da sua aplicação.")
        .addFields(
          {
            name: "🟢 Status Online",
            value: getRemoteRunning(applicationMetrics)
              ? "Online・🟢"
              : "Offline・🔴",
            inline: true,
          },
          {
            name: "📋 Status Conta",
            value: statusDict[currentApplication.status],
            inline: true,
          },
          { name: "💾 Memória", value: `\`${memoryUsedLabel}\``, inline: true },
          {
            name: "⏱️ Tempo de Atividade",
            value: getRemoteUptimeLabel(applicationMetrics),
            inline: true,
          },
          {
            name: "📅 Expiração",
            value: currentApplication.lifetime
              ? "`♾️ Lifetime`"
              : `<t:${Math.floor((((_a = currentApplication.expiresAt) === null || _a === void 0 ? void 0 : _a.getTime()) || 0) / 1000)}:R>`,
            inline: true,
          },
          {
            name: "🔖 Versão",
            value: `\`v${currentApplication.version}・${currentApplication.errorOnUpdate ? "Erro ao atualizar ⚠️" : versionLabel}\``,
            inline: true,
          },
        )
        .setColor(getRemoteRunning(applicationMetrics) ? 0x57f287 : 0xed4245)
        .setTimestamp();
      const components = [
        (0, fast_discord_js_1.CreateRow)([
          new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
            customId: `invoke-apps:${storeConfig._id}`,
            options: selectApplications,
            placeholder: "Selecione uma aplicação",
            getValueInLastParam: true,
          }),
        ]),
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            customId: `start-app:${currentApplication._id}`,
            label: "Iniciar",
            style: discord_js_1.ButtonStyle.Success,
            emoji: functions_1.emojis.play,
            disabled: getRemoteRunning(applicationMetrics),
          }),
          (0, fast_discord_js_1.CreateButton)({
            customId: `restart-app:${currentApplication._id}`,
            label: "Reiniciar",
            style: discord_js_1.ButtonStyle.Primary,
            emoji: functions_1.emojis.reload,
            disabled: !getRemoteRunning(applicationMetrics),
          }),
          (0, fast_discord_js_1.CreateButton)({
            customId: `stop-app:${currentApplication._id}`,
            label: "Parar",
            style: discord_js_1.ButtonStyle.Danger,
            emoji: functions_1.emojis.square,
            disabled: !getRemoteRunning(applicationMetrics),
          }),
          (0, fast_discord_js_1.CreateButton)({
            customId: `renew-app:${currentApplication._id}`,
            label: "Renovar BOT",
            style: discord_js_1.ButtonStyle.Secondary,
            emoji: functions_1.emojis.cart,
            disabled: currentApplication.lifetime,
          }),
        ]),
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            customId: `settings-app:${currentApplication._id}`,
            label: "Configurações",
            style: discord_js_1.ButtonStyle.Secondary,
            emoji: functions_1.emojis.config,
          }),
          (0, fast_discord_js_1.CreateButton)({
            customId: `invoke-apps:${storeId}:${currentApplication._id}`,
            label: "Atualizar painel",
            style: discord_js_1.ButtonStyle.Secondary,
            emoji: functions_1.emojis.reload,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Adicionar no Servidor",
            style: discord_js_1.ButtonStyle.Link,
            url: `https://discord.com/api/oauth2/authorize?client_id=${currentApplication.botId}&permissions=8&scope=bot%20applications.commands`,
            customId: ``,
            emoji: functions_1.emojis.user,
          }),
        ]),
      ];
      if (interaction.isCommand()) {
        return interaction.reply({
          embeds: [embed],
          components,
          flags: 64,
        });
      } else {
        if (interaction.replied || interaction.deferred) {
          return interaction.editReply({
            embeds: [embed],
            components,
            files: [],
          });
        } else if (interaction.isAnySelectMenu()) {
          // Select menu dentro da mensagem ephemeral: atualiza a mensagem existente
          return interaction.update({ embeds: [embed], components, files: [] });
        } else {
          // Botão de canal público: abre painel em ephemeral sem alterar a embed original
          return interaction.reply({
            embeds: [embed],
            components,
            flags: 64,
          });
        }
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "settings-app",
  run: (client, interaction, appId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      const application = yield databases_1.default.applications
        .findById(appId)
        .populate("productId");
      if (!application) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Aplicação não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const product = application.productId;
      if (
        application.deliveryMode === functions_1.PRODUCT_DELIVERY_MODES.SHARED
      ) {
        const entitlement = yield (0, functions_1.findEntitlementByApplicationId)(
          application._id.toString(),
        ).catch(() => null);
        const embed = new discord_js_1.EmbedBuilder()
          .setTitle(`⚙️ Licença do bot pronto: ${application.name}`)
          .setDescription(
            "Essa licença é gerenciada pelo manager. Ative no `/resgatar-key` e acompanhe pelo `/gerenciar` do bot convidado.",
          )
          .addFields(
            {
              name: "📦 Produto",
              value: `\`${product.name}\``,
              inline: true,
            },
            {
              name: "🔑 Key",
              value: application.claimKeyLast4
                ? `Final \`${application.claimKeyLast4}\``
                : "`N/A`",
              inline: true,
            },
            {
              name: "🏷️ Guild vinculada",
              value: entitlement === null || entitlement === void 0 ? void 0 : entitlement.boundGuildName
                ? `\`${entitlement.boundGuildName}\``
                : "`Aguardando vínculo`",
              inline: true,
            },
          )
          .setColor(0x5865f2)
          .setTimestamp();
        const components = [
          (0, fast_discord_js_1.CreateRow)([
            (0, fast_discord_js_1.CreateButton)({
              customId: `settings-app:${appId}`,
              label: "Atualizar painel",
              style: discord_js_1.ButtonStyle.Secondary,
              emoji: functions_1.emojis.reload,
            }),
            (0, fast_discord_js_1.CreateButton)({
              customId: `invoke-apps:${application.storeId}:${application._id}`,
              label: "Voltar",
              style: discord_js_1.ButtonStyle.Secondary,
              emoji: functions_1.emojis.back,
            }),
          ]),
        ];
        if (application.inviteUrl) {
          components.unshift(
            (0, fast_discord_js_1.CreateRow)([
              (0, fast_discord_js_1.CreateButton)({
                label: "Convidar bot",
                style: discord_js_1.ButtonStyle.Link,
                url: application.inviteUrl,
                customId: "",
                emoji: functions_1.emojis.user,
              }),
            ]),
          );
        }
        if (interaction.replied || interaction.deferred) {
          return yield interaction.editReply({ embeds: [embed], components });
        }
        yield interaction.update({ embeds: [embed], components });
        return;
      }
      const components = [
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            customId: `change-token:${appId}:show-modal`,
            label: "Alterar token",
            style: discord_js_1.ButtonStyle.Primary,
            emoji: functions_1.emojis.settings,
          }),
          (0, fast_discord_js_1.CreateButton)({
            customId: `change-name:${appId}:show-modal`,
            label: "Alterar nome",
            style: discord_js_1.ButtonStyle.Secondary,
            emoji: functions_1.emojis.settings,
          }),
          (0, fast_discord_js_1.CreateButton)({
            customId: `settings-app:${appId}`,
            label: "Atualizar painel",
            style: discord_js_1.ButtonStyle.Secondary,
            emoji: functions_1.emojis.reload,
          }),
          (0, fast_discord_js_1.CreateButton)({
            customId: `invoke-apps:${application.storeId}:${application._id}`,
            label: "Voltar",
            style: discord_js_1.ButtonStyle.Secondary,
            emoji: functions_1.emojis.back,
          }),
        ]),
      ];
      const statusDict = {
        active: "Ativo・🟢",
        grace_period: "Período de carência・🟠",
        expired: "Expirado・🔴",
      };
      const versionLabel =
        product.currentReleaseVersion !== application.version
          ? "Será atualizado em breve ⚠️"
          : "🟢";
      const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`⚙️ Configurações: ${application.name}`)
        .addFields(
          { name: "📦 Produto", value: `\`${product.name}\``, inline: true },
          {
            name: "🆔 ID do Produto",
            value: `\`${product._id}\``,
            inline: true,
          },
          { name: "\u200B", value: "\u200B", inline: false },
          {
            name: "🖥️ ID da Aplicação",
            value: `\`${application.appId}\``,
            inline: true,
          },
          {
            name: "🤖 ID do Bot",
            value: `\`${application.botId}\``,
            inline: true,
          },
          { name: "\u200B", value: "\u200B", inline: false },
          {
            name: "📅 Expiração",
            value: application.lifetime
              ? "`♾️ Lifetime`"
              : `<t:${Math.floor((((_a = application.expiresAt) === null || _a === void 0 ? void 0 : _a.getTime()) || 0) / 1000)}:R>`,
            inline: true,
          },
          {
            name: "🔖 Versão",
            value: `\`v${application.version}・${application.errorOnUpdate ? "Erro ao atualizar ⚠️" : versionLabel}\``,
            inline: true,
          },
          {
            name: "📋 Status",
            value: `\`${statusDict[application.status]}\``,
            inline: true,
          },
        )
        .setColor(0x5865f2)
        .setTimestamp();
      if (interaction.replied || interaction.deferred) {
        return yield interaction.editReply({ embeds: [embed], components });
      } else {
        yield interaction.update({ embeds: [embed], components });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "change-token",
  run: (client, interaction, appId, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      const application = yield databases_1.default.applications
        .findById(appId)
        .populate("storeId")
        .populate("productId");
      if (!application) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Aplicação não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const storeConfig = application.storeId;
      if (!storeConfig) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Loja não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const product = application.productId;
      if (!product) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Produto não encontrado.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      if (
        application.deliveryMode === functions_1.PRODUCT_DELIVERY_MODES.SHARED
      ) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・Licenças de bot pronto no servidor não permitem alteração de token pelo manager.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      if (action === "show-modal" && interaction.isButton()) {
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Alterar Token da Aplicação",
          customId: `change-token:${appId}:submit-modal`,
          inputs: [
            {
              label: "Novo Token",
              customId: "newToken",
              required: true,
              placeholder: "Digite o novo token da aplicação",
              value: application.token,
            },
          ],
        });
        return interaction.showModal(modal);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        try {
          yield interaction.deferUpdate({});
          yield interaction.editReply({
            embeds: [
              new discord_js_1.EmbedBuilder()
                .setTitle("🔁 Alterando token...")
                .setColor(0x5865f2),
            ],
            components: [],
          });
          const newToken = interaction.fields.getTextInputValue("newToken");
          if (!newToken) throw new Error("O token não pode ser vazio.");
          const botInfo = yield axios_1.default
            .get(`https://discord.com/api/v10/applications/@me`, {
              headers: {
                contentType: "application/json",
                Authorization: `Bot ${newToken}`,
              },
            })
            .catch(() => null);
          if (!botInfo || !botInfo.data)
            throw new Error("Token inválido. Verifique e tente novamente.");
          application.botId = botInfo.data.id;
          application.token = newToken;
          yield (0, functions_1.updateManagedApplicationEnvironment)(
            databases_1.default,
            {
              application,
              product,
              store: storeConfig,
              ownerId: interaction.user.id,
              botToken: newToken,
            },
          );
          yield application.save();
          yield client.invokeInteraction(
            `settings-app:${application._id}`,
            interaction,
          );
          yield interaction.followUp({
            embeds: [
              new discord_js_1.EmbedBuilder()
                .setDescription("`✅`・Token alterado com sucesso!")
                .setColor(0x57f287),
            ],
            flags: 64,
          });
        } catch (error) {
          yield client.invokeInteraction(`settings-app:${appId}`, interaction);
          yield interaction.followUp({
            embeds: [
              new discord_js_1.EmbedBuilder()
                .setDescription(`\`❌\`・${error.message}`)
                .setColor(0xed4245),
            ],
            flags: 64,
          });
        }
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "restart-app",
  run: (client, interaction, appId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      if (!interaction.isButton()) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・Este comando só pode ser usado através de um botão.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const application = yield databases_1.default.applications
        .findById(appId)
        .populate("storeId");
      if (!application) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Aplicação não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const storeConfig = application.storeId;
      if (!storeConfig) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Loja não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      if (application.status !== "active") {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・A aplicação não está ativa. Não é possível reiniciar.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const remoteState = yield (0, functions_1.getRemoteApplicationState)(
        databases_1.default,
        application,
        storeConfig,
      ).catch(() => null);
      if (!(remoteState === null || remoteState === void 0 ? void 0 : remoteState.remoteApplication)) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Aplicação remota não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      try {
        yield interaction.deferUpdate({});
        yield interaction.editReply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setTitle("🔁 Reiniciando aplicação...")
              .setColor(0x5865f2),
          ],
          components: [],
        });
        if (!getRemoteRunning(remoteState.remoteStatus)) {
          return interaction.followUp({
            embeds: [
              new discord_js_1.EmbedBuilder()
                .setDescription("`❌`・A aplicação não está online.")
                .setColor(0xed4245),
            ],
            flags: 64,
          });
        }
        yield remoteState.adapter.restartApplication(application.appId);
        yield client.invokeInteraction(
          `invoke-apps:${storeConfig._id}:${application._id}`,
          interaction,
        );
        yield interaction.followUp({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`✅`・Aplicação reiniciada com sucesso!")
              .setColor(0x57f287),
          ],
          flags: 64,
        });
      } catch (error) {
        yield client.invokeInteraction(
          `invoke-apps:${storeConfig._id}:${application._id}`,
          interaction,
        );
        yield interaction.followUp({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(`\`❌\`・${error.message}`)
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "start-app",
  run: (client, interaction, appId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      if (!interaction.isButton()) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・Este comando só pode ser usado através de um botão.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const application = yield databases_1.default.applications
        .findById(appId)
        .populate("storeId");
      if (!application) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Aplicação não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const storeConfig = application.storeId;
      if (!storeConfig) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Loja não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      if (application.status !== "active") {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・A aplicação não está ativa. Não é possível iniciar.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const remoteState = yield (0, functions_1.getRemoteApplicationState)(
        databases_1.default,
        application,
        storeConfig,
      ).catch(() => null);
      if (!(remoteState === null || remoteState === void 0 ? void 0 : remoteState.remoteApplication)) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Aplicação remota não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      try {
        yield interaction.deferUpdate({});
        yield interaction.editReply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setTitle("🔁 Iniciando aplicação...")
              .setColor(0x5865f2),
          ],
          components: [],
        });
        if (getRemoteRunning(remoteState.remoteStatus)) {
          return interaction.followUp({
            embeds: [
              new discord_js_1.EmbedBuilder()
                .setDescription("`❌`・A aplicação já está online.")
                .setColor(0xed4245),
            ],
            flags: 64,
          });
        }
        yield remoteState.adapter.startApplication(application.appId);
        yield client.invokeInteraction(
          `invoke-apps:${storeConfig._id}:${application._id}`,
          interaction,
        );
        yield interaction.followUp({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`✅`・Aplicação iniciada com sucesso!")
              .setColor(0x57f287),
          ],
          flags: 64,
        });
      } catch (error) {
        yield client.invokeInteraction(
          `invoke-apps:${storeConfig._id}:${application._id}`,
          interaction,
        );
        yield interaction.followUp({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(`\`❌\`・${error.message}`)
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "stop-app",
  run: (client, interaction, appId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      if (!interaction.isButton()) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・Este comando só pode ser usado através de um botão.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const application = yield databases_1.default.applications
        .findById(appId)
        .populate("storeId");
      if (!application) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Aplicação não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const storeConfig = application.storeId;
      if (!storeConfig) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Loja não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      if (application.status !== "active") {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・A aplicação não está ativa. Não é possível parar.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const remoteState = yield (0, functions_1.getRemoteApplicationState)(
        databases_1.default,
        application,
        storeConfig,
      ).catch(() => null);
      if (!(remoteState === null || remoteState === void 0 ? void 0 : remoteState.remoteApplication)) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Aplicação remota não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      try {
        yield interaction.deferUpdate({});
        yield interaction.editReply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setTitle("🔁 Parando aplicação...")
              .setColor(0x5865f2),
          ],
          components: [],
        });
        if (!getRemoteRunning(remoteState.remoteStatus)) {
          return interaction.followUp({
            embeds: [
              new discord_js_1.EmbedBuilder()
                .setDescription("`❌`・A aplicação já está offline.")
                .setColor(0xed4245),
            ],
            flags: 64,
          });
        }
        yield remoteState.adapter.stopApplication(application.appId);
        yield client.invokeInteraction(
          `invoke-apps:${storeConfig._id}:${application._id}`,
          interaction,
        );
        yield interaction.followUp({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`✅`・Aplicação parada com sucesso!")
              .setColor(0x57f287),
          ],
          flags: 64,
        });
      } catch (error) {
        yield client.invokeInteraction(
          `invoke-apps:${storeConfig._id}:${application._id}`,
          interaction,
        );
        yield interaction.followUp({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(`\`❌\`・${error.message}`)
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "change-name",
  run: (client, interaction, appId, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const application =
        yield databases_1.default.applications.findById(appId);
      if (!application) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Aplicação não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      if (action === "show-modal" && interaction.isButton()) {
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Alterar Nome da Aplicação",
          customId: `change-name:${appId}:submit-modal`,
          inputs: [
            {
              label: "Novo Nome",
              customId: "newName",
              required: true,
              placeholder: "Digite o novo nome da aplicação",
              value: application.name,
            },
          ],
        });
        return interaction.showModal(modal);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        try {
          const newName = interaction.fields.getTextInputValue("newName");
          if (!newName) throw new Error("O nome não pode ser vazio.");
          if (newName.length > 40)
            throw new Error("O nome não pode ter mais de 40 caracteres.");
          application.name = newName;
          yield application.save();
          yield client.invokeInteraction(
            `settings-app:${application._id}`,
            interaction,
          );
          yield interaction.followUp({
            embeds: [
              new discord_js_1.EmbedBuilder()
                .setDescription("`✅`・Nome alterado com sucesso!")
                .setColor(0x57f287),
            ],
            flags: 64,
          });
        } catch (error) {
          yield client.invokeInteraction(`settings-app:${appId}`, interaction);
          yield interaction.followUp({
            embeds: [
              new discord_js_1.EmbedBuilder()
                .setDescription(`\`❌\`・${error.message}`)
                .setColor(0xed4245),
            ],
            flags: 64,
          });
        }
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "renew-app",
  run: (_client, interaction, appId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      if (!interaction.isButton()) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・Este comando só pode ser usado através de um botão.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const application = yield databases_1.default.applications
        .findById(appId)
        .populate("storeId")
        .populate("productId");
      if (!application) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Aplicação não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const storeConfig = application.storeId;
      if (!storeConfig) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Loja não encontrada.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const product = application.productId;
      if (!product) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Produto não encontrado.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const ownerStoreConfig = yield (0, functions_1.findStoreOwnerSettings)(
        databases_1.default,
        storeConfig,
      );
      if (!ownerStoreConfig) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・Configuração do dono da loja não encontrada.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      if (ownerStoreConfig.payment_gateway === "manual") {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・O dono da loja optou por não utilizar o gateway de pagamento automático. Entre em contato com o suporte para renovar sua aplicação.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const selectedGateway =
        ownerStoreConfig.payment_gateway || functions_1.PAYMENT_GATEWAYS.MANUAL;
      const gatewayErrors = (0, functions_1.validateSelectedPaymentGateway)(
        ownerStoreConfig,
        selectedGateway,
      );
      if (gatewayErrors.length) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                `\`❌\`・O gateway ${(0, functions_1.getPaymentGatewayLabel)(
                  selectedGateway,
                )} está incompleto. ${gatewayErrors[0]}`,
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const priceTable = getApplicationPriceTable(product, application);
      if (
        !priceTable ||
        (!priceTable.weekly &&
          !priceTable.biweekly &&
          !priceTable.monthly &&
          !priceTable.lifetime)
      ) {
        throw new Error(
          "Este produto não possui preços definidos. Por favor, contate o administrador do servidor.",
        );
      }
      const cart = yield databases_1.default.cartsRenew.create({
        userId: interaction.user.id,
        applicationId: application._id,
        storeId: storeConfig._id,
        paymentGateway: selectedGateway,
        expiresAt: new Date(Date.now() + RENEW_CART_EXPIRES_MINUTES * 60000),
      });
      if (!cart) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・Não foi possível criar o carrinho. Tente novamente mais tarde.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const messageData = yield (0, exports.getCartMessageRenew)(
        cart._id.toString(),
      );
      const message = yield interaction.update(messageData);
      cronjobs_1.renewCartsMessage.set(cart._id.toString(), message);
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "select-days-renew",
  run: (_client, interaction, cartId, selectedValue) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a, _b, _c, _d;
      try {
        if (!interaction.isAnySelectMenu()) return;
        const cartRenew = yield databases_1.default.cartsRenew.findById(cartId);
        if (!cartRenew)
          throw new Error(
            "Carrinho não encontrado ou expirado. Por favor, tente novamente.",
          );
        const application = yield databases_1.default.applications
          .findById(cartRenew.applicationId)
          .populate("productId");
        if (!application) throw new Error("Aplicação não encontrada.");
        const product = application.productId;
        const priceTable = getApplicationPriceTable(product, application);
        if (!product) throw new Error("Produto não encontrado.");
        let price = 0;
        switch (selectedValue) {
          case "monthly":
            if (
              !((_a = priceTable) === null || _a === void 0
                ? void 0
                : _a.monthly)
            )
              throw new Error("Preço mensal não definido para este produto.");
            price = priceTable.monthly;
            cartRenew.days = 30;
            break;
          case "biweekly":
            if (
              !((_b = priceTable) === null || _b === void 0
                ? void 0
                : _b.biweekly)
            )
              throw new Error(
                "Preço quinzenal não definido para este produto.",
              );
            price = priceTable.biweekly;
            cartRenew.days = 15;
            break;
          case "weekly":
            if (
              !((_c = priceTable) === null || _c === void 0
                ? void 0
                : _c.weekly)
            )
              throw new Error("Preço semanal não definido para este produto.");
            price = priceTable.weekly;
            cartRenew.days = 7;
            break;
          case "lifetime":
            if (
              !((_d = priceTable) === null || _d === void 0
                ? void 0
                : _d.lifetime)
            )
              throw new Error(
                "Preço vitalício não definido para este produto.",
              );
            price = priceTable.lifetime;
            cartRenew.lifetime = true;
            break;
          default:
            throw new Error("Opção de dias inválida selecionada.");
        }
        cartRenew.price = price;
        cartRenew.step = "select-coupons";
        yield cartRenew.save();
        const messageData = yield (0, exports.getCartMessageRenew)(
          cartRenew._id.toString(),
        );
        return yield interaction.update(messageData);
      } catch (e) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(`\`❌\`・${e.message}`)
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "go-payment-renew",
  run: (client, interaction, cartId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      try {
        if (!interaction.isButton())
          throw new Error(
            "Este comando só pode ser usado através de um botão.",
          );
        const cartRenew = yield databases_1.default.cartsRenew
          .findById(cartId)
          .populate("applicationId")
          .populate("storeId")
          .populate("coupon");
        if (!cartRenew)
          throw new Error(
            "Carrinho não encontrado ou expirado. Por favor, tente novamente.",
          );
        const application = cartRenew.applicationId;
        if (!application) throw new Error("Aplicação não encontrada.");
        const storeConfig = cartRenew.storeId;
        if (!storeConfig) throw new Error("Loja não encontrada.");
        const product = yield databases_1.default.products.findById(
          application.productId,
        );
        if (!product) throw new Error("Produto não encontrado.");
        const ownerStoreConfig = yield (0, functions_1.findStoreOwnerSettings)(
          databases_1.default,
          storeConfig,
        );
        if (!ownerStoreConfig)
          throw new Error("Configuração do dono da loja não encontrada.");
        const currentGateway = (0, functions_1.getCartPaymentGateway)(
          cartRenew,
          ownerStoreConfig,
        );
        const gatewayErrors = (0, functions_1.validateSelectedPaymentGateway)(
          ownerStoreConfig,
          currentGateway,
        );
        if (gatewayErrors.length)
          throw new Error(
            `O gateway ${(0, functions_1.getPaymentGatewayLabel)(
              currentGateway,
            )} está incompleto. ${gatewayErrors[0]}`,
          );
        if (!cartRenew.price || cartRenew.price <= 0)
          throw new Error(
            "Preço inválido no carrinho. Por favor, contate um administrador.",
          );
        const coupon = cartRenew.coupon ? cartRenew.coupon : null;
        const coupomDiscount =
          (cartRenew.coupon
            ? coupon === null || coupon === void 0
              ? void 0
              : coupon.discount
            : 0) || 0;
        const priceWithDiscount =
          cartRenew.price - cartRenew.price * (coupomDiscount / 100);
        const creditedAmount = Number(priceWithDiscount.toFixed(2));
        const finalPrice = (0, functions_1.calculateAutomaticGatewayAmount)(
          priceWithDiscount,
        );
        const expiresAt = new Date(
          Date.now() + RENEW_CART_EXPIRES_MINUTES * 60000,
        );
        const payment = yield (0, functions_1.createAutomaticPixPayment)({
          gateway: currentGateway,
          scope: "renew",
          cartId: cartRenew._id.toString(),
          storeId: storeConfig._id.toString(),
          userId: cartRenew.userId,
          ownerDiscordUserId: ownerStoreConfig.userId_discord,
          amount: finalPrice,
          baseAmount: creditedAmount,
          expirationDate: expiresAt,
          description: `Renovação do produto ${product.name}`,
          metadata: {
            application_id: application._id.toString(),
            product_id: product._id.toString(),
            coupon_id: coupon ? coupon._id.toString() : null,
          },
        });
        cartRenew.paymentGateway = currentGateway;
        cartRenew.paymentStatus = payment.paymentStatus;
        cartRenew.pix_qrcode = payment.pixQrCode;
        cartRenew.pix_copy_and_paste = payment.pixCopyAndPaste;
        cartRenew.paymentId = payment.paymentId;
        cartRenew.finalPrice = finalPrice;
        cartRenew.creditedAmount = creditedAmount;
        cartRenew.paymentMetadata = payment.paymentMetadata || {};
        cartRenew.step = "waiting-payment";
        cartRenew.expiresAt = expiresAt;
        yield cartRenew.save();
        const messageData = yield (0, exports.getCartMessageRenew)(
          cartRenew._id.toString(),
        );
        yield interaction.update(messageData);
      } catch (e) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(`\`❌\`・${e.message}`)
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: `cancel-renew`,
  run: (client, interaction, cartId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      if (!interaction.isButton()) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・Este comando só pode ser usado através de um botão.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const cart = yield databases_1.default.cartsRenew.findById(cartId);
      if (!cart) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription("`❌`・Carrinho não encontrado.")
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const storeConfig = yield databases_1.default.stores.findById(
        cart.storeId,
      );
      if (storeConfig) {
        const ownerStoreConfig = yield (0, functions_1.findStoreOwnerSettings)(
          databases_1.default,
          storeConfig,
        );
        if (ownerStoreConfig) {
          const paymentGateway = (0, functions_1.getCartPaymentGateway)(
            cart,
            ownerStoreConfig,
          );
          yield (0, functions_1.cancelAutomaticPayment)({
            gateway: paymentGateway,
            ownerDiscordUserId: ownerStoreConfig.userId_discord,
            paymentId: cart.paymentId,
          }).catch(() => null);
        }
      }
      cronjobs_1.renewCartsMessage.delete(cart._id.toString());
      yield cart.updateOne({ status: "cancelled", paymentStatus: "cancelled" });
      yield client.invokeInteraction(
        `invoke-apps:${cart.storeId}:${cart.applicationId}`,
        interaction,
      );
      return interaction.followUp({
        embeds: [
          new discord_js_1.EmbedBuilder()
            .setDescription("`✅`・Carrinho cancelado com sucesso.")
            .setColor(0x57f287),
        ],
        flags: 64,
      });
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "update-renew-cart",
  run: (_client, interaction, cartId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      try {
        if (!interaction.isButton()) {
          return interaction.reply({
            embeds: [
              new discord_js_1.EmbedBuilder()
                .setDescription(
                  "`❌`・Este comando só pode ser usado através de um botão.",
                )
                .setColor(0xed4245),
            ],
            flags: 64,
          });
        }
        const messageData = yield (0, exports.getCartMessageRenew)(cartId);
        return yield interaction.update(messageData);
      } catch (error) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(`\`❌\`・${error.message}`)
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "add-coupon-renew",
  run: (client, interaction, cartId, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a, _b;
      const cart = yield databases_1.default.cartsRenew
        .findById(cartId)
        .catch(() => null);
      if (!cart) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・Carrinho não encontrado. Peça pra um administrador excluir pra você.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      if (
        application.deliveryMode === functions_1.PRODUCT_DELIVERY_MODES.SHARED
      ) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・Esse formato é ativado no `/resgatar-key` e configurado no `/gerenciar` do bot convidado.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      if (action === "show-modal" && interaction.isButton()) {
        try {
          const modal = (0, fast_discord_js_1.CreateModal)({
            customId: `add-coupon-renew:${cartId}:submit-modal`,
            title: "Adicionar Cupom",
            inputs: [
              {
                customId: "coupon-code",
                label: "Código do Cupom",
                style: discord_js_1.TextInputStyle.Short,
                required: true,
                placeholder: "Digite o código do cupom",
              },
            ],
          });
          interaction.showModal(modal);
        } catch (e) {
          return interaction.reply({
            embeds: [
              new discord_js_1.EmbedBuilder()
                .setDescription(`\`❌\`・${e.message}`)
                .setColor(0xed4245),
            ],
            flags: 64,
          });
        }
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        try {
          const couponCode =
            interaction.fields.getTextInputValue("coupon-code");
          if (!couponCode)
            throw new Error("Você precisa fornecer um código de cupom.");
          const coupon = yield databases_1.default.coupons.findOne({
            code: couponCode,
          });
          if (!coupon) throw new Error("Cupom inválido ou não encontrado.");
          if (coupon.remainingUses <= 0)
            throw new Error("Este cupom não possui mais usos disponíveis.");
          if (coupon.expiresAt && coupon.expiresAt < new Date())
            throw new Error("Este cupom expirou.");
          const userRoles =
            (_a = interaction.member) === null || _a === void 0
              ? void 0
              : _a.roles;
          if (coupon.roles) {
            if (
              !userRoles.cache.some((role) => {
                var _a;
                return (_a = coupon.roles) === null || _a === void 0
                  ? void 0
                  : _a.includes(role.id);
              })
            ) {
              const rolesMention = coupon.roles
                .map((role) => `<@&${role}>`)
                .join(", ");
              throw new Error(
                `Esse cupom só pode ser utilizado por membros com os cargos: ${rolesMention}`,
              );
            }
          }
          const application = yield databases_1.default.applications.findById(
            cart.applicationId,
          );
          if (!application) throw new Error("Aplicação não encontrada.");
          if (!application.productId)
            throw new Error("Aplicação sem produto vinculado.");
          if (coupon.products) {
            if (
              !coupon.products.includes(application.productId.toString()) &&
              !coupon.products.includes("all")
            ) {
              throw new Error(
                "Este cupom não é válido para o produto selecionado.",
              );
            }
          }
          cart.coupon = coupon._id;
          yield cart.save();
          yield databases_1.default.coupons.updateOne(
            { code: couponCode },
            { $inc: { remainingUses: -1 } },
          );
          const messageData = yield (0, exports.getCartMessageRenew)(
            cart._id.toString(),
          );
          yield (_b = interaction.message) === null || _b === void 0
            ? void 0
            : _b.edit(messageData);
          return interaction.reply({
            embeds: [
              new discord_js_1.EmbedBuilder()
                .setDescription("`✅`・Cupom aplicado com sucesso!")
                .setColor(0x57f287),
            ],
            flags: 64,
          });
        } catch (e) {
          return interaction.reply({
            embeds: [
              new discord_js_1.EmbedBuilder()
                .setDescription(`\`❌\`・${e.message}`)
                .setColor(0xed4245),
            ],
            flags: 64,
          });
        }
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "cupom-step-renew",
  run: (client, interaction, cartId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      try {
        if (!interaction.isButton()) return;
        const cartRenew = yield databases_1.default.cartsRenew
          .findById(cartId)
          .catch(() => null);
        if (!cartRenew)
          throw new Error(
            "Carrinho não encontrado. Peça pra um administrador excluir pra você.",
          );
        cartRenew.step = "select-coupons";
        yield cartRenew.save();
        const messageData = yield (0, exports.getCartMessageRenew)(
          cartRenew._id.toString(),
        );
        yield interaction.update(messageData);
      } catch (e) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(`\`❌\`・${e.message}`)
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "pix-copy-and-paste-renew",
  run: (_client, interaction, cartId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      if (!interaction.isButton()) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・Este comando só pode ser usado através de um botão.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      const cartRenew = yield databases_1.default.cartsRenew.findById(cartId);
      if (!cartRenew) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・Carrinho não encontrado. Peça pra um administrador excluir pra você.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      if (!cartRenew.pix_copy_and_paste) {
        return interaction.reply({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setDescription(
                "`❌`・Código de pagamento não encontrado. Tente gerar um novo código.",
              )
              .setColor(0xed4245),
          ],
          flags: 64,
        });
      }
      return interaction.reply({
        content: `${cartRenew.pix_copy_and_paste}`,
        flags: 64,
      });
    }),
});
const getCartMessageRenew = (cartId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const cartRenew = yield databases_1.default.cartsRenew
      .findById(cartId)
      .populate("applicationId")
      .populate("storeId")
      .populate("coupon");
    if (!cartRenew)
      throw new Error(
        "Carrinho não encontrado ou expirado. Por favor, tente novamente.",
      );
    const application = yield databases_1.default.applications
      .findById(cartRenew.applicationId)
      .populate("storeId")
      .populate("productId");
    if (!application) throw new Error("Aplicação não encontrada.");
    const storeConfig = cartRenew.storeId;
    if (!storeConfig) throw new Error("Loja não encontrada.");
    const product = application.productId;
    const priceTable = getApplicationPriceTable(product, application);
    if (!product) throw new Error("Produto não encontrado.");
    const components = [];
    const coupon = cartRenew.coupon ? cartRenew.coupon : null;
    const coupomDiscount =
      (cartRenew.coupon
        ? coupon === null || coupon === void 0
          ? void 0
          : coupon.discount
        : 0) || 0;
    const priceWithDiscount =
      cartRenew.price - cartRenew.price * (coupomDiscount / 100);
    // Carrinho expirado
    if (cartRenew.status === "expired") {
      const embed = new discord_js_1.EmbedBuilder()
        .setTitle("⏰ Carrinho Expirado")
        .setDescription(
          "Seu carrinho expirou. Se ainda quiser renovar sua aplicação, crie um novo carrinho.",
        )
        .setColor(0xed4245)
        .setTimestamp();
      const components = [
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Voltar para aplicação",
            style: discord_js_1.ButtonStyle.Secondary,
            customId: `invoke-apps:${storeConfig._id}:${application._id}`,
            emoji: functions_1.emojis.back,
          }),
        ]),
      ];
      return { embeds: [embed], components };
    }
    if (cartRenew.step === "select-days") {
      const embed = new discord_js_1.EmbedBuilder()
        .setTitle(`🔄 Renovação: ${application.name}`)
        .setDescription(
          `Olá <@${application.ownerId}>! Você está prestes a renovar sua aplicação **${application.name}**.\nEscolha uma das opções abaixo para continuar.`,
        )
        .setColor(0x57f287)
        .setTimestamp();
      const selectDaysOptions = [];
      if ((_a = priceTable) === null || _a === void 0 ? void 0 : _a.monthly)
        selectDaysOptions.push({
          label: "Mensal・30 dias",
          value: "monthly",
          description: `R$ ${priceTable.monthly.toFixed(2)}`,
          emoji: "📆",
        });
      if (
        (_b = priceTable) === null || _b === void 0 ? void 0 : _b.biweekly
      )
        selectDaysOptions.push({
          label: "Quinzenal・15 dias",
          value: "biweekly",
          description: `R$ ${priceTable.biweekly.toFixed(2)}`,
          emoji: "📅",
        });
      if ((_c = priceTable) === null || _c === void 0 ? void 0 : _c.weekly)
        selectDaysOptions.push({
          label: "Semanal・7 dias",
          value: "weekly",
          description: `R$ ${priceTable.weekly.toFixed(2)}`,
          emoji: "📅",
        });
      if (
        (_d = priceTable) === null || _d === void 0 ? void 0 : _d.lifetime
      )
        selectDaysOptions.push({
          label: "Vitalício",
          value: "lifetime",
          description: `R$ ${priceTable.lifetime.toFixed(2)}`,
          emoji: "♾️",
        });
      components.push(
        (0, fast_discord_js_1.CreateRow)([
          new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
            customId: `select-days-renew:${cartRenew._id}`,
            placeholder: "Selecione os dias",
            options: selectDaysOptions,
            getValueInLastParam: true,
          }),
        ]),
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Cancelar carrinho",
            style: discord_js_1.ButtonStyle.Danger,
            customId: `cancel-renew:${cartRenew._id}`,
            emoji: functions_1.emojis.cancel,
          }),
        ]),
      );
      return { embeds: [embed], components };
    }
    if (cartRenew.step === "select-coupons") {
      const embed = new discord_js_1.EmbedBuilder()
        .setTitle("🛒 Sistema de Compras")
        .setDescription(
          `Olá <@${cartRenew.userId}>, você está renovando o produto **${product.name}**.`,
        )
        .setColor(0x57f287)
        .setTimestamp();
      if (coupon) {
        embed.addFields(
          {
            name: "💰 Preço com desconto",
            value: `R$ ${priceWithDiscount.toFixed(2)}`,
            inline: true,
          },
          {
            name: "🎟️ Cupom aplicado",
            value: `**${coupon.code}** (${coupomDiscount}%)`,
            inline: true,
          },
          {
            name: "💸 Desconto",
            value: `R$ ${(cartRenew.price * (coupomDiscount / 100)).toFixed(2)}`,
            inline: true,
          },
        );
      } else {
        embed.addFields(
          {
            name: "💰 Preço total",
            value: `R$ ${priceWithDiscount.toFixed(2)}`,
            inline: true,
          },
          { name: "🎟️ Cupom", value: "Nenhum cupom aplicado", inline: true },
        );
      }
      embed.addFields({
        name: "⏳ Expiração",
        value: `<t:${Math.floor(cartRenew.expiresAt.getTime() / 1000)}:R>`,
        inline: false,
      });
      components.push(
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Ir para o pagamento",
            style: discord_js_1.ButtonStyle.Success,
            customId: `go-payment-renew:${cartRenew._id}`,
            emoji: functions_1.emojis.cart,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Adicionar cupom",
            style: discord_js_1.ButtonStyle.Primary,
            customId: `add-coupon-renew:${cartRenew._id}:show-modal`,
            emoji: functions_1.emojis.cupom,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Cancelar carrinho",
            style: discord_js_1.ButtonStyle.Danger,
            customId: `cancel-renew:${cartRenew._id}`,
            emoji: functions_1.emojis.cancel,
          }),
        ]),
      );
      return { embeds: [embed], components };
    }
    if (cartRenew.step === "waiting-payment" && cartRenew.paymentId) {
      const paymentSummary = (0, functions_1.buildCartPaymentSummary)(
        cartRenew,
        null,
      );
      const isPixPayment =
        paymentSummary.paymentMode === "manual_pix" ||
        paymentSummary.paymentMode === "pix";
      const isCardCheckout = paymentSummary.paymentMode === "transparent_card";
      const embed = new discord_js_1.EmbedBuilder()
        .setTitle("🛒 Sistema de Compras")
        .setDescription(
          isCardCheckout
            ? `Olá <@${cartRenew.userId}>, você está renovando o produto **${product.name}**.\nO pagamento por cartão foi enviado ao checkout transparente do Mercado Pago. Aguarde a confirmação.`
            : `Olá <@${cartRenew.userId}>, você está renovando o produto **${product.name}**.`,
        )
        .addFields(
          {
            name: "💰 Valor base",
            value: `R$ ${paymentSummary.creditedAmount.toFixed(2)}`,
            inline: true,
          },
          {
            name: "🏦 Gateway",
            value: paymentSummary.gatewayLabel,
            inline: true,
          },
          {
            name: "💳 Valor para pagamento",
            value: `R$ ${paymentSummary.paymentAmount.toFixed(2)}`,
            inline: true,
          },
          {
            name: "📋 Status",
            value: "**Aguardando pagamento**",
            inline: true,
          },
          {
            name: "⏳ Expiração",
            value: `<t:${Math.floor(cartRenew.expiresAt.getTime() / 1000)}:R>`,
            inline: false,
          },
        )
        .setColor(0xfee75c)
        .setTimestamp();
      if (isPixPayment && cartRenew.pix_qrcode) {
        embed.setImage("attachment://payment.png");
      }
      const waitingPaymentButtons = [];
      if (isPixPayment && cartRenew.pix_copy_and_paste) {
        waitingPaymentButtons.push(
          (0, fast_discord_js_1.CreateButton)({
            label: "Pix Copia e Cola",
            style: discord_js_1.ButtonStyle.Primary,
            customId: `pix-copy-and-paste-renew:${cartId}`,
            emoji: functions_1.emojis.copy,
          }),
        );
      }
      waitingPaymentButtons.push(
        (0, fast_discord_js_1.CreateButton)({
          label: "Cancelar carrinho",
          style: discord_js_1.ButtonStyle.Danger,
          customId: `cancel-renew:${cartId}`,
          emoji: functions_1.emojis.cancel,
        }),
        (0, fast_discord_js_1.CreateButton)({
          label: "Atualizar",
          style: discord_js_1.ButtonStyle.Secondary,
          customId: `update-renew-cart:${cartId}`,
          emoji: functions_1.emojis.reload,
        }),
      );
      components.push((0, fast_discord_js_1.CreateRow)(waitingPaymentButtons));
      if (isPixPayment && cartRenew.pix_qrcode) {
        const buffer_base_64 = Buffer.from(cartRenew.pix_qrcode, "base64");
        const attachment = new discord_js_1.AttachmentBuilder(buffer_base_64, {
          name: "payment.png",
        });
        return { embeds: [embed], components, files: [attachment] };
      }
      return { embeds: [embed], components, files: [] };
    }
    if (cartRenew.step === "payment-confirmed") {
      const embed = new discord_js_1.EmbedBuilder()
        .setTitle("🎉 Renovação Concluída!")
        .setDescription(
          `Produto **${product.name}** renovado com sucesso!\nVocê já pode utilizá-la normalmente.`,
        )
        .addFields({
          name: "📋 Status",
          value: "**Pagamento aprovado!**",
          inline: true,
        })
        .setColor(0x57f287)
        .setTimestamp();
      const components = [
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Voltar para aplicação",
            style: discord_js_1.ButtonStyle.Secondary,
            customId: `invoke-apps:${storeConfig._id}:${application._id}`,
            emoji: functions_1.emojis.back,
          }),
        ]),
      ];
      return { embeds: [embed], components, files: [] };
    }
    return {
      embeds: [
        new discord_js_1.EmbedBuilder()
          .setDescription("`❌`・Etapa inválida.")
          .setColor(0xed4245),
      ],
      components: [
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Cancelar carrinho",
            style: discord_js_1.ButtonStyle.Danger,
            customId: "cancel-cart",
            emoji: functions_1.emojis.cancel,
          }),
        ]),
      ],
    };
  });
exports.getCartMessageRenew = getCartMessageRenew;
