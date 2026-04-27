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
const databases_1 = __importDefault(require("@root/src/databases"));
const functions_1 = require("@root/src/functions");
const extracts_1 = require("@root/src/functions/extracts");
const discord_js_1 = require("discord.js");
const fast_discord_js_1 = require("fast-discord-js");
new fast_discord_js_1.InteractionHandler({
  customId: "sales-statistics",
  run: (_client_1, interaction_1, storeId_1, ...args_1) =>
    __awaiter(
      void 0,
      [_client_1, interaction_1, storeId_1, ...args_1],
      void 0,
      function* (_client, interaction, storeId, page = "1") {
        const hasPermission = yield (0,
        functions_1.getUserHasPermissionOnStore)({
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
        const currentPage = parseInt(page);
        const pageSize = 10;
        const skip = (currentPage - 1) * pageSize;
        // Buscar apenas o valor do saldo
        const storeConfig = yield databases_1.default.stores
          .findOne({ _id: storeId }, { balance: 1, _id: 1 })
          .lean();
        if (!storeConfig) {
          return interaction.reply({
            content: "`❌`・Loja não encontrada!",
            flags: 64,
          });
        }
        const balance =
          storeConfig === null || storeConfig === void 0
            ? void 0
            : storeConfig.balance;
        // Contar total de extratos (para saber o total de páginas)
        const totalExtracts = yield databases_1.default.extracts.countDocuments(
          { storeId: storeId },
        );
        const totalPages = Math.max(1, Math.ceil(totalExtracts / pageSize));
        // Buscar extratos paginados com apenas os campos necessários
        const extracts = yield databases_1.default.extracts
          .find({ storeId }, { amount: 1, description: 1, action: 1 })
          .sort({ createdAt: -1 }) // opcional: do mais recente pro mais antigo
          .skip(skip)
          .limit(pageSize)
          .lean();
        const contents = [
          "`📊`・Estatísticas de Vendas",
          "`📈`・Visualize as vendas do seu produto e obtenha insights valiosos para impulsionar suas vendas.\n",
          `> Saldo Atual: \`R$ ${(balance || 0).toFixed(2)}\``,
        ];
        const components = [];
        if (extracts.length > 0) {
          components.push(
            (0, fast_discord_js_1.CreateRow)(
              new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
                customId: `sales-statistics-select:${storeId}`,
                placeholder: "Selecione uma venda para ver detalhes",
                options: extracts.map((extract, index) => {
                  var _a;
                  return {
                    label: `R$ ${extract.amount.toFixed(2)}`,
                    value: `${extract._id}`,
                    description:
                      (_a =
                        extract === null || extract === void 0
                          ? void 0
                          : extract.description) === null || _a === void 0
                        ? void 0
                        : _a.slice(0, 50),
                    emoji: extract.action === "add" ? "🟢" : "🔴",
                  };
                }),
              }),
            ),
            (0, fast_discord_js_1.CreateRow)([
              (0, fast_discord_js_1.CreateButton)({
                label: " ",
                emoji: "⬅️",
                customId: `sales-statistics:${storeId}:${currentPage - 1}`,
                disabled: currentPage <= 1,
              }),
              (0, fast_discord_js_1.CreateButton)({
                label: `Página ${currentPage}/${totalPages}`,
                style: discord_js_1.ButtonStyle.Secondary,
                customId: "dont-click",
                disabled: true,
              }),
              (0, fast_discord_js_1.CreateButton)({
                label: " ",
                emoji: "➡️",
                customId: `sales-statistics:${storeId}:${currentPage + 1}`,
                disabled: currentPage >= totalPages,
              }),
            ]),
          );
        }
        components.push(
          (0, fast_discord_js_1.CreateRow)(
            (0, fast_discord_js_1.CreateButton)({
              label: "Adicionar",
              customId: `add-balance:${storeId}:show-modal`,
              style: discord_js_1.ButtonStyle.Primary,
              emoji: functions_1.emojis.add,
            }),
            (0, fast_discord_js_1.CreateButton)({
              label: "Remover",
              customId: `remove-balance:${storeId}:show-modal`,
              style: discord_js_1.ButtonStyle.Primary,
              emoji: functions_1.emojis.remove,
            }),
            (0, fast_discord_js_1.CreateButton)({
              label: "Atualizar painel",
              customId: `sales-statistics:${storeId}:${page}`,
              style: discord_js_1.ButtonStyle.Secondary,
              emoji: functions_1.emojis.reload,
            }),
            (0, fast_discord_js_1.CreateButton)({
              label: "Voltar",
              customId: `advanced-config:${storeId}`,
              style: discord_js_1.ButtonStyle.Secondary,
              emoji: functions_1.emojis.back,
            }),
          ),
        );
        yield interaction.update({
          content: contents.join("\n"),
          components,
          files: [],
        });
      },
    ),
});
new fast_discord_js_1.InteractionHandler({
  customId: "add-balance",
  run: (client, interaction, storeId, action) =>
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
      if (action === "show-modal" && interaction.isButton()) {
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Adicionar Saldo",
          customId: `add-balance:${storeId}:submit-modal`,
          inputs: [
            {
              label: "Valor",
              customId: "amount",
              placeholder: "Digite o valor a ser adicionado",
              required: true,
            },
            {
              label: "Descrição",
              customId: "description",
              placeholder: "Digite uma descrição (opcional)",
              required: false,
              style: discord_js_1.TextInputStyle.Paragraph,
            },
          ],
        });
        return yield interaction.showModal(modal);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        try {
          const amount = parseFloat(
            interaction.fields.getTextInputValue("amount").replace(",", "."),
          );
          const description =
            interaction.fields.getTextInputValue("description") ||
            "Saldo adicionado";
          if (isNaN(amount) || amount <= 0) {
            return yield interaction.reply({
              content:
                "`❌`・Por favor, insira um valor válido para adicionar ao saldo.",
              flags: 64,
            });
          }
          yield (0, extracts_1.changeBalance)({
            action: "add",
            amount,
            description,
            origin: "manual",
            storeId,
          });
          yield client.invokeInteraction(
            `sales-statistics:${storeId}`,
            interaction,
          );
          yield interaction.followUp({
            content: `\`✅\`・Saldo adicionado com sucesso`,
            flags: 64,
          });
        } catch (error) {
          if (interaction.replied) {
            yield interaction.followUp({
              content: "`❌`・Ocorreu um erro ao adicionar o saldo.",
              flags: 64,
            });
            return;
          }
          return yield interaction.reply({
            content: "`❌`・Ocorreu um erro ao adicionar o saldo.",
            flags: 64,
          });
        }
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "remove-balance",
  run: (client, interaction, storeId, action) =>
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
      if (action === "show-modal" && interaction.isButton()) {
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Remover Saldo",
          customId: `remove-balance:${storeId}:submit-modal`,
          inputs: [
            {
              label: "Valor",
              customId: "amount",
              placeholder: "Digite o valor a ser removido",
              required: true,
            },
            {
              label: "Descrição",
              customId: "description",
              placeholder: "Digite uma descrição (opcional)",
              required: false,
              style: discord_js_1.TextInputStyle.Paragraph,
            },
          ],
        });
        return yield interaction.showModal(modal);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        try {
          const amount = parseFloat(
            interaction.fields.getTextInputValue("amount").replace(",", "."),
          );
          const description =
            interaction.fields.getTextInputValue("description") ||
            "Saldo removido";
          if (isNaN(amount) || amount <= 0) {
            return yield interaction.reply({
              content:
                "`❌`・Por favor, insira um valor válido para remover do saldo.",
              flags: 64,
            });
          }
          yield (0, extracts_1.changeBalance)({
            action: "remove",
            amount,
            description,
            origin: "manual",
            storeId,
          });
          yield client.invokeInteraction(
            `sales-statistics:${storeId}`,
            interaction,
          );
          yield interaction.followUp({
            content: `\`✅\`・Saldo removido com sucesso`,
            flags: 64,
          });
        } catch (error) {
          if (interaction.replied) {
            yield interaction.followUp({
              content: "`❌`・Ocorreu um erro ao remover o saldo.",
              flags: 64,
            });
            return;
          }
          return yield interaction.reply({
            content: "`❌`・Ocorreu um erro ao remover o saldo.",
            flags: 64,
          });
        }
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "sales-statistics-select",
  run: (client, interaction, storeId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      if (!interaction.isAnySelectMenu()) return;
      return interaction.reply({
        content:
          "`⚠️`・A funcionalidade de detalhes da venda ainda não está implementada 😴",
        flags: 64,
      });
    }),
});
