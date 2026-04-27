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

const axios_1 = __importDefault(require("axios"));

function getDatabases() {
  return require("../databases").default;
}

const MERCADO_PAGO_API_BASE_URL =
  process.env.MERCADO_PAGO_API_BASE_URL || "https://api.mercadopago.com";

class MercadoPagoWrapper {
  constructor() {
    this.instances = new Map();
  }

  getInstance(userId) {
    return __awaiter(this, void 0, void 0, function* () {
      if (this.instances.has(userId)) {
        return this.instances.get(userId);
      }

      return yield this.updateCredentials(userId);
    });
  }

  updateCredentials(userId) {
    return __awaiter(this, void 0, void 0, function* () {
      const databases = getDatabases();
      const settingsDB = yield databases.userSettings.findOne({
        userId_discord: userId,
      });

      if (!settingsDB) {
        console.error(
          `Mercado Pago settings not found for user ${userId}.`,
        );
        return null;
      }

      const mercadoPagoSettings = settingsDB.mercado_pago_credentials || {};

      if (!mercadoPagoSettings.access_token) {
        console.error(
          `Mercado Pago access token is missing for user ${userId}.`,
        );
        return null;
      }

      const instance = {
        accessToken: mercadoPagoSettings.access_token,
        publicKey: mercadoPagoSettings.public_key || "",
        webhookUrl: mercadoPagoSettings.webhook_url || "",
        statementDescriptor: mercadoPagoSettings.statement_descriptor || "",
      };

      const userMercadoPagoInstance = {
        instance,
        isValid: yield this.checkIsValidConfig(userId, instance),
      };

      this.instances.set(userId, userMercadoPagoInstance);
      return userMercadoPagoInstance;
    });
  }

  checkIsValidConfig(userId, instance) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        yield this.request(instance, {
          method: "GET",
          url: "/users/me",
        });
        return true;
      } catch (error) {
        console.error(
          `Error testing Mercado Pago instance for user ${userId}:`,
          error,
        );
        return false;
      }
    });
  }

  createPixPayment(userId, payload) {
    return __awaiter(this, void 0, void 0, function* () {
      const mercadoPagoInstance = yield this.getInstance(userId);

      if (!mercadoPagoInstance || !mercadoPagoInstance.isValid) {
        throw new Error(
          "Não foi possível autenticar com o Mercado Pago. Verifique o token de acesso.",
        );
      }

      const { instance } = mercadoPagoInstance;
      const response = yield this.request(instance, {
        method: "POST",
        url: "/v1/payments",
        headers: {
          "X-Idempotency-Key": payload.idempotencyKey,
        },
        data: {
          transaction_amount: payload.amount,
          description: payload.description,
          payment_method_id: "pix",
          external_reference: payload.externalReference,
          date_of_expiration: payload.dateOfExpiration,
          notification_url: payload.notificationUrl || instance.webhookUrl || undefined,
          statement_descriptor:
            payload.statementDescriptor || instance.statementDescriptor || undefined,
          payer: {
            email: payload.payer.email,
            first_name: payload.payer.firstName || undefined,
            last_name: payload.payer.lastName || undefined,
          },
          metadata: payload.metadata || {},
        },
      });

      return response;
    });
  }

  createTransparentCardPayment(userId, payload) {
    return __awaiter(this, void 0, void 0, function* () {
      const mercadoPagoInstance = yield this.getInstance(userId);

      if (!mercadoPagoInstance || !mercadoPagoInstance.isValid) {
        throw new Error(
          "Não foi possível autenticar com o Mercado Pago. Verifique o token de acesso.",
        );
      }

      const { instance } = mercadoPagoInstance;

      return yield this.request(instance, {
        method: "POST",
        url: "/v1/payments",
        headers: {
          "X-Idempotency-Key": payload.idempotencyKey,
        },
        data: {
          transaction_amount: payload.amount,
          token: payload.token,
          description: payload.description,
          installments: payload.installments,
          issuer_id: payload.issuerId,
          payment_method_id: payload.paymentMethodId,
          external_reference: payload.externalReference,
          notification_url: payload.notificationUrl || instance.webhookUrl || undefined,
          statement_descriptor:
            payload.statementDescriptor || instance.statementDescriptor || undefined,
          payer: {
            email: payload.payer.email,
            first_name: payload.payer.firstName || undefined,
            last_name: payload.payer.lastName || undefined,
            identification: payload.payer.identification
              ? {
                  type: payload.payer.identification.type,
                  number: payload.payer.identification.number,
                }
              : undefined,
          },
          metadata: payload.metadata || {},
        },
      });
    });
  }

  getPayment(userId, paymentId) {
    return __awaiter(this, void 0, void 0, function* () {
      const mercadoPagoInstance = yield this.getInstance(userId);

      if (!mercadoPagoInstance || !mercadoPagoInstance.isValid) {
        throw new Error(
          "Não foi possível autenticar com o Mercado Pago. Verifique o token de acesso.",
        );
      }

      return yield this.request(mercadoPagoInstance.instance, {
        method: "GET",
        url: `/v1/payments/${paymentId}`,
      });
    });
  }

  cancelPayment(userId, paymentId) {
    return __awaiter(this, void 0, void 0, function* () {
      const mercadoPagoInstance = yield this.getInstance(userId);

      if (!mercadoPagoInstance || !mercadoPagoInstance.isValid) {
        return null;
      }

      return yield this.request(mercadoPagoInstance.instance, {
        method: "PUT",
        url: `/v1/payments/${paymentId}`,
        data: {
          status: "cancelled",
        },
      }).catch(() => null);
    });
  }

  clearInstance(userId) {
    this.instances.delete(userId);
  }

  request(instance, config) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const requestHeaders = {
          Authorization: `Bearer ${instance.accessToken}`,
          "Content-Type": "application/json",
          ...((config === null || config === void 0 ? void 0 : config.headers) || {}),
        };
        const response = yield axios_1.default({
          baseURL: MERCADO_PAGO_API_BASE_URL,
          timeout: 15000,
          ...config,
          headers: requestHeaders,
        });

        return response.data;
      } catch (error) {
        const message =
          error === null || error === void 0
            ? void 0
            : error.response;
        const apiMessage =
          (message === null || message === void 0
            ? void 0
            : message.data.message) ||
          (message === null || message === void 0
            ? void 0
            : message.data.error) ||
          (message === null || message === void 0
            ? void 0
            : message.data.cause) ||
          (error === null || error === void 0 ? void 0 : error.message) ||
          "Erro desconhecido no Mercado Pago.";

        const normalizedError = new Error(
          `Mercado Pago: ${Array.isArray(apiMessage) ? JSON.stringify(apiMessage) : apiMessage}`,
        );

        normalizedError.response =
          error === null || error === void 0 ? void 0 : error.response;

        throw normalizedError;
      }
    });
  }
}

const mercadoPagoWrapper = new MercadoPagoWrapper();

exports.default = mercadoPagoWrapper;
