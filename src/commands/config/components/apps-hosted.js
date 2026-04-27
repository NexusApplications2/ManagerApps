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
const src_1 = __importDefault(require("@root/src"));
const databases_1 = __importDefault(require("@root/src/databases"));
const functions_1 = require("@root/src/functions");
const pages_1 = __importDefault(require("@root/src/functions/pages"));
const axios_1 = __importDefault(require("axios"));
const bytes_1 = __importDefault(require("bytes"));
const discord_js_1 = require("discord.js");
const fast_discord_js_1 = require("fast-discord-js");
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
new fast_discord_js_1.InteractionHandler({
  customId: "apps-hosted",
  run: (_client, interaction, storeId, _page) =>
    __awaiter(void 0, void 0, void 0, function* () {
      try {
        const page = _page ? Number(_page) : 1;
        if (isNaN(page) || page < 0) {
          throw new Error("Número da página inválido.");
        }
        const hasPermission = yield (0,
        functions_1.getUserHasPermissionOnStore)({
          userId: interaction.user.id,
          storeId: storeId,
          permission: functions_1.PermissionsStore.ADMIN,
        });
        if (!hasPermission) {
          throw new Error("Você não tem permissão para usar este comando.");
        }
        const store = yield databases_1.default.stores.findOne({
          _id: storeId,
        });
        if (!store) {
          throw new Error("Loja não encontrada!");
        }
        const applications = yield databases_1.default.applications
          .find(
            { storeId },
            {
              name: 1,
              productName: 1,
              status: 1,
              expiresAt: 1,
              ownerId: 1,
              lifetime: 1,
            },
          )
          .populate("productId", { name: 1 });
        const selectOptions = [];
        const contents = [
          `# Aplicações Hospedadas `,
          `- Aqui estão listadas todas as aplicações hospedadas na loja ${store.name}.\n`,
          `- Total de aplicações hospedadas: \`${applications.length}\`\n`,
          `- **Leganda dos emojis:**`,
          `  - \`♾️\`・Vitalício`,
          `  - \`🟢\`・Ativa`,
          `  - \`🟠\`・Período de carência\n`,
        ];
        for (const application of applications) {
          const applicationProduct = application.productId;
          const owner = src_1.default.users.cache.get(application.ownerId);
          let expiresString = "";
          if (application.lifetime) {
            expiresString = "Vitalício";
          } else {
            expiresString = (0, functions_1.getRemainingTimeFormated)(
              application.expiresAt,
            );
          }
          let emoji = "";
          switch (application.status) {
            case "active":
              if (application.lifetime) {
                emoji = "♾️";
              } else {
                emoji = "🟢";
              }
              break;
            case "grace_period":
              emoji = "🟠";
              break;
            default:
              emoji = "⚠️";
          }
          selectOptions.push({
            label:
              `${application.name}・${applicationProduct === null || applicationProduct === void 0 ? void 0 : applicationProduct.name} ( ${(owner === null || owner === void 0 ? void 0 : owner.username) || "Desconhecido"} )`.slice(
                0,
                50,
              ),
            description: `Expira em: ${expiresString}`,
            value: application._id.toString(),
            emoji: emoji,
          });
        }
        const pageSystem = new pages_1.default({
          data: selectOptions,
          maxItemPerPage: 25,
        });
        const components = [
          (0, fast_discord_js_1.CreateRow)([
            ...(selectOptions.length
              ? [
                  (0, fast_discord_js_1.CreateButton)({
                    label: " ",
                    emoji: "⬅️",
                    style: 1,
                    customId: `apps-hosted:${storeId}:${page - 1}`,
                    disabled: page <= 1,
                  }),
                  (0, fast_discord_js_1.CreateButton)({
                    label: `Pagina ${page}/${pageSystem.totalPages}`,
                    style: 2,
                    customId: `N/A`,
                    disabled: true,
                  }),
                  (0, fast_discord_js_1.CreateButton)({
                    label: " ",
                    emoji: "➡️",
                    style: 1,
                    customId: `apps-hosted:${storeId}:${page + 1}`,
                    disabled: page >= pageSystem.totalPages,
                  }),
                ]
              : []),
            (0, fast_discord_js_1.CreateButton)({
              label: "Atualizar painel",
              style: 2,
              customId: `apps-hosted:${storeId}`,
              emoji: functions_1.emojis.reload,
            }),
            (0, fast_discord_js_1.CreateButton)({
              label: "Voltar",
              style: 2,
              customId: `config-store:${storeId}`,
              emoji: functions_1.emojis.back,
            }),
          ]),
        ];
        if (selectOptions.length) {
          components.unshift(
            (0, fast_discord_js_1.CreateRow)([
              new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
                customId: `select-app-hosted:${storeId}`,
                placeholder: "Selecione uma aplicação para gerenciar",
                options: pageSystem.getPage(page),
                getValueInLastParam: true,
              }),
            ]),
          );
        }
        if (interaction.replied || interaction.deferred) {
          return interaction.editReply({
            content: contents.join("\n"),
            components,
            files: [],
          });
        } else {
          return interaction.update({
            content: contents.join("\n"),
            components,
            files: [],
          });
        }
      } catch (error) {
        if (interaction.replied || interaction.deferred) {
          return interaction.followUp({
            content: `\`❌\`・${error.message}`,
            components: [],
          });
        } else {
          return interaction.reply({
            content: `\`❌\`・${error.message}`,
            components: [],
            flags: 64,
          });
        }
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "select-app-hosted",
  run: (_client, interaction, storeId, applicationId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      const hasPermission = yield (0, functions_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: storeId,
        permission: functions_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      const store = yield databases_1.default.stores.findOne({ _id: storeId });
      if (!store) {
        return interaction.reply({
          content: "`❌`・Loja não encontrada!",
          flags: 64,
        });
      }
      const application = yield databases_1.default.applications
        .findOne({ _id: applicationId, storeId }, {})
        .populate("productId", { name: 1, currentReleaseVersion: 1 });
      if (!application) {
        return interaction.reply({
          content: "`❌`・Aplicação não encontrada!",
          flags: 64,
        });
      }
      const product = application.productId;
      if (!product) {
        return interaction.reply({
          content: "`❌`・Produto não encontrado.",
          flags: 64,
        });
      }
      const ownerStoreConfig = yield (0, functions_1.findStoreOwnerSettings)(
        databases_1.default,
        store,
      );
      if (!ownerStoreConfig) {
        return interaction.reply({
          content:
            "`❌`・Configuração da loja não encontrada. Por favor, conecte a conta do host na loja.",
          flags: 64,
        });
      }
      const remoteState = yield (0, functions_1.getRemoteApplicationState)(
        databases_1.default,
        application,
        store,
      ).catch(() => null);
      const applicationMetrics = remoteState
        ? remoteState.remoteStatus
        : null;
      const memoryUsedLabel = getRemoteMemoryLabel(applicationMetrics);
      const statusDict = {
        active: "Ativa 🟢",
        grace_period: "Período de carência 🟠",
      };
      const versionLabel =
        product.currentReleaseVersion !== application.version
          ? "Será atualizado em breve ⚠️"
          : "🟢";
      const dashboardUrl =
        remoteState && remoteState.adapter
          ? remoteState.adapter.getApplicationDashboardUrl(application.appId)
          : `${(0, functions_1.getHostDashboardBaseUrl)(
              (0, functions_1.getStoreHostProvider)(store),
            )}/${application.appId}`;
      const contents = [
        `## ${application.name}`,
        `- Aqui estão as informações da sua [aplicação](<${dashboardUrl}>):`,
        `> Status: \`${getRemoteRunning(applicationMetrics) ? "Online 🟢" : "Offline 🔴"}\``,
        `> Memória utilizada: \`${memoryUsedLabel}\``,
        `> Tempo de atividade: ${getRemoteUptimeLabel(applicationMetrics)}\n`,
        `> Data de expiração: ${application.lifetime ? `\`♾️ Lifetime\`` : `<t:${Math.floor((((_a = application.expiresAt) === null || _a === void 0 ? void 0 : _a.getTime()) || 0) / 1000)}:R>`}`,
        `> Versão: \`v${application.version}・${application.errorOnUpdate ? "Erro ao atualizar ⚠️" : versionLabel}\``,
        `> Status: \`${statusDict[application.status]}\``,
      ];
      const components = [
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            customId: `admin-store-start-app:${application._id}`,
            label: "Iniciar",
            style: discord_js_1.ButtonStyle.Success,
            emoji: functions_1.emojis.play,
            disabled: getRemoteRunning(applicationMetrics),
          }),
          (0, fast_discord_js_1.CreateButton)({
            customId: `admin-store-restart-app:${application._id}`,
            label: "Reiniciar",
            style: discord_js_1.ButtonStyle.Primary,
            emoji: functions_1.emojis.reload,
            disabled: !getRemoteRunning(applicationMetrics),
          }),
          (0, fast_discord_js_1.CreateButton)({
            customId: `admin-store-stop-app:${application._id}`,
            label: "Parar",
            style: discord_js_1.ButtonStyle.Danger,
            emoji: functions_1.emojis.square,
            disabled: !getRemoteRunning(applicationMetrics),
          }),
          (0, fast_discord_js_1.CreateButton)({
            customId: `admin-store-settings-app:${application._id}`,
            label: "Configurações Avançadas",
            style: discord_js_1.ButtonStyle.Secondary,
            emoji: functions_1.emojis.config,
          }),
        ]),
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            customId: `select-app-hosted:${storeId}:${application._id}`,
            label: "Atualizar painel",
            style: discord_js_1.ButtonStyle.Secondary,
            emoji: functions_1.emojis.reload,
          }),
          (0, fast_discord_js_1.CreateButton)({
            customId: `apps-hosted:${storeId}`,
            label: "Voltar",
            style: discord_js_1.ButtonStyle.Secondary,
            emoji: functions_1.emojis.back,
          }),
        ]),
      ];
      if (interaction.replied || interaction.deferred) {
        return interaction.editReply({
          content: contents.join("\n"),
          components,
          files: [],
        });
      } else {
        return interaction.update({
          content: contents.join("\n"),
          components,
          files: [],
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "admin-store-settings-app",
  run: (client, interaction, appId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      try {
        const application = yield databases_1.default.applications
          .findById(appId)
          .populate("storeId")
          .populate("productId");
        if (!application) {
          throw new Error("Aplicação não encontrada.");
        }
        const storeConfig = application.storeId;
        if (!storeConfig) {
          throw new Error("Loja não encontrada.");
        }
        const product = application.productId;
        if (!product) {
          throw new Error("Produto não encontrado.");
        }
        const hasPermission = yield (0,
        functions_1.getUserHasPermissionOnStore)({
          userId: interaction.user.id,
          storeId: storeConfig._id.toString(),
          permission: functions_1.PermissionsStore.ADMIN,
        });
        if (!hasPermission) {
          throw new Error("Você não tem permissão para usar este comando.");
        }
        const components = [
          (0, fast_discord_js_1.CreateRow)([
            (0, fast_discord_js_1.CreateButton)({
              customId: `admin-store-change-token:${appId}:show-modal`,
              label: "Alterar token",
              style: discord_js_1.ButtonStyle.Primary,
              emoji: functions_1.emojis.settings,
            }),
            (0, fast_discord_js_1.CreateButton)({
              customId: `admin-store-change-name:${appId}:show-modal`,
              label: "Alterar nome",
              style: discord_js_1.ButtonStyle.Primary,
              emoji: functions_1.emojis.config,
            }),
            (0, fast_discord_js_1.CreateButton)({
              customId: `admin-store-transfer-ownership:${appId}:show-modal`,
              label: "Transferir posse",
              style: discord_js_1.ButtonStyle.Primary,
              emoji: functions_1.emojis.user,
            }),
            (0, fast_discord_js_1.CreateButton)({
              customId: `admin-store-delete-app:${appId}:show-modal`,
              label: "Deletar aplicação",
              style: discord_js_1.ButtonStyle.Danger,
              emoji: functions_1.emojis.trash,
            }),
          ]),
          (0, fast_discord_js_1.CreateRow)([
            (0, fast_discord_js_1.CreateButton)({
              customId: `admin-store-change-expiration:${appId}:show-modal`,
              label: "Alterar vencimento",
              style: discord_js_1.ButtonStyle.Secondary,
              emoji: functions_1.emojis.config,
            }),
            (0, fast_discord_js_1.CreateButton)({
              customId: `admin-store-settings-app:${appId}`,
              label: "Atualizar painel",
              style: discord_js_1.ButtonStyle.Secondary,
              emoji: functions_1.emojis.reload,
            }),
            (0, fast_discord_js_1.CreateButton)({
              customId: `select-app-hosted:${storeConfig._id}:${application._id}`,
              label: "Voltar",
              style: discord_js_1.ButtonStyle.Secondary,
              emoji: functions_1.emojis.back,
            }),
          ]),
        ];
        const statusDict = {
          active: "Ativo 🟢",
          grace_period: "Período de carência 🟠",
        };
        const versionLabel =
          product.currentReleaseVersion !== application.version
            ? "Será atualizado em breve ⚠️"
            : "🟢";
        const contents = [
          `## Configurações da Aplicação: ${application.name}`,
          `- Produto: \`${product.name}\``,
          `- Data de expiração: ${application.lifetime ? "`♾️ Lifetime`" : `<t:${Math.floor((((_a = application.expiresAt) === null || _a === void 0 ? void 0 : _a.getTime()) || 0) / 1000)}:R>`}\n`,
          `- Versão: \`v${application.version}・${application.errorOnUpdate ? "Erro ao atualizar ⚠️" : versionLabel}\``,
          `- Status: \`${statusDict[application.status]}\``,
        ];
        if (interaction.replied || interaction.deferred) {
          return yield interaction.editReply({
            content: contents.join("\n"),
            components,
          });
        } else {
          return yield interaction.update({
            content: contents.join("\n"),
            components,
          });
        }
      } catch (error) {
        if (interaction.replied || interaction.deferred) {
          return yield interaction.followUp({
            content: `\`❌\`・${error.message}`,
            components: [],
            flags: 64,
          });
        } else {
          return yield interaction.reply({
            content: `\`❌\`・${error.message}`,
            components: [],
            flags: 64,
          });
        }
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "admin-store-restart-app",
  run: (client, interaction, appId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      if (!interaction.isButton()) {
        return interaction.reply({
          content: "`❌`・Este comando só pode ser usado através de um botão.",
          flags: 64,
        });
      }
      const application = yield databases_1.default.applications
        .findById(appId)
        .populate("storeId");
      if (!application) {
        return interaction.reply({
          content: "`❌`・Aplicação não encontrada.",
          flags: 64,
        });
      }
      const storeConfig = application.storeId;
      if (!storeConfig) {
        return interaction.reply({
          content: "`❌`・Loja não encontrada.",
          flags: 64,
        });
      }
      const hasPermission = yield (0, functions_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: storeConfig._id.toString(),
        permission: functions_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      if (application.status !== "active") {
        return interaction.reply({
          content:
            "`❌`・A aplicação não está ativa. Não é possível reiniciar.",
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
          content: "`❌`・Aplicação remota não encontrada.",
          flags: 64,
        });
      }
      try {
        yield interaction.deferUpdate({});
        yield interaction.editReply({
          content: "`🔁`・Reiniciando aplicação... ",
          components: [],
        });
        if (!getRemoteRunning(remoteState.remoteStatus)) {
          return interaction.followUp({
            content:
              "`❌`・A aplicação não está online. Não é possível reiniciar.",
            flags: 64,
          });
        }
        yield remoteState.adapter.restartApplication(application.appId);
        yield client.invokeInteraction(
          `select-app-hosted:${storeConfig._id}:${application._id}`,
          interaction,
        );
        yield interaction.followUp({
          content: "`✅`・Aplicação reiniciada com sucesso!",
          flags: 64,
        });
      } catch (error) {
        yield client.invokeInteraction(
          `select-app-hosted:${storeConfig._id}:${application._id}`,
          interaction,
        );
        yield interaction.followUp({
          content: `\`❌\`・${error.message}`,
          flags: 64,
        });
        return;
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "admin-store-start-app",
  run: (client, interaction, appId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      if (!interaction.isButton()) {
        return interaction.reply({
          content: "`❌`・Este comando só pode ser usado através de um botão.",
          flags: 64,
        });
      }
      const application = yield databases_1.default.applications
        .findById(appId)
        .populate("storeId");
      if (!application) {
        return interaction.reply({
          content: "`❌`・Aplicação não encontrada.",
          flags: 64,
        });
      }
      const storeConfig = application.storeId;
      if (!storeConfig) {
        return interaction.reply({
          content: "`❌`・Loja não encontrada.",
          flags: 64,
        });
      }
      const hasPermission = yield (0, functions_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: storeConfig._id.toString(),
        permission: functions_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      if (application.status !== "active") {
        return interaction.reply({
          content: "`❌`・A aplicação não está ativa. Não é possível iniciar.",
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
          content: "`❌`・Aplicação remota não encontrada.",
          flags: 64,
        });
      }
      try {
        yield interaction.deferUpdate({});
        yield interaction.editReply({
          content: "`🔁`・Iniciando aplicação... ",
          components: [],
        });
        if (getRemoteRunning(remoteState.remoteStatus)) {
          return interaction.followUp({
            content: "`❌`・A aplicação já está online.",
            flags: 64,
          });
        }
        yield remoteState.adapter.startApplication(application.appId);
        yield client.invokeInteraction(
          `select-app-hosted:${storeConfig._id}:${application._id}`,
          interaction,
        );
        yield interaction.followUp({
          content: "`✅`・Aplicação iniciada com sucesso!",
          flags: 64,
        });
      } catch (error) {
        yield client.invokeInteraction(
          `select-app-hosted:${storeConfig._id}:${application._id}`,
          interaction,
        );
        yield interaction.followUp({
          content: `\`❌\`・${error.message}`,
          flags: 64,
        });
        return;
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "admin-store-stop-app",
  run: (client, interaction, appId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      if (!interaction.isButton()) {
        return interaction.reply({
          content: "`❌`・Este comando só pode ser usado através de um botão.",
          flags: 64,
        });
      }
      const application = yield databases_1.default.applications
        .findById(appId)
        .populate("storeId");
      if (!application) {
        return interaction.reply({
          content: "`❌`・Aplicação não encontrada.",
          flags: 64,
        });
      }
      const storeConfig = application.storeId;
      if (!storeConfig) {
        return interaction.reply({
          content: "`❌`・Loja não encontrada.",
          flags: 64,
        });
      }
      const hasPermission = yield (0, functions_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: storeConfig._id.toString(),
        permission: functions_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      if (application.status !== "active") {
        return interaction.reply({
          content: "`❌`・A aplicação não está ativa. Não é possível parar.",
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
          content: "`❌`・Aplicação remota não encontrada.",
          flags: 64,
        });
      }
      try {
        yield interaction.deferUpdate({});
        yield interaction.editReply({
          content: "`🔁`・Parando aplicação... ",
          components: [],
        });
        if (!getRemoteRunning(remoteState.remoteStatus)) {
          return interaction.followUp({
            content: "`❌`・A aplicação já está offline.",
            flags: 64,
          });
        }
        yield remoteState.adapter.stopApplication(application.appId);
        yield client.invokeInteraction(
          `select-app-hosted:${storeConfig._id}:${application._id}`,
          interaction,
        );
        yield interaction.followUp({
          content: "`✅`・Aplicação parada com sucesso!",
          flags: 64,
        });
      } catch (error) {
        yield client.invokeInteraction(
          `select-app-hosted:${storeConfig._id}:${application._id}`,
          interaction,
        );
        yield interaction.followUp({
          content: `\`❌\`・${error.message}`,
          flags: 64,
        });
        return;
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "admin-store-change-name",
  run: (client, interaction, appId, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const application =
        yield databases_1.default.applications.findById(appId);
      if (!application) {
        return interaction.reply({
          content: "`❌`・Aplicação não encontrada.",
          flags: 64,
        });
      }
      if (action === "show-modal" && interaction.isButton()) {
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Alterar Nome da Aplicação",
          customId: `admin-store-change-name:${appId}:submit-modal`,
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
          if (!newName) {
            throw new Error("O nome não pode ser vazio.");
          }
          if (newName.length > 40) {
            throw new Error("O nome não pode ter mais de 40 caracteres.");
          }
          application.name = newName;
          yield application.save();
          yield client.invokeInteraction(
            `admin-store-settings-app:${application._id}`,
            interaction,
          );
          yield interaction.followUp({
            content: "`✅`・Nome alterado com sucesso!",
            flags: 64,
          });
        } catch (error) {
          yield client.invokeInteraction(
            `admin-store-settings-app:${appId}`,
            interaction,
          );
          yield interaction.followUp({
            content: `\`❌\`・${error.message}`,
            flags: 64,
          });
        }
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "admin-store-change-token",
  run: (client, interaction, appId, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      const application = yield databases_1.default.applications
        .findById(appId)
        .populate("storeId")
        .populate("productId");
      if (!application) {
        return interaction.reply({
          content: "`❌`・Aplicação não encontrada.",
          flags: 64,
        });
      }
      const storeConfig = application.storeId;
      if (!storeConfig) {
        return interaction.reply({
          content: "`❌`・Loja não encontrada.",
          flags: 64,
        });
      }
      const product = application.productId;
      if (!product) {
        return interaction.reply({
          content: "`❌`・Produto não encontrado.",
          flags: 64,
        });
      }
      if (action === "show-modal" && interaction.isButton()) {
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Alterar Token da Aplicação",
          customId: `admin-store-change-token:${appId}:submit-modal`,
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
            content: "`🔁`・Alterando token... ",
            components: [],
          });
          const newToken = interaction.fields.getTextInputValue("newToken");
          if (!newToken) {
            throw new Error("O token não pode ser vazio.");
          }
          const botInfo = yield axios_1.default
            .get(`https://discord.com/api/v10/applications/@me`, {
              headers: {
                contentType: "application/json",
                Authorization: `Bot ${newToken}`,
              },
            })
            .catch(() => null);
          if (!botInfo || !botInfo.data) {
            throw new Error(
              "Não foi possível obter informações do bot com o novo token. Verifique se o token está correto e tente novamente.",
            );
          }
          application.botId = botInfo.data.id;
          application.token = newToken;
          yield (0, functions_1.updateManagedApplicationEnvironment)(
            databases_1.default,
            {
              application,
              product,
              store: storeConfig,
              ownerId: application.ownerId,
              botToken: newToken,
            },
          );
          yield application.save();
          yield client.invokeInteraction(
            `admin-store-settings-app:${application._id}`,
            interaction,
          );
          yield interaction.followUp({
            content: "`✅`・Token alterado com sucesso!",
            flags: 64,
          });
        } catch (error) {
          yield client.invokeInteraction(
            `admin-store-settings-app:${application._id}`,
            interaction,
          );
          yield interaction.followUp({
            content: `\`❌\`・${error.message}`,
            flags: 64,
          });
        }
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "admin-store-transfer-ownership",
  run: (client, interaction, appId, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      const application = yield databases_1.default.applications
        .findById(appId)
        .populate("storeId")
        .populate("productId");
      if (!application) {
        return interaction.reply({
          content: "`❌`・Aplicação não encontrada.",
          flags: 64,
        });
      }
      const storeConfig = application.storeId;
      if (!storeConfig) {
        return interaction.reply({
          content: "`❌`・Loja não encontrada.",
          flags: 64,
        });
      }
      const hasPermission = yield (0, functions_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: storeConfig._id.toString(),
        permission: functions_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        throw new Error(
          "Você não tem permissão para transferir a posse desta aplicação.",
        );
      }
      const product = application.productId;
      if (!product) {
        return interaction.reply({
          content: "`❌`・Produto não encontrado.",
          flags: 64,
        });
      }
      if (action === "show-modal" && interaction.isButton()) {
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Alterar Token da Aplicação",
          customId: `admin-store-transfer-ownership:${appId}:submit-modal`,
          inputs: [
            {
              label: "ID do Novo Dono",
              customId: "newOwnerId",
              required: true,
              placeholder: "Digite o ID aqui",
              value: application.ownerId,
            },
            {
              label: "Confirmação",
              customId: "confirmation",
              required: true,
              placeholder: "Digite 'sim' para confirmar",
            },
          ],
        });
        return interaction.showModal(modal);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        try {
          yield interaction.deferUpdate({});
          yield interaction.editReply({
            content: "`🔁`・Transferindo aplicação... ",
            components: [],
          });
          const confirmation =
            interaction.fields.getTextInputValue("confirmation");
          if (confirmation.toLowerCase() !== "sim") {
            throw new Error(
              "Você não confirmou a transferência. Digite 'sim' para confirmar.",
            );
          }
          const newOwnerId = interaction.fields.getTextInputValue("newOwnerId");
          if (!newOwnerId) {
            throw new Error("O ID do novo dono não pode ser vazio.");
          }
          yield (0, functions_1.updateManagedApplicationEnvironment)(
            databases_1.default,
            {
              application,
              product,
              store: storeConfig,
              ownerId: newOwnerId,
              botToken: application.token,
            },
          );
          yield databases_1.default.applications.updateOne(
            { _id: application._id },
            { ownerId: newOwnerId },
          );
          yield client.invokeInteraction(
            `admin-store-settings-app:${application._id}`,
            interaction,
          );
          yield interaction.followUp({
            content: "`✅`・Posse alterada com sucesso!",
            flags: 64,
          });
        } catch (error) {
          yield client.invokeInteraction(
            `admin-store-settings-app:${application._id}`,
            interaction,
          );
          yield interaction.followUp({
            content: `\`❌\`・${error.message}`,
            flags: 64,
          });
        }
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "admin-store-delete-app",
  run: (client, interaction, appId, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const application = yield databases_1.default.applications
        .findById(appId)
        .populate("storeId");
      if (!application) {
        return interaction.reply({
          content: "`❌`・Aplicação não encontrada.",
          flags: 64,
        });
      }
      const storeConfig = application.storeId;
      if (!storeConfig) {
        return interaction.reply({
          content: "`❌`・Loja não encontrada.",
          flags: 64,
        });
      }
      const hasPermission = yield (0, functions_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: storeConfig._id.toString(),
        permission: functions_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      if (action === "show-modal" && interaction.isButton()) {
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Deletar Aplicação",
          customId: `admin-store-delete-app:${appId}:submit-modal`,
          inputs: [
            {
              label: "Confirmação",
              customId: "confirmation",
              required: true,
              placeholder: "Digite 'sim' para confirmar",
            },
          ],
        });
        return interaction.showModal(modal);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        try {
          yield interaction.deferUpdate({});
          yield interaction.editReply({
            content: "`🔁`・Deletando aplicação... ",
            components: [],
          });
          const confirmation =
            interaction.fields.getTextInputValue("confirmation");
          if (confirmation.toLowerCase() !== "sim") {
            throw new Error(
              "Você não confirmou a deleção. Digite 'deletar' para confirmar.",
            );
          }
          const host = yield (0, functions_1.getHostAdapterForApplication)(
            databases_1.default,
            application,
            storeConfig,
          );
          yield host.adapter.deleteApplication(application.appId).catch(() => null);
          yield databases_1.default.applications.deleteOne({
            _id: application._id,
          });
          yield client.invokeInteraction(
            `apps-hosted:${storeConfig._id}`,
            interaction,
          );
          yield interaction.followUp({
            content: "`✅`・Aplicação deletada com sucesso!",
            flags: 64,
          });
        } catch (error) {
          yield client.invokeInteraction(
            `admin-store-settings-app:${application._id}`,
            interaction,
          );
          yield interaction.followUp({
            content: `\`❌\`・${error.message}`,
            flags: 64,
          });
        }
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "admin-store-change-expiration",
  run: (client, interaction, appId, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const application = yield databases_1.default.applications
        .findById(appId)
        .populate("storeId")
        .populate("productId");
      if (!application) {
        return interaction.reply({
          content: "`❌`・Aplicação não encontrada.",
          flags: 64,
        });
      }
      const storeConfig = application.storeId;
      if (!storeConfig) {
        return interaction.reply({
          content: "`❌`・Loja não encontrada.",
          flags: 64,
        });
      }
      const hasPermission = yield (0, functions_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: storeConfig._id.toString(),
        permission: functions_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      const product = application.productId;
      if (!product) {
        return interaction.reply({
          content: "`❌`・Produto não encontrado.",
          flags: 64,
        });
      }
      if (action === "show-modal" && interaction.isButton()) {
        let days = "";
        let hours = "";
        let minutes = "";
        if (!application.lifetime && application.expiresAt) {
          const diffMs = application.expiresAt.getTime() - Date.now();
          if (diffMs > 0) {
            const totalMinutes = Math.floor(diffMs / 60000);
            const totalHours = Math.floor(diffMs / 3600000);
            const totalDays = Math.floor(diffMs / 86400000);
            days = totalDays.toString();
            hours = Math.floor(totalHours % 24).toString();
            minutes = Math.floor(totalMinutes % 60).toString();
          }
        }
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Alterar Vencimento da Aplicação",
          customId: `admin-store-change-expiration:${appId}:submit-modal`,
          inputs: [
            {
              label: "Dias até o Vencimento",
              customId: "daysUntilExpiration",
              required: false,
              placeholder: "Digite a quantidade de dias",
              value: days,
            },
            {
              label: "Horas até o vencimento",
              customId: "hoursUntilExpiration",
              required: false,
              placeholder: "Digite a quantidade de horas (opcional)",
              value: hours,
            },
            {
              label: "Minutos até o vencimento",
              customId: "minutesUntilExpiration",
              required: false,
              placeholder: "Digite a quantidade de minutos (opcional)",
              value: minutes,
            },
            {
              label: "Lifetime",
              customId: "isLifetime",
              required: true,
              placeholder:
                "digite 'sim' para definir como lifetime (vitalício)",
              value: application.lifetime ? "sim" : "não",
            },
          ],
        });
        return interaction.showModal(modal);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        try {
          const daysUntilExpiration =
            parseInt(
              interaction.fields.getTextInputValue("daysUntilExpiration"),
            ) || 0;
          const hoursUntilExpiration =
            parseInt(
              interaction.fields.getTextInputValue("hoursUntilExpiration"),
            ) || 0;
          const minutesUntilExpiration =
            parseInt(
              interaction.fields.getTextInputValue("minutesUntilExpiration"),
            ) || 0;
          const isLifetime = interaction.fields.getTextInputValue("isLifetime");
          const validValues = ["sim", "não"];
          if (!validValues.includes(isLifetime.toLowerCase())) {
            throw new Error(
              "Por favor, insira 'sim' ou 'não' no campo Lifetime.",
            );
          }
          // Validando dias
          if (isNaN(daysUntilExpiration) || daysUntilExpiration < 0) {
            throw new Error(
              "Por favor, insira um número válido de dias (0 ou mais).",
            );
          }
          if (daysUntilExpiration > 500) {
            throw new Error(
              `O número máximo de dias até o vencimento para este produto é 500 dias.`,
            );
          }
          // Validando horas e minutos
          if (
            Number.isNaN(minutesUntilExpiration) ||
            minutesUntilExpiration < 0 ||
            minutesUntilExpiration > 59
          ) {
            throw new Error(
              "Por favor, insira um número válido de minutos (0-59).",
            );
          }
          if (
            Number.isNaN(hoursUntilExpiration) ||
            hoursUntilExpiration < 0 ||
            hoursUntilExpiration > 23
          ) {
            throw new Error(
              "Por favor, insira um número válido de horas (0-23).",
            );
          }
          // Calculando a data de expiração
          if (isLifetime.toLowerCase() === "sim") {
            application.lifetime = true;
            application.expiresAt = undefined;
            application.status = "active";
          } else {
            if (
              daysUntilExpiration === 0 &&
              hoursUntilExpiration === 0 &&
              minutesUntilExpiration === 0
            ) {
              throw new Error(
                "Por favor, insira pelo menos um valor para dias, horas ou minutos até o vencimento.",
              );
            }
            application.status = "active";
            application.lifetime = false;
            const newExpiresAt = new Date();
            if (daysUntilExpiration) {
              newExpiresAt.setDate(
                newExpiresAt.getDate() + daysUntilExpiration,
              );
            }
            if (hoursUntilExpiration) {
              newExpiresAt.setHours(
                newExpiresAt.getHours() + hoursUntilExpiration,
              );
            }
            if (minutesUntilExpiration) {
              newExpiresAt.setMinutes(
                newExpiresAt.getMinutes() + minutesUntilExpiration,
              );
            }
            application.expiresAt = newExpiresAt;
          }
          yield application.save();
          yield client.invokeInteraction(
            `admin-store-settings-app:${application._id}`,
            interaction,
          );
          yield interaction.followUp({
            content: "`✅`・Vencimento alterado com sucesso!",
            flags: 64,
          });
        } catch (error) {
          yield client.invokeInteraction(
            `admin-store-settings-app:${appId}`,
            interaction,
          );
          yield interaction.followUp({
            content: `\`❌\`・${error.message}`,
            flags: 64,
          });
        }
      }
    }),
});
