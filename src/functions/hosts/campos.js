"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.CamposHostAdapter = void 0;

const camposcloud_sdk_1 = require("../camposcloud-sdk");
const compat_1 = require("./compat");
const release_1 = require("./release");

class CamposHostAdapter {
  constructor(options) {
    this.provider = compat_1.HOST_PROVIDERS.CAMPOS;
    this.options = options;
  }

  async getSdk() {
    const sdk = await camposcloud_sdk_1.default.getInstance(
      this.options.ownerDiscordUserId,
    );

    if (!sdk || !sdk.isValid) {
      throw new Error("Não foi possível conectar ao host configurado.");
    }

    return sdk;
  }

  async validateCredentials() {
    const sdk = await this.getSdk();
    const account = await this.getAccount();
    return { isValid: Boolean(sdk.isValid), account };
  }

  async getAccount() {
    const sdk = await this.getSdk();
    const data = await sdk.instance.getMe();
    return {
      provider: this.provider,
      id: data._id,
      name: data.name || "",
      email: data.email || "",
      raw: data,
    };
  }

  async getPlanUsage() {
    const planUsage = await camposcloud_sdk_1.default.getPlanUsage(
      this.options.ownerDiscordUserId,
    );

    if (!planUsage) {
      return null;
    }

    return {
      provider: this.provider,
      totalMemory: planUsage.totalMemory,
      freeMemoryMB: planUsage.freeMemoryMB,
      usedMemoryMB: planUsage.usedMemoryMB,
      utilizedMemoryPercentage: planUsage.utilizedMemoryPercentage,
      endAt: planUsage.endAt,
      raw: planUsage,
    };
  }

  async listWorkspaces() {
    const sdk = await this.getSdk();
    const teams = await sdk.instance.getTeams().catch(() => []);
    return (teams || []).map((team) => ({
      id: team._id,
      name: team.name,
      raw: team,
    }));
  }

  async getApplication(appId) {
    const sdk = await this.getSdk();
    const application = await sdk.instance
      .getApplication({ appId })
      .catch(() => null);

    if (!application) {
      return null;
    }

    const data = application.data;

    return {
      id: data._id,
      name: data.name,
      memoryMB: data.allocatedMemoryMB,
      startupCommand: data.startupCommand,
      runtimeEnvironment: data.runtimeEnvironment,
      raw: data,
      remote: application,
    };
  }

  async getApplicationStatus(appId) {
    const application = await this.getApplication(appId);

    if (!application) {
      return null;
    }

    const metrics = (application.raw || {}).currentResourceMetrics || {};

    return {
      provider: this.provider,
      running: Boolean(metrics.online),
      status: metrics.online ? "running" : "stopped",
      uptime: metrics.uptime || 0,
      cpu: null,
      ram: metrics.memoryUsageBytes || 0,
      storage: null,
      network: null,
      memoryBytes: metrics.memoryUsageBytes || 0,
      memoryLimitBytes: metrics.memoryLimitBytes || 0,
      raw: metrics,
      application,
    };
  }

  async createApplication(options) {
    const sdk = await this.getSdk();
    const created = await sdk.instance.createApplication({
      appName: options.appName,
      memoryMB: options.memoryMB || release_1.DEFAULT_HOST_MEMORY_MB,
      mainFile: "N/A",
      runtimeEnvironment: options.runtimeEnvironment,
      autoRestartEnabled: true,
      teamId: options.workspaceId || undefined,
      startupCommand: options.startupCommand,
      file: options.file,
      environmentVariables: normalizeEnvironmentVariables(
        options.environmentVariables,
      ),
    });

    return {
      id: created.data._id,
      name: created.data.name,
      raw: created.data,
      remote: created,
    };
  }

  async overwriteEnvironment(appId, options) {
    const application = await this.getApplication(appId);

    if (!application) {
      throw new Error("Aplicação remota não encontrada.");
    }

    await application.remote.updateApplication({
      appName: application.name,
      memoryMB: application.memoryMB || release_1.DEFAULT_HOST_MEMORY_MB,
      runtimeEnvironment: options.runtimeEnvironment,
      startupCommand: options.startupCommand || application.startupCommand,
      environmentVariables: normalizeEnvironmentVariables(
        options.environmentVariables,
      ),
    });

    return true;
  }

  async startApplication(appId) {
    const application = await this.getApplication(appId);

    if (!application) {
      return false;
    }

    await application.remote.start();
    return true;
  }

  async stopApplication(appId) {
    const application = await this.getApplication(appId);

    if (!application) {
      return false;
    }

    await application.remote.stop();
    return true;
  }

  async restartApplication(appId) {
    const application = await this.getApplication(appId);

    if (!application) {
      return false;
    }

    await application.remote.restart();
    return true;
  }

  async deleteApplication(appId) {
    const sdk = await this.getSdk();
    return sdk.instance.deleteApplication({ appId }).catch(() => null);
  }

  async commitApplication(appId, fileBuffer) {
    const application = await this.getApplication(appId);

    if (!application) {
      throw new Error("Aplicação remota não encontrada.");
    }

    await application.remote.uploadFile({ file: fileBuffer, path: "/" });
    return true;
  }

  getApplicationDashboardUrl(appId) {
    return `${(0, compat_1.getHostDashboardBaseUrl)(this.provider)}/${appId}`;
  }
}

exports.CamposHostAdapter = CamposHostAdapter;

function normalizeEnvironmentVariables(environmentVariables = []) {
  return environmentVariables
    .filter((item) => item && item.key)
    .map((item) => ({
      key: String(item.key),
      value: String(item.value == null ? "" : item.value),
    }));
}
