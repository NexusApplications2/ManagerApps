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
exports.scheduleSharedCartThreadDeletion =
  exports.sendSharedPurchaseDm =
  exports.getCartMessage =
  exports.CART_EXPIRES_MINUTES =
    void 0;
const fast_discord_js_1 = require("fast-discord-js");
const discord_js_1 = require("discord.js");
const functions_1 = require("../functions");
const notify_wrapper_1 = require("../functions/notify-wrapper");
const databases_1 = __importDefault(require("../databases"));
const axios_1 = __importDefault(require("axios"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const promises_1 = __importDefault(require("fs/promises"));
exports.CART_EXPIRES_MINUTES = 30;
const SHARED_CART_THREAD_CLOSE_DELAY_MS = 60 * 1000;
const TIER_LABELS = {
  shared: "Bot pronto no servidor",
  private: "Bot privado só seu",
};
function refreshBuyCustomId(customId) {
  const parts = String(customId || "").split(":");
  if (parts[0] !== "buy-product" || parts.length < 3) {
    return customId;
  }
  return `buy-product:${parts[1]}:${parts[2]}:${Date.now().toString(36)}`;
}
function cloneComponentForSelectReset(component) {
  const data =
    component && typeof component.toJSON === "function"
      ? component.toJSON()
      : Object.assign({}, component);

  if (typeof data.custom_id === "string") {
    data.custom_id = refreshBuyCustomId(data.custom_id);
  }

  if (Array.isArray(data.options)) {
    data.options = data.options.map((option) => {
      const optionData =
        option && typeof option.toJSON === "function"
          ? option.toJSON()
          : Object.assign({}, option);
      delete optionData.default;
      return optionData;
    });
  }

  if (Array.isArray(data.components)) {
    data.components = data.components.map(cloneComponentForSelectReset);
  }

  return data;
}
async function resetPanelSelectMenu(interaction) {
  const message = interaction === null || interaction === void 0 ? void 0 : interaction.message;
  if (!message || typeof message.edit !== "function") {
    return;
  }
  const components = (message.components || []).map(
    cloneComponentForSelectReset,
  );
  if (!components.length) {
    return;
  }
  await message.edit({ components }).catch(() => null);
}
function buildDmCopyFromCartMessage(messageData) {
  const components = (messageData.components || [])
    .map((row) => {
      const rowComponents = (row.components || []).filter(
        (component) =>
          component &&
          (component.style === discord_js_1.ButtonStyle.Link || component.url),
      );
      return Object.assign(Object.assign({}, row), {
        components: rowComponents,
      });
    })
    .filter((row) => (row.components || []).length);

  return Object.assign(Object.assign({}, messageData), { components });
}
const sendSharedPurchaseDm = (client, userId, messageData) =>
  __awaiter(void 0, void 0, void 0, function* () {
    const user = yield client.users.fetch(userId).catch(() => null);
    if (!user) {
      return false;
    }

    yield user.send(buildDmCopyFromCartMessage(messageData)).catch(() => null);
    return true;
  });
exports.sendSharedPurchaseDm = sendSharedPurchaseDm;
function scheduleSharedCartThreadDeletion(
  channel,
  delayMs = SHARED_CART_THREAD_CLOSE_DELAY_MS,
) {
  if (!channel || !channel.isThread()) {
    return;
  }

  setTimeout(() => {
    channel.delete().catch(() => {});
  }, delayMs);
}
exports.scheduleSharedCartThreadDeletion = scheduleSharedCartThreadDeletion;
new fast_discord_js_1.InteractionHandler({
  customId: "buy-product",
  run: (client, interaction, storeId, product_id) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a, _b, _c;
      try {
        yield interaction.deferReply({ flags: 64 });
        if (interaction.isAnySelectMenu()) {
          yield resetPanelSelectMenu(interaction);
        }
        yield interaction.editReply({
          content: `\<a:carregandoauto:1474402230961438986>\ Processando sua compra...`,
        });
        const storeConfig = yield databases_1.default.stores.findOne({
          _id: storeId,
        });
        if (!storeConfig) {
          throw new Error(
            "Loja não encontrada. Por favor, contate o administrador do servidor.",
          );
        }
        const ownerStoreConfig = yield (0, functions_1.findStoreOwnerSettings)(
          databases_1.default,
          storeConfig,
        );
        if (!ownerStoreConfig) {
          throw new Error(
            "Configuração do dono da loja não encontrada. Por favor, contate o administrador do servidor.",
          );
        }

        const selectedGateway =
          ownerStoreConfig.payment_gateway ||
          functions_1.PAYMENT_GATEWAYS.MANUAL;
        const gatewayErrors = (0, functions_1.validateSelectedPaymentGateway)(
          ownerStoreConfig,
          selectedGateway,
        );

        if (gatewayErrors.length) {
          throw new Error(
            `O dono da loja não configurou corretamente o gateway ${(0,
            functions_1.getPaymentGatewayLabel)(
              selectedGateway,
            )}. ${gatewayErrors[0]}`,
          );
        }

        if (!product_id) {
          throw new Error(
            "Produto não foi passado por parametro na interação do botão",
          );
        }
        const product = yield databases_1.default.products.findById(product_id);
        if (!product) {
          throw new Error("Produto não existe mais no banco de dados.");
        }
        const isManagedService = (0, functions_1.isManagedServiceProduct)(product);
        const availableTiers = (0, functions_1.getConfiguredTierKeys)(product);
        if (isManagedService && !availableTiers.length) {
          throw new Error(
            "Este produto ainda não possui formas de entrega configuradas. Por favor, contate o administrador do servidor.",
          );
        }
        const productHasRelease = product.currentReleaseVersion;
        if (!isManagedService && !productHasRelease) {
          throw new Error(
            "Este produto não possui uma versão de release definida. Por favor, contate o administrador do servidor.",
          );
        }
        const productInStore =
          product.storeId.toString() === storeConfig._id.toString();
        if (!productInStore) {
          throw new Error(
            "Este produto não pertence a loja selecionada. Por favor, contate o administrador do servidor.",
          );
        }
        if (
          !isManagedService &&
          (!product.prices ||
            (!product.prices.weekly &&
              !product.prices.biweekly &&
              !product.prices.monthly &&
              !product.prices.lifetime))
        ) {
          throw new Error(
            "Este produto não possui preços definidos. Por favor, contate o administrador do servidor.",
          );
        }
        if (!isManagedService) {
          yield (0, functions_1.assertStoreHasAvailableMemory)(
            databases_1.default,
            storeConfig,
          );
        }
        if (
          ((_a = interaction.channel) === null || _a === void 0
            ? void 0
            : _a.type) !== discord_js_1.ChannelType.GuildText
        ) {
          throw new Error("Canal não encontrado para criar o thread.");
        }
        const existOpenedCart = yield databases_1.default.cartsBuy.findOne({
          userId: interaction.user.id,
          status: { $in: ["opened", "processing"] },
        });
        if (existOpenedCart) {
          if (
            (_b = interaction.guild) === null || _b === void 0
              ? void 0
              : _b.channels.cache.has(existOpenedCart.channelId)
          ) {
            return interaction.editReply({
              content: `> \<:certo:1474402234103238698>\・Você já possui um carrinho aberto. Por favor, finalize ou cancele o carrinho atual antes de comprar outro produto.`,
              components: [
                (0, fast_discord_js_1.CreateRow)([
                  (0, fast_discord_js_1.CreateButton)({
                    label: "Ir para o carrinho",
                    style: discord_js_1.ButtonStyle.Link,
                    url: `https://discord.com/channels/${interaction.guildId}/${existOpenedCart.channelId}`,
                    customId: "",
                  }),
                ]),
              ],
            });
          }
          existOpenedCart.status = "cancelled"; // Cancel the cart if the channel doesn't exist
          yield existOpenedCart.save();
        }
        const thread = yield interaction.channel.threads.create({
          name: `💱・bot・${interaction.user.id}`,
          type: discord_js_1.ChannelType.PrivateThread,
          invitable: false,
          reason: `Carrinho de compras do usuário ${interaction.user.tag} (${interaction.user.id})`,
        });
        if (!thread) {
          throw new Error("Não foi possível criar o thread privado.");
        }
        yield thread.members.add(interaction.user.id);
        yield databases_1.default.cartsBuy.create({
          automaticPayment: (0, functions_1.isAutomaticPaymentGateway)(
            selectedGateway,
          ),
          channelId: thread.id,
          storeId: storeConfig._id,
          userId: interaction.user.id,
          guildId:
            (_c = interaction.guild) === null || _c === void 0 ? void 0 : _c.id,
          productId: product._id,
          paymentGateway: selectedGateway,
          step: isManagedService ? "select-tier" : "select-days",
          expiresAt: new Date(
            Date.now() + exports.CART_EXPIRES_MINUTES * 60 * 1000,
          ),
        });
        const messageData = yield (0, exports.getCartMessage)(thread.id);
        yield thread.send(messageData);
        let mention = `<@${ownerStoreConfig.userId_discord}>`;
        if (storeConfig.permissions && storeConfig.permissions.length > 0) {
          const teamMembers = storeConfig.permissions
            .map((perm) => `<@${perm.userId}>`)
            .join(", ");
          mention += teamMembers;
        }
        const mentionMessage = yield thread.send(mention).catch(() => null);
        mentionMessage === null || mentionMessage === void 0
          ? void 0
          : mentionMessage.delete().catch(() => {});
        return interaction.editReply({
          content: `\<:certo:1474402234103238698>\ Carrinho criado com sucesso! Você pode continuar a compra no thread privado criado: <#${thread.id}>`,
        });
      } catch (e) {
        return interaction.editReply({
          content: `\`❌\`・${e.message}`,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "select-tier",
  run: (_client, interaction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      try {
        if (!interaction.isAnySelectMenu()) {
          return;
        }
        const cart = yield databases_1.default.cartsBuy
          .findOne({ channelId: interaction.channelId })
          .populate("productId");
        if (!cart) {
          throw new Error(
            "Carrinho não encontrado. Peça pra um administrador excluir pra você.",
          );
        }
        const product = cart.productId;
        if (!(0, functions_1.isManagedServiceProduct)(product)) {
          throw new Error("Este carrinho não utiliza seleção de plano.");
        }
        const selectedTier = (0, functions_1.normalizeDeliveryMode)(interaction.values[0], null);
        if (!selectedTier) {
          throw new Error("Plano inválido selecionado.");
        }
        const tierConfig = (0, functions_1.getProductTierConfig)(
          product,
          selectedTier,
        );
        if (!(tierConfig === null || tierConfig === void 0 ? void 0 : tierConfig.enabled)) {
          throw new Error("Esse plano não está disponível no momento.");
        }
        if (
          !(0, functions_1.getTierDurationOptions)(product, selectedTier).length
        ) {
          throw new Error(
            "Esse plano não possui valores configurados no momento.",
          );
        }
        cart.selectedTier = selectedTier;
        cart.step = "select-days";
        yield cart.save();
        const messageData = yield (0, exports.getCartMessage)(cart.channelId);
        yield interaction.update(messageData);
      } catch (error) {
        return interaction.reply({
          content: `\`❌\`・${error.message}`,
          flags: 64,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "select-days",
  run: (client, interaction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      try {
        if (!interaction.isAnySelectMenu()) {
          return;
        }
        const cart = yield databases_1.default.cartsBuy
          .findOne({ channelId: interaction.channelId })
          .populate("productId");
        if (!cart) {
          throw new Error(
            "Carrinho não encontrado. Peça pra um administrador excluir pra você.",
          );
        }
        const product = cart.productId;
        const selectedTier = (0, functions_1.normalizeDeliveryMode)(cart.selectedTier);
        const priceTable = (0, functions_1.getProductPriceTable)(
          product,
          selectedTier,
        );
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
        const selectedDays = interaction.values[0];
        let price = 0;
        switch (selectedDays) {
          case "monthly":
            if (!priceTable.monthly)
              throw new Error("Preço mensal não definido para este produto.");
            price = priceTable.monthly;
            cart.days = 30;
            break;
          case "biweekly":
            if (!priceTable.biweekly)
              throw new Error(
                "Preço quinzenal não definido para este produto.",
              );
            price = priceTable.biweekly;
            cart.days = 15;
            break;
          case "weekly":
            if (!priceTable.weekly)
              throw new Error("Preço semanal não definido para este produto.");
            price = priceTable.weekly;
            cart.days = 7;
            break;
          case "lifetime":
            if (!priceTable.lifetime)
              throw new Error(
                "Preço vitalício não definido para este produto.",
              );
            price = priceTable.lifetime;
            cart.lifetime = true;
            break;
          default:
            throw new Error("Opção de dias inválida selecionada.");
        }
        cart.price = price;
        cart.step = "select-coupons";
        yield cart.save();
        const messageData = yield (0, exports.getCartMessage)(cart.channelId);
        yield interaction.update(messageData);
      } catch (e) {
        return interaction.reply({
          content: `\`❌\`・${e.message}`,
          flags: 64,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "cupom-step",
  run: (client, interaction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      try {
        if (!interaction.isButton()) {
          return;
        }
        const cart = yield databases_1.default.cartsBuy.findOne({
          channelId: interaction.channelId,
        });
        if (!cart) {
          throw new Error(
            "Carrinho não encontrado. Peça pra um administrador excluir pra você.",
          );
        }
        cart.step = "select-coupons";
        yield cart.save();
        const messageData = yield (0, exports.getCartMessage)(cart.channelId);
        yield interaction.update(messageData);
      } catch (e) {
        return interaction.reply({
          content: `\`❌\`・${e.message}`,
          flags: 64,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "cancel-cart",
  run: (_client, interaction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      try {
        yield interaction.deferReply({ flags: 64 });
        const cart = yield databases_1.default.cartsBuy.findOne({
          channelId: interaction.channelId,
        });
        if (!cart) {
          throw new Error(
            "Carrinho não encontrado. Peça pra um administrador excluir pra você.",
          );
        }
        if (cart.status !== "opened") {
          throw new Error(
            "Você só pode cancelar carrinhos que estão abertos. Peça pra um administrador excluir o carrinho.",
          );
        }
        const storeConfig = yield databases_1.default.stores.findById(
          cart.storeId,
        );
        if (storeConfig) {
          const ownerStoreConfig = yield (0,
          functions_1.findStoreOwnerSettings)(databases_1.default, storeConfig);
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
        yield databases_1.default.cartsBuy.updateOne(
          { channelId: interaction.channelId },
          { status: "cancelled", paymentStatus: "cancelled" },
        );
        yield interaction.editReply({
          content:
            "<:certo:1474402234103238698> Seu carrinho será excluido em 3 segundos.",
        });
        setInterval(
          () =>
            __awaiter(void 0, void 0, void 0, function* () {
              var _a;
              (_a = interaction.channel) === null || _a === void 0
                ? void 0
                : _a.delete().catch(() => {});
            }),
          3000,
        );
      } catch (error) {
        yield interaction.editReply({ content: `\`❌\`・${error.message}` });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "update-cart",
  run: (client, interaction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      try {
        if (!interaction.isButton()) {
          return;
        }
        const cart = yield databases_1.default.cartsBuy.findOne({
          channelId: interaction.channelId,
        });
        if (!cart) {
          throw new Error(
            "Carrinho não encontrado. Peça pra um administrador excluir pra você.",
          );
        }
        const messageData = yield (0, exports.getCartMessage)(cart.channelId);
        yield interaction.update(messageData);
      } catch (error) {
        yield interaction.reply({ content: `\`❌\`・${error.message}` });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "add-coupon",
  run: (client, interaction, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a, _b;
      const cart = yield databases_1.default.cartsBuy.findOne({
        channelId: interaction.channelId,
      });
      if (!cart) {
        return interaction.reply({
          content:
            "`❌`・Carrinho não encontrado. Peça pra um administrador excluir pra você.",
          flags: 64,
        });
      }
      if (action === "show-modal" && interaction.isButton()) {
        try {
          const modal = (0, fast_discord_js_1.CreateModal)({
            customId: "add-coupon:submit-modal",
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
            content: `\`❌\`・${e.message}`,
            flags: 64,
          });
        }
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        try {
          const couponCode =
            interaction.fields.getTextInputValue("coupon-code");
          if (!couponCode) {
            throw new Error("Você precisa fornecer um código de cupom.");
          }
          const coupon = yield databases_1.default.coupons.findOne({
            code: couponCode,
          });
          if (!coupon) {
            throw new Error("Cupom inválido ou não encontrado.");
          }
          if (coupon.remainingUses <= 0) {
            throw new Error("Este cupom não possui mais usos disponíveis.");
          }
          if (coupon.expiresAt && coupon.expiresAt < new Date()) {
            throw new Error("Este cupom expirou.");
          }
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
          if (coupon.products) {
            if (
              !coupon.products.includes(cart.productId.toString()) &&
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
          const messageData = yield (0, exports.getCartMessage)(cart.channelId);
          yield (_b = interaction.message) === null || _b === void 0
            ? void 0
            : _b.edit(messageData);
          return interaction.reply({
            content: "<:certo:1474402234103238698> Cupom aplicado com sucesso!",
            flags: 64,
          });
        } catch (e) {
          return interaction.reply({
            content: `\`❌\`・${e.message}`,
            flags: 64,
          });
        }
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "go-payment",
  run: (client, interaction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      let cartForRecovery = null;
      try {
        if (!interaction.isButton()) {
          return;
        }
        yield interaction.update({
          embeds: [
            new discord_js_1.EmbedBuilder()
              .setTitle(
                "<a:carregandoauto:1474402230961438986> Gerando pagamento...",
              )
              .setColor(0x5865f2),
          ],
          components: [],
        });
        const cart = yield databases_1.default.cartsBuy
          .findOne({ channelId: interaction.channelId })
          .populate("productId")
          .populate("coupon")
          .populate("storeId");
        cartForRecovery = cart;
        if (!cart) {
          throw new Error(
            "Carrinho não encontrado. Peça pra um administrador excluir pra você.",
          );
        }
        const storeConfig = cart.storeId;
        if (!storeConfig) {
          throw new Error(
            "Loja não encontrada. Por favor, contate o administrador do servidor.",
          );
        }
        const product = cart.productId;
        if (!product) {
          throw new Error(
            "Produto não encontrado. Por favor, contate o administrador do servidor.",
          );
        }
        const storeOwnerDatabase = yield (0,
        functions_1.findStoreOwnerSettings)(databases_1.default, storeConfig);
        if (!storeOwnerDatabase) {
          throw new Error(
            "Configuração do dono da loja não encontrada. Por favor, contate o administrador do servidor.",
          );
        }
        const coupon = cart.coupon ? cart.coupon : null;
        const coupomDiscount =
          (cart.coupon
            ? coupon === null || coupon === void 0
              ? void 0
              : coupon.discount
            : 0) || 0;
        const priceWithDiscount =
          cart.price - cart.price * (coupomDiscount / 100);
        if (priceWithDiscount <= 0) {
          throw new Error(
            "O preço total da compra é inválido. Verifique os preços dos produtos e adicione um cupom válido.",
          );
        }

        const currentGateway = (0, functions_1.getCartPaymentGateway)(
          cart,
          storeOwnerDatabase,
        );
        const gatewayErrors = (0, functions_1.validateSelectedPaymentGateway)(
          storeOwnerDatabase,
          currentGateway,
        );
        if (gatewayErrors.length) {
          throw new Error(
            `O gateway ${(0, functions_1.getPaymentGatewayLabel)(
              currentGateway,
            )} está incompleto. ${gatewayErrors[0]}`,
          );
        }
        const expiresAt = new Date(
          Date.now() + exports.CART_EXPIRES_MINUTES * 60000,
        );

        if (currentGateway === functions_1.PAYMENT_GATEWAYS.MANUAL) {
          const manualCredentials =
            storeOwnerDatabase.manual_payment_credentials || {};
          const creditedAmount = Number(priceWithDiscount.toFixed(2));

          if (!manualCredentials.pix_key || !manualCredentials.key_type) {
            throw new Error(
              "O dono da loja não configurou corretamente o pagamento manual.",
            );
          }

          cart.step = "waiting-payment";
          cart.paymentGateway = currentGateway;
          cart.paymentStatus = "manual_pending";
          cart.finalPrice = (0, functions_1.calculateManualGatewayAmount)(
            priceWithDiscount,
          );
          cart.creditedAmount = creditedAmount;
          cart.pix_qrcode = null;
          cart.pix_copy_and_paste = manualCredentials.pix_key;
          cart.paymentId = null;
          cart.paymentMetadata = {
            payment_mode: "manual_pix",
            key_type: manualCredentials.key_type,
            base_amount: creditedAmount,
            charged_amount: creditedAmount,
          };
          cart.expiresAt = expiresAt;
        } else {
          const creditedAmount = Number(priceWithDiscount.toFixed(2));
          const automaticAmount = (0,
          functions_1.calculateAutomaticGatewayAmount)(priceWithDiscount);
          const payment = yield (0, functions_1.createAutomaticPixPayment)({
            gateway: currentGateway,
            scope: "buy",
            cartId: cart._id.toString(),
            storeId: storeConfig._id.toString(),
            userId: cart.userId,
            ownerDiscordUserId: storeOwnerDatabase.userId_discord,
            amount: automaticAmount,
            baseAmount: creditedAmount,
            expirationDate: expiresAt,
            description: `Compra do produto ${product.name}`,
            metadata: {
              product_id: product._id.toString(),
              coupon_id: coupon ? coupon._id.toString() : null,
            },
          });

          cart.step = "waiting-payment";
          cart.paymentGateway = currentGateway;
          cart.paymentStatus = payment.paymentStatus;
          cart.finalPrice = automaticAmount;
          cart.creditedAmount = creditedAmount;
          cart.pix_qrcode = payment.pixQrCode;
          cart.pix_copy_and_paste = payment.pixCopyAndPaste;
          cart.paymentId = payment.paymentId;
          cart.paymentMetadata = payment.paymentMetadata || {};
          cart.expiresAt = expiresAt;
        }

        yield cart.save();
        const messageData = yield (0, exports.getCartMessage)(cart.channelId);
        yield interaction.editReply(messageData);
        yield interaction.followUp({
          content: `<:certo:1474402234103238698> Pagamento gerado com sucesso via ${(0, functions_1.getPaymentGatewayLabel)(currentGateway)}!`,
          flags: 64,
        });
      } catch (e) {
        console.error("Erro ao gerar pagamento do carrinho:", {
          channelId: interaction.channelId,
          userId: interaction.user.id,
          message: e === null || e === void 0 ? void 0 : e.message,
          stack: e === null || e === void 0 ? void 0 : e.stack,
        });
        if (cartForRecovery) {
          const messageData = yield (0, exports.getCartMessage)(
            cartForRecovery.channelId,
          ).catch(() => null);
          if (messageData) {
            yield interaction.editReply(messageData).catch(() => null);
            return interaction.followUp({
              content: `\`❌\`・${e.message}`,
              flags: 64,
            });
          }
        }
        return interaction.editReply({ content: `\`❌\`・${e.message}` });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "send-bot",
  run: (client, interaction, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a, _b;
      const cart = yield databases_1.default.cartsBuy
        .findOne({ channelId: interaction.channelId })
        .populate("productId")
        .populate("storeId");
      if (!cart) {
        return interaction.reply({
          content:
            "`❌`・Carrinho não encontrado. Peça pra um administrador excluir pra você.",
          flags: 64,
        });
      }
      if (cart.status !== "opened") {
        return interaction.reply({
          content:
            "`❌`・Você só pode enviar o bot quando o carrinho estiver aberto.",
          flags: 64,
        });
      }
      if (cart.step !== "payment-confirmed") {
        return interaction.reply({
          content:
            "`❌`・Você só pode enviar o bot quando o pagamento estiver confirmado. Peça pra um administrador excluir o carrinho.",
          flags: 64,
        });
      }
      const product = cart.productId;
      if (!product) {
        return interaction.reply({
          content:
            "`❌`・Produto não encontrado. Peça pra um administrador excluir o carrinho.",
          flags: 64,
        });
      }
      const storeConfig = cart.storeId;
      if (!storeConfig) {
        return interaction.reply({
          content:
            "`❌`・Loja não encontrada. Peça pra um administrador excluir o carrinho.",
          flags: 64,
        });
      }
      const ownerStoreConfig = yield (0, functions_1.findStoreOwnerSettings)(
        databases_1.default,
        storeConfig,
      );
      if (!ownerStoreConfig) {
        return interaction.reply({
          content:
            "`❌`・Configuração do dono da loja não encontrada. Peça pra um administrador excluir o carrinho.",
          flags: 64,
        });
      }
      if (action === "show-modal" && interaction.isButton()) {
        if (cart.selectedTier === functions_1.PRODUCT_DELIVERY_MODES.SHARED) {
          return interaction.reply({
            content:
              "`❌`・Esse formato de entrega não pede token do bot. Use a key enviada após o pagamento no `/resgatar-key` do bot convidado.",
            flags: 64,
          });
        }
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: "send-bot:submit-modal",
          title: "Enviar Bot",
          inputs: [
            {
              customId: "bot-name",
              label: "Nome do Bot",
              style: discord_js_1.TextInputStyle.Short,
              required: true,
              placeholder: "Digite o nome do bot",
            },
            {
              customId: "bot-token",
              label: "Token do Bot",
              style: discord_js_1.TextInputStyle.Short,
              required: true,
              placeholder: "Digite o token do bot",
            },
          ],
        });
        yield interaction.showModal(modal);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        let application;
        let uploadedApplication;
        const cart = yield databases_1.default.cartsBuy
          .findOne({ channelId: interaction.channelId })
          .populate("storeId");
        if (!cart) {
          return interaction.reply({
            content:
              "`❌`・Carrinho não encontrado. Peça pra um administrador excluir pra você.",
            flags: 64,
          });
        }
        const storeConfig = cart.storeId;
        if (!storeConfig) {
          return interaction.reply({
            content:
              "`❌`・Loja não encontrada. Por favor, contate o administrador do servidor.",
            flags: 64,
          });
        }
        try {
          const botToken = interaction.fields.getTextInputValue("bot-token");
          const botName = interaction.fields.getTextInputValue("bot-name");
          if (!botToken || !botName) {
            return interaction.editReply({
              content: "`❌`・Você precisa fornecer o nome e o token do bot.",
            });
          }
          if (botName.length > 25) {
            return interaction.editReply({
              content:
                "`❌`・O nome do bot não pode ter mais que 25 caracteres.",
            });
          }
          const hostCapacity = yield (0, functions_1.assertStoreHasAvailableMemory)(
            databases_1.default,
            storeConfig,
          ).catch(() => null);
          if (!hostCapacity) {
            throw new Error(
              "O dono da loja não possui memória RAM suficiente no host para adicionar novos bots.",
            );
          }
          cart.status = "processing";
          yield cart.save();
          yield interaction.deferReply({ flags: 64 });
          const botInfo = yield axios_1.default
            .get(`https://discord.com/api/v10/applications/@me`, {
              headers: {
                contentType: "application/json",
                Authorization: `Bot ${botToken}`,
              },
            })
            .catch(() => null);
          if (!botInfo || !botInfo.data) {
            return interaction.editReply({
              content:
                "`❌`・O token fornecido não é válido ou não corresponde a um bot existente.",
            });
          }
          application = yield databases_1.default.applications.create({
            storeId: storeConfig._id,
            productId: product._id,
            name: botName,
            ownerId: interaction.user.id,
            botId: botInfo.data.id,
            token: botToken,
            hostProvider: (0, functions_1.getStoreHostProvider)(storeConfig),
            deliveryMode: functions_1.PRODUCT_DELIVERY_MODES.PRIVATE,
            expiresAt: cart.lifetime
              ? null
              : new Date(Date.now() + cart.days * 24 * 60 * 60 * 1000),
            version: product.currentReleaseVersion,
            lifetime: cart.lifetime || false,
          });
          const releaseBuffer = (0, functions_1.isManagedServiceProduct)(product)
            ? yield (0, functions_1.readManagedServiceReleaseBuffer)(product)
            : new adm_zip_1.default(
                `releases/${product._id}/${product.currentReleaseVersion}.zip`,
              ).toBuffer();
          const extraEnvironmentVariables =
            (0, functions_1.isManagedServiceProduct)(product)
              ? (0, functions_1.buildDedicatedBotEnvironmentVariables)({
                  botToken,
                  ownerId: interaction.user.id,
                  applicationId: application._id.toString(),
                  mongoUri:
                    process.env.DEDICATED_BOT_MONGO_URI ||
                    process.env.MONGO_DB_URL,
                  bridgeMongoUri:
                    process.env.LICENSE_BRIDGE_MONGO_URI ||
                    process.env.MONGO_DB_URL,
                })
              : [];
          uploadedApplication = yield (0, functions_1.createManagedApplication)(
            databases_1.default,
            {
              store: storeConfig,
              product,
              appName: `${product.name}・${cart.userId}`,
              botToken,
              ownerId: interaction.user.id,
              applicationId: application._id.toString(),
              tier: functions_1.PRODUCT_DELIVERY_MODES.PRIVATE,
              extraEnvironmentVariables,
              file: releaseBuffer,
            },
          );
          application.appId = uploadedApplication.id;
          application.hostProvider =
            application.hostProvider ||
            (0, functions_1.getStoreHostProvider)(storeConfig);
          yield application.save();
          yield (0, functions_1.upsertApplicationEntitlement)(application, {
            product,
          }).catch(() => null);
          cart.status = "closed";
          cart.delivered = true;
          yield cart.save();
          const notifyContent = [
            `# Bot enviado com sucesso! 🎉`,
            `- Olá <@${interaction.user.id}>, seu bot foi enviado com sucesso!\n`,
            `> Você pode ver mais detalhes usando o comando /apps na loja ${storeConfig.name}.\n`,
            `-# ${product.name} - ID ${application._id}`,
          ];
          (0, notify_wrapper_1.notifyUser)({
            userId: interaction.user.id,
            message: notifyContent.join("\n"),
          });
          yield interaction.editReply({
            content:
              "<:certo:1474402234103238698> Bot enviado com sucesso! Você pode ver mais detalhes usando o comando /apps. Esse carrinho será fechado em 5 segundos",
          });
          setTimeout(() => {
            var _a;
            (_a = interaction.channel) === null || _a === void 0
              ? void 0
              : _a.delete().catch(() => {});
          }, 5000);
        } catch (e) {
          if (application) {
            yield databases_1.default.applications.deleteOne({
              _id: application._id,
            });
          }
          if (uploadedApplication) {
            const host = yield (0, functions_1.getHostAdapterForStore)(
              databases_1.default,
              storeConfig,
            ).catch(() => null);
            if (host) {
              yield host.adapter
                .deleteApplication(uploadedApplication.id)
                .catch(() => {});
            }
          }
          console.log(e);
          cart.status = "cancelled";
          yield cart.save();
          return interaction.editReply({
            content: `\`❌\`・${((_b = (_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || (e === null || e === void 0 ? void 0 : e.message)}`,
          });
        }
      }
    }),
});
const getCartMessage = (channelId) =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const cart = yield databases_1.default.cartsBuy
      .findOne({ channelId })
      .populate("productId")
      .populate("coupon")
      .populate("storeId");
    if (!cart)
      return {
        embeds: [],
        content: "Carrinho não encontrado.",
        components: [],
      };
    const product = cart.productId;
    const coupon = cart.coupon ? cart.coupon : null;
    const coupomDiscount =
      (cart.coupon
        ? coupon === null || coupon === void 0
          ? void 0
          : coupon.discount
        : 0) || 0;
    const storeConfig = cart.storeId;
    if (!storeConfig) {
      throw new Error(
        "Loja não encontrada. Por favor, contate o administrador do servidor.",
      );
    }
    const components = [];
    const expiresTimestamp = Math.floor(cart.expiresAt.getTime() / 1000);
    const selectedTier = (0, functions_1.normalizeDeliveryMode)(cart.selectedTier);
    const selectedTierLabel =
      TIER_LABELS[selectedTier] || "Bot privado só seu";
    if (cart.step === "select-tier") {
      const tierOptions = (0, functions_1.getConfiguredTierKeys)(product).map(
        (tier) => ({
          label:
            tier === functions_1.PRODUCT_DELIVERY_MODES.SHARED
              ? "Bot pronto no servidor"
              : "Bot privado só seu",
          value: tier,
          description:
            tier === functions_1.PRODUCT_DELIVERY_MODES.SHARED
              ? "O cliente convida o bot e ativa uma key em 1 servidor"
              : "O manager entrega um bot separado só para esse cliente",
          emoji:
            tier === functions_1.PRODUCT_DELIVERY_MODES.SHARED ? "🌐" : "🤖",
        }),
      );
      const embed = new discord_js_1.EmbedBuilder()
        .setTitle("<:cart:1473839280559358023> Sistema de Compras")
        .setDescription(
          `Olá <@${cart.userId}>, você está comprando o produto **${product.name}**.\nEscolha primeiro qual plano deseja adquirir.`,
        )
        .addFields({
          name: "<:relogio:1474086586642600020> Expiração",
          value: `<t:${expiresTimestamp}:R>`,
          inline: false,
        })
        .setTimestamp();
      components.push(
        (0, fast_discord_js_1.CreateRow)([
          new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
            customId: "select-tier",
            placeholder: "Selecione o plano",
            options: tierOptions,
          }),
        ]),
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Cancelar carrinho",
            style: discord_js_1.ButtonStyle.Danger,
            customId: "cancel-cart",
            emoji: functions_1.emojis.cancel,
          }),
        ]),
      );
      return { embeds: [embed], components };
    }
    if (cart.step === "select-days") {
      const priceTable = (0, functions_1.getProductPriceTable)(
        product,
        selectedTier,
      );
      const embed = new discord_js_1.EmbedBuilder()
        .setTitle("<:cart:1473839280559358023> Sistema de Compras")
        .setDescription(
          `Olá <@${cart.userId}>, você está comprando o produto **${product.name}**${(0, functions_1.isManagedServiceProduct)(product) ? ` em **${selectedTierLabel}**` : ""}.\nSelecione por quantos dias deseja adquirir o produto.`,
        )
        .addFields({
          name: "<:relogio:1474086586642600020> Expiração",
          value: `<t:${expiresTimestamp}:R>`,
          inline: false,
        })
        .setTimestamp();
      const selectDaysOptions = [];
      if (
        (_a = priceTable) === null || _a === void 0 ? void 0 : _a.monthly
      ) {
        selectDaysOptions.push({
          label: "Mensal・30 dias",
          value: "monthly",
          description: `R$ ${priceTable.monthly.toFixed(2)}`,
          emoji: "📆",
        });
      }
      if (
        (_b = priceTable) === null || _b === void 0 ? void 0 : _b.biweekly
      ) {
        selectDaysOptions.push({
          label: "Quinzenal・15 dias",
          value: "biweekly",
          description: `R$ ${priceTable.biweekly.toFixed(2)}`,
          emoji: "📅",
        });
      }
      if (
        (_c = priceTable) === null || _c === void 0 ? void 0 : _c.weekly
      ) {
        selectDaysOptions.push({
          label: "Semanal・7 dias",
          value: "weekly",
          description: `R$ ${priceTable.weekly.toFixed(2)}`,
          emoji: "📅",
        });
      }
      if (
        (_d = priceTable) === null || _d === void 0 ? void 0 : _d.lifetime
      ) {
        selectDaysOptions.push({
          label: "Vitalício",
          value: "lifetime",
          description: `R$ ${priceTable.lifetime.toFixed(2)}`,
          emoji: "♾️",
        });
      }
      components.push(
        (0, fast_discord_js_1.CreateRow)([
          new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
            customId: "select-days",
            placeholder: "Selecione os dias",
            options: selectDaysOptions,
          }),
        ]),
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Cancelar carrinho",
            style: discord_js_1.ButtonStyle.Danger,
            customId: "cancel-cart",
            emoji: functions_1.emojis.cancel,
          }),
        ]),
      );
      return { embeds: [embed], components };
    }
    if (cart.step === "select-coupons") {
      const priceWithDiscount =
        cart.price - cart.price * (coupomDiscount / 100);
      const embed = new discord_js_1.EmbedBuilder()
        .setTitle("<:cart:1473839280559358023> Sistema de Compras")
        .setDescription(
          `Olá <@${cart.userId}>, você está comprando o produto **${product.name}**${(0, functions_1.isManagedServiceProduct)(product) ? ` em **${selectedTierLabel}**` : ""}.`,
        )
        .setTimestamp();
      if (coupon) {
        embed.addFields(
          {
            name: "<:dinheiro:1474087684300341551> Preço com desconto",
            value: `R$ ${priceWithDiscount.toFixed(2)}`,
            inline: true,
          },
          {
            name: "<:Cupons:1474087080647983124> Cupom aplicado",
            value: `**${coupon.code}** (${coupomDiscount}%)`,
            inline: true,
          },
          {
            name: "<:cart:1473839280559358023> Desconto",
            value: `R$ ${(cart.price * (coupomDiscount / 100)).toFixed(2)}`,
            inline: true,
          },
        );
      } else {
        embed.addFields(
          {
            name: "<:dinheiro:1474087684300341551> Preço total",
            value: `R$ ${priceWithDiscount.toFixed(2)}`,
            inline: true,
          },
          {
            name: "<:Cupons:1474087080647983124> Cupom",
            value: "Nenhum cupom aplicado",
            inline: true,
          },
        );
      }
      embed.addFields({
        name: "<:relogio:1474086586642600020> Expiração",
        value: `<t:${expiresTimestamp}:R>`,
        inline: false,
      });
      components.push(
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Ir para o pagamento",
            style: discord_js_1.ButtonStyle.Success,
            customId: "go-payment",
            emoji: functions_1.emojis.cart,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Adicionar cupom",
            style: discord_js_1.ButtonStyle.Primary,
            customId: "add-coupon:show-modal",
            emoji: functions_1.emojis.cupom,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Cancelar carrinho",
            style: discord_js_1.ButtonStyle.Danger,
            customId: "cancel-cart",
            emoji: functions_1.emojis.cancel,
          }),
        ]),
      );
      return { embeds: [embed], components };
    }
    if (cart.step === "waiting-payment") {
      const priceWithDiscount =
        cart.price - cart.price * (coupomDiscount / 100);
      const ownerStoreConfig = yield (0, functions_1.findStoreOwnerSettings)(
        databases_1.default,
        storeConfig,
      );
      if (!ownerStoreConfig) {
        throw new Error(
          "Configuração do dono da loja não encontrada. Por favor, contate o administrador do servidor.",
        );
      }

      const paymentSummary = (0, functions_1.buildCartPaymentSummary)(
        cart,
        ownerStoreConfig,
      );
      const paymentAmount =
        paymentSummary.paymentAmount || Number(priceWithDiscount.toFixed(2));
      const isManualGateway = paymentSummary.isManual;
      const isPixPayment =
        paymentSummary.paymentMode === "manual_pix" ||
        paymentSummary.paymentMode === "pix";
      const isCardCheckout = paymentSummary.paymentMode === "transparent_card";
      const embed = new discord_js_1.EmbedBuilder()
        .setTitle("<:cart:1473839280559358023> Sistema de Compras")
        .setDescription(
          isManualGateway
            ? `Olá <@${cart.userId}>, você está comprando o produto **${product.name}**.\nUse a chave PIX abaixo e aguarde a aprovação manual do pagamento.`
            : isCardCheckout
              ? `Olá <@${cart.userId}>, você está comprando o produto **${product.name}**.\nO pagamento por cartão foi enviado ao checkout transparente do Mercado Pago. Aguarde a confirmação.`
              : `Olá <@${cart.userId}>, você está comprando o produto **${product.name}**.`,
        )
        .addFields(
          {
            name: "<:dinheiro:1474087684300341551> Valor base",
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
            value: `R$ ${paymentAmount.toFixed(2)}`,
            inline: true,
          },
          {
            name: "<:pix_StorM:1473664077703417959> Status",
            value: "**Aguardando pagamento**",
            inline: true,
          },
          {
            name: "<:relogio:1474086586642600020> Expiração",
            value: `<t:${expiresTimestamp}:R>`,
            inline: false,
          },
        )
        .setTimestamp();

      if (!isManualGateway && cart.pix_qrcode) {
        embed.setImage("attachment://payment.png");
      }
      const waitingPaymentButtons = [];
      if (isPixPayment) {
        waitingPaymentButtons.push(
          (0, fast_discord_js_1.CreateButton)({
            label: isManualGateway ? "Ver chave PIX" : "PIX Copia e Cola",
            style: discord_js_1.ButtonStyle.Primary,
            customId: "pix-copy-and-paste",
            emoji: functions_1.emojis.copy,
          }),
        );
      }
      waitingPaymentButtons.push(
        (0, fast_discord_js_1.CreateButton)({
          label: "Cancelar carrinho",
          style: discord_js_1.ButtonStyle.Danger,
          customId: "cancel-cart",
          emoji: functions_1.emojis.cancel,
        }),
        (0, fast_discord_js_1.CreateButton)({
          label: "Atualizar",
          style: discord_js_1.ButtonStyle.Secondary,
          customId: "update-cart",
          emoji: functions_1.emojis.reload,
        }),
      );
      components.push((0, fast_discord_js_1.CreateRow)(waitingPaymentButtons));

      if (!isManualGateway && cart.pix_qrcode) {
        const bufferBase64 = Buffer.from(cart.pix_qrcode, "base64");
        const attachment = new discord_js_1.AttachmentBuilder(bufferBase64, {
          name: "payment.png",
        });
        return { embeds: [embed], components, files: [attachment] };
      }

      return { embeds: [embed], components };
    }
    if (cart.step === "payment-confirmed") {
      if (selectedTier === functions_1.PRODUCT_DELIVERY_MODES.SHARED) {
        const fulfillment = yield (0, functions_1.ensureSharedCartEntitlement)(
          databases_1.default,
          cart,
        );
        const instructions = (0, functions_1.buildSharedPurchaseInstructions)({
          userId: cart.userId,
          inviteUrl:
            (fulfillment === null || fulfillment === void 0 ? void 0 : fulfillment.inviteUrl) ||
            cart.sharedInviteUrl,
          claimKey:
            fulfillment === null || fulfillment === void 0
              ? void 0
              : fulfillment.claimKey,
          claimKeyLast4:
            (fulfillment === null || fulfillment === void 0
              ? void 0
              : fulfillment.entitlement.claimKeyLast4) ||
            cart.sharedClaimKeyLast4,
        });
        const embed = new discord_js_1.EmbedBuilder()
          .setTitle("🎉 Pagamento confirmado!")
          .setDescription(instructions)
          .addFields(
            {
              name: "🧭 Próximo passo",
              value:
                "Convide o bot no servidor alvo, abra `/resgatar-key` e conclua a ativacao no mesmo fluxo.",
              inline: false,
            },
            {
              name: "🔒 Regra",
              value: "Cada key pode ser usada em apenas 1 servidor.",
              inline: false,
            },
          )
          .setColor(0x57f287)
          .setTimestamp();
        const sharedButtons = [];
        if (
          (fulfillment === null || fulfillment === void 0
            ? void 0
            : fulfillment.inviteUrl) ||
          cart.sharedInviteUrl
        ) {
          sharedButtons.push(
            (0, fast_discord_js_1.CreateButton)({
              label: "Convidar bot",
              style: discord_js_1.ButtonStyle.Link,
              url:
                (fulfillment === null || fulfillment === void 0
                  ? void 0
                  : fulfillment.inviteUrl) || cart.sharedInviteUrl,
              customId: "",
              emoji: functions_1.emojis.user,
            }),
          );
        }
        sharedButtons.push(
          (0, fast_discord_js_1.CreateButton)({
            label: "Atualizar",
            style: discord_js_1.ButtonStyle.Secondary,
            customId: "update-cart",
            emoji: functions_1.emojis.reload,
          }),
        );
        components.push((0, fast_discord_js_1.CreateRow)(sharedButtons));
        return { embeds: [embed], components };
      }
      const embed = new discord_js_1.EmbedBuilder()
        .setTitle("🎉 Pagamento confirmado!")
        .setDescription(
          `Olá <@${cart.userId}>, seu pagamento foi confirmado!\n\nPra finalizar a compra, envie seu BOT clicando no botão **"Enviar Bot"** abaixo.`,
        )
        .addFields(
          {
            name: "🔗 Discord Developers",
            value:
              "[Clique aqui](https://discord.com/developers/applications) para criar seu BOT e obter o token.",
            inline: false,
          },
          {
            name: "❓ Dúvidas",
            value: "Abra um ticket que ajudamos você!",
            inline: false,
          },
        )
        .setColor(0x57f287)
        .setTimestamp();
      components.push(
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Enviar Bot",
            style: discord_js_1.ButtonStyle.Success,
            customId: "send-bot:show-modal",
            emoji: functions_1.emojis.yes,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Video tutorial",
            style: discord_js_1.ButtonStyle.Link,
            url: "https://www.youtube.com/watch?v=JvuARNPwcXs",
            customId: "",
            disabled: true,
          }),
        ]),
      );
      return { embeds: [embed], components };
    }
    return {
      embeds: [],
      content: "`❌`・Etapa inválida.",
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
exports.getCartMessage = getCartMessage;
new fast_discord_js_1.InteractionHandler({
  customId: "pix-copy-and-paste",
  run: (client, interaction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      try {
        if (!interaction.isButton()) {
          return;
        }
        const cart = yield databases_1.default.cartsBuy.findOne({
          channelId: interaction.channelId,
        });
        if (!cart) {
          throw new Error(
            "Carrinho não encontrado. Peça pra um administrador excluir pra você.",
          );
        }
        if (!cart.pix_copy_and_paste) {
          throw new Error(
            "Pix Copia e Cola não encontrado. Peça pra um administrador excluir o carrinho.",
          );
        }

        const paymentGateway =
          cart.paymentGateway || functions_1.PAYMENT_GATEWAYS.MANUAL;
        const paymentMetadata = cart.paymentMetadata || {};
        const content =
          paymentGateway === functions_1.PAYMENT_GATEWAYS.MANUAL
            ? `Chave PIX (${paymentMetadata.key_type || "manual"}): ${cart.pix_copy_and_paste}`
            : `${cart.pix_copy_and_paste}`;

        yield interaction.reply({
          content,
          flags: 64,
        });
      } catch (e) {
        return interaction.reply({
          content: `\`❌\`・${e.message}`,
          flags: 64,
        });
      }
    }),
});
