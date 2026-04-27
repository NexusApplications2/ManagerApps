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
const fast_discord_js_1 = require("fast-discord-js");
const functions_1 = require("@root/src/functions");
const efi_wrapper_1 = __importDefault(
  require("@root/src/functions/efi_wrapper"),
);
const mercadopago_wrapper_1 = __importDefault(
  require("@root/src/functions/mercadopago-wrapper"),
);

const keyTypeDict = {
  email: "email",
  cpf: "cpf",
  cnpj: "cnpj",
  telefone: "phone",
  "chave aleatoria": "random",
};

function getCurrentGateway(settingsDB) {
  return (
    (settingsDB === null || settingsDB === void 0
      ? void 0
      : settingsDB.payment_gateway) || functions_1.PAYMENT_GATEWAYS.MANUAL
  );
}

new fast_discord_js_1.InteractionHandler({
  customId: "config-payment",
  run: (client, interaction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const settingsDB = yield databases_1.default.userSettings.findOne({
        userId_discord: interaction.user.id,
      });

      const currentGateway = getCurrentGateway(settingsDB);
      const efiSettings = (settingsDB === null || settingsDB === void 0
        ? void 0
        : settingsDB.efi_credentials) || {
        client_id: "",
        client_secret: "",
        pix_key: "",
        cert: "",
      };
      const manualSettings = (settingsDB === null || settingsDB === void 0
        ? void 0
        : settingsDB.manual_payment_credentials) || {
        pix_key: "",
        key_type: "",
      };
      const mercadoPagoSettings = (settingsDB === null || settingsDB === void 0
        ? void 0
        : settingsDB.mercado_pago_credentials) || {
        access_token: "",
      };

      const contents = [
        "# Configuração de pagamento",
        "- Configure abaixo os gateways de pagamento que deseja utilizar",
        `> Gateway padrão: \`${(0, functions_1.getPaymentGatewayLabel)(currentGateway)}\``,
        "",
      ];

      const errors = (0, functions_1.validateSelectedPaymentGateway)(
        settingsDB,
        currentGateway,
      );

      if (currentGateway === functions_1.PAYMENT_GATEWAYS.EFI) {
        if (!errors.length) {
          const paymentInstance = yield efi_wrapper_1.default
            .updateCredentials(interaction.user.id)
            .catch(() => null);

          if (
            paymentInstance === null || paymentInstance === void 0
              ? void 0
              : paymentInstance.isValid
          ) {
            contents.push(
              "`✅`・Configuração da **EFI** validada com sucesso.",
            );
          } else {
            contents.push(
              "`❌`・A EFI está configurada, mas a autenticação falhou. Revise credenciais e certificado.",
            );
          }
        }

        if (efiSettings.pix_key) {
          contents.push(`- Chave PIX EFI: \`${efiSettings.pix_key}\``);
        }
      }

      if (currentGateway === functions_1.PAYMENT_GATEWAYS.MERCADO_PAGO) {
        if (!errors.length) {
          const mercadoPagoInstance = yield mercadopago_wrapper_1.default
            .updateCredentials(interaction.user.id)
            .catch(() => null);

          if (
            mercadoPagoInstance === null || mercadoPagoInstance === void 0
              ? void 0
              : mercadoPagoInstance.isValid
          ) {
            contents.push(
              "`✅`・Configuração do **Mercado Pago** validada com sucesso.",
            );
          } else {
            contents.push(
              "`❌`・O token do Mercado Pago foi salvo, mas a autenticação falhou.",
            );
          }
        }

        contents.push(
          mercadoPagoSettings.access_token
            ? "`ℹ️`・Neste gateway, somente o **Access Token** é necessário para operar."
            : "`⚠️`・Informe o **Access Token** do Mercado Pago para habilitar as cobranças automáticas.",
        );
      }

      if (currentGateway === functions_1.PAYMENT_GATEWAYS.MANUAL) {
        if (!errors.length) {
          contents.push("`✅`・Pagamento manual configurado com sucesso.");
        }

        if (manualSettings.pix_key) {
          contents.push(`- Chave manual: \`${manualSettings.pix_key}\``);
        }

        if (manualSettings.key_type) {
          contents.push(`- Tipo de chave: \`${manualSettings.key_type}\``);
        }
      }

      if (errors.length) {
        contents.push("", ...errors.map((error) => `\`⚠️\`・${error}`));
      }

      const components = [
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "EFI",
            style: 1,
            customId: "config-payment-efibank:show-modal",
            emoji: functions_1.emojis.bank,
            disabled: currentGateway !== functions_1.PAYMENT_GATEWAYS.EFI,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Mercado Pago",
            style: 1,
            customId: "config-payment-mercado-pago:show-modal",
            emoji: functions_1.emojis.bank,
            disabled:
              currentGateway !== functions_1.PAYMENT_GATEWAYS.MERCADO_PAGO,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Pagamento manual",
            style: 1,
            customId: "config-manual-payment:show-modal",
            emoji: functions_1.emojis.bank,
            disabled: currentGateway !== functions_1.PAYMENT_GATEWAYS.MANUAL,
          }),
        ]),
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Alterar gateway",
            style: 1,
            customId: "config-select-payment-gateway:show-select",
            emoji: functions_1.emojis.config,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Atualizar painel",
            style: 2,
            customId: "config-payment",
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

      const payload = {
        content: contents.join("\n"),
        components,
      };

      if (interaction.deferred) {
        return interaction.editReply(payload);
      }

      if (interaction.replied) {
        return interaction.followUp({
          ...payload,
          flags: 64,
        });
      }

      return interaction.update(payload);
    }),
});

new fast_discord_js_1.InteractionHandler({
  customId: "config-payment-efibank",
  run: (client, interaction, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const settingsDB = yield databases_1.default.userSettings.findOne({
        userId_discord: interaction.user.id,
      });
      const currentValues =
        (settingsDB === null || settingsDB === void 0
          ? void 0
          : settingsDB.efi_credentials) || {};

      if (action === "show-modal") {
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Configuração EFI",
          customId: "config-payment-efibank:submit-modal",
          inputs: [
            {
              label: "Client ID",
              placeholder: "Digite o client id da EFI",
              customId: "efi-sales-config-client-id",
              required: false,
              style: 1,
              value: currentValues.client_id || "",
            },
            {
              label: "Client Secret",
              placeholder: "Digite o client secret da EFI",
              customId: "efi-sales-config-client-secret",
              required: false,
              style: 1,
              value: currentValues.client_secret || "",
            },
            {
              label: "Chave Pix",
              placeholder: "Digite a chave pix da EFI",
              customId: "efi-sales-config-pix-key",
              required: false,
              style: 1,
              value: currentValues.pix_key || "",
            },
          ],
        });

        return modal.show(interaction);
      }

      if (action === "submit-modal" && interaction.isModalSubmit()) {
        const clientId = interaction.fields.getTextInputValue(
          "efi-sales-config-client-id",
        );
        const clientSecret = interaction.fields.getTextInputValue(
          "efi-sales-config-client-secret",
        );
        const pixKey = interaction.fields.getTextInputValue(
          "efi-sales-config-pix-key",
        );

        yield interaction.deferUpdate();
        yield interaction.editReply({
          content: "`🔄`・Atualizando configurações da EFI...",
          components: [],
        });

        yield databases_1.default.userSettings.updateOne(
          { userId_discord: interaction.user.id },
          {
            $set: {
              "efi_credentials.client_id": clientId,
              "efi_credentials.client_secret": clientSecret,
              "efi_credentials.pix_key": pixKey,
            },
          },
          { upsert: true },
        );

        const paymentInstance = yield efi_wrapper_1.default
          .updateCredentials(interaction.user.id)
          .catch(() => null);

        yield client.invokeInteraction("config-payment", interaction);

        if (
          !(paymentInstance === null || paymentInstance === void 0
            ? void 0
            : paymentInstance.isValid)
        ) {
          if (!currentValues.cert) {
            return interaction.followUp({
              content:
                "`⚠️`・Credenciais salvas, mas o certificado ainda não foi enviado. Use `/enviarcertificado`.",
              flags: 64,
            });
          }

          return interaction.followUp({
            content:
              "`⚠️`・Credenciais salvas, mas a autenticação da EFI falhou. Revise client id, secret e certificado.",
            flags: 64,
          });
        }

        return interaction.followUp({
          content: "`✅`・EFI configurada com sucesso!",
          flags: 64,
        });
      }
    }),
});

new fast_discord_js_1.InteractionHandler({
  customId: "config-payment-mercado-pago",
  run: (client, interaction, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const settingsDB = yield databases_1.default.userSettings.findOne({
        userId_discord: interaction.user.id,
      });
      const currentValues =
        (settingsDB === null || settingsDB === void 0
          ? void 0
          : settingsDB.mercado_pago_credentials) || {};

      if (action === "show-modal") {
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Configuração Mercado Pago",
          customId: "config-payment-mercado-pago:submit-modal",
          inputs: [
            {
              label: "Access Token",
              placeholder: "APP_USR-...",
              customId: "mercado-pago-access-token",
              required: false,
              style: 1,
              value: currentValues.access_token || "",
            },
          ],
        });

        return modal.show(interaction);
      }

      if (action === "submit-modal" && interaction.isModalSubmit()) {
        const accessToken = interaction.fields
          .getTextInputValue("mercado-pago-access-token")
          .trim();

        yield interaction.deferUpdate();
        yield interaction.editReply({
          content: "`🔄`・Atualizando configurações do Mercado Pago...",
          components: [],
        });

        yield databases_1.default.userSettings.updateOne(
          { userId_discord: interaction.user.id },
          {
            $set: {
              "mercado_pago_credentials.access_token": accessToken,
            },
          },
          { upsert: true },
        );

        mercadopago_wrapper_1.default.clearInstance(interaction.user.id);

        const mercadoPagoInstance = yield mercadopago_wrapper_1.default
          .updateCredentials(interaction.user.id)
          .catch(() => null);

        yield client.invokeInteraction("config-payment", interaction);

        if (!accessToken) {
          return interaction.followUp({
            content:
              "`⚠️`・Configuração salva, mas o Access Token está vazio. O Mercado Pago não poderá ser utilizado até você informá-lo.",
            flags: 64,
          });
        }

        if (
          !(mercadoPagoInstance === null || mercadoPagoInstance === void 0
            ? void 0
            : mercadoPagoInstance.isValid)
        ) {
          return interaction.followUp({
            content:
              "`⚠️`・As credenciais foram salvas, mas a autenticação no Mercado Pago falhou. Revise o Access Token.",
            flags: 64,
          });
        }

        return interaction.followUp({
          content:
            "`✅`・Mercado Pago configurado com sucesso! O Access Token já habilita as cobranças automáticas desse gateway.",
          flags: 64,
        });
      }
    }),
});

new fast_discord_js_1.InteractionHandler({
  customId: "config-manual-payment",
  run: (client, interaction, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const settingsDB = yield databases_1.default.userSettings.findOne({
        userId_discord: interaction.user.id,
      });
      const currentValues =
        (settingsDB === null || settingsDB === void 0
          ? void 0
          : settingsDB.manual_payment_credentials) || {};

      if (action === "show-modal") {
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Configuração de Pagamento Manual",
          customId: "config-manual-payment:submit-modal",
          inputs: [
            {
              label: "Chave PIX",
              placeholder: "Digite a chave pix usada no recebimento manual",
              customId: "pix-key",
              required: false,
              style: 1,
              value: currentValues.pix_key || "",
            },
            {
              label: "Tipo de chave",
              placeholder: "email, cnpj, cpf, telefone, chave aleatoria",
              customId: "pix-key-type",
              required: false,
              style: 1,
              value: currentValues.key_type || "",
            },
          ],
        });

        return modal.show(interaction);
      }

      if (action === "submit-modal" && interaction.isModalSubmit()) {
        try {
          const pixKey = interaction.fields.getTextInputValue("pix-key");
          const rawKeyType =
            interaction.fields.getTextInputValue("pix-key-type");
          const normalizedKeyType = rawKeyType
            ? rawKeyType.trim().toLocaleLowerCase()
            : "";

          if (normalizedKeyType && !keyTypeDict[normalizedKeyType]) {
            throw new Error(
              "Tipo de chave inválida. Use: email, cnpj, cpf, telefone ou chave aleatoria.",
            );
          }

          yield interaction.deferUpdate();
          yield interaction.editReply({
            content: "`🔄`・Atualizando configurações do pagamento manual...",
            components: [],
          });

          yield databases_1.default.userSettings.updateOne(
            { userId_discord: interaction.user.id },
            {
              $set: {
                "manual_payment_credentials.pix_key": pixKey || null,
                "manual_payment_credentials.key_type": normalizedKeyType
                  ? keyTypeDict[normalizedKeyType]
                  : null,
              },
            },
            { upsert: true },
          );

          yield client.invokeInteraction("config-payment", interaction);

          return interaction.followUp({
            content: "`✅`・Pagamento manual configurado com sucesso!",
            flags: 64,
          });
        } catch (error) {
          const content =
            (error === null || error === void 0 ? void 0 : error.message) ||
            "Ocorreu um erro ao salvar as configurações do pagamento manual.";

          if (interaction.replied || interaction.deferred) {
            return interaction.followUp({
              content: `\`❌\`・${content}`,
              flags: 64,
            });
          }

          return interaction.reply({
            content: `\`❌\`・${content}`,
            flags: 64,
          });
        }
      }
    }),
});

new fast_discord_js_1.InteractionHandler({
  customId: "config-select-payment-gateway",
  run: (client, interaction, action, selectValue) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const settingsDB = yield databases_1.default.userSettings.findOne({
        userId_discord: interaction.user.id,
      });

      if (action === "show-select") {
        const currentGateway = getCurrentGateway(settingsDB);
        const components = [
          (0, fast_discord_js_1.CreateRow)([
            new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
              customId: "config-select-payment-gateway:submit-select",
              placeholder: "Selecione o gateway de pagamento",
              options: [
                {
                  label: "Banco (EFI)",
                  value: functions_1.PAYMENT_GATEWAYS.EFI,
                  description:
                    "PIX automático via EFI com certificado + polling interno",
                  emoji: "🏦",
                  default: currentGateway === functions_1.PAYMENT_GATEWAYS.EFI,
                },
                {
                  label: "Mercado Pago",
                  value: functions_1.PAYMENT_GATEWAYS.MERCADO_PAGO,
                  description:
                    "Cobranças automáticas usando apenas o Access Token",
                  emoji: "💳",
                  default:
                    currentGateway ===
                    functions_1.PAYMENT_GATEWAYS.MERCADO_PAGO,
                },
                {
                  label: "Pagamento manual",
                  value: functions_1.PAYMENT_GATEWAYS.MANUAL,
                  description:
                    "Recebimento manual com aprovação via comando /aprovar",
                  emoji: "💵",
                  default:
                    currentGateway === functions_1.PAYMENT_GATEWAYS.MANUAL,
                },
              ],
              getValueInLastParam: true,
            }),
          ]),
          (0, fast_discord_js_1.CreateRow)([
            (0, fast_discord_js_1.CreateButton)({
              label: "Voltar",
              style: 2,
              customId: "config-payment",
              emoji: functions_1.emojis.back,
            }),
          ]),
        ];

        return interaction.update({
          content: "`🔄`・Selecione o gateway de pagamento padrão:",
          components,
          flags: 64,
        });
      }

      if (action === "submit-select") {
        try {
          const currentGateway = getCurrentGateway(settingsDB);

          if (currentGateway === selectValue) {
            return interaction.reply({
              content: "`⚠️`・Este gateway já está selecionado como padrão!",
              flags: 64,
            });
          }

          yield databases_1.default.userSettings.updateOne(
            { userId_discord: interaction.user.id },
            {
              $set: {
                payment_gateway: selectValue,
              },
            },
            { upsert: true, runValidators: true },
          );

          yield client.invokeInteraction("config-payment", interaction);

          return interaction.followUp({
            content: `\`✅\`・Gateway padrão atualizado para **${(0, functions_1.getPaymentGatewayLabel)(selectValue)}**.`,
            flags: 64,
          });
        } catch (_error) {
          return interaction.reply({
            content:
              "`❌`・Ocorreu um erro ao atualizar o gateway de pagamento.",
            flags: 64,
          });
        }
      }
    }),
});
