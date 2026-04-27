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
const buy_event_1 = require("@root/src/events/buy.event");
const functions_1 = require("@root/src/functions");
const extracts_1 = require("@root/src/functions/extracts");
const discord_js_1 = require("discord.js");
const fast_discord_js_1 = require("fast-discord-js");
new fast_discord_js_1.SlashCommand({
  name: "aprovar",
  description: "Aprovar carrinho do usuário",
  type: 1,
  run: (client, interaction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      client.invokeInteraction("approve-payment:show-modal", interaction);
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "approve-payment",
  run: (client, interaction, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a, _b;
      if (
        !((_a = interaction.channel) === null || _a === void 0
          ? void 0
          : _a.isThread())
      ) {
        return interaction.reply({
          content: "`❌`・Este comando só pode ser usado em canais de texto.",
          flags: 64,
        });
      }
      const cart = yield databases_1.default.cartsBuy
        .findOne({ channelId: interaction.channelId })
        .populate("storeId");
      if (!cart) {
        return interaction.reply({
          content: "`❌`・Nenhum carrinho encontrado para este canal.",
          flags: 64,
        });
      }
      const storeConfig = cart.storeId;
      if (!storeConfig) {
        return interaction.reply({
          content:
            "`❌`・A loja deste carrinho está desativada ou não existe mais.",
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
      if (cart.step !== "waiting-payment") {
        return interaction.reply({
          content:
            "`❌`・Para aprovar o carrinho, ele deve estar no passo de pagamento.",
          flags: 64,
        });
      }
      if (action === "show-modal" && interaction.isCommand()) {
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Aprovar Carrinho",
          customId: "approve-payment:submit-modal",
          inputs: [
            {
              customId: "add-balance",
              label: "Essa compra deve ser adicionada no saldo ?",
              placeholder: "Use: sim ou não",
              style: discord_js_1.TextInputStyle.Short,
              required: true,
            },
          ],
        });
        modal.show(interaction);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        const validValues = ["sim", "não"];
        const confirm = interaction.fields
          .getTextInputValue("add-balance")
          .trim();
        if (!validValues.includes(confirm.toLowerCase())) {
          return interaction.reply({
            content: "`❌`・Valor inválido, use: `sim` ou `não`",
            flags: 64,
          });
        }
        if (confirm.toLowerCase() === "sim") {
          yield (0, extracts_1.changeBalance)({
            action: "add",
            amount: (0, functions_1.getCreditedAmount)(cart),
            origin: "sales",
            description: `Carrinho aprovado por ${interaction.user.tag} (${interaction.user.id})`,
            storeId: storeConfig._id.toString(),
          });
        }
        const logs_and_roles = storeConfig.logsAndRoles;
        const customer_role =
          logs_and_roles === null || logs_and_roles === void 0
            ? void 0
            : logs_and_roles.customerRole;
        if (customer_role) {
          const member = yield (_b = client.guilds.cache.get(cart.guildId)) ===
            null || _b === void 0
            ? void 0
            : _b.members.fetch(cart.userId).catch(() => null);
          member === null || member === void 0
            ? void 0
            : member.roles.add(customer_role).catch(() => null);
        }
        cart.status = "opened";
        cart.step = "payment-confirmed";
        cart.paymentStatus = "manual_approved";
        yield cart.save();
        const messageData = yield (0, buy_event_1.getCartMessage)(
          interaction.channel.id,
        );
        if (!messageData) {
          return interaction.reply({
            content: "`❌`・Erro ao buscar a mensagem do carrinho.",
            flags: 64,
          });
        }
        yield interaction.channel.bulkDelete(100, true).catch(() => {});
        yield interaction.channel.send(messageData);
        if (cart.selectedTier === functions_1.PRODUCT_DELIVERY_MODES.SHARED) {
          const dmSent = yield (0, buy_event_1.sendSharedPurchaseDm)(
            client,
            cart.userId,
            messageData,
          );
          yield interaction.channel
            .send({
              content: dmSent
                ? "`ℹ️`・As instrucoes tambem foram enviadas na DM do cliente. Este thread sera fechado em 60 segundos."
                : "`ℹ️`・Nao consegui entregar a DM do cliente. Use a mensagem acima. Este thread sera fechado em 60 segundos.",
            })
            .catch(() => null);
          (0, buy_event_1.scheduleSharedCartThreadDeletion)(interaction.channel);
        }
        return interaction.reply({
          content: "`✅`・Carrinho aprovado e mensagem enviada.",
          flags: 64,
        });
      }
    }),
});
