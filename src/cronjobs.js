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
exports.renewCartsMessage = void 0;
const index_1 = __importDefault(require("./index"));
const databases_1 = __importDefault(require("./databases"));
const promises_1 = __importDefault(require("fs/promises"));
const functions_1 = require("./functions");
const buy_event_1 = require("./events/buy.event");
const extracts_1 = require("./functions/extracts");
const notify_wrapper_1 = require("./functions/notify-wrapper");
const apps_1 = require("./commands/apps");
let validPresences = [];
let currentActivity = 0;
exports.renewCartsMessage = new Map();
const GRACE_PERIOD_DAYS = 4;
const RATE_UPDATE_APPLICATION_SECONDS = 3;
function getErrorMessage(error) {
  var _a, _b, _c;
  return (
    ((_c =
      (_b =
        (_a = error === null || error === void 0 ? void 0 : error.response) ===
          null || _a === void 0
          ? void 0
          : _a.data) === null || _b === void 0
        ? void 0
        : _b.error) !== null && _c !== void 0
      ? _c
      : error === null || error === void 0
        ? void 0
        : error.message) || "Erro desconhecido"
  );
}
function isRemoteApplicationMissingError(error) {
  var _a, _b;
  const responseStatus =
    (_a = error === null || error === void 0 ? void 0 : error.response) ===
      null || _a === void 0
      ? void 0
      : _a.status;
  const errorCode =
    ((_b = error === null || error === void 0 ? void 0 : error.response) ===
      null || _b === void 0
      ? void 0
      : _b.data) || {};
  const message = String(
    errorCode.error ||
      errorCode.message ||
      (error === null || error === void 0 ? void 0 : error.message) ||
      "",
  ).toLowerCase();
  return (
    responseStatus === 404 ||
    message.includes("not found") ||
    message.includes("não encontrada") ||
    message.includes("nao encontrada") ||
    message.includes("app not found")
  );
}
(0, functions_1.asyncLoopingExec)(6000, () =>
  __awaiter(void 0, void 0, void 0, function* () {
    if (
      !(index_1.default === null || index_1.default === void 0
        ? void 0
        : index_1.default.user)
    ) {
      return;
    }
    const presencesDatabase = yield databases_1.default.globalSettings.findOne({
      key: "rich_presences",
    });
    const presences =
      (presencesDatabase === null || presencesDatabase === void 0
        ? void 0
        : presencesDatabase.value) || [];
    validPresences =
      presences === null || presences === void 0
        ? void 0
        : presences.filter((presence) => presence);
    if (
      !(validPresences === null || validPresences === void 0
        ? void 0
        : validPresences.length)
    ) {
      index_1.default.user.setPresence({});
      return;
    }
    if (currentActivity >= validPresences.length) {
      currentActivity = 0;
    }
    index_1.default.user.setActivity(validPresences[currentActivity], {
      type: 4,
    });
    currentActivity++; // Incrementa o índice para a próxima atividade
  }),
);
/**
 * Esse cronjob é responsável por verificar se os pagamentos via PIX foram concluídos.
 * Após a conclusão, ele atualiza o carrinho e notifica o usuário.
 *
 * Ele verifica a cada 5 segundos se há carrinhos abertos com o status "waiting-payment".
 * Se encontrar algum, ele consulta o status do pagamento via efiWrapper e atualiza o carrinho.
 */
(0, functions_1.asyncLoopingExec)(5000, () =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const buyCarts = yield databases_1.default.cartsBuy
      .find({
        status: "opened",
        step: "waiting-payment",
        automaticPayment: true,
      })
      .populate("storeId");
    for (const cart of buyCarts) {
      const storeConfig = cart.storeId;
      if (!storeConfig) {
        console.error(
          `\`⚠️\`・Carrinho com ID ${cart._id} não possui configuração de loja válida.`,
        );
        continue;
      }
      const storeOwnerConfig = yield (0, functions_1.findStoreOwnerSettings)(
        databases_1.default,
        storeConfig,
      );
      if (!storeOwnerConfig) {
        console.error(
          `\`⚠️\`・Configuração de loja do dono do carrinho com ID ${cart._id} não encontrada.`,
        );
        continue;
      }
      const paymentGateway = (0, functions_1.getCartPaymentGateway)(
        cart,
        storeOwnerConfig,
      );
      if (!(0, functions_1.isAutomaticPaymentGateway)(paymentGateway)) {
        continue;
      }
      const paymentStatus = yield (0, functions_1.getAutomaticPaymentStatus)({
        gateway: paymentGateway,
        ownerDiscordUserId: storeOwnerConfig.userId_discord,
        paymentId: cart.paymentId,
      }).catch(() => null);
      if (!paymentStatus) continue;
      if (paymentStatus.normalizedStatus === "approved") {
        yield databases_1.default.cartsBuy.updateOne(
          { _id: cart._id },
          {
            $set: {
              step: "payment-confirmed",
              paymentStatus: paymentStatus.rawStatus || "approved",
            },
          },
        );
        yield (0, extracts_1.changeBalance)({
          action: "add",
          amount: (0, functions_1.getCreditedAmount)(cart),
          origin: "sales",
          description: `Carrinho pago por ${cart.userId}`,
          storeId: storeConfig._id.toString(),
        });
        const customer_role =
          (_a = storeConfig.logsAndRoles) === null || _a === void 0
            ? void 0
            : _a.customerRole;
        if (customer_role) {
          const member = yield (_b = index_1.default.guilds.cache.get(
            cart.guildId,
          )) === null || _b === void 0
            ? void 0
            : _b.members.fetch(cart.userId).catch(() => null);
          member === null || member === void 0
            ? void 0
            : member.roles.add(customer_role).catch(() => null);
        }
        const messageData = yield (0, buy_event_1.getCartMessage)(
          cart.channelId,
        );
        const channel = index_1.default.channels.cache.get(cart.channelId);
        if (!channel || !messageData || !channel.isThread()) continue;
        yield channel.bulkDelete(30).catch(() => null);
        yield channel.send(messageData).catch(() => null);
        if (cart.selectedTier === functions_1.PRODUCT_DELIVERY_MODES.SHARED) {
          const dmSent = yield (0, buy_event_1.sendSharedPurchaseDm)(
            index_1.default,
            cart.userId,
            messageData,
          );
          yield channel
            .send({
              content: dmSent
                ? "`ℹ️`・As instrucoes tambem foram enviadas na DM do cliente. Este thread sera fechado em 60 segundos."
                : "`ℹ️`・Nao consegui entregar a DM do cliente. Use a mensagem acima. Este thread sera fechado em 60 segundos.",
            })
            .catch(() => null);
          (0, buy_event_1.scheduleSharedCartThreadDeletion)(channel);
        }
      }
    }
    /**
     * Esse trecho é responsável por verificar os carrinhos de renovação.
     * Após a conclusão do pagamento, ele atualiza a aplicação e notifica o usuário.
     *
     * Ele verifica a cada 5 segundos se há carrinhos de renovação abertos com o status "waiting-payment".
     * Se encontrar algum, ele consulta o status do pagamento via efiWrapper e atualiza o carrinho e a aplicação.
     */
    const renewCarts = yield databases_1.default.cartsRenew.find({
      status: "opened",
      step: "waiting-payment",
      delivered: false,
    });
    for (const cart of renewCarts) {
      const storeConfig = yield databases_1.default.stores.findOne({
        _id: cart.storeId,
      });
      if (!storeConfig) {
        console.error(
          `\`⚠️\`・Carrinho de renovação com ID ${cart._id} não possui configuração de loja válida.`,
        );
        continue;
      }
      const storeOwnerConfig = yield (0, functions_1.findStoreOwnerSettings)(
        databases_1.default,
        storeConfig,
      );
      if (!storeOwnerConfig) {
        console.error(
          `\`⚠️\`・Configuração de loja do dono do carrinho de renovação com ID ${cart._id} não encontrada.`,
        );
        continue;
      }
      const paymentGateway = (0, functions_1.getCartPaymentGateway)(
        cart,
        storeOwnerConfig,
      );
      if (!(0, functions_1.isAutomaticPaymentGateway)(paymentGateway)) {
        continue;
      }
      const paymentStatus = yield (0, functions_1.getAutomaticPaymentStatus)({
        gateway: paymentGateway,
        ownerDiscordUserId: storeOwnerConfig.userId_discord,
        paymentId: cart.paymentId,
      }).catch(() => null);
      if (!paymentStatus) continue;
      if (paymentStatus.normalizedStatus === "approved") {
        yield databases_1.default.cartsRenew.updateOne(
          { _id: cart._id },
          {
            $set: {
              step: "payment-confirmed",
              paymentStatus: paymentStatus.rawStatus || "approved",
            },
          },
        );
        yield (0, extracts_1.changeBalance)({
          action: "add",
          amount: (0, functions_1.getCreditedAmount)(cart),
          origin: "sales",
          description: `Renovação paga por ${cart.userId}`,
          storeId: storeConfig._id.toString(),
        });
        const application = yield databases_1.default.applications.findOne({
          _id: cart.applicationId,
        });
        if (!application) {
          console.error(
            `\`⚠️\`・Aplicação para o carrinho de renovação com ID ${cart._id} não encontrada.`,
          );
          continue;
        }
        /**
         * Vamos salvar o carrinho como entregue e fechado.
         */
        cart.delivered = true;
        cart.status = "closed";
        cart.step = "payment-confirmed";
        yield cart.save();
        // Vamos atualizar a mensagem do carrinho para dar um feedback de pagamento aprovado.
        const message = exports.renewCartsMessage.get(cart._id.toString());
        if (message) {
          const updatedMessageData = yield (0, apps_1.getCartMessageRenew)(
            cart._id.toString(),
          );
          if (updatedMessageData) {
            yield message
              .edit(updatedMessageData)
              .catch((error) =>
                console.warn(
                  "⚠️ Erro ao editar a mensagem do carrinho de renovação:",
                  error,
                ),
              );
          }
        }
        // Se for vitalícia, vamos atualizar a aplicação para vitalícia.
        if (cart.lifetime) {
          application.lifetime = true;
          yield application.save();
          yield (0, functions_1.syncApplicationEntitlementStatus)(
            application,
          ).catch(() => null);
          const notifyContent = [
            `# Sua aplicação foi renovada com sucesso! 🎉`,
            `Olá <@${cart.userId}>, sua aplicação **${application.name}** foi renovada com sucesso!\n`,
            `-# Agora ela é vitalícia e não expirará mais!`,
            `> Agradecemos por continuar utilizando nossos serviços!`,
          ];
          (0, notify_wrapper_1.notifyUser)({
            userId: cart.userId,
            message: notifyContent.join("\n"),
          }).catch(() => null);
        } else {
          // Se não for vitalícia, vamos adicionar os dias comprados na aplicação.
          if (!cart.days) {
            console.error(
              `\`⚠️\`・Dias inválidos para renovação na aplicação ${application._id}.`,
            );
            continue;
          }
          application.expiresAt = new Date(
            (application.expiresAt || new Date()).getTime() +
              cart.days * 24 * 60 * 60 * 1000,
          );
          application.status = "active";
          yield application.save();
          yield (0, functions_1.syncApplicationEntitlementStatus)(
            application,
          ).catch(() => null);
          const notifyContent = [
            `# Sua aplicação foi renovada com sucesso! 🎉`,
            `Olá <@${cart.userId}>, sua aplicação **${application.name}** foi renovada com sucesso!\n`,
            `-# Expira em: <t:${Math.floor(application.expiresAt.getTime() / 1000)}:R>`,
            `> Agradecemos por continuar utilizando nossos serviços!`,
          ];
          (0, notify_wrapper_1.notifyUser)({
            userId: cart.userId,
            message: notifyContent.join("\n"),
          }).catch(() => null);
        }
      }
    }
  }),
);
/**
 * Esse cronjob é responsável por verificar se os carrinhos expiraram.
 * Após expirar, eles são fechados na DB e o thread é deletado.
 */
(0, functions_1.asyncLoopingExec)(5000, () =>
  __awaiter(void 0, void 0, void 0, function* () {
    const buyCarts = yield databases_1.default.cartsBuy.find({
      status: "opened",
      step: { $ne: "payment-confirmed" },
      expiresAt: { $lte: new Date() },
    });
    for (const cart of buyCarts) {
      const storeConfig = yield databases_1.default.stores.findById(
        cart.storeId,
      );
      if (storeConfig) {
        const storeOwnerConfig = yield (0, functions_1.findStoreOwnerSettings)(
          databases_1.default,
          storeConfig,
        );
        if (storeOwnerConfig) {
          const paymentGateway = (0, functions_1.getCartPaymentGateway)(
            cart,
            storeOwnerConfig,
          );
          yield (0, functions_1.cancelAutomaticPayment)({
            gateway: paymentGateway,
            ownerDiscordUserId: storeOwnerConfig.userId_discord,
            paymentId: cart.paymentId,
          }).catch(() => null);
        }
      }
      yield databases_1.default.cartsBuy.updateOne(
        { _id: cart._id },
        { $set: { status: "expired", paymentStatus: "expired" } },
      );
      const channel = yield index_1.default.channels
        .fetch(cart.channelId)
        .catch(() => null);
      if (channel && channel.isThread()) {
        yield channel.bulkDelete(100, true).catch(() => {});
        yield channel
          .send({
            content:
              "`⚠️`・Este carrinho expirou! Ele será fechado em 10 segundos.",
          })
          .catch(() => {});
        setTimeout(
          () =>
            __awaiter(void 0, void 0, void 0, function* () {
              yield channel.delete().catch(() => {});
            }),
          10000,
        );
      } else {
        console.error(
          `\`⚠️\`・O carrinho expirou, mas o canal não é um thread ou não foi encontrado. ID: ${cart.channelId}`,
        );
      }
    }
    const renewCarts = yield databases_1.default.cartsRenew.find({
      status: "opened",
      expiresAt: { $lte: new Date() },
    });
    for (const cart of renewCarts) {
      const storeConfig = yield databases_1.default.stores.findById(
        cart.storeId,
      );
      if (storeConfig) {
        const storeOwnerConfig = yield (0, functions_1.findStoreOwnerSettings)(
          databases_1.default,
          storeConfig,
        );
        if (storeOwnerConfig) {
          const paymentGateway = (0, functions_1.getCartPaymentGateway)(
            cart,
            storeOwnerConfig,
          );
          yield (0, functions_1.cancelAutomaticPayment)({
            gateway: paymentGateway,
            ownerDiscordUserId: storeOwnerConfig.userId_discord,
            paymentId: cart.paymentId,
          }).catch(() => null);
        }
      }
      yield databases_1.default.cartsRenew.updateOne(
        { _id: cart._id },
        { $set: { status: "expired", paymentStatus: "expired" } },
      );
      const message = exports.renewCartsMessage.get(cart._id.toString());
      if (message) {
        const updatedMessageData = yield (0, apps_1.getCartMessageRenew)(
          cart._id.toString(),
        );
        if (updatedMessageData) {
          yield message
            .edit(updatedMessageData)
            .catch((error) =>
              console.warn(
                "⚠️ Erro ao editar a mensagem do carrinho de renovação na hora de expirar:",
                error,
              ),
            );
        }
      }
    }
  }),
);
/**
 * Esse cronjob é responsável por verificar se as aplicações expiraram.
 * Após expirar, ela é marcada como "grace_period" e é renovada pelo tempo do "GRACE_PERIOD_DAYS".
 *
 * Após expirar o grace period, a aplicação é deletada.
 */
(0, functions_1.asyncLoopingExec)(3000, () =>
  __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const expiredApplications = yield databases_1.default.applications
      .find({ expiresAt: { $lte: new Date() }, lifetime: false })
      .populate("storeId");
    if (!expiredApplications.length) return;
    for (const application of expiredApplications) {
      const storeConfig = application.storeId;
      if (!storeConfig) {
        // console.error(`\`⚠️\`・Aplicação com ID ${application._id} não possui configuração de loja válida.`);
        continue;
      }
      if (
        application.deliveryMode === functions_1.PRODUCT_DELIVERY_MODES.SHARED
      ) {
        try {
          if (application.status === "grace_period") {
            application.status = "expired";
            yield application.save();
            yield (0, functions_1.syncApplicationEntitlementStatus)(
              application,
            ).catch(() => null);
          } else if (application.status !== "expired") {
            application.status = "grace_period";
            application.expiresAt = new Date(
              Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
            );
            yield application.save();
            yield (0, functions_1.syncApplicationEntitlementStatus)(
              application,
            ).catch(() => null);
          }
        } catch (error) {
          console.error(
            `⚠️ Erro ao processar a licença de bot pronto ${application._id}:`,
            getErrorMessage(error),
          );
        }
        continue;
      }
      const remoteHost = yield (0, functions_1.getHostAdapterForApplication)(
        databases_1.default,
        application,
        storeConfig,
      ).catch(() => null);
      if (!remoteHost) {
        // console.error(`\`⚠️\`・Configuração de loja do dono da aplicação com ID ${application._id} não encontrada.`);
        continue;
      }
      try {
        if (application.status === "grace_period") {
          yield remoteHost.adapter
            .deleteApplication(application.appId)
            .catch((error) => {
              if (isRemoteApplicationMissingError(error)) {
                console.log(
                  `🛡️ A aplicação ${application.appId} já foi deletada da ${(0, functions_1.getHostLabel)(remoteHost.provider)}, deletando da nossa DB.`,
                );
                return;
              }
              throw error;
            });
          yield databases_1.default.applications.deleteOne({
            _id: application._id,
          });
          const notifyContent = [
            `# Aviso importante sobre sua aplicação! 😿`,
            `Olá <@${application.ownerId}>, sua aplicação expirou e foi deletada!\n`,
            `- Você não poderá mais utilizá-la, pois ela foi removida do sistema.`,
            `> Para criar uma nova aplicação, entre no servidor ${storeConfig.name} e compre outra.\n`,
            `-# Aplicação: ${application.name} - ID ${application.appId}`,
            `-# Esperamos que tenha gostado da nossa plataforma!`,
          ];
          (0, notify_wrapper_1.notifyUser)({
            userId: application.ownerId,
            message: {
              content: notifyContent.join("\n"),
            },
          });
          (0, notify_wrapper_1.notifyChannelLog)({
            logName: "expiredApplication",
            message: {
              content: `A aplicação \`${application.name}\` (ID: ${application.appId}) do usuário <@${application.ownerId}> expirou e foi deletada.`,
            },
          });
        } else {
          application.status = "grace_period";
          application.expiresAt = new Date(
            Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000,
          );
          // Vamos desligar a aplicação, o usuário não poderá ligar novamente até renovar o plano.
          remoteHost.adapter
            .stopApplication(application.appId)
            .catch(() => null);
          const notifyContent = [
            `# Aviso importante sobre sua aplicação!`,
            `Olá <@${application.ownerId}>, sua aplicação expirou!\n`,
            `- Você tem um período de carência de **${GRACE_PERIOD_DAYS} dias** para renová-la.`,
            `> Após esse período, ela será deletada e não poderá ser recuperada.`,
            `> Para renovar, entre no servidor ${storeConfig.name} e digite /apps e vá ate a opção de renovar.\n`,
            `-# Aplicação: ${application.name} - ID ${application.appId}`,
            `-# Expira em: <t:${Math.floor(application.expiresAt.getTime() / 1000)}:R>`,
          ];
          (0, notify_wrapper_1.notifyUser)({
            userId: application.ownerId,
            message: {
              content: notifyContent.join("\n"),
            },
          });
          (0, notify_wrapper_1.notifyChannelLog)({
            logName: "expiredApplication",
            message: {
              content: `A aplicação \`${application.name}\` (ID: ${application.appId}) do usuário <@${application.ownerId}> expirou e entrou no **período de carência**.`,
            },
          });
          yield application.save();
          yield (0, functions_1.syncApplicationEntitlementStatus)(
            application,
          ).catch(() => null);
        }
      } catch (error) {
        console.error(
          `⚠️ Erro ao processar a expiracao da aplicacao ${application._id}:`,
          getErrorMessage(error),
        );
      }
    }
  }),
);
/**
 * Esse cronjob é responsável por atualizar os BOTs para a release atual.
 */
(0, functions_1.asyncLoopingExec)(5000, () =>
  __awaiter(void 0, void 0, void 0, function* () {
    const stores = yield databases_1.default.stores.find({});
    // Executa lojas em paralelo
    yield Promise.all(
      stores.map((store) =>
        __awaiter(void 0, void 0, void 0, function* () {
          const productsOnStore = yield databases_1.default.products.find({
            storeId: store._id,
            needToUpdateApplications: true,
          });
          // Aqui executa produtos em série
          for (const product of productsOnStore) {
            if (!product.currentReleaseVersion) {
              console.error(
                `⚠️ Release atual do produto ${product._id} não encontrada.`,
              );
              yield databases_1.default.products.updateOne(
                { _id: product._id },
                { $set: { needToUpdateApplications: false } },
              );
              continue;
            }
            const applications = yield databases_1.default.applications.find({
              productId: product._id,
              errorOnUpdate: false,
              deliveryMode: { $ne: functions_1.PRODUCT_DELIVERY_MODES.SHARED },
              version: { $ne: product.currentReleaseVersion },
            });
            if (!applications.length) {
              yield databases_1.default.products.updateOne(
                { _id: product._id },
                { $set: { needToUpdateApplications: false } },
              );
              continue;
            }
            const existZip = yield promises_1.default
              .access(
                `releases/${product._id}/${product.currentReleaseVersion}.zip`,
              )
              .then(() => true)
              .catch(() => false);
            if (!existZip) {
              console.error(
                `⚠️ Release ${product.currentReleaseVersion} do produto ${product._id} não encontrada.`,
              );
              yield databases_1.default.products.updateOne(
                { _id: product._id },
                { $set: { needToUpdateApplications: false } },
              );
              continue;
            }
            const releaseBuffer = yield promises_1.default.readFile(
              `releases/${product._id}/${product.currentReleaseVersion}.zip`,
            );
            // Aqui também já é sequencial
            for (const app of applications) {
              let success = false;
              let attempts = app.updateAttempts || 0;
              while (!success && attempts <= 3) {
                const initialTime = Date.now();
                try {
                  if (!app.appId) throw new Error("Aplicação sem appId.");
                  const remoteState = yield (0,
                  functions_1.getRemoteApplicationState)(
                    databases_1.default,
                    app,
                    store,
                  ).catch(() => null);
                  if (!remoteState) {
                    throw new Error(
                      "Não foi possível carregar o host da aplicação.",
                    );
                  }
                  if (!remoteState.remoteApplication) {
                    console.log(
                      `🛡️ Aplicação ${app.appId} não encontrada em ${(0, functions_1.getHostLabel)(remoteState.provider)}. Removendo registro local.`,
                    );
                    yield databases_1.default.applications.deleteOne({
                      _id: app._id,
                    });
                    success = true;
                    continue;
                  }
                  yield (0, functions_1.commitManagedApplicationRelease)(
                    databases_1.default,
                    {
                      application: app,
                      store,
                      product,
                      file: releaseBuffer,
                    },
                  );
                  yield databases_1.default.applications.updateOne(
                    { _id: app._id },
                    {
                      $set: {
                        version: product.currentReleaseVersion,
                        updateAttempts: 0,
                        errorOnUpdate: false,
                      },
                      $unset: { errorOnUpdateMessage: "" },
                    },
                  );
                  console.log(
                    `✅ Aplicação ${app._id} atualizada para a versão ${product.currentReleaseVersion}.`,
                  );
                  success = true;
                } catch (error) {
                  attempts++;
                  if (attempts > 3) {
                    console.error(
                      `⚠️ Erro ao atualizar a aplicação ${app._id} após 3 tentativas, aplicação marcada como erro ao atualizar.`,
                      error,
                    );
                    yield databases_1.default.applications.updateOne(
                      { _id: app._id },
                      {
                        $set: {
                          errorOnUpdate: true,
                          errorOnUpdateMessage: getErrorMessage(error),
                        },
                      },
                    );
                  } else {
                    console.log(
                      `⚠️ Tentativa ${attempts} de 3 para atualizar a aplicação ${app._id}.`,
                    );
                    yield databases_1.default.applications.updateOne(
                      { _id: app._id },
                      { $set: { updateAttempts: attempts } },
                    );
                  }
                } finally {
                  const elapsedTime = Date.now() - initialTime;
                  const remainingTime =
                    RATE_UPDATE_APPLICATION_SECONDS * 1000 - elapsedTime;
                  if (remainingTime > 0) {
                    console.log(
                      `Aguardando ${Math.ceil(remainingTime / 1000)} segundos...`,
                    );
                    yield new Promise((resolve) =>
                      setTimeout(resolve, remainingTime),
                    );
                  } else {
                    console.log(
                      `Continuando sem aguardar, tempo de atualização já excedido. Tempo gasto: ${Math.ceil(elapsedTime / 1000)} segundos.`,
                    );
                  }
                }
              }
            }
            const pendingApplications =
              yield databases_1.default.applications.countDocuments({
                productId: product._id,
                errorOnUpdate: false,
                version: { $ne: product.currentReleaseVersion },
              });
            if (!pendingApplications) {
              yield databases_1.default.products.updateOne(
                { _id: product._id },
                { $set: { needToUpdateApplications: false } },
              );
            }
          }
        }),
      ),
    );
  }),
);
