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
const fast_discord_js_1 = require("fast-discord-js");
const functions_1 = require("@root/src/functions");
const discord_js_1 = require("discord.js");
const databases_1 = __importDefault(require("@root/src/databases"));
const src_1 = __importDefault(require("@root/src"));
const mongoose_1 = require("mongoose");
new fast_discord_js_1.InteractionHandler({
  customId: "config-store",
  run: (_client, interaction, storeId) =>
    __awaiter(void 0, void 0, void 0, function* () {
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
      const contents = [
        `# Configurando lojas`,
        `- Aqui você poderá configurar sua loja \`${store.name}\`\n`,
      ];
      const components = [
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Configurar Produtos",
            style: 1,
            customId: `config-products:${storeId}`,
            emoji: functions_1.emojis.cart,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: `Configurar ${(0, functions_1.getHostWorkspaceLabel)(
              (0, functions_1.getStoreHostProvider)(store),
            )}`,
            style: 1,
            customId: `config-team:${storeId}`,
            emoji: functions_1.emojis.config,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Configurar os Cupons",
            style: 1,
            customId: `config-coupons:${storeId}`,
            emoji: functions_1.emojis.cupom,
          }),
        ]),
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Configurações Avançadas",
            style: 2,
            customId: `advanced-config:${storeId}`,
            emoji: functions_1.emojis.config,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Aplicações Hospedadas",
            style: 2,
            customId: `apps-hosted:${storeId}`,
            emoji: functions_1.emojis.user,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Atualizar painel",
            style: 2,
            customId: `config-store:${storeId}`,
            emoji: functions_1.emojis.reload,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Voltar",
            style: 2,
            customId: "config",
            emoji: functions_1.emojis.back,
          }),
        ]),
      ];
      const salesCounts = yield databases_1.default.applications.aggregate([
        {
          $match: {
            storeId: new mongoose_1.Types.ObjectId(storeId),
          },
        },
        {
          $group: {
            _id: "$productId",
            count: { $sum: 1 },
          },
        },
      ]);
      // Transformar para Map
      const salesCountMap = new Map();
      for (const item of salesCounts) {
        salesCountMap.set(item._id.toString(), item.count);
      }
      // Buscar somente os campos necessários dos produtos
      const products = yield databases_1.default.products.find(
        { storeId },
        { name: 1 },
      );
      const chartData = {
        labels: products.map((product) => product.name),
        values: products.map(
          (product) => salesCountMap.get(product._id.toString()) || 0,
        ),
      };
      const canvasChartBuffer = yield (0, functions_1.generateChartBuffer)({
        labels: chartData.labels,
        values: chartData.values,
        type: functions_1.ChartType.BAR,
        borderRadius: 4,
        width: 500,
        height: 300,
      });
      const attachment = new discord_js_1.AttachmentBuilder(canvasChartBuffer, {
        name: "chart.png",
      });
      yield interaction.update({
        content: contents.join("\n"),
        files: [attachment],
        components,
      });
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "config-team",
  run: (_client, interaction, storeId) =>
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
      const userInfo = yield databases_1.default.userSettings.findOne({
        userId_discord: interaction.user.id,
      });
      if (!userInfo) {
        return interaction.reply({
          content: "`❌`・Você não está cadastrado!",
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
      const provider = (0, functions_1.getStoreHostProvider)(store);
      const providerLabel = (0, functions_1.getHostLabel)(provider);
      const workspaceLabel = (0, functions_1.getHostWorkspaceLabel)(provider);
      const ownerStoreData = yield (0, functions_1.findStoreOwnerSettings)(
        databases_1.default,
        store,
      );
      if (!ownerStoreData) {
        return interaction.reply({
          content: "`❌`・Dono da loja não encontrado!",
          flags: 64,
        });
      }
      const hostAccount = (0, functions_1.getUserHostAccount)(
        ownerStoreData,
        provider,
      );
      if (!hostAccount.apiToken) {
        return interaction.reply({
          content: `\`❌\`・Conta ${providerLabel} da loja não encontrada!`,
          flags: 64,
        });
      }
      const host = yield (0, functions_1.getHostAdapterForStore)(
        databases_1.default,
        store,
      ).catch(() => null);
      const workspaces = host
        ? yield host.adapter.listWorkspaces().catch(() => null)
        : null;
      if (!workspaces) {
        return interaction.reply({
          content: `\`❌\`・Não foi possível obter os ${workspaceLabel.toLowerCase()}s do ${providerLabel}!`,
          flags: 64,
        });
      }
      const contents = [
        `# Configurando ${workspaceLabel}`,
        `- Aqui você poderá configurar o ${workspaceLabel.toLowerCase()} da loja \`${store.name}\`\n`,
        `- -# A configuração do ${workspaceLabel.toLowerCase()} adiciona automaticamente todo BOT adquirido pelos seus clientes ao espaço escolhido, facilitando o gerenciamento centralizado.`,
        `> -# A configuração do ${workspaceLabel.toLowerCase()} é opcional.`,
      ];
      const components = [
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Atualizar painel",
            style: 1,
            customId: `config-team:${storeId}`,
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
      if (workspaces.length) {
        const options = workspaces.map((workspace) => {
          return {
            label: workspace.name,
            value: workspace.id,
            description: `${workspaceLabel} ID: ${workspace.id}`,
            emoji:
              workspace.id === (0, functions_1.getStoreHostWorkspaceId)(store)
                ? "🟢"
                : "🔴",
          };
        });
        components.unshift(
          (0, fast_discord_js_1.CreateRow)([
            new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
              customId: `select-team:${storeId}`,
              placeholder: `Selecione um ${workspaceLabel.toLowerCase()}`,
              options,
              getValueInLastParam: true,
            }),
          ]),
        );
      } else {
        contents.push(
          `\n> Você não possui nenhum ${workspaceLabel.toLowerCase()} criado. Crie um no [painel](<${(0, functions_1.getHostDashboardBaseUrl)(provider)}>).`,
        );
      }
      return interaction.update({
        content: contents.join("\n"),
        components,
        files: [],
        flags: 64,
      });
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "select-team",
  run: (_client, interaction, storeId, workspaceId) =>
    __awaiter(void 0, void 0, void 0, function* () {
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
      const userInfo = yield databases_1.default.userSettings.findOne({
        userId_discord: interaction.user.id,
      });
      if (!userInfo) {
        return interaction.reply({
          content: "`❌`・Você não está cadastrado!",
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
      const provider = (0, functions_1.getStoreHostProvider)(store);
      const isSameWorkspace =
        (0, functions_1.getStoreHostWorkspaceId)(store) === workspaceId;
      if (isSameWorkspace) {
        yield databases_1.default.stores.updateOne(
          { _id: storeId },
          {
            $set: {
              hostWorkspaceId: null,
              ...(provider === functions_1.HOST_PROVIDERS.CAMPOS
                ? { teamId_campos: null }
                : {}),
            },
          },
        );
      } else {
        yield databases_1.default.stores.updateOne(
          { _id: storeId },
          {
            $set: {
              hostWorkspaceId: workspaceId,
              ...(provider === functions_1.HOST_PROVIDERS.CAMPOS
                ? { teamId_campos: workspaceId }
                : {}),
            },
          },
        );
      }
      yield src_1.default.invokeInteraction(
        `config-team:${storeId}`,
        interaction,
      );
      return interaction.followUp({
        content: "`✅`・Configuração atualizada com sucesso!",
        flags: 64,
      });
    }),
});
