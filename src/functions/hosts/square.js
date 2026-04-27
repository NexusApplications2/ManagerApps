"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.SquareHostAdapter = void 0;

const api_1 = require("@squarecloud/api");
const axios_1 = require("axios");
const compat_1 = require("./compat");
const release_1 = require("./release");

const BASE_URL = "https://api.squarecloud.app/v2";

class SquareHostAdapter {
  constructor(options) {
    this.provider = compat_1.HOST_PROVIDERS.SQUARE;
    this.options = options;
    this.client = new api_1.SquareCloudAPI(options.apiToken);
  }

  get headers() {
    return { Authorization: this.options.apiToken };
  }

  async request(config) {
    try {
      const response = await axios_1.default({
        baseURL: BASE_URL,
        headers: Object.assign({}, this.headers, config.headers || {}),
        method: config.method || "GET",
        url: config.url,
        data: config.data,
        params: config.params,
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      const apiError =
        (((error || {}).response || {}).data || {}).message ||
        (((error || {}).response || {}).data || {}).error ||
        error.message;
      const wrappedError = new Error(
        apiError || "Erro ao acessar a Square Cloud.",
      );
      wrappedError.cause = error;
      wrappedError.response = error.response;
      throw wrappedError;
    }
  }

  async validateCredentials() {
    const account = await this.getAccount();
    return { isValid: Boolean(account.id), account };
  }

  async getAccount() {
    const data = await this.request({ url: "/users/me" });
    const user = (data.response || {}).user || {};

    return {
      provider: this.provider,
      id: user.id,
      name: user.name || "",
      email: user.email || "",
      raw: data.response,
    };
  }

  async getPlanUsage() {
    const data = await this.request({ url: "/users/me" });
    const plan = (((data || {}).response || {}).user || {}).plan || {};
    const memory = plan.memory || {};
    const totalMemory = Number(memory.limit || 0);
    const freeMemoryMB = Number(memory.available || 0);
    const usedMemoryMB = Number(memory.used || 0);

    return {
      provider: this.provider,
      totalMemory,
      freeMemoryMB,
      usedMemoryMB,
      utilizedMemoryPercentage:
        totalMemory > 0
          ? Number(((usedMemoryMB / totalMemory) * 100).toFixed(2))
          : 0,
      endAt: plan.duration ? new Date(Number(plan.duration)) : null,
      raw: data.response,
    };
  }

  async listWorkspaces() {
    const data = await this.request({ url: "/workspaces" });
    return (data.response || []).map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      raw: workspace,
    }));
  }

  async getApplication(appId) {
    const application = await this.client.applications
      .fetch(appId)
      .catch(() => null);

    if (!application) {
      return null;
    }

    return {
      id: application.id,
      name: application.name,
      memoryMB: application.ram,
      startupCommand: null,
      runtimeEnvironment: application.language,
      raw: application,
      remote: application,
    };
  }

  async getApplicationStatus(appId) {
    const application = await this.getApplication(appId);

    if (!application) {
      return null;
    }

    const status = await application.remote.getStatus().catch(() => null);

    if (!status) {
      return null;
    }

    return {
      provider: this.provider,
      running: Boolean(status.running),
      status: status.status || (status.running ? "running" : "stopped"),
      uptime: status.uptimeTimestamp
        ? Math.floor(Number(status.uptimeTimestamp) / 1000)
        : 0,
      cpu: (status.usage || {}).cpu || null,
      ram: (status.usage || {}).ram || null,
      storage: (status.usage || {}).storage || null,
      network: (status.usage || {}).network || null,
      memoryBytes: null,
      memoryLimitBytes: application.memoryMB
        ? application.memoryMB * 1024 * 1024
        : null,
      raw: status,
      application,
    };
  }

  async createApplication(options) {
    const preparedRelease = (0, release_1.prepareSquareCloudRelease)({
      product: options.product,
      buffer: options.file,
    });
    const created = await this.client.applications.create(
      preparedRelease.toBuffer(),
    );
    const result = {
      id: created.id,
      name: created.name,
      raw: created,
    };

    if (options.workspaceId) {
      await this.addApplicationToWorkspace(created.id, options.workspaceId);
    }

    if (options.environmentVariables && options.environmentVariables.length) {
      await this.overwriteEnvironment(created.id, {
        environmentVariables: options.environmentVariables,
      });
    }

    return result;
  }

  async addApplicationToWorkspace(appId, workspaceId) {
    await this.request({
      method: "POST",
      url: "/workspaces/applications",
      headers: { "Content-Type": "application/json" },
      data: { workspaceId, appId },
    });
    return true;
  }

  async overwriteEnvironment(appId, options) {
    const envMap = {};

    for (const item of options.environmentVariables || []) {
      if (item && item.key) {
        envMap[String(item.key)] = String(item.value == null ? "" : item.value);
      }
    }

    if (!Object.keys(envMap).length) {
      return true;
    }

    await this.request({
      method: "PUT",
      url: `/apps/${appId}/envs`,
      headers: { "Content-Type": "application/json" },
      data: { envs: envMap },
    });

    return true;
  }

  async startApplication(appId) {
    const application = await this.getApplication(appId);

    if (!application) {
      return false;
    }

    return application.remote.start();
  }

  async stopApplication(appId) {
    const application = await this.getApplication(appId);

    if (!application) {
      return false;
    }

    return application.remote.stop();
  }

  async restartApplication(appId) {
    const application = await this.getApplication(appId);

    if (!application) {
      return false;
    }

    return application.remote.restart();
  }

  async deleteApplication(appId) {
    const application = await this.getApplication(appId);

    if (!application) {
      return false;
    }

    return application.remote.delete();
  }

  async commitApplication(appId, fileBuffer, product) {
    const application = await this.getApplication(appId);

    if (!application) {
      throw new Error("Aplicação remota não encontrada.");
    }

    const preparedRelease = (0, release_1.prepareSquareCloudRelease)({
      product,
      buffer: fileBuffer,
    });

    await application.remote.commit(preparedRelease.toBuffer(), "release.zip");
    return true;
  }

  async getApplicationLogs(appId) {
    const application = await this.getApplication(appId);

    if (!application) {
      return null;
    }

    return application.remote.getLogs();
  }

  getApplicationDashboardUrl(appId) {
    return `${(0, compat_1.getHostDashboardBaseUrl)(this.provider)}/app/${appId}`;
  }
}

exports.SquareHostAdapter = SquareHostAdapter;
