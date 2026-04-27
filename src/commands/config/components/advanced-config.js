"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
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
const acl_1 = __importStar(require("@root/src/functions/acl"));
const databases_1 = __importDefault(require("@root/src/databases"));
const bytes_1 = __importDefault(require("bytes"));
const promises_1 = __importDefault(require("fs/promises"));
const functions_1 = require("@root/src/functions");
const discord_js_1 = require("discord.js");
const fast_discord_js_1 = require("fast-discord-js");
const path_1 = __importDefault(require("path"));
new fast_discord_js_1.InteractionHandler({
  customId: "advanced-config",
  run: (_client, interaction, storeId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a, _b, _c;
      const hasPermission = yield (0, acl_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: storeId,
        permission: acl_1.PermissionsStore.ADMIN,
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
      // Informações do usuário que está interagindo
      const userInfo = yield databases_1.default.userSettings.findOne({
        userId_discord: interaction.user.id,
      });
      // Informações do dono da loja
      const storeOwnerConfig = yield (0, functions_1.findStoreOwnerSettings)(
        databases_1.default,
        store,
      );
      if (!storeOwnerConfig) {
        return interaction.reply({
          content: "`❌`・Dono da loja não encontrado!",
          flags: 64,
        });
      }
      // Vamos verificar se o usuário que está interagindo é o dono da loja ou tem permissão na loja
      const isStoreOwner = (0, functions_1.isStoreOwner)(store, userInfo);
      const hasStorePermission =
        (_a = store.permissions) === null || _a === void 0
          ? void 0
          : _a.find((p) => p.userId === interaction.user.id);
      if (!isStoreOwner && !hasStorePermission) {
        return interaction.reply({
          content:
            "`❌`・Você não tem permissão para acessar as configurações desta loja!",
          flags: 64,
        });
      }
      const contents = [
        `# Configurando lojas`,
        `- Aqui você poderá configurar sua loja \`${store.name}\`\n`,
      ];
      const provider = (0, functions_1.getStoreHostProvider)(store);
      const hostAccount = (0, functions_1.getUserHostAccount)(
        storeOwnerConfig,
        provider,
      );
      const adapter = hostAccount.apiToken
        ? yield (0, functions_1.createHostAdapter)({
            provider,
            ownerDiscordUserId: storeOwnerConfig.userId_discord,
            apiToken: hostAccount.apiToken,
          }).catch(() => null)
        : null;
      const userData = adapter
        ? yield adapter.getAccount().catch(() => null)
        : null;
      const planUsage = adapter
        ? yield adapter.getPlanUsage().catch(() => null)
        : null;
      const expirationDate =
        planUsage === null || planUsage === void 0 ? void 0 : planUsage.endAt
          ? new Date(planUsage.endAt)
          : null;
      if (userData) {
        contents.push(
          `> Informações do dono da loja na [${(0,
          functions_1.getHostLabel)(provider)}](<${(0,
          functions_1.getHostDashboardBaseUrl)(provider)}>)`,
        );
        contents.push(`- Nome: \`${userData.name}\``);
        contents.push(`- Email: \`${userData.email}\``);
        if (planUsage) {
          const emoji =
            planUsage.utilizedMemoryPercentage > 80
              ? "🟥"
              : planUsage.utilizedMemoryPercentage > 50
                ? "🟡"
                : "🟢";
          contents.push(
            `- RAM: \`${`${(0, bytes_1.default)(planUsage.totalMemory * 1024 * 1024, { unitSeparator: " " })} (${planUsage.utilizedMemoryPercentage}% utilizado) ${emoji}`}\``,
          );
        }
      }
      if (expirationDate) {
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
      const components = [
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Configurar Logs e Cargos",
            style: 1,
            customId: `config-logs:${storeId}`,
            emoji: functions_1.emojis.config,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Configurar permissões",
            style: 1,
            customId: `config-permissions:${storeId}`,
            emoji: functions_1.emojis.user,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Excluir loja",
            style: 4,
            customId: `delete-store:${storeId}:show-modal`,
            emoji: functions_1.emojis.trash,
          }),
        ]),
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Estatisticas de Vendas",
            style: 2,
            customId: `sales-statistics:${storeId}`,
            emoji: functions_1.emojis.statistics,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Atualizar esse painel",
            style: 2,
            customId: `advanced-config:${storeId}`,
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
      return yield interaction.update({
        content: contents.join("\n"),
        files: [],
        components,
      });
    }),
});
/**
 * Bloco de exclusão de loja
 */
new fast_discord_js_1.InteractionHandler({
  customId: "delete-store",
  run: (client, interaction, storeId, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const hasPermission = yield (0, acl_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: storeId,
        permission: acl_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      const userInfo = yield databases_1.default.userSettings.findOne({
        userId_discord: interaction.user.id,
      });
      if (!userInfo) {
        return interaction.reply({
          content: "`❌`・Você não está cadastrado!",
          flags: 64,
        });
      }
      const store = yield databases_1.default.stores.findOne({
        _id: storeId,
      });
      if (!store || !(0, functions_1.isStoreOwner)(store, userInfo)) {
        return interaction.reply({
          content: "`❌`・Loja não encontrada!",
          flags: 64,
        });
      }
      if (action === "show-modal") {
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: `delete-store:${storeId}:submit-modal`,
          title: "Excluindo loja",
          inputs: [
            {
              label: "Confirme a exclusão",
              placeholder: `Digite "${store.name}" para confirmar`,
              required: true,
              style: discord_js_1.TextInputStyle.Short,
              customId: "confirm-name",
            },
          ],
        });
        return yield modal.show(interaction);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        const confirmName =
          interaction.fields.getTextInputValue("confirm-name");
        if (confirmName !== store.name) {
          return yield interaction.reply({
            content: "`❌`・Nome incorreto! A loja não foi excluída.",
            flags: 64,
          });
        }
        const applicationsInStoreCount =
          yield databases_1.default.applications.countDocuments({ storeId });
        if (applicationsInStoreCount > 0) {
          return yield interaction.reply({
            content: `\`❌\`・Não é possível excluir a loja, pois existem \`${applicationsInStoreCount}\` aplicações associadas a ela. Por favor, remova as aplicações antes de excluir a loja.`,
            flags: 64,
          });
        }
        const productsInStore = yield databases_1.default.products.find({
          storeId,
        });
        for (const product of productsInStore) {
          yield promises_1.default
            .rm(path_1.default.join("releases", product._id.toString()), {
              recursive: true,
              force: true,
            })
            .catch((e) =>
              console.error(
                `❌・Erro ao tentar excluir a pasta de releases do produto ${product._id}:`,
                e,
              ),
            );
        }
        yield databases_1.default.products.deleteMany({ storeId });
        yield databases_1.default.coupons.deleteMany({ storeId });
        yield databases_1.default.stores.deleteOne({
          _id: storeId,
        });
        yield client.invokeInteraction("config", interaction);
        yield interaction.followUp({
          content: "`✅`・Loja excluída com sucesso!",
          flags: 64,
        });
      }
    }),
});
/**
 * Bloco de configuração de permissões
 * Permite que o dono da loja adicione usuários com permissões específicas.
 */
new fast_discord_js_1.InteractionHandler({
  customId: "config-permissions",
  run: (client, interaction, storeId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const userInfo = yield databases_1.default.userSettings.findOne({
        userId_discord: interaction.user.id,
      });
      if (!userInfo) {
        return interaction.reply({
          content: "`❌`・Você não está cadastrado!",
          flags: 64,
        });
      }
      const storeConfig = yield databases_1.default.stores.findOne({
        _id: storeId,
      });
      if (!storeConfig || !(0, functions_1.isStoreOwner)(storeConfig, userInfo)) {
        return interaction.reply({
          content:
            "`❌`・Loja não encontrada ou você não tem permissão para acessar as configurações.",
          flags: 64,
        });
      }
      const userPermissions = storeConfig.permissions || [];
      const contents = [
        `# Permissões do BOT`,
        `- Aqui você poderá configurar as permissões dos usuarios\n`,
        `- **Usuarios com permissão: (${userPermissions.length})**`,
      ];
      if (userPermissions.length > 0) {
        userPermissions.map((userPermissionObject) => {
          const userId = userPermissionObject.userId;
          const permissions = userPermissionObject.permissions;
          const translatedPermissions = permissions.map((permission) => {
            const translatedPermission = acl_1.default
              .get()
              .find((p) => p.value === permission);
            return (
              (translatedPermission === null || translatedPermission === void 0
                ? void 0
                : translatedPermission.label) || permission
            );
          });
          const contentToPush = [
            ` - `,
            ` - Usuario: <@${userId}>`,
            ` - Permissões: \`${permissions.length > 0 ? translatedPermissions.join(", ") : `\`Ainda não definido\``}\``,
          ];
          contents.push(contentToPush.join("\n"));
        });
      } else {
        contents.push(` - Nenhum usuario com permissão`);
      }
      const components = [
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Adicionar usuario",
            customId: `add-store-permission:${storeId}:show-modal`,
            emoji: functions_1.emojis.add,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Atualizar painel",
            customId: `config-permissions:${storeId}`,
            emoji: functions_1.emojis.reload,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Voltar",
            customId: `advanced-config:${storeId}`,
            emoji: functions_1.emojis.back,
            style: 2,
          }),
        ]),
      ];
      if (userPermissions.length > 0) {
        const options = yield Promise.all(
          userPermissions.map((userPermissionObject) =>
            __awaiter(void 0, void 0, void 0, function* () {
              const user = yield client.users
                .fetch(userPermissionObject.userId)
                .catch(() => null);
              const userId = userPermissionObject.userId;
              return {
                label:
                  (user === null || user === void 0 ? void 0 : user.username) ||
                  userId,
                description: `ID: ${userId}`,
                value: userId,
                emoji: functions_1.emojis.user,
              };
            }),
          ),
        );
        components.unshift(
          (0, fast_discord_js_1.CreateRow)([
            new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
              customId: `config-permissions-user:handler:${storeId}`,
              placeholder: "Selecione um usuário",
              options: options,
              getValueInLastParam: true,
            }),
          ]),
        );
      }
      contents.push("\n");
      yield interaction.update({
        content: contents.join("\n"),
        components,
        files: [],
      });
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "add-store-permission",
  run: (client, interaction, storeId, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const hasPermission = yield (0, acl_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: storeId,
        permission: acl_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      if (action === "show-modal") {
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Adicionar usuario",
          customId: `add-store-permission:${storeId}:submit-modal`,
          inputs: [
            {
              label: "ID do usuario",
              required: true,
              style: 1,
              placeholder: "413749917396238336",
              customId: "user-id",
            },
          ],
        });
        yield modal.show(interaction);
        return;
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        const userId = interaction.fields.getTextInputValue("user-id");
        const userExists = yield client.users.fetch(userId).catch(() => null);
        if (!userExists) {
          return interaction.reply({
            content: "`❌`・Usuario não encontrado",
            flags: 64,
          });
        }
        const storeDatabase = yield databases_1.default.stores.findOne({
          _id: storeId,
        });
        if (!storeDatabase) {
          return interaction.reply({
            content: "`❌`・Loja não encontrada",
            flags: 64,
          });
        }
        if (
          storeDatabase.permissions.find(
            (userPermissionObject) => userPermissionObject.userId === userId,
          )
        ) {
          return interaction.reply({
            content: "`❌`・O usuario já possui permissão",
            flags: 64,
          });
        }
        yield databases_1.default.stores.updateOne(
          { _id: storeId },
          { $push: { permissions: { userId, permissions: [] } } },
          { upsert: true },
        );
        yield client.invokeInteraction(
          `config-permissions:${storeId}`,
          interaction,
        );
        return interaction.followUp({
          content: "`✅`・Permissão adicionada com sucesso",
          flags: 64,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "config-permissions-user",
  run: (client, interaction, action, storeId, userId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const hasPermission = yield (0, acl_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: storeId,
        permission: acl_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      if (action === "handler") {
        const storeConfig = yield databases_1.default.stores.findOne({
          _id: storeId,
        });
        if (!storeConfig) {
          return interaction.reply({
            content: "`❌`・Loja não encontrada",
            flags: 64,
          });
        }
        const usersPermissions = storeConfig.permissions || [];
        const userPermissionObject = usersPermissions.find(
          (userPermissionObject) => userPermissionObject.userId === userId,
        );
        if (!userPermissionObject) {
          return interaction.reply({
            content: `\`❌\`・Usuario não encontrado na lista de permissões`,
            flags: 64,
          });
        }
        let permissionString = "";
        if (userPermissionObject.permissions.length > 0) {
          userPermissionObject.permissions.map((permission) => {
            const translatedPermission = acl_1.default
              .get()
              .find((p) => p.value === permission);
            permissionString += `\n - \`${(translatedPermission === null || translatedPermission === void 0 ? void 0 : translatedPermission.label) || permission}\``;
          });
        }
        const contents = [
          `# Editar permissões`,
          `- Aqui você poderá editar as permissões do usuario <@${userId}>\n`,
          `- **Permissões atuais:** ${userPermissionObject.permissions.length > 0 ? `${permissionString}` : `\n - \`Ainda não definido\``}`,
        ];
        const components = [
          (0, fast_discord_js_1.CreateRow)([
            new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
              customId: `config-permissions-user:toggle-permission:${storeId}:${userId}`,
              placeholder: "Selecione uma permissão",
              options: acl_1.default.get().map((permission) => {
                const hasPermission = userPermissionObject.permissions.includes(
                  permission.value,
                );
                return {
                  label: permission.label,
                  value: permission.value,
                  description: permission.description,
                  emoji: hasPermission ? "🟢" : "🔴",
                };
              }),
            }),
          ]),
          (0, fast_discord_js_1.CreateRow)([
            (0, fast_discord_js_1.CreateButton)({
              label: "Atualizar painel",
              customId: `config-permissions-user:handler:${storeId}:${userId}`,
              emoji: functions_1.emojis.reload,
            }),
            (0, fast_discord_js_1.CreateButton)({
              label: "Remover usuario",
              customId: `config-permissions-user:remove-user:${storeId}:${userId}`,
              style: 4,
              emoji: functions_1.emojis.trash,
            }),
            (0, fast_discord_js_1.CreateButton)({
              label: "Voltar",
              customId: `config-permissions:${storeId}`,
              emoji: functions_1.emojis.back,
              style: 2,
            }),
          ]),
        ];
        return interaction.update({ content: contents.join("\n"), components });
      }
      if (action === "toggle-permission" && interaction.isAnySelectMenu()) {
        const storeConfig = yield databases_1.default.stores.findOne({
          _id: storeId,
        });
        if (!storeConfig) {
          return interaction.reply({
            content: "`❌`・Loja não encontrada",
            flags: 64,
          });
        }
        const usersPermissions = storeConfig.permissions || [];
        const userPermissionObject = usersPermissions.find(
          (user) => user.userId === userId,
        );
        if (!userPermissionObject) {
          return interaction.reply({
            content: `\`❌\`・Usuario não encontrado na lista de permissões`,
            flags: 64,
          });
        }
        const permission = interaction.values[0];
        const permissionIndex =
          userPermissionObject.permissions.indexOf(permission);
        if (permissionIndex === -1) {
          userPermissionObject.permissions.push(permission);
        } else {
          userPermissionObject.permissions.splice(permissionIndex, 1);
        }
        yield databases_1.default.stores.updateOne(
          { _id: storeId },
          { $set: { permissions: usersPermissions } },
        );
        yield client.invokeInteraction(
          `config-permissions-user:handler:${storeId}:${userId}`,
          interaction,
        );
      }
      if (action === "remove-user") {
        const contents = [
          `# Confirme essa ação`,
          `- Você realmente deseja remover a permissão desse usuario ? essa ação é irreversível!`,
        ];
        const components = [
          (0, fast_discord_js_1.CreateRow)([
            (0, fast_discord_js_1.CreateButton)({
              label: "Sim",
              customId: `config-permissions-user:confirmed-remove-user:${storeId}:${userId}`,
              style: 4,
              emoji: functions_1.emojis.yes,
            }),
            (0, fast_discord_js_1.CreateButton)({
              label: "Não, quero voltar",
              customId: `config-permissions-user:handler:${storeId}:${userId}`,
              emoji: functions_1.emojis.cancel,
              style: 1,
            }),
          ]),
        ];
        yield interaction.update({ content: contents.join("\n"), components });
      }
      if (action === "confirmed-remove-user") {
        const storeConfig = yield databases_1.default.stores.findOne({
          _id: storeId,
        });
        if (!storeConfig) {
          return interaction.reply({
            content: "`❌`・Loja não encontrada",
            flags: 64,
          });
        }
        const usersPermissions = storeConfig.permissions || [];
        const userPermissionObject = usersPermissions.find(
          (user) => user.userId === userId,
        );
        if (!userPermissionObject) {
          return interaction.reply({
            content: `\`❌\`・Usuario não encontrado na lista de permissões`,
            flags: 64,
          });
        }
        const newUsersPermissions = usersPermissions.filter(
          (user) => user.userId !== userId,
        );
        yield databases_1.default.stores.updateOne(
          { _id: storeId },
          { $set: { permissions: newUsersPermissions } },
        );
        yield client.invokeInteraction(
          `config-permissions:${storeId}`,
          interaction,
        );
        yield interaction.followUp({
          content: `\`✅\`・Usuario removido com sucesso`,
          flags: 64,
        });
      }
    }),
});
/**
 * Bloco de configuração de Logs e Cargos
 * Permite que o dono da loja configure os logs e cargos associados à loja.
 */
new fast_discord_js_1.InteractionHandler({
  customId: "config-logs",
  run: (_client, interaction, storeId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const hasPermission = yield (0, acl_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: storeId,
        permission: acl_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      const storeConfig = yield databases_1.default.stores.findOne({
        _id: storeId,
      });
      if (!storeConfig) {
        return interaction.reply({
          content: "`❌`・Loja não encontrada",
          flags: 64,
        });
      }
      const logsAndRoles = storeConfig.logsAndRoles || {};
      const sales =
        logsAndRoles === null || logsAndRoles === void 0
          ? void 0
          : logsAndRoles.sales;
      const renovations =
        logsAndRoles === null || logsAndRoles === void 0
          ? void 0
          : logsAndRoles.renovations;
      const transferOwnership =
        logsAndRoles === null || logsAndRoles === void 0
          ? void 0
          : logsAndRoles.transferOwnership;
      const expiredApplication =
        logsAndRoles === null || logsAndRoles === void 0
          ? void 0
          : logsAndRoles.expiredApplication;
      const customerRole =
        logsAndRoles === null || logsAndRoles === void 0
          ? void 0
          : logsAndRoles.customerRole;
      const contents = [
        `# Configurações de Logs`,
        `- Aqui você poderá configurar o canal de logs do BOT\n`,
        `\`👥\`・Cargo de Cliente: ${customerRole ? `<@&${customerRole}>` : "`⚠️ Cargo não definido`"}\n`,
        `\`💸\`・Log de Vendas: ${sales ? `<#${sales}>` : "`⚠️ Canal não definido`"}`,
        `\`🔁\`・Log de Renovação: ${renovations ? `<#${renovations}>` : "`⚠️ Canal não definido`"}`,
        `\`👦\`・Log de Transferência de Dono: ${transferOwnership ? `<#${transferOwnership}>` : "`⚠️ Canal não definido`"}`,
        `\`⏳\`・Log de Aplicações expiradas: ${expiredApplication ? `<#${expiredApplication}>` : "`⚠️ Canal não definido`"}\n`,
      ];
      const components = [
        (0, fast_discord_js_1.CreateRow)([
          new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
            customId: `config-logs-select:${storeId}:show-select-channel`,
            placeholder: "Selecione uma opção",
            options: [
              {
                emoji: functions_1.emojis.user,
                label: "Cargo de Cliente",
                value: "customerRole:role",
                description: "O Cargo de Cliente",
              },
              {
                emoji: functions_1.emojis.channels,
                label: "Logs de Vendas",
                value: "sales:channel",
                description:
                  "O Canal onde será enviado as notificações de vendas",
              },
              {
                emoji: functions_1.emojis.channels,
                label: "Logs de Renovação",
                value: "renovations:channel",
                description:
                  "O Canal onde será enviado as notificações de renovação",
              },
              {
                emoji: functions_1.emojis.channels,
                label: "Logs de Transferência de Dono",
                value: "transferOwnership:channel",
                description:
                  "O Canal onde será enviado as notificações de transferência de dono",
              },
              {
                emoji: functions_1.emojis.channels,
                label: "Logs de Aplicações Expiradas",
                value: "expiredApplication:channel",
                description:
                  "O Canal onde será enviado as notificações de aplicações expiradas",
              },
            ],
          }),
        ]),
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Atualizar o painel",
            style: 1,
            customId: `config-logs:${storeId}`,
            emoji: functions_1.emojis.reload,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Voltar",
            style: 2,
            customId: `advanced-config:${storeId}`,
            emoji: functions_1.emojis.back,
          }),
        ]),
      ];
      yield interaction.update({
        content: contents.join("\n"),
        files: [],
        components,
      });
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "config-logs-select",
  run: (client, interaction, storeId, value, option) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      const hasPermission = yield (0, acl_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: storeId,
        permission: acl_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      if (value === "show-select-channel" && interaction.isAnySelectMenu()) {
        const selectedOption = interaction.values[0];
        const type = selectedOption.split(":")[1];
        const components = [];
        const contents = [`# Configurações de Logs`];
        if (type === "role") {
          components.push(
            (0, fast_discord_js_1.CreateRow)([
              new fast_discord_js_1.CreateSelect().RoleSelectMenuBuilder({
                customId: `config-logs-select:${storeId}:submit-select:${selectedOption}`,
                placeholder: "Selecione um cargo",
              }),
            ]),
          );
        }
        if (type === "channel") {
          components.push(
            (0, fast_discord_js_1.CreateRow)([
              new fast_discord_js_1.CreateSelect().ChannelSelectMenuBuilder({
                customId: `config-logs-select:${storeId}:submit-select:${selectedOption}`,
                placeholder: "Selecione um canal",
                type: discord_js_1.ChannelType.GuildText,
              }),
            ]),
          );
        }
        if (type === "category") {
          components.push(
            (0, fast_discord_js_1.CreateRow)([
              new fast_discord_js_1.CreateSelect().ChannelSelectMenuBuilder({
                customId: `config-logs-select:${storeId}:submit-select:${selectedOption}`,
                placeholder: "Selecione uma categoria",
                type: discord_js_1.ChannelType.GuildCategory,
              }),
            ]),
          );
        }
        components.push(
          (0, fast_discord_js_1.CreateRow)([
            (0, fast_discord_js_1.CreateButton)({
              label: "Remover",
              style: 4,
              customId: `config-logs-remove-config:${storeId}:${selectedOption}`,
              emoji: functions_1.emojis.trash,
            }),
            (0, fast_discord_js_1.CreateButton)({
              label: "Cancelar",
              style: 2,
              customId: `config-logs:${storeId}`,
              emoji: functions_1.emojis.cancel,
            }),
          ]),
        );
        return interaction.update({ content: contents.join("\n"), components });
      }
      if (value === "submit-select" && interaction.isAnySelectMenu()) {
        const hasPermissionAdmin =
          (_a = interaction.memberPermissions) === null || _a === void 0
            ? void 0
            : _a.has(discord_js_1.PermissionsBitField.Flags.Administrator);
        if (!hasPermissionAdmin) {
          return yield interaction.reply({
            content:
              "`❌`・Você precisa da permissão de administrador para publicar a mensagem",
            flags: 64,
          });
        }
        const selectedChannel = interaction.values[0];
        // dentro de value da db, vou por um array de objeto com o nome da log e ID do canal
        const currentConfig = yield databases_1.default.stores.findOne({
          _id: storeId,
        });
        const logs =
          (currentConfig === null || currentConfig === void 0
            ? void 0
            : currentConfig.logsAndRoles) || {};
        logs[option] = selectedChannel;
        yield databases_1.default.stores.findOneAndUpdate(
          { _id: storeId },
          { $set: { logsAndRoles: logs } },
        );
        yield client.invokeInteraction(`config-logs:${storeId}`, interaction);
        yield interaction.followUp({
          content: "`✅`・Canal de logs alterado com sucesso",
          flags: 64,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "config-logs-remove-config",
  run: (client, interaction, storeId, value) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const hasPermission = yield (0, acl_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: storeId,
        permission: acl_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      const settings = yield databases_1.default.stores.findOne({
        _id: storeId,
      });
      if (!settings) {
        return yield interaction.reply({
          content: "`❌`・Loja não encontrada",
          flags: 64,
        });
      }
      yield databases_1.default.stores.updateOne(
        { _id: storeId },
        { $set: { [`logsAndRoles.${value}`]: null } },
      );
      yield client.invokeInteraction(`config-logs:${storeId}`, interaction);
      yield interaction.followUp({
        content: "`✅`・Configuração removida com sucesso",
        flags: 64,
      });
    }),
});
