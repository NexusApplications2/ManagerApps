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
const src_1 = __importDefault(require("@root/src"));
const databases_1 = __importDefault(require("@root/src/databases"));
const promises_1 = __importDefault(require("fs/promises"));
const functions_1 = require("@root/src/functions");
const builders_1 = require("@discordjs/builders");
const discord_js_1 = require("discord.js");
const fast_discord_js_1 = require("fast-discord-js");
const bytes_1 = __importDefault(require("bytes"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const pages_1 = __importDefault(require("@root/src/functions/pages"));
const ignore_1 = __importDefault(require("ignore"));
const axios_1 = __importDefault(require("axios"));
const VALID_RUNTIMES = ["nodejs", "python"];
const DISCORD_API = "https://discord.com/api/v10";
const PRODUCT_SETUP_MODES = {
  READY_BOT: "ready_bot",
  DEDICATED_INSTANCE: "dedicated_instance",
  BOTH: "both",
};
const PANEL_MESSAGE_MODES = {
  CONTENT: "content",
  EMBED: "embed",
  CONTAINER: "container",
};
const COMPONENTS_V2_FLAG = 32768;
const DEFAULT_PANEL_MODE = PANEL_MESSAGE_MODES.CONTENT;
const DEFAULT_PANEL_SELECT_PLACEHOLDER = "🛒  Selecione um plano para comprar";
const DEFAULT_LEARN_MORE_BUTTON_LABEL = "Saiba Mais";
const DEFAULT_BUY_OPTION_LABEL = "Comprar";
const PANEL_ACCENT_COLOR = 0x2b2d31;
const DELIVERY_LABELS = {
  [functions_1.PRODUCT_DELIVERY_MODES.SHARED]: "Bot pronto no servidor",
  [functions_1.PRODUCT_DELIVERY_MODES.PRIVATE]: "Bot privado só seu",
};
const GUIDE_DOC_PATH = "docs/integracao-bot-pronto.md";
function clampText(value, fallback, maxLength) {
  const text = String(value || "")
    .trim()
    .slice(0, maxLength);
  if (text) {
    return text;
  }
  return String(fallback || "").slice(0, maxLength);
}
function normalizePanelMode(mode) {
  const normalized = String(mode || "")
    .trim()
    .toLowerCase();
  return Object.values(PANEL_MESSAGE_MODES).includes(normalized)
    ? normalized
    : DEFAULT_PANEL_MODE;
}
function getPanelModeLabel(mode) {
  const normalized = normalizePanelMode(mode);
  if (normalized === PANEL_MESSAGE_MODES.EMBED) {
    return "Embed";
  }
  if (normalized === PANEL_MESSAGE_MODES.CONTAINER) {
    return "Container";
  }
  return "Content";
}
function getProductMessageSettings(product) {
  return (product === null || product === void 0 ? void 0 : product.messageSettings) || {};
}
function getProductPanelContent(product) {
  const settings = getProductMessageSettings(product);
  return String(settings.description || "").trim();
}
function isComponentsV2Payload(payload) {
  return Boolean((payload === null || payload === void 0 ? void 0 : payload.flags) & COMPONENTS_V2_FLAG);
}
function isComponentsV2Message(message) {
  return Boolean((Number((message === null || message === void 0 ? void 0 : message.flags) || 0)) & COMPONENTS_V2_FLAG);
}
/**
 * Monta o payload do painel de venda em content, embed ou Components V2.
 */
function buildMessagePayload(opts) {
  const {
    content,
    banner,
    video,
    saibaMais,
    storeId,
    productId,
    disableButtons,
    prices,
    panelMode,
    selectPlaceholder,
    learnMoreButtonLabel,
    buyLabel,
  } = opts;
  const mode = normalizePanelMode(panelMode);
  const safeContent = String(content || "").trim();
  const safeSelectPlaceholder = clampText(
    selectPlaceholder,
    DEFAULT_PANEL_SELECT_PLACEHOLDER,
    150,
  );
  const safeLearnMoreButtonLabel = clampText(
    learnMoreButtonLabel,
    DEFAULT_LEARN_MORE_BUTTON_LABEL,
    80,
  );
  const safeBuyLabel = clampText(buyLabel, DEFAULT_BUY_OPTION_LABEL, 100);
  // Monta as opções do select com base nos planos configurados
  const planLabels = {
    weekly: "Semanal",
    biweekly: "Quinzenal",
    monthly: "Mensal",
    lifetime: "Vitalício",
  };
  const selectOptions = [];
  const planOptionEmoji = { name: "🛒" };
  if (prices) {
    for (const [key, label] of Object.entries(planLabels)) {
      const val = prices[key];
      if (val) {
        selectOptions.push({
          label: clampText(
            `${label}  —  R$ ${(0, functions_1.moneyFormatter)(val)}`,
            label,
            100,
          ),
          value: key,
          emoji: planOptionEmoji,
        });
      }
    }
  }
  // Fallback caso não haja preços configurados
  if (selectOptions.length === 0) {
    selectOptions.push({
      label: safeBuyLabel,
      value: "default",
      emoji: planOptionEmoji,
    });
  }
  const components = [
    {
      type: 1,
      components: [
        {
          type: 3, // StringSelectMenu
          custom_id: `buy-product:${storeId}:${productId}`,
          placeholder: safeSelectPlaceholder,
          disabled:
            disableButtons !== null && disableButtons !== void 0
              ? disableButtons
              : false,
          options: selectOptions,
        },
      ],
    },
  ];
  // Linha de botões — Saiba Mais (azul) + Vídeo Demonstrativo (link, se configurado)
  const actionButtons = [];
  actionButtons.push({
    type: 2,
    style: 1, // Button primário (azul)
    label: safeLearnMoreButtonLabel,
    custom_id: `saiba-mais:${productId}`,
    emoji: { name: "ℹ️" },
    disabled:
      disableButtons !== null && disableButtons !== void 0
        ? disableButtons
        : false,
  });
  if (video) {
    actionButtons.push({
      type: 2,
      style: 5, // Button link
      label: "Vídeo Demonstrativo",
      url: video,
      emoji: { name: "🎬" },
    });
  }
  components.push({ type: 1, components: actionButtons });
  // Banner como embed (image)
  const embeds = [];
  if (banner) {
    embeds.push({ image: { url: banner } });
  }
  if (mode === PANEL_MESSAGE_MODES.EMBED) {
    const embed = {
      description: safeContent,
      color: PANEL_ACCENT_COLOR,
    };
    if (banner) {
      embed.image = { url: banner };
    }
    return { content: "", embeds: [embed], components };
  }
  if (mode === PANEL_MESSAGE_MODES.CONTAINER) {
    const containerComponents = [];
    if (banner) {
      containerComponents.push({
        type: 12, // MediaGallery
        items: [{ media: { url: banner } }],
      });
    }
    containerComponents.push({
      type: 10, // TextDisplay
      content: safeContent.slice(0, 4000),
    });
    containerComponents.push({ type: 14, divider: true, spacing: 1 });
    containerComponents.push(...components);
    return {
      flags: COMPONENTS_V2_FLAG,
      components: [
        {
          type: 17, // Container
          accent_color: PANEL_ACCENT_COLOR,
          components: containerComponents,
        },
      ],
    };
  }
  return { content: safeContent, embeds, components };
}
function buildProductPanelPayload(product, storeId, productId, extra = {}) {
  const settings = getProductMessageSettings(product);
  return buildMessagePayload(
    Object.assign(
      {
        content: settings.description,
        banner: settings.banner,
        video: settings.video,
        saibaMais: settings.saibaMais,
        storeId,
        productId,
        prices: isManagedServiceProductCompat(product) ? null : product.prices,
        panelMode: settings.panelMode,
        selectPlaceholder: settings.selectPlaceholder,
        learnMoreButtonLabel: settings.learnMoreButtonLabel,
        buyLabel: settings.buttonName,
      },
      extra,
    ),
  );
}
function inferRuntimeFromCommand(command) {
  const normalized = String(command || "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return functions_1.DEFAULT_RUNTIME;
  }
  if (normalized.startsWith("python")) {
    return "python";
  }
  return "nodejs";
}
function isManagedServiceProductCompat(product) {
  return (0, functions_1.isManagedServiceProduct)(product);
}
function getConfiguredDeliveryModesCompat(product) {
  return (0, functions_1.getConfiguredDeliveryModes)(product);
}
function getDeliveryConfig(product, mode) {
  return (0, functions_1.getProductDeliveryConfig)(product, mode);
}
function getReadyBotConfig(product) {
  return getDeliveryConfig(product, functions_1.PRODUCT_DELIVERY_MODES.SHARED);
}
function getDedicatedConfig(product) {
  return getDeliveryConfig(product, functions_1.PRODUCT_DELIVERY_MODES.PRIVATE);
}
function getSetupModeFromProduct(product) {
  const modes = getConfiguredDeliveryModesCompat(product);
  const hasReadyBot = modes.includes(functions_1.PRODUCT_DELIVERY_MODES.SHARED);
  const hasDedicated = modes.includes(functions_1.PRODUCT_DELIVERY_MODES.PRIVATE);
  if (hasReadyBot && hasDedicated) {
    return PRODUCT_SETUP_MODES.BOTH;
  }
  if (hasReadyBot) {
    return PRODUCT_SETUP_MODES.READY_BOT;
  }
  return PRODUCT_SETUP_MODES.DEDICATED_INSTANCE;
}
function getDeliveryModeLabel(mode) {
  return DELIVERY_LABELS[mode] || "Bot privado só seu";
}
function getSetupModeLabel(mode) {
  if (mode === PRODUCT_SETUP_MODES.READY_BOT) {
    return "Bot pronto no servidor";
  }
  if (mode === PRODUCT_SETUP_MODES.BOTH) {
    return "Bot pronto + bot privado só seu";
  }
  return "Bot privado só seu";
}
function getSetupModeDescription(mode) {
  if (mode === PRODUCT_SETUP_MODES.READY_BOT) {
    return "O cliente convida o bot para o servidor e ativa uma key no /resgatar-key.";
  }
  if (mode === PRODUCT_SETUP_MODES.BOTH) {
    return "O cliente escolhe entre usar o bot pronto ou ter um bot privado só dele.";
  }
  return "O cliente recebe um bot separado, só para ele, hospedado pelo manager.";
}
function getSetupModeBooleans(mode) {
  return {
    enableReadyBot:
      mode === PRODUCT_SETUP_MODES.READY_BOT || mode === PRODUCT_SETUP_MODES.BOTH,
    enableDedicated:
      mode === PRODUCT_SETUP_MODES.DEDICATED_INSTANCE ||
      mode === PRODUCT_SETUP_MODES.BOTH,
  };
}
function supportsSharedTrial(product) {
  return (
    isManagedServiceProductCompat(product) &&
    getConfiguredDeliveryModesCompat(product).includes(
      functions_1.PRODUCT_DELIVERY_MODES.SHARED,
    )
  );
}
function getTrialDurationDays(product) {
  const value = Number((((product || {}).redeemSettings || {}).days) || 1);
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return Math.max(1, Math.floor(value));
}
function formatTrialDaysLabel(days) {
  return `${days} dia${days === 1 ? "" : "s"}`;
}
function buildTrialDefaultTitle(product) {
  return `Teste Gratis - ${product.name}`;
}
function buildTrialDefaultDescription(product) {
  const days = getTrialDurationDays(product);
  return (
    `Experimente **${product.name}** gratuitamente por **${formatTrialDaysLabel(days)}**.\n` +
    "Clique no botao **Testar Bot** para receber uma key temporaria e ativar via `/resgatar-key`."
  );
}
function getTrialInviteUrl(product) {
  return (0, functions_1.buildSharedBotInviteUrl)({ product });
}
function formatPriceTableLine(priceTable) {
  const labels = {
    weekly: "Semanal",
    biweekly: "Quinzenal",
    monthly: "Mensal",
    lifetime: "Vitalício",
  };
  const parts = Object.entries(labels)
    .filter(([key]) => Number(priceTable === null || priceTable === void 0 ? void 0 : priceTable[key]) > 0)
    .map(([key, label]) => `${label}: R$ ${(0, functions_1.moneyFormatter)(priceTable[key])}`);
  return parts.length ? parts.join(" • ") : "Não configurado";
}
function buildProductChecklist(product) {
  const checklist = [];
  const readyBotConfig = getReadyBotConfig(product);
  const dedicatedConfig = getDedicatedConfig(product);
  const configuredModes = getConfiguredDeliveryModesCompat(product);

  checklist.push(
    configuredModes.includes(functions_1.PRODUCT_DELIVERY_MODES.SHARED)
      ? `\`🟢\`・Bot pronto no servidor habilitado`
      : `\`⚪\`・Bot pronto no servidor desativado`,
  );
  checklist.push(
    configuredModes.includes(functions_1.PRODUCT_DELIVERY_MODES.PRIVATE)
      ? `\`🟢\`・Bot privado só seu habilitado`
      : `\`⚪\`・Bot privado só seu desativado`,
  );

  if (configuredModes.includes(functions_1.PRODUCT_DELIVERY_MODES.SHARED)) {
    const clientId =
      ((readyBotConfig === null || readyBotConfig === void 0 ? void 0 : readyBotConfig.accessBot) || {}).clientId ||
      (0, functions_1.resolveSharedBotClientId)(product);
    checklist.push(
      clientId
        ? `\`🟢\`・Client ID do bot pronto configurado`
        : `\`🟡\`・Falta informar o Client ID do bot pronto`,
    );
    checklist.push(
      `\`💵\`・Valores do bot pronto: \`${formatPriceTableLine((readyBotConfig === null || readyBotConfig === void 0 ? void 0 : readyBotConfig.prices) || {})}\``,
    );
  }

  if (configuredModes.includes(functions_1.PRODUCT_DELIVERY_MODES.PRIVATE)) {
    checklist.push(
      `\`💵\`・Valores do bot privado: \`${formatPriceTableLine((dedicatedConfig === null || dedicatedConfig === void 0 ? void 0 : dedicatedConfig.prices) || product.prices || {})}\``,
    );
    checklist.push(
      `\`📂\`・Pasta do bot privado: \`${(dedicatedConfig === null || dedicatedConfig === void 0 ? void 0 : dedicatedConfig.sourcePath) || process.env.MANAGED_SERVICE_SOURCE_PATH || "Padrão do sistema"}\``,
    );
    checklist.push(
      `\`⚙️\`・Comando do bot privado: \`${(dedicatedConfig === null || dedicatedConfig === void 0 ? void 0 : dedicatedConfig.runCommand) || product.runCommand || functions_1.DEFAULT_RUN_COMMAND}\``,
    );
  }

  return checklist;
}
function buildServiceSetupModal(modalCustomId, product) {
  const setupMode = getSetupModeFromProduct(product);
  const readyBotConfig = getReadyBotConfig(product);
  const dedicatedConfig = getDedicatedConfig(product);
  const clientId =
    ((readyBotConfig === null || readyBotConfig === void 0 ? void 0 : readyBotConfig.accessBot) || {}).clientId ||
    (0, functions_1.resolveSharedBotClientId)(product) ||
    "";
  const runCommand =
    (dedicatedConfig === null || dedicatedConfig === void 0 ? void 0 : dedicatedConfig.runCommand) ||
    product.runCommand ||
    functions_1.DEFAULT_RUN_COMMAND;
  const sourcePath =
    (dedicatedConfig === null || dedicatedConfig === void 0 ? void 0 : dedicatedConfig.sourcePath) ||
    process.env.MANAGED_SERVICE_SOURCE_PATH ||
    "";
  return new builders_1.ModalBuilder()
    .setCustomId(modalCustomId)
    .setTitle("Configuração rápida do produto")
    .addLabelComponents(
      new builders_1.LabelBuilder()
        .setLabel("Como o cliente recebe esse produto?")
        .setDescription("Escolha a forma de entrega de modo descritivo.")
        .setRadioGroupComponent(
          new builders_1.RadioGroupBuilder()
            .setCustomId("deliveryMode")
            .setRequired(true)
            .addOptions(
              new builders_1.RadioGroupOptionBuilder()
                .setLabel("Bot pronto no servidor")
                .setValue(PRODUCT_SETUP_MODES.READY_BOT)
                .setDescription("O cliente convida o bot e ativa a licença no /resgatar-key.")
                .setDefault(setupMode === PRODUCT_SETUP_MODES.READY_BOT),
              new builders_1.RadioGroupOptionBuilder()
                .setLabel("Bot privado só seu")
                .setValue(PRODUCT_SETUP_MODES.DEDICATED_INSTANCE)
                .setDescription("O manager liga um bot separado só para esse cliente.")
                .setDefault(setupMode === PRODUCT_SETUP_MODES.DEDICATED_INSTANCE),
              new builders_1.RadioGroupOptionBuilder()
                .setLabel("Os dois jeitos")
                .setValue(PRODUCT_SETUP_MODES.BOTH)
                .setDescription("O cliente escolhe entre bot pronto ou bot privado só dele.")
                .setDefault(setupMode === PRODUCT_SETUP_MODES.BOTH),
            ),
        ),
      new builders_1.LabelBuilder()
        .setLabel("Client ID do bot pronto")
        .setDescription("Opcional. Deixe vazio para usar o bot padrão do sistema.")
        .setTextInputComponent(
          new builders_1.TextInputBuilder()
            .setCustomId("sharedClientId")
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setRequired(false)
            .setValue(clientId)
            .setPlaceholder("Ex.: 123456789012345678"),
        ),
      new builders_1.LabelBuilder()
        .setLabel("Comando do bot privado")
        .setDescription("Usado quando o cliente recebe um bot separado só dele.")
        .setTextInputComponent(
          new builders_1.TextInputBuilder()
            .setCustomId("runCommand")
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setRequired(false)
            .setValue(runCommand)
            .setPlaceholder("Ex.: node src/index.js"),
        ),
      new builders_1.LabelBuilder()
        .setLabel("Pasta do bot privado")
        .setDescription("Opcional. Deixe vazio para usar a pasta padrão configurada no sistema.")
        .setTextInputComponent(
          new builders_1.TextInputBuilder()
            .setCustomId("sourcePath")
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setRequired(false)
            .setValue(sourcePath)
            .setPlaceholder("Ex.: C:\\Projetos\\MeuBot"),
        ),
    );
}
function buildAddProductWizardModal(storeId) {
  return new builders_1.ModalBuilder()
    .setCustomId(`add-product:${storeId}:submit-modal`)
    .setTitle("Novo produto")
    .addLabelComponents(
      new builders_1.LabelBuilder()
        .setLabel("Como o cliente recebe esse produto?")
        .setDescription("Escolha a forma de entrega. Isso pode ser alterado depois.")
        .setRadioGroupComponent(
          new builders_1.RadioGroupBuilder()
            .setCustomId("deliveryMode")
            .setRequired(true)
            .addOptions(
              new builders_1.RadioGroupOptionBuilder()
                .setLabel("Bot pronto no servidor")
                .setValue(PRODUCT_SETUP_MODES.READY_BOT)
                .setDescription("Cliente convida o bot no servidor e ativa uma licença."),
              new builders_1.RadioGroupOptionBuilder()
                .setLabel("Bot privado só seu")
                .setValue(PRODUCT_SETUP_MODES.DEDICATED_INSTANCE)
                .setDescription("Cliente recebe um bot separado só dele.")
                .setDefault(true),
              new builders_1.RadioGroupOptionBuilder()
                .setLabel("Os dois jeitos")
                .setValue(PRODUCT_SETUP_MODES.BOTH)
                .setDescription("Cliente escolhe entre bot pronto ou bot privado só dele."),
            ),
        ),
      new builders_1.LabelBuilder()
        .setLabel("Nome do produto")
        .setTextInputComponent(
          new builders_1.TextInputBuilder()
            .setCustomId("name")
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder("Ex.: Bot de moderação"),
        ),
      new builders_1.LabelBuilder()
        .setLabel("Client ID do bot pronto")
        .setDescription("Opcional. Só preencha se você já tiver o bot que será convidado.")
        .setTextInputComponent(
          new builders_1.TextInputBuilder()
            .setCustomId("sharedClientId")
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setRequired(false)
            .setPlaceholder("Ex.: 123456789012345678"),
        ),
      new builders_1.LabelBuilder()
        .setLabel("Comando do bot privado")
        .setDescription("Opcional. Se deixar vazio, o manager usa o padrão do sistema.")
        .setTextInputComponent(
          new builders_1.TextInputBuilder()
            .setCustomId("runCommand")
            .setStyle(discord_js_1.TextInputStyle.Short)
            .setRequired(false)
            .setValue(functions_1.DEFAULT_RUN_COMMAND)
            .setPlaceholder("Ex.: node src/index.js"),
        ),
    );
}
function getIntegrationGuideLines(product) {
  const modeLabel = getSetupModeLabel(getSetupModeFromProduct(product));
  return [
    `# Guia rápido do produto ${product.name}`,
    `- Forma atual de entrega: ${modeLabel}`,
    `- Use a base pronta em \`templates/Base Bot\` para subir o bot compartilhado.`,
    `- A base já inclui \`/resgatar-key\`, \`/gerenciar\`, leitura de \`manager_bridge.entitlements\` e helper para bloquear comandos sem licença.`,
    `- Configure \`MANAGER_BRIDGE_MONGO_URI\`, \`MANAGER_BRIDGE_DB_NAME\` e o token do bot no \`.env\` da base.`,
    `- Depois informe o Client ID desse bot na configuração rápida do produto.`,
    `- Guia completo: \`${GUIDE_DOC_PATH}\``,
  ].join("\n");
}
function readPriceFields(fields) {
  return {
    weekly: String(fields.getTextInputValue("weekly") || "")
      .trim()
      .replace(",", "."),
    biweekly: String(fields.getTextInputValue("biweekly") || "")
      .trim()
      .replace(",", "."),
    monthly: String(fields.getTextInputValue("monthly") || "")
      .trim()
      .replace(",", "."),
    lifetime: String(fields.getTextInputValue("lifetime") || "")
      .trim()
      .replace(",", "."),
  };
}
function validatePriceTableInput(priceTable) {
  const values = Object.entries(priceTable || {});
  if (!values.some(([, value]) => value)) {
    throw new Error("Por favor, preencha ao menos um valor.");
  }
  for (const [key, value] of values) {
    if (value && isNaN(Number(value))) {
      throw new Error(
        `O valor ${key} é inválido. Use apenas números, por exemplo: 19.90`,
      );
    }
  }
}
/**
 * Envia mensagem V2 via fetch nativo — sem passar pelo discord.js.
 * Retorna o objeto da mensagem criada.
 */
function discordPost(token, path, body) {
  return __awaiter(this, void 0, void 0, function* () {
    const res = yield fetch(`${DISCORD_API}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = yield res.text();
      throw new Error(`Discord API ${res.status}: ${err}`);
    }
    return res.json();
  });
}
/**
 * Edita mensagem V2 via fetch nativo.
 */
function discordPatch(token, path, body) {
  return __awaiter(this, void 0, void 0, function* () {
    const res = yield fetch(`${DISCORD_API}${path}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = yield res.text();
      throw new Error(`Discord API ${res.status}: ${err}`);
    }
    return res.json();
  });
}
function discordDelete(token, path) {
  return __awaiter(this, void 0, void 0, function* () {
    const res = yield fetch(`${DISCORD_API}${path}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${token}`,
      },
    });
    if (res.status === 404) {
      return false;
    }
    if (!res.ok) {
      const err = yield res.text();
      throw new Error(`Discord API ${res.status}: ${err}`);
    }
    return true;
  });
}
/**
 * Verifica se uma mensagem existe via fetch nativo.
 */
function discordGetMessage(token, channelId, messageId) {
  return __awaiter(this, void 0, void 0, function* () {
    const res = yield fetch(
      `${DISCORD_API}/channels/${channelId}/messages/${messageId}`,
      {
        headers: { Authorization: `Bot ${token}` },
      },
    );
    if (!res.ok) return null;
    return res.json();
  });
}
new fast_discord_js_1.InteractionHandler({
  customId: "config-products",
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
      const products = yield databases_1.default.products
        .find({ storeId: storeId })
        .catch(() => []);
      const contents = [
        `# Configurando produtos`,
        `- Aqui você poderá adicionar, remover e editar produtos!\n`,
      ];
      const components = [
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Adicionar Produto",
            style: 1,
            customId: `add-product:${storeId}:show-modal`,
            emoji: functions_1.emojis.add,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Atualizar Painel",
            style: 2,
            customId: `config-products:${storeId}`,
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
      if (products.length) {
        components.unshift(
          (0, fast_discord_js_1.CreateRow)([
            new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
              customId: `select-edit-product:${storeId}`,
              options: products.map((product) => ({
                label: `Produto: ${product.name}`,
                value: product._id,
                emoji: functions_1.emojis.settings,
                description: "Clique para editar esse produto",
              })),
              placeholder: "Selecione um produto",
            }),
          ]),
        );
      }
      yield interaction.update({
        content: contents.join("\n"),
        files: [],
        components,
      });
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "add-product",
  run: (_client, interaction, storeId, action) =>
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
      if (action === "show-modal") {
        return interaction.showModal(buildAddProductWizardModal(storeId));
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        const name = interaction.fields.getTextInputValue("name");
        const deliveryMode = interaction.fields.getRadioGroup(
          "deliveryMode",
          true,
        );
        const sharedClientId = String(
          interaction.fields.getTextInputValue("sharedClientId") || "",
        ).trim();
        const runCommand = String(
          interaction.fields.getTextInputValue("runCommand") ||
            functions_1.DEFAULT_RUN_COMMAND,
        ).trim();
        const runtimeEnvironment = inferRuntimeFromCommand(runCommand);
        const { enableReadyBot, enableDedicated } =
          getSetupModeBooleans(deliveryMode);
        const productType = functions_1.PRODUCT_TYPES.MANAGED_SERVICE;
        if (!name) {
          return yield interaction.reply({
            content: "`❌`・Por favor, preencha todos os campos",
            flags: 64,
          });
        }
        if (!VALID_RUNTIMES.includes(runtimeEnvironment)) {
          return yield interaction.reply({
            content:
              "`❌`・Ambiente de execução inválido, utilize: " +
              VALID_RUNTIMES.join(", "),
            flags: 64,
          });
        }
        if (!runCommand) {
          return yield interaction.reply({
            content: "`❌`・Por favor, preencha o comando de execução",
            flags: 64,
          });
        }
        yield databases_1.default.products.create({
          storeId,
          name,
          productType,
          runCommand,
          runtimeEnvironment,
          tiers: {
            shared: {
              enabled: enableReadyBot,
              accessBot: {
                clientId:
                  sharedClientId ||
                  process.env.SHARED_BOT_CLIENT_ID ||
                  "",
                invitePermissions:
                  process.env.SHARED_BOT_INVITE_PERMISSIONS ||
                  "8",
              },
              sharedBot: {
                clientId:
                  sharedClientId ||
                  process.env.SHARED_BOT_CLIENT_ID ||
                  "",
                invitePermissions:
                  process.env.SHARED_BOT_INVITE_PERMISSIONS ||
                  "8",
              },
            },
            private: {
              enabled: enableDedicated,
              runtimeEnvironment,
              runCommand,
              releaseChannel: "local_source",
              sourcePath: process.env.MANAGED_SERVICE_SOURCE_PATH || "",
            },
          },
        });
        yield src_1.default.invokeInteraction(
          `config-products:${storeId}`,
          interaction,
        );
        yield interaction.followUp({
          content:
            "`✅`・Produto criado com sucesso. Abra a configuração rápida para ajustar os valores e a integração.",
          flags: 64,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "select-edit-product",
  run: (client, interaction, storeId) =>
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
      if (!interaction.isAnySelectMenu()) {
        return;
      }
      return client.invokeInteraction(
        `edit-product-handler:${storeId}:${interaction.values[0]}`,
        interaction,
      );
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "edit-product-handler",
  run: (_client, interaction, storeId, productId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a, _b;
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
      const product = yield databases_1.default.products.findOne({
        _id: productId,
        storeId,
      });
      if (!product) {
        return yield interaction.reply({
          content: "`❌`・Produto não encontrado",
          flags: 64,
        });
      }
      const isManagedService = isManagedServiceProductCompat(product);
      const readyBotConfig = getReadyBotConfig(product);
      const dedicatedConfig = getDedicatedConfig(product);
      const setupModeLabel = isManagedService
        ? getSetupModeLabel(getSetupModeFromProduct(product))
        : "Bot privado só seu (legado)";
      const checklist = buildProductChecklist(product);
      const messageSettings = getProductMessageSettings(product);
      const panelModeLabel = getPanelModeLabel(messageSettings.panelMode);
      const nonUpdatedApplications = yield databases_1.default.applications
        .find({ productId, version: { $ne: product.currentReleaseVersion } })
        .countDocuments();
      const contents = [
        `# Editando produto: ${product.name}`,
        `- Use a configuração rápida para ajustar a forma de entrega e os dados principais sem depender de termos técnicos.\n`,
        `\`📝\`・Nome do produto: \`${product.name}\``,
        `\`🧭\`・Forma atual de entrega: \`${setupModeLabel}\``,
        `\`📦\`・Aplicações na fila de update: \`${nonUpdatedApplications}\``,
        `\`🔖\`・Versão atual: \`${product.currentReleaseVersion || "Não configurada"}\``,
        `\`📂\`・Comando principal: \`${(dedicatedConfig === null || dedicatedConfig === void 0 ? void 0 : dedicatedConfig.runCommand) || product.runCommand}\``,
        `\`🖥️\`・Ambiente principal: \`${(dedicatedConfig === null || dedicatedConfig === void 0 ? void 0 : dedicatedConfig.runtimeEnvironment) || product.runtimeEnvironment}\`\n`,
        `\`🖼️\`・Tipo do painel: \`${panelModeLabel}\``,
        `## Checklist rápido`,
        ...checklist,
        "",
        `\`🎁\`・Teste Grátis: \`${((_a = product.redeemSettings) === null || _a === void 0 ? void 0 : _a.active) ? "✅ Ativo" : "❌ Inativo"}\``,
      ];
      const selectOptions = [
        {
          label: "Editar nome",
          value: "name",
          emoji: functions_1.emojis.config,
          description: "Alterar o nome do produto",
        },
        {
          label: "Configuração rápida",
          value: "setup",
          emoji: functions_1.emojis.tools,
          description: "Escolher a forma de entrega e os dados principais",
        },
        {
          label: "Configurar painel",
          value: "message",
          emoji: functions_1.emojis.config,
          description: "Editar conteúdo, mídia e modo visual do painel",
        },
        {
          label: "Textos do painel",
          value: "message-texts",
          emoji: functions_1.emojis.art,
          description: "Editar placeholder, Saiba Mais e opção Comprar",
        },
      ];
      if (isManagedService) {
        if (
          getConfiguredDeliveryModesCompat(product).includes(
            functions_1.PRODUCT_DELIVERY_MODES.SHARED,
          )
        ) {
          selectOptions.push({
            label: "Valores do bot pronto",
            value: "ready-bot-prices",
            emoji: functions_1.emojis.bank,
            description: "Definir os valores para uso via convite no servidor",
          });
        }
        if (
          getConfiguredDeliveryModesCompat(product).includes(
            functions_1.PRODUCT_DELIVERY_MODES.PRIVATE,
          )
        ) {
          selectOptions.push({
            label: "Valores do bot privado",
            value: "dedicated-prices",
            emoji: functions_1.emojis.bank,
            description: "Definir os valores do bot separado do cliente",
          });
          selectOptions.push({
            label: "Ajustes avançados do bot privado",
            value: "dedicated-advanced",
            emoji: functions_1.emojis.settings,
            description: "Editar runtime, comando e origem do projeto",
          });
        }
      } else {
        selectOptions.push(
          {
            label: "Configurar preços",
            value: "prices",
            emoji: functions_1.emojis.bank,
            description: "Editar os valores do produto",
          },
          {
            label: "Configurar comando de execução",
            value: "runCommand",
            emoji: functions_1.emojis.settings,
            description: "Editar o comando de execução do produto",
          },
          {
            label: "Configurar ambiente de execução",
            value: "runtimeEnvironment",
            emoji: functions_1.emojis.settings,
            description: "Editar o ambiente de execução do produto",
          },
        );
      }
      selectOptions.push(
        {
          label: "Guia de integração",
          value: "integration-guide",
          emoji: functions_1.emojis.tools,
          description: "Ver o passo a passo para integrar um bot compartilhado",
        },
        {
          label: "Deletar produto",
          value: "delete",
          emoji: "⚠️",
          description: "Remover o produto permanentemente",
        },
      );
      const components = [
        (0, fast_discord_js_1.CreateRow)([
          new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
            customId: `on-select-edit-product:${storeId}:${productId}`,
            placeholder: "Selecione uma opção",
            options: selectOptions,
          }),
        ]),
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Publicar mensagem",
            style: 1,
            customId: `edit-product-f:${storeId}:${productId}:select-channel-publish`,
            emoji: functions_1.emojis.yes,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Sincronizar mensagem",
            style: 1,
            customId: `edit-product-f:${storeId}:${productId}:sync-message`,
            emoji: functions_1.emojis.reload,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Preview mensagem",
            style: 1,
            customId: `edit-product-f:${storeId}:${productId}:preview`,
            emoji: functions_1.emojis.art,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Gerenciar Aplicações",
            style: 1,
            customId: `send-manage-apps:${storeId}:${productId}:select-channel`,
            emoji: functions_1.emojis.foldder,
          }),
        ]),
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Configuração rápida",
            style: 1,
            customId: `edit-product-f:${storeId}:${productId}:setup-show-modal`,
            emoji: functions_1.emojis.tools,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Guia de integração",
            style: 2,
            customId: `edit-product-f:${storeId}:${productId}:integration-guide`,
            emoji: functions_1.emojis.key,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Publicar Painel de Teste",
            style: 1,
            customId: `edit-product-f:${storeId}:${productId}:trial-select-channel`,
            emoji: functions_1.emojis.gift,
            disabled: !((_b = product.redeemSettings) === null || _b === void 0
              ? void 0
              : _b.active),
          }),
        ]),
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Teste gratis",
            style: 2,
            customId: `edit-product-f:${storeId}:${productId}:redeem-show-modal`,
            emoji: functions_1.emojis.gift,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Atualização Automática",
            style: 2,
            customId: `auto-update:${productId}`,
            emoji: functions_1.emojis.foldder,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Atualizar Painel",
            style: 2,
            customId: `edit-product-handler:${storeId}:${productId}`,
            emoji: functions_1.emojis.reload,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Voltar",
            style: 2,
            customId: `config-products:${storeId}`,
            emoji: functions_1.emojis.back,
          }),
        ]),
      ];
      if (interaction.replied || interaction.deferred) {
        return yield interaction.editReply({
          content: contents.join("\n"),
          files: [],
          components,
        });
      } else {
        return yield interaction.update({
          content: contents.join("\n"),
          files: [],
          components,
        });
      }
    }),
});
/**
 * Bloco responsável por lidar com as interações de edição de produtos
 */
new fast_discord_js_1.InteractionHandler({
  customId: "on-select-edit-product",
  run: (client, interaction, storeId, productId) =>
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
      if (!interaction.isAnySelectMenu()) {
        return;
      }
      const option = interaction.values[0];
      if (option === "name") {
        return client.invokeInteraction(
          `edit-product-f:${storeId}:${productId}:name-show-modal`,
          interaction,
        );
      }
      if (option === "setup") {
        return client.invokeInteraction(
          `edit-product-f:${storeId}:${productId}:setup-show-modal`,
          interaction,
        );
      }
      if (option === "message") {
        return client.invokeInteraction(
          `edit-product-f:${storeId}:${productId}:message-show-modal`,
          interaction,
        );
      }
      if (option === "message-texts") {
        return client.invokeInteraction(
          `edit-product-f:${storeId}:${productId}:message-texts-show-modal`,
          interaction,
        );
      }
      if (option === "prices") {
        return client.invokeInteraction(
          `edit-product-f:${storeId}:${productId}:prices-show-modal`,
          interaction,
        );
      }
      if (option === "ready-bot-prices") {
        return client.invokeInteraction(
          `edit-product-f:${storeId}:${productId}:ready-bot-prices-show-modal`,
          interaction,
        );
      }
      if (option === "dedicated-prices") {
        return client.invokeInteraction(
          `edit-product-f:${storeId}:${productId}:dedicated-prices-show-modal`,
          interaction,
        );
      }
      if (option === "dedicated-advanced") {
        return client.invokeInteraction(
          `edit-product-f:${storeId}:${productId}:setup-show-modal`,
          interaction,
        );
      }
      if (option === "runCommand") {
        return client.invokeInteraction(
          `edit-product-f:${storeId}:${productId}:runCommand-show-modal`,
          interaction,
        );
      }
      if (option === "runtimeEnvironment") {
        return client.invokeInteraction(
          `edit-product-f:${storeId}:${productId}:runtimeEnvironment-show-modal`,
          interaction,
        );
      }
      if (option === "delete") {
        return client.invokeInteraction(
          `edit-product-f:${storeId}:${productId}:delete-show-confirm-modal`,
          interaction,
        );
      }
      if (option === "integration-guide") {
        return client.invokeInteraction(
          `edit-product-f:${storeId}:${productId}:integration-guide`,
          interaction,
        );
      }
      if (option === "sync-file") {
        return client.invokeInteraction(
          `edit-product-f:${storeId}:${productId}:sync-file-show-modal`,
          interaction,
        );
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "edit-product-f",
  run: (client, interaction, storeId, productId, option) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a,
        _b,
        _c,
        _d,
        _e,
        _f,
        _g,
        _h,
        _j,
        _k,
        _l,
        _m,
        _o,
        _p,
        _q,
        _r,
        _s,
        _t,
        _u,
        _v,
        _w,
        _x,
        _y,
        _z,
        _0,
        _1,
        _2,
        _3,
        _4,
        _5,
        _6,
        _7,
        _8,
        _9,
        _10,
        _11,
        _12,
        _13;
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
      const product = yield databases_1.default.products.findOne({
        _id: productId,
        storeId,
      });
      if (!product) {
        return yield interaction.reply({
          content: "`❌`・Produto não encontrado",
          flags: 64,
        });
      }
      if (option === "name-show-modal") {
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: `edit-product-f:${storeId}:${productId}:name-submit-modal`,
          title: "Editando nome",
          inputs: [
            {
              label: "Nome do produto",
              placeholder: "Digite o nome do produto",
              required: true,
              style: discord_js_1.TextInputStyle.Short,
              customId: "name",
              value: product.name,
            },
          ],
        });
        return modal.show(interaction);
      }
      if (option === "name-submit-modal" && interaction.isModalSubmit()) {
        const name = interaction.fields.getTextInputValue("name");
        if (!name) {
          return yield interaction.reply({
            content: "`❌`・Por favor, preencha todos os campos",
            flags: 64,
          });
        }
        yield databases_1.default.products.findByIdAndUpdate(productId, {
          name,
        });
        yield client.invokeInteraction(
          `edit-product-handler:${storeId}:${productId}`,
          interaction,
        );
        return yield interaction.followUp({
          content: "`✅`・Nome do produto editado com sucesso",
          flags: 64,
        });
      }
      if (option === "setup-show-modal") {
        return interaction.showModal(
          buildServiceSetupModal(
            `edit-product-f:${storeId}:${productId}:setup-submit-modal`,
            product,
          ),
        );
      }
      if (option === "setup-submit-modal" && interaction.isModalSubmit()) {
        const deliveryMode = interaction.fields.getRadioGroup(
          "deliveryMode",
          true,
        );
        const sharedClientId = String(
          interaction.fields.getTextInputValue("sharedClientId") || "",
        ).trim();
        const runCommand = String(
          interaction.fields.getTextInputValue("runCommand") ||
            functions_1.DEFAULT_RUN_COMMAND,
        )
          .trim()
          .replace(/\s+/g, " ");
        const sourcePath = String(
          interaction.fields.getTextInputValue("sourcePath") || "",
        ).trim();
        const runtimeEnvironment = inferRuntimeFromCommand(runCommand);
        const { enableReadyBot, enableDedicated } =
          getSetupModeBooleans(deliveryMode);

        if (!VALID_RUNTIMES.includes(runtimeEnvironment)) {
          return yield interaction.reply({
            content:
              "`❌`・Não foi possível identificar o ambiente de execução. Use um comando começando com `node` ou `python`.",
            flags: 64,
          });
        }

        yield databases_1.default.products.findByIdAndUpdate(productId, {
          productType: functions_1.PRODUCT_TYPES.MANAGED_SERVICE,
          runtimeEnvironment,
          runCommand,
          "tiers.shared.enabled": enableReadyBot,
          "tiers.shared.accessBot.clientId": sharedClientId,
          "tiers.shared.accessBot.invitePermissions":
            process.env.SHARED_BOT_INVITE_PERMISSIONS ||
            (((product.tiers || {}).shared || {}).accessBot || {})
              .invitePermissions ||
            (((product.tiers || {}).shared || {}).sharedBot || {})
              .invitePermissions ||
            "8",
          "tiers.shared.sharedBot.clientId": sharedClientId,
          "tiers.shared.sharedBot.invitePermissions":
            process.env.SHARED_BOT_INVITE_PERMISSIONS ||
            (((product.tiers || {}).shared || {}).accessBot || {})
              .invitePermissions ||
            (((product.tiers || {}).shared || {}).sharedBot || {})
              .invitePermissions ||
            "8",
          "tiers.private.enabled": enableDedicated,
          "tiers.private.runtimeEnvironment": runtimeEnvironment,
          "tiers.private.runCommand": runCommand,
          "tiers.private.releaseChannel":
            (((product.tiers || {}).private || {}).releaseChannel) ||
            "local_source",
          "tiers.private.sourcePath":
            sourcePath ||
            (((product.tiers || {}).private || {}).sourcePath) ||
            process.env.MANAGED_SERVICE_SOURCE_PATH ||
            "",
        });
        yield client.invokeInteraction(
          `edit-product-handler:${storeId}:${productId}`,
          interaction,
        );
        return yield interaction.followUp({
          content:
            "`✅`・Configuração rápida atualizada. Agora ajuste os valores da forma de entrega desejada.",
          flags: 64,
        });
      }
      if (option === "ready-bot-prices-show-modal") {
        const priceTable = ((product.tiers || {}).shared || {}).prices || {};
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: `edit-product-f:${storeId}:${productId}:ready-bot-prices-submit-modal`,
          title: "Valores do bot pronto",
          inputs: [
            {
              label: "Preço semanal",
              placeholder: "Ex.: 19.90",
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "weekly",
              value: priceTable.weekly ? String(priceTable.weekly) : undefined,
            },
            {
              label: "Preço quinzenal",
              placeholder: "Ex.: 29.90",
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "biweekly",
              value: priceTable.biweekly
                ? String(priceTable.biweekly)
                : undefined,
            },
            {
              label: "Preço mensal",
              placeholder: "Ex.: 49.90",
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "monthly",
              value: priceTable.monthly ? String(priceTable.monthly) : undefined,
            },
            {
              label: "Preço vitalício",
              placeholder: "Ex.: 199.90",
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "lifetime",
              value: priceTable.lifetime
                ? String(priceTable.lifetime)
                : undefined,
            },
          ],
        });
        return modal.show(interaction);
      }
      if (
        option === "ready-bot-prices-submit-modal" &&
        interaction.isModalSubmit()
      ) {
        try {
          const priceTable = readPriceFields(interaction.fields);
          validatePriceTableInput(priceTable);
          yield databases_1.default.products.findByIdAndUpdate(productId, {
            "tiers.shared.enabled": true,
            "tiers.shared.prices": priceTable,
          });
          yield client.invokeInteraction(
            `edit-product-handler:${storeId}:${productId}`,
            interaction,
          );
          return yield interaction.followUp({
            content: "`✅`・Valores do bot pronto atualizados com sucesso.",
            flags: 64,
          });
        } catch (e) {
          yield client.invokeInteraction(
            `edit-product-handler:${storeId}:${productId}`,
            interaction,
          );
          return yield interaction.followUp({
            content: `\`❌\`・${e.message}`,
            flags: 64,
          });
        }
      }
      if (option === "dedicated-prices-show-modal") {
        const priceTable =
          (((product.tiers || {}).private || {}).prices || product.prices || {});
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: `edit-product-f:${storeId}:${productId}:dedicated-prices-submit-modal`,
          title: "Valores do bot privado",
          inputs: [
            {
              label: "Preço semanal",
              placeholder: "Ex.: 19.90",
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "weekly",
              value: priceTable.weekly ? String(priceTable.weekly) : undefined,
            },
            {
              label: "Preço quinzenal",
              placeholder: "Ex.: 29.90",
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "biweekly",
              value: priceTable.biweekly
                ? String(priceTable.biweekly)
                : undefined,
            },
            {
              label: "Preço mensal",
              placeholder: "Ex.: 49.90",
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "monthly",
              value: priceTable.monthly ? String(priceTable.monthly) : undefined,
            },
            {
              label: "Preço vitalício",
              placeholder: "Ex.: 199.90",
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "lifetime",
              value: priceTable.lifetime
                ? String(priceTable.lifetime)
                : undefined,
            },
          ],
        });
        return modal.show(interaction);
      }
      if (
        option === "dedicated-prices-submit-modal" &&
        interaction.isModalSubmit()
      ) {
        try {
          const priceTable = readPriceFields(interaction.fields);
          validatePriceTableInput(priceTable);
          yield databases_1.default.products.findByIdAndUpdate(productId, {
            prices: priceTable,
            "tiers.private.enabled": true,
            "tiers.private.prices": priceTable,
          });
          yield client.invokeInteraction(
            `edit-product-handler:${storeId}:${productId}`,
            interaction,
          );
          return yield interaction.followUp({
            content: "`✅`・Valores do bot privado atualizados com sucesso.",
            flags: 64,
          });
        } catch (e) {
          yield client.invokeInteraction(
            `edit-product-handler:${storeId}:${productId}`,
            interaction,
          );
          return yield interaction.followUp({
            content: `\`❌\`・${e.message}`,
            flags: 64,
          });
        }
      }
      if (option === "integration-guide") {
        const guide = getIntegrationGuideLines(product);
        if (interaction.isButton()) {
          return interaction.reply({ content: guide, flags: 64 });
        }
        if (interaction.isAnySelectMenu()) {
          return interaction.reply({ content: guide, flags: 64 });
        }
      }
      if (option === "message-show-modal") {
        const messageSettings = getProductMessageSettings(product);
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: `edit-product-f:${storeId}:${productId}:message-submit-modal`,
          title: "Editando mensagem",
          inputs: [
            {
              label: "Tipo da mensagem",
              placeholder: "content, embed ou container",
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "panelMode",
              value: normalizePanelMode(messageSettings.panelMode),
            },
            {
              label: "Mensagem do Saiba Mais",
              placeholder:
                "Digite a mensagem que aparecerá ao clicar em Saiba Mais",
              required: false,
              style: discord_js_1.TextInputStyle.Paragraph,
              customId: "saibaMais",
              value: messageSettings.saibaMais,
            },
            {
              label: "Link do video",
              placeholder: "Digite o link do video",
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "video",
              value: messageSettings.video,
            },
            {
              label: "Link do banner",
              placeholder: "Digite o link do banner",
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "banner",
              value: messageSettings.banner,
            },
            {
              label: "Descrição",
              placeholder: "Digite a descrição",
              required: false,
              style: discord_js_1.TextInputStyle.Paragraph,
              customId: "description",
              value: messageSettings.description,
            },
          ],
        });
        return modal.show(interaction);
      }
      if (option === "message-submit-modal" && interaction.isModalSubmit()) {
        const rawPanelMode =
          (interaction.fields.getTextInputValue("panelMode") || "")
            .trim()
            .toLowerCase();
        if (
          rawPanelMode &&
          !Object.values(PANEL_MESSAGE_MODES).includes(rawPanelMode)
        ) {
          return interaction.reply({
            content:
              "`❌`・Tipo de mensagem inválido. Use: `content`, `embed` ou `container`.",
            flags: 64,
          });
        }
        const panelMode = rawPanelMode || DEFAULT_PANEL_MODE;
        const video =
          ((_e = interaction.fields.getTextInputValue("video")) === null ||
          _e === void 0
            ? void 0
            : _e.trim()) || null;
        const banner =
          ((_f = interaction.fields.getTextInputValue("banner")) === null ||
          _f === void 0
            ? void 0
            : _f.trim()) || null;
        const description =
          ((_g = interaction.fields.getTextInputValue("description")) ===
            null || _g === void 0
            ? void 0
            : _g.trim()) || null;
        // saibaMais precisa de { strict: false } para ser salvo caso não esteja no schema do Mongoose
        const saibaMais =
          ((_h = interaction.fields.getTextInputValue("saibaMais")) === null ||
          _h === void 0
            ? void 0
            : _h.trim()) || null;
        yield databases_1.default.products.findByIdAndUpdate(
          productId,
          {
            $set: {
              "messageSettings.video": video,
              "messageSettings.banner": banner,
              "messageSettings.description": description,
              "messageSettings.saibaMais": saibaMais,
              "messageSettings.panelMode": panelMode,
            },
          },
          { strict: false, new: true },
        );
        yield client.invokeInteraction(
          `edit-product-handler:${storeId}:${productId}`,
          interaction,
        );
        return yield interaction.followUp({
          content:
            "`✅`・Mensagem editada com sucesso! **Não esqueça de sincronizar a mensagem novamente para que tenha efeito.**",
          flags: 64,
        });
      }
      if (option === "message-texts-show-modal") {
        const messageSettings = getProductMessageSettings(product);
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: `edit-product-f:${storeId}:${productId}:message-texts-submit-modal`,
          title: "Textos do painel",
          inputs: [
            {
              label: "Placeholder do select",
              placeholder: DEFAULT_PANEL_SELECT_PLACEHOLDER,
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "selectPlaceholder",
              value: messageSettings.selectPlaceholder,
            },
            {
              label: "Label do botão Saiba Mais",
              placeholder: DEFAULT_LEARN_MORE_BUTTON_LABEL,
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "learnMoreButtonLabel",
              value: messageSettings.learnMoreButtonLabel,
            },
            {
              label: "Label da opção Comprar",
              placeholder: DEFAULT_BUY_OPTION_LABEL,
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "buttonName",
              value: messageSettings.buttonName,
            },
          ],
        });
        return modal.show(interaction);
      }
      if (
        option === "message-texts-submit-modal" &&
        interaction.isModalSubmit()
      ) {
        const selectPlaceholder = clampText(
          interaction.fields.getTextInputValue("selectPlaceholder"),
          DEFAULT_PANEL_SELECT_PLACEHOLDER,
          150,
        );
        const learnMoreButtonLabel = clampText(
          interaction.fields.getTextInputValue("learnMoreButtonLabel"),
          DEFAULT_LEARN_MORE_BUTTON_LABEL,
          80,
        );
        const buttonName = clampText(
          interaction.fields.getTextInputValue("buttonName"),
          DEFAULT_BUY_OPTION_LABEL,
          100,
        );
        yield databases_1.default.products.findByIdAndUpdate(
          productId,
          {
            $set: {
              "messageSettings.selectPlaceholder": selectPlaceholder,
              "messageSettings.learnMoreButtonLabel": learnMoreButtonLabel,
              "messageSettings.buttonName": buttonName,
            },
          },
          { strict: false, new: true },
        );
        yield client.invokeInteraction(
          `edit-product-handler:${storeId}:${productId}`,
          interaction,
        );
        return yield interaction.followUp({
          content:
            "`✅`・Textos do painel editados com sucesso! **Sincronize a mensagem publicada para aplicar.**",
          flags: 64,
        });
      }
      if (option === "prices-show-modal") {
        const { weekly, biweekly, monthly, lifetime } = product.prices || {};
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: `edit-product-f:${storeId}:${productId}:prices-submit-modal`,
          title: "Editando preços",
          inputs: [
            {
              label: "Preço semanal",
              placeholder: "Digite o preço semanal",
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "weekly",
              value: weekly
                ? String(
                    (_j = product.prices) === null || _j === void 0
                      ? void 0
                      : _j.weekly,
                  )
                : undefined,
            },
            {
              label: "Preço quinzenal",
              placeholder: "Digite o preço quinzenal",
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "biweekly",
              value: biweekly
                ? String(
                    (_k = product.prices) === null || _k === void 0
                      ? void 0
                      : _k.biweekly,
                  )
                : undefined,
            },
            {
              label: "Preço mensal",
              placeholder: "Digite o preço mensal",
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "monthly",
              value: monthly
                ? String(
                    (_l = product.prices) === null || _l === void 0
                      ? void 0
                      : _l.monthly,
                  )
                : undefined,
            },
            {
              label: "Preço vitalicio",
              placeholder: "Digite o preço vitalicio",
              required: false,
              style: discord_js_1.TextInputStyle.Short,
              customId: "lifetime",
              value: lifetime
                ? String(
                    (_m = product.prices) === null || _m === void 0
                      ? void 0
                      : _m.lifetime,
                  )
                : undefined,
            },
          ],
        });
        return modal.show(interaction);
      }
      if (option === "prices-submit-modal" && interaction.isModalSubmit()) {
        const weekly =
          (_o = interaction.fields.getTextInputValue("weekly")) === null ||
          _o === void 0
            ? void 0
            : _o.replace(",", ".");
        const biweekly =
          (_p = interaction.fields.getTextInputValue("biweekly")) === null ||
          _p === void 0
            ? void 0
            : _p.replace(",", ".");
        const monthly =
          (_q = interaction.fields.getTextInputValue("monthly")) === null ||
          _q === void 0
            ? void 0
            : _q.replace(",", ".");
        const lifetime =
          (_r = interaction.fields.getTextInputValue("lifetime")) === null ||
          _r === void 0
            ? void 0
            : _r.replace(",", ".");
        try {
          if (!weekly && !biweekly && !monthly && !lifetime) {
            throw new Error("Por favor, preencha ao menos um campo de preço");
          }
          if (weekly && isNaN(Number(weekly))) {
            throw new Error("Preço semanal inválido, utilize apenas números!");
          }
          if (biweekly && isNaN(Number(biweekly))) {
            throw new Error(
              "Preço quinzenal inválido, utilize apenas números!",
            );
          }
          if (monthly && isNaN(Number(monthly))) {
            throw new Error("Preço mensal inválido, utilize apenas números!");
          }
          if (lifetime && isNaN(Number(lifetime))) {
            throw new Error(
              "Preço vitalicio inválido, utilize apenas números!",
            );
          }
          yield databases_1.default.products.findByIdAndUpdate(productId, {
            prices: { weekly, biweekly, monthly, lifetime },
          });
          yield client.invokeInteraction(
            `edit-product-handler:${storeId}:${productId}`,
            interaction,
          );
          return yield interaction.followUp({
            content: "`✅`・Preços editados com sucesso",
            flags: 64,
          });
        } catch (e) {
          yield client.invokeInteraction(
            `edit-product-handler:${storeId}:${productId}`,
            interaction,
          );
          return yield interaction.followUp({
            content: `\`❌\`・${e.message}`,
            flags: 64,
          });
        }
      }
      if (option === "delete-show-confirm-modal") {
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: `edit-product-f:${storeId}:${productId}:delete-submit-modal`,
          title: "Deletando produto",
          inputs: [
            {
              label: "Você tem certeza?",
              placeholder: "Digite 'sim' para confirmar",
              required: true,
              style: discord_js_1.TextInputStyle.Short,
              customId: "confirm",
            },
          ],
        });
        return modal.show(interaction);
      }
      if (option === "runtimeEnvironment-show-modal") {
        const currentRuntime = product.runtimeEnvironment || "nodejs";
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: `edit-product-f:${storeId}:${productId}:runtimeEnvironment-submit-modal`,
          title: "Editando ambiente de execução",
          inputs: [
            {
              label: "Ambiente de execução",
              placeholder: "nodejs, python",
              required: true,
              style: discord_js_1.TextInputStyle.Short,
              customId: "runtimeEnvironment",
              value: currentRuntime,
            },
          ],
        });
        return modal.show(interaction);
      }
      if (
        option === "runtimeEnvironment-submit-modal" &&
        interaction.isModalSubmit()
      ) {
        const runtimeEnvironment =
          interaction.fields.getTextInputValue("runtimeEnvironment");
        if (!VALID_RUNTIMES.includes(runtimeEnvironment)) {
          return yield interaction.reply({
            content:
              "`❌`・Ambiente de execução inválido, utilize: " +
              VALID_RUNTIMES.join(", "),
            flags: 64,
          });
        }
        yield databases_1.default.products.findByIdAndUpdate(productId, {
          runtimeEnvironment,
        });
        yield client.invokeInteraction(
          `edit-product-handler:${storeId}:${productId}`,
          interaction,
        );
        return yield interaction.followUp({
          content: "`✅`・Ambiente de execução editado com sucesso",
          flags: 64,
        });
      }
      if (option === "runCommand-show-modal") {
        const currentrunCommand = product.runCommand || "index.js";
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: `edit-product-f:${storeId}:${productId}:runCommand-submit-modal`,
          title: "Editando comando de execução",
          inputs: [
            {
              label: "Comando de execução",
              placeholder: "index.js, main.py",
              required: true,
              style: discord_js_1.TextInputStyle.Short,
              customId: "runCommand",
              value: currentrunCommand,
            },
          ],
        });
        return modal.show(interaction);
      }
      if (option === "runCommand-submit-modal" && interaction.isModalSubmit()) {
        const runCommand = interaction.fields.getTextInputValue("runCommand");
        if (!runCommand) {
          return yield interaction.reply({
            content: "`❌`・Por favor, preencha todos os campos",
            flags: 64,
          });
        }
        yield databases_1.default.products.findByIdAndUpdate(productId, {
          runCommand,
        });
        yield client.invokeInteraction(
          `edit-product-handler:${storeId}:${productId}`,
          interaction,
        );
        return yield interaction.followUp({
          content: "`✅`・Comando de execução editado com sucesso",
          flags: 64,
        });
      }
      if (option === "delete-submit-modal" && interaction.isModalSubmit()) {
        const confirm = interaction.fields.getTextInputValue("confirm");
        if (confirm !== "sim") {
          return yield interaction.reply({
            content: "`❌`・Confirmação inválida",
            flags: 64,
          });
        }
        const applications = yield databases_1.default.applications.find({
          productId,
        });
        if (applications.length) {
          return yield interaction.reply({
            content: `\`❌\`・Não é possível deletar o produto, pois existem ${applications.length} aplicações atreladas a ele. Por favor, remova as aplicações antes de deletar o produto.`,
            flags: 64,
          });
        }
        yield promises_1.default
          .rm(`releases/${productId}`, { force: true, recursive: true })
          .catch(() => null);
        yield databases_1.default.products.findByIdAndDelete(productId);
        yield client.invokeInteraction(
          `config-products:${storeId}`,
          interaction,
        );
        return yield interaction.followUp({
          content: "`✅`・Produto deletado com sucesso",
          flags: 64,
        });
      }
      if (option === "select-channel-publish") {
        const contents = [
          `# Publicando mensagem`,
          `- Selecione o canal que deseja publicar a mensagem do produto!\n`,
        ];
        const components = [
          (0, fast_discord_js_1.CreateRow)([
            new fast_discord_js_1.CreateSelect().ChannelSelectMenuBuilder({
              customId: `edit-product-f:${storeId}:${productId}:publish`,
              placeholder: "Selecione um canal",
              type: discord_js_1.ChannelType.GuildText,
            }),
          ]),
          (0, fast_discord_js_1.CreateRow)([
            (0, fast_discord_js_1.CreateButton)({
              label: "Cancelar",
              style: 2,
              customId: `edit-product-handler:${storeId}:${productId}`,
              emoji: functions_1.emojis.cancel,
            }),
          ]),
        ];
        return yield interaction.update({
          content: contents.join("\n"),
          files: [],
          components,
        });
      }
      if (option === "publish" && interaction.isAnySelectMenu()) {
        const hasPermissionAdmin =
          (_s = interaction.memberPermissions) === null || _s === void 0
            ? void 0
            : _s.has(discord_js_1.PermissionsBitField.Flags.Administrator);
        if (!hasPermissionAdmin) {
          return yield interaction.reply({
            content:
              "`❌`・Você precisa da permissão de administrador para publicar a mensagem",
            flags: 64,
          });
        }
        const channelId = interaction.values[0];
        const channel =
          (_t = interaction.guild) === null || _t === void 0
            ? void 0
            : _t.channels.cache.get(channelId);
        if (!channel) {
          return yield interaction.reply({
            content: "`❌`・Canal não encontrado",
            flags: 64,
          });
        }
        const content = getProductPanelContent(product);
        if (!content) {
          return interaction.reply({
            content: "`❌`・Mensagem do painel não configurada",
            flags: 64,
          });
        }
        const payload = buildProductPanelPayload(product, storeId, productId);
        const botToken = interaction.client.token;
        try {
          const message = yield discordPost(
            botToken,
            `/channels/${channelId}/messages`,
            payload,
          );
          yield product.updateOne({
            $set: {
              "messageSettings.channelId": channelId,
              "messageSettings.messageId": message.id,
            },
          });
          yield client.invokeInteraction(
            `edit-product-handler:${storeId}:${productId}`,
            interaction,
          );
          yield interaction.followUp({
            content: "`✅`・Mensagem publicada com sucesso",
            flags: 64,
          });
        } catch (e) {
          return interaction.reply({
            content: `\`❌\`・Erro ao publicar mensagem: ${e.message}`,
            flags: 64,
          });
        }
      }
      if (option === "sync-message") {
        const content = getProductPanelContent(product);
        if (!content) {
          return interaction.reply({
            content: "`❌`・Mensagem do painel não configurada",
            flags: 64,
          });
        }
        if (
          !((_2 = product.messageSettings) === null || _2 === void 0
            ? void 0
            : _2.channelId)
        ) {
          return interaction.reply({
            content:
              "`❌`・Canal da mensagem não configurado. Publique a mensagem novamente!",
            flags: 64,
          });
        }
        const syncChannelId = product.messageSettings.channelId;
        const payload = buildProductPanelPayload(product, storeId, productId);
        const botToken = interaction.client.token;
        try {
          const existingMsg = yield discordGetMessage(
            botToken,
            syncChannelId,
            product.messageSettings.messageId,
          );
          if (!existingMsg) {
            const newMessage = yield discordPost(
              botToken,
              `/channels/${syncChannelId}/messages`,
              payload,
            );
            yield databases_1.default.products.findByIdAndUpdate(productId, {
              "messageSettings.messageId": newMessage.id,
            });
            yield interaction.reply({
              content:
                "`✅`・A Mensagem antiga não foi encontrada para ser editada, então o sistema criou outra mensagem automaticamente!",
              flags: 64,
            });
          } else if (
            isComponentsV2Payload(payload) !== isComponentsV2Message(existingMsg)
          ) {
            const newMessage = yield discordPost(
              botToken,
              `/channels/${syncChannelId}/messages`,
              payload,
            );
            yield databases_1.default.products.findByIdAndUpdate(productId, {
              "messageSettings.messageId": newMessage.id,
            });
            yield discordDelete(
              botToken,
              `/channels/${syncChannelId}/messages/${product.messageSettings.messageId}`,
            ).catch(() => null);
            yield interaction.reply({
              content:
                "`✅`・O tipo visual do painel mudou, então a mensagem foi recriada automaticamente.",
              flags: 64,
            });
          } else {
            yield discordPatch(
              botToken,
              `/channels/${syncChannelId}/messages/${product.messageSettings.messageId}`,
              payload,
            );
            yield interaction.reply({
              content: "`✅`・Mensagem sincronizada com sucesso",
              flags: 64,
            });
          }
        } catch (e) {
          return yield interaction.reply({
            content: `\`❌\`・Mensagem não sincronizada: ${e.message}`,
            flags: 64,
          });
        }
      }
      if (option === "preview") {
        const content = getProductPanelContent(product);
        if (!content) {
          return interaction.reply({
            content: "`❌`・Mensagem do painel não configurada",
            flags: 64,
          });
        }
        const payload = buildProductPanelPayload(product, storeId, productId, {
          disableButtons: true,
        });
        const botToken = interaction.client.token;
        try {
          // Envia como ephemeral para preview
          yield discordPost(
            botToken,
            `/webhooks/${interaction.applicationId}/${interaction.token}`,
            Object.assign(Object.assign({}, payload), {
              flags: ((payload === null || payload === void 0 ? void 0 : payload.flags) || 0) | 64,
            }),
          );
        } catch (e) {
          return interaction.reply({
            content: `\`❌\`・Erro ao gerar preview: ${e.message}`,
            flags: 64,
          });
        }
      }
      if (option === "trial-select-channel") {
        // Seleciona o canal onde o painel de teste grátis será publicado
        const contents = [
          `# Publicando Painel de Teste Grátis`,
          `- Selecione o canal onde o painel de teste de **${product.name}** será enviado!\n`,
        ];
        const components = [
          (0, fast_discord_js_1.CreateRow)([
            new fast_discord_js_1.CreateSelect().ChannelSelectMenuBuilder({
              customId: `edit-product-f:${storeId}:${productId}:trial-publish`,
              placeholder: "Selecione um canal",
              type: discord_js_1.ChannelType.GuildText,
            }),
          ]),
          (0, fast_discord_js_1.CreateRow)([
            (0, fast_discord_js_1.CreateButton)({
              label: "Cancelar",
              style: 2,
              customId: `edit-product-handler:${storeId}:${productId}`,
              emoji: functions_1.emojis.cancel,
            }),
          ]),
        ];
        return yield interaction.update({
          content: contents.join("\n"),
          files: [],
          components,
        });
      }
      if (option === "trial-publish" && interaction.isAnySelectMenu()) {
        // Publica o painel de teste grátis em content mode no canal escolhido
        const hasPermissionAdmin =
          (_7 = interaction.memberPermissions) === null || _7 === void 0
            ? void 0
            : _7.has(discord_js_1.PermissionsBitField.Flags.Administrator);
        if (!hasPermissionAdmin) {
          return yield interaction.reply({
            content:
              "`❌`・Você precisa da permissão de administrador para publicar.",
            flags: 64,
          });
        }
        const channelId = interaction.values[0];
        const channel =
          (_8 = interaction.guild) === null || _8 === void 0
            ? void 0
            : _8.channels.cache.get(channelId);
        if (!channel) {
          return yield interaction.reply({
            content: "`❌`・Canal não encontrado.",
            flags: 64,
          });
        }
        const trialTitle =
          ((_9 = product.redeemSettings) === null || _9 === void 0
            ? void 0
            : _9.trialTitle) || `🎁 Teste Grátis — ${product.name}`;
        const trialDesc =
          ((_10 = product.redeemSettings) === null || _10 === void 0
            ? void 0
            : _10.trialDesc) ||
          `Experimente o NioxSallers, basta clicar no botão abaixo e logar com o token do seu bot.
> - O bot irá durar apenas 1 dia!! Mas poderá usar de novo quando expirar!
> - É bem simples e ao abrir o tópico tem um tutorial explicando!
`;
        // Painel em content (sem embed, sem V2) com botão "Testar Bot"
        const trialPayload = {
          content: `${trialTitle}\n\n${trialDesc}`,
          embeds: [],
          components: [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 3, // Success (verde)
                  label: "Testar Bot",
                  custom_id: `free-trial:${storeId}:${productId}:start`,
                  emoji: { name: "🧪" },
                },
              ],
            },
          ],
        };
        const botToken = interaction.client.token;
        try {
          const message = yield discordPost(
            botToken,
            `/channels/${channelId}/messages`,
            trialPayload,
          );
          yield databases_1.default.products.findByIdAndUpdate(
            productId,
            {
              $set: {
                "redeemSettings.trialChannelId": channelId,
                "redeemSettings.trialMessageId": message.id,
              },
            },
            { strict: false },
          );
          yield client.invokeInteraction(
            `edit-product-handler:${storeId}:${productId}`,
            interaction,
          );
          yield interaction.followUp({
            content: "`✅`・Painel de teste grátis publicado com sucesso!",
            flags: 64,
          });
        } catch (e) {
          return interaction.reply({
            content: `\`❌\`・Erro ao publicar: ${e.message}`,
            flags: 64,
          });
        }
      }
      if (option === "redeem-show-modal") {
        // Modal para configurar o painel de teste grátis (título + descrição)
        const currentTitle =
          ((_11 = product.redeemSettings) === null || _11 === void 0
            ? void 0
            : _11.trialTitle) || `🎁 Teste Grátis — ${product.name}`;
        const currentDesc =
          ((_12 = product.redeemSettings) === null || _12 === void 0
            ? void 0
            : _12.trialDesc) ||
          `Experimente **${product.name}** gratuitamente por **1 dia**!\nClique no botão **Testar Bot** para começar.`;
        const isActive = (
          (_13 = product.redeemSettings) === null || _13 === void 0
            ? void 0
            : _13.active
        )
          ? "sim"
          : "não";
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: `edit-product-f:${storeId}:${productId}:redeem-submit-modal`,
          title: "Configurar Teste Grátis",
          inputs: [
            {
              label: "Ativar? (sim / não)",
              placeholder: "sim ou não",
              required: true,
              style: discord_js_1.TextInputStyle.Short,
              customId: "redeemActive",
              value: isActive,
            },
            {
              label: "Título do painel de teste",
              placeholder: "Ex: 🎁 Teste Grátis — MeuBot",
              required: true,
              style: discord_js_1.TextInputStyle.Short,
              customId: "trialTitle",
              value: currentTitle,
            },
            {
              label: "Descrição do painel de teste",
              placeholder: "Descreva o que o usuário irá testar...",
              required: true,
              style: discord_js_1.TextInputStyle.Paragraph,
              customId: "trialDesc",
              value: currentDesc,
            },
          ],
        });
        return modal.show(interaction);
      }
      if (option === "redeem-submit-modal" && interaction.isModalSubmit()) {
        const rawActive = interaction.fields
          .getTextInputValue("redeemActive")
          .toLowerCase()
          .trim();
        const trialTitle = interaction.fields
          .getTextInputValue("trialTitle")
          .trim();
        const trialDesc = interaction.fields
          .getTextInputValue("trialDesc")
          .trim();
        if (!["sim", "não", "nao"].includes(rawActive)) {
          return yield interaction.reply({
            content: "`❌`・Valor inválido — use `sim` ou `não`.",
            flags: 64,
          });
        }
        const active = rawActive === "sim";
        yield databases_1.default.products.findByIdAndUpdate(
          productId,
          {
            $set: {
              "redeemSettings.active": active,
              "redeemSettings.days": 1,
              "redeemSettings.trialTitle": trialTitle,
              "redeemSettings.trialDesc": trialDesc,
            },
          },
          { strict: false, new: true },
        );
        yield client.invokeInteraction(
          `edit-product-handler:${storeId}:${productId}`,
          interaction,
        );
        return yield interaction.followUp({
          content: `\`✅\`・Teste grátis **${active ? "ativado" : "desativado"}** com sucesso!`,
          flags: 64,
        });
      }
    }),
});
/**
 * Bloco responsável por lidar com a proteção de arquivos
 * Essa proteção é feita para que os arquivos não sejam substituidos durante o processo de atualização
 */
new fast_discord_js_1.InteractionHandler({
  customId: "auto-update",
  run: (_client, interaction, productId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      const product = yield databases_1.default.products.findOne({
        _id: productId,
      });
      if (!product) {
        return interaction.reply({
          content: "`❌`・Produto não encontrado",
          flags: 64,
        });
      }
      const hasPermission = yield (0, functions_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: product.storeId.toString(),
        permission: functions_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      const errorOnUpdateApplications = yield databases_1.default.applications
        .find({ productId, errorOnUpdate: true })
        .countDocuments();
      const pendingUpdateApplications = yield databases_1.default.applications
        .find({
          productId,
          version: { $ne: product.currentReleaseVersion },
          errorOnUpdate: false,
        })
        .countDocuments();
      const contents = [
        "# Sistema de atualização",
        `- Aqui você poderá configurar o sistema de atualização automática do produto \`${product.name}\`!\n`,
        `- Versão atual: **${product.currentReleaseVersion}**`,
        `- Aplicações na fila de update: ${pendingUpdateApplications > 0 ? `\`${pendingUpdateApplications} Aplicações 🟡\`` : "`Nenhuma aplicação 🟢`"}`,
        `- Aplicações com erro ao atualizar: ${errorOnUpdateApplications > 0 ? `\`${errorOnUpdateApplications} Aplicações ⚠️\`` : "`Nenhuma aplicação 🟢`"}\n`,
      ];
      const baseButtons = [
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Arquivos protegidos",
            style: 1,
            customId: `change-protected-files:${productId}:show-modal`,
            emoji: functions_1.emojis.settings,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Atualizar aplicações com erro",
            style: 1,
            emoji: functions_1.emojis.copy,
            customId: `force-update-applications:${productId}:show-modal`,
            disabled:
              errorOnUpdateApplications <= 0 ||
              product.needToUpdateApplications,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Status das atualizações",
            style: 1,
            customId: `status-update:${productId}`,
            emoji: functions_1.emojis.foldder,
          }),
        ]),
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Atualizar esse painel",
            style: 2,
            customId: `auto-update:${productId}`,
            emoji: functions_1.emojis.reload,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Voltar ao menu anterior",
            style: 2,
            customId: `edit-product-handler:${product.storeId}:${productId}`,
            emoji: functions_1.emojis.back,
          }),
        ]),
      ];
      const components = [...baseButtons];
      // === Releases ===
      if (
        (_a = product.releases) === null || _a === void 0 ? void 0 : _a.length
      ) {
        product.releases.reverse();
        const options = product.releases.map((release) => {
          const formattedDate = release.date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
          const isCurrent = release.version === product.currentReleaseVersion;
          return {
            label: `Versão: ${release.version}${isCurrent ? " (atual)" : ""}`,
            value: release._id.toString(),
            description: `Enviado: ${formattedDate}`,
            emoji: isCurrent ? "✅" : "🔴",
          };
        });
        // Select de versões
        components.unshift(
          (0, fast_discord_js_1.CreateRow)([
            new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
              customId: `select-release:${productId}`,
              options,
              placeholder: "Selecione uma versão",
              getValueInLastParam: true,
            }),
          ]),
        );
        if (product.currentReleaseVersion) {
          contents.push(
            "-# `⚠️`・Utilize o botão `Arquivos protegidos` para configurar os arquivos que não serão substituídos durante o processo de atualização.",
          );
        } else {
          contents.push(
            "-# `❌`・Ainda não foi especificada uma versão atual do produto, selecione uma versão no select para definir como atual!",
          );
        }
        if (errorOnUpdateApplications > 0) {
          contents.push(
            "-# `⚠️`・Existem aplicações com erro ao atualizar, utilize o botão `Atualizar aplicações com erro` para tentar novamente.",
          );
        }
      } else {
        contents.push(
          "-# `❌`・Nenhuma release encontrada para esse produto! Utilize o comando `/enviar-release` para enviar uma release.",
        );
      }
      // === Resposta ===
      return interaction.update({
        content: contents.join("\n"),
        files: [],
        components,
      });
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "status-update",
  run: (client, interaction, productId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const product = yield databases_1.default.products.findOne({
        _id: productId,
      });
      if (!product) {
        return interaction.reply({
          content: "`❌`・Produto não encontrado",
          flags: 64,
        });
      }
      const pendingUpdateApplications = yield databases_1.default.applications
        .find({ productId, version: { $ne: product.currentReleaseVersion } })
        .sort({ errorOnUpdate: -1 });
      const formatedAllApplications = pendingUpdateApplications.map(
        (application) => {
          var _a;
          const messageList = [
            `Dono: ${application.ownerId} (${((_a = client.users.cache.get(application.ownerId)) === null || _a === void 0 ? void 0 : _a.username) || "Desconhecido"})`,
            `ID da Aplicação: ${application._id}`,
            `Aplicação: ${application.name} - v${application.version}`,
            `Status: ${application.errorOnUpdate ? "Erro ao atualizar ⚠️" : "Atualização pendente 🟡"}`,
          ];
          if (application.errorOnUpdate) {
            messageList.push(
              `Mensagem de erro: ${application.errorOnUpdateMessage || "Nenhuma mensagem de erro"}`,
            );
          }
          return messageList.join("\n");
        },
      );
      const txtContent =
        formatedAllApplications.join("\n\n----\n\n") ||
        "✅・Nenhuma aplicação encontrada, Todas aplicações estão atualizadas!";
      const txtFile = new discord_js_1.AttachmentBuilder(
        Buffer.from(txtContent),
        { name: "status-update.txt" },
      );
      return interaction.reply({
        content: "`✅`・Status das atualizações",
        files: [txtFile],
        flags: 64,
      });
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "force-update-applications",
  run: (client, interaction, productId, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      if (action === "show-modal") {
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: `force-update-applications:${productId}:submit-modal`,
          title: "Atualizar aplicações com erro",
          inputs: [
            {
              label: "Você tem certeza?",
              placeholder: "Digite 'sim' para confirmar",
              required: true,
              style: discord_js_1.TextInputStyle.Short,
              customId: "confirmation",
            },
          ],
        });
        return modal.show(interaction);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        const confirmation =
          interaction.fields.getTextInputValue("confirmation");
        if (confirmation.toLowerCase() !== "sim") {
          return interaction.reply({
            content:
              "`❌`・Confirmação inválida, digite 'sim' para confirmar a atualização.",
            flags: 64,
          });
        }
        try {
          yield databases_1.default.products.findByIdAndUpdate(productId, {
            $set: { needToUpdateApplications: true },
          });
          const update = yield databases_1.default.applications.updateMany(
            { productId, errorOnUpdate: true },
            {
              $set: { errorOnUpdate: false, updateAttempts: 0 },
              $unset: { errorOnUpdateMessage: "" },
            },
          );
          yield client.invokeInteraction(
            `auto-update:${productId}`,
            interaction,
          );
          return interaction.followUp({
            content: `\`✅\`・${update.modifiedCount} aplicações adicionadas a fila de atualização`,
            flags: 64,
          });
        } catch (e) {
          return interaction.reply({
            content: `\`❌\`・Erro ao atualizar aplicações: ${e.message}`,
            flags: 64,
          });
        }
      }
    }),
});
/**
 * Bloco responsável por lidar com a proteção de arquivos
 */
new fast_discord_js_1.InteractionHandler({
  customId: "change-protected-files",
  run: (client, interaction, productId, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const product = yield databases_1.default.products.findOne({
        _id: productId,
      });
      if (!product) {
        return interaction.reply({
          content: "`❌`・Produto não encontrado",
          flags: 64,
        });
      }
      const hasPermission = yield (0, functions_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: product.storeId.toString(),
        permission: functions_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      if (action === "show-modal") {
        const protectedFiles = product.protectedFiles || [];
        const protectedFilesString = protectedFiles.length
          ? protectedFiles.join("\n")
          : undefined;
        const exemples = [
          "Exemplo:",
          "databases/*.json (ignora todos .json da pasta databases)",
        ];
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: `change-protected-files:${productId}:submit-modal`,
          title: "Arquivos protegidos",
          inputs: [
            {
              label: "Arquivos protegidos",
              placeholder: exemples.join("\n"),
              required: false,
              style: discord_js_1.TextInputStyle.Paragraph,
              customId: "protectedFiles",
              value: protectedFilesString,
            },
          ],
        });
        return modal.show(interaction);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        const protectedFilesInput =
          interaction.fields.getTextInputValue("protectedFiles");
        const protectedFiles = protectedFilesInput
          .split("\n")
          .map((file) => file.trim())
          .filter((file) => file.length > 0);
        yield databases_1.default.products.findByIdAndUpdate(productId, {
          protectedFiles,
        });
        yield client.invokeInteraction(`auto-update:${productId}`, interaction);
        return interaction.followUp({
          content: "`✅`・Arquivos protegidos atualizados com sucesso",
          flags: 64,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "select-release",
  run: (_client, interaction, productId, releaseId, _page) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      const product = yield databases_1.default.products.findOne({
        _id: productId,
      });
      if (!product) {
        return interaction.reply({
          content: "`❌`・Produto não encontrado",
          flags: 64,
        });
      }
      const hasPermission = yield (0, functions_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: product.storeId.toString(),
        permission: functions_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      const release =
        (_a = product.releases) === null || _a === void 0
          ? void 0
          : _a.find((r) => r._id.toString() === releaseId);
      if (!release) {
        return interaction.reply({
          content: "`❌`・Release não encontrada",
          flags: 64,
        });
      }
      const page = _page ? Number(_page) : 1;
      if (isNaN(page) || page < 0) {
        return interaction.reply({
          content: "`❌`・Página inválida",
          flags: 64,
        });
      }
      const releaseFormatedDate = release.date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const releaseFileStat = yield promises_1.default
        .stat(release.path)
        .catch(() => null);
      const contents = [
        `# Detalhes da Release ${release.version}`,
        `- Enviada em: \`${releaseFormatedDate}\``,
        `- Tamanho do arquivo: \`${releaseFileStat ? `${(0, bytes_1.default)(releaseFileStat.size, { unitSeparator: " " })}` : "Desconhecido"}\`\n`,
        `- **Legendas:**`,
        `> \`🟢\`・Arquivo protegido, não será substituído durante o processo de atualização.`,
        `> \`🔴\`・Arquivo não protegido, será substituído durante o processo de atualização.\n`,
      ];
      if (product.needToUpdateApplications) {
        contents.push(
          "> -# `⚠️`・**O sistema de atualização está em andamento, não é possível alterar a release até que seja concluído.**\n",
        );
      }
      if (!releaseFileStat) {
        contents.push(
          "-# `❌`・Arquivo não encontrado, verifique se a release foi enviada corretamente.",
        );
      }
      const isCurrentRelease =
        release.version === product.currentReleaseVersion;
      if (isCurrentRelease) {
        contents.push("-# `✅`・Essa é a versão atual do produto");
      } else {
        contents.push(
          "> -# `⚠️`・Essa não é a versão atual do produto, utilize o botão `Definir como atual` para definir essa versão como a atual. Após fazer isso, o sistema irá atualizar automaticamente as aplicações para essa versão.\n",
        );
        contents.push(
          '> -# `⚠️`・Antes de trocar a release do produto, confirme se os "Arquivos protegidos" foram devidamente configurados, caso contrário, poderá ocorrer perda de dados ou arquivos importantes que não devem ser substituídos.',
        );
      }
      const productFiles = new adm_zip_1.default(
        `./releases/${productId}/${release.version}.zip`,
      );
      const ig = (0, ignore_1.default)().add(product.protectedFiles || []);
      const options = productFiles.getEntries().map((entry) => {
        const _protected = ig.ignores(entry.entryName);
        return {
          label: entry.entryName,
          value: entry.entryName,
          emoji: _protected ? "🟢" : "🔴",
          description: `${_protected ? "Esse arquivo está protegido, não será substituido" : "Esse arquivo será substituido no BOT do cliente"}・${(0, bytes_1.default)(entry.header.size, { unitSeparator: " " })}`,
        };
      });
      const pageSystem = new pages_1.default({
        data: options,
        maxItemPerPage: 25,
      });
      const components = [
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: " ",
            emoji: "⬅️",
            style: 1,
            customId: `select-release:${productId}:${release._id.toString()}:${page - 1}`,
            disabled: page <= 1,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: `Pagina ${page}/${pageSystem.totalPages}`,
            style: 2,
            customId: `N/A`,
            disabled: true,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: " ",
            emoji: "➡️",
            style: 1,
            customId: `select-release:${productId}:${release._id.toString()}:${page + 1}`,
            disabled: page >= pageSystem.totalPages,
          }),
        ]),
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Definir como atual",
            style: 1,
            customId: `set-current-release:${productId}:${release._id.toString()}:show-modal`,
            emoji: functions_1.emojis.yes,
            disabled: isCurrentRelease || product.needToUpdateApplications,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Baixar release",
            style: 1,
            customId: `download-release:${productId}:${release._id.toString()}`,
            emoji: functions_1.emojis.foldder,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Excluir release",
            style: 4,
            customId: `delete-release:${productId}:${release._id.toString()}:show-modal`,
            emoji: functions_1.emojis.trash,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Atualizar painel",
            style: 2,
            customId: `select-release:${productId}:${release._id.toString()}:${page}`,
            emoji: functions_1.emojis.reload,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Voltar",
            style: 2,
            customId: `auto-update:${productId}`,
            emoji: functions_1.emojis.back,
          }),
        ]),
      ];
      if (options.length) {
        components.unshift(
          (0, fast_discord_js_1.CreateRow)([
            new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
              customId: `select-release-files:${productId}:${release._id.toString()}`,
              placeholder: "Nenhum arquivo encontrado",
              options: pageSystem.getPage(page),
            }),
          ]),
        );
      }
      return interaction.update({
        content: contents.join("\n"),
        files: [],
        components,
      });
    }),
});
/**
 * Bloco responsável por excluir uma release
 */
new fast_discord_js_1.InteractionHandler({
  customId: "delete-release",
  run: (client, interaction, productId, releaseId, option) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      const product = yield databases_1.default.products.findOne({
        _id: productId,
      });
      if (!product) {
        return interaction.reply({
          content: "`❌`・Produto não encontrado",
          flags: 64,
        });
      }
      const hasPermission = yield (0, functions_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: product.storeId.toString(),
        permission: functions_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      const release =
        (_a = product.releases) === null || _a === void 0
          ? void 0
          : _a.find((r) => r._id.toString() === releaseId);
      if (!release) {
        return interaction.reply({
          content: "`❌`・Release não encontrada",
          flags: 64,
        });
      }
      const isCurrentRelease =
        release.version === product.currentReleaseVersion;
      if (isCurrentRelease) {
        return interaction.reply({
          content:
            "`❌`・Não é possível excluir a versão atual do produto, defina outra versão como atual antes de excluir essa.",
          flags: 64,
        });
      }
      if (option === "show-modal") {
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: `delete-release:${productId}:${releaseId}:submit-modal`,
          title: "Deletando Release",
          inputs: [
            {
              label: "Você tem certeza?",
              placeholder: "Digite 'sim' para confirmar",
              required: true,
              style: discord_js_1.TextInputStyle.Short,
              customId: "confirm",
            },
          ],
        });
        return modal.show(interaction);
      }
      if (option === "submit-modal" && interaction.isModalSubmit()) {
        const confirm = interaction.fields.getTextInputValue("confirm");
        if (confirm.toLowerCase() !== "sim") {
          return interaction.reply({
            content:
              "`❌`・Confirmação inválida, digite 'sim' para confirmar a exclusão.",
            flags: 64,
          });
        }
        yield databases_1.default.products.findByIdAndUpdate(productId, {
          $pull: { releases: { _id: releaseId } },
        });
        yield promises_1.default
          .rm(release.path, { force: true })
          .catch(() => null);
        yield client.invokeInteraction(`auto-update:${productId}`, interaction);
        return interaction.followUp({
          content: "`✅`・Release deletada com sucesso",
          flags: 64,
        });
      }
    }),
});
/**
 * Bloco responsável por baixar uma release
 */
new fast_discord_js_1.InteractionHandler({
  customId: "download-release",
  run: (client, interaction, productId, releaseId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      const product = yield databases_1.default.products.findOne({
        _id: productId,
      });
      if (!product) {
        return interaction.reply({
          content: "`❌`・Produto não encontrado",
          flags: 64,
        });
      }
      const hasPermission = yield (0, functions_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: product.storeId.toString(),
        permission: functions_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      const release =
        (_a = product.releases) === null || _a === void 0
          ? void 0
          : _a.find((r) => r._id.toString() === releaseId);
      if (!release) {
        return interaction.reply({
          content: "`❌`・Release não encontrada",
          flags: 64,
        });
      }
      const releaseFileStat = yield promises_1.default
        .stat(release.path)
        .catch(() => null);
      if (!releaseFileStat) {
        return interaction.reply({
          content:
            "`❌`・Arquivo não encontrado, verifique se a release foi enviada corretamente.",
          flags: 64,
        });
      }
      const fileName = `release-${productId}-${release.version}.zip`;
      const fileBuffer = yield promises_1.default
        .readFile(release.path)
        .catch(() => null);
      if (!fileBuffer) {
        return interaction.reply({
          content:
            "`❌`・Erro ao ler o arquivo da release, verifique se a release foi enviada corretamente.",
          flags: 64,
        });
      }
      yield interaction.reply({
        content:
          "`✅`・Download iniciado, clique no link abaixo para baixar a release.",
        files: [{ attachment: fileBuffer, name: fileName }],
        flags: 64,
      });
    }),
});
/**
 * Bloco responsável por definir uma release como a atual
 */
new fast_discord_js_1.InteractionHandler({
  customId: "set-current-release",
  run: (client, interaction, productId, releaseId, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a;
      const product = yield databases_1.default.products.findOne({
        _id: productId,
      });
      if (!product) {
        return interaction.reply({
          content: "`❌`・Produto não encontrado",
          flags: 64,
        });
      }
      if (product.needToUpdateApplications) {
        return interaction.reply({
          content:
            "`❌`・Não é possível definir uma versão atual, pois o sistema de atualização está em andamento.",
          flags: 64,
        });
      }
      const hasPermission = yield (0, functions_1.getUserHasPermissionOnStore)({
        userId: interaction.user.id,
        storeId: product.storeId.toString(),
        permission: functions_1.PermissionsStore.ADMIN,
      });
      if (!hasPermission) {
        return interaction.reply({
          content: "`❌`・Você não tem permissão para usar este comando.",
          flags: 64,
        });
      }
      const release =
        (_a = product.releases) === null || _a === void 0
          ? void 0
          : _a.find((r) => r._id.toString() === releaseId);
      if (!release) {
        return interaction.reply({
          content: "`❌`・Release não encontrada",
          flags: 64,
        });
      }
      if (release.version === product.currentReleaseVersion) {
        return interaction.reply({
          content: "`❌`・Essa já é a versão atual do produto",
          flags: 64,
        });
      }
      if (action === "show-modal") {
        const modal = (0, fast_discord_js_1.CreateModal)({
          customId: `set-current-release:${productId}:${releaseId}:confirm-modal`,
          title: "Definindo versão atual",
          inputs: [
            {
              label: "Você tem certeza?",
              placeholder: "Digite 'sim' para confirmar",
              required: true,
              style: discord_js_1.TextInputStyle.Short,
              customId: "confirm",
            },
          ],
        });
        return modal.show(interaction);
      }
      if (action === "confirm-modal" && interaction.isModalSubmit()) {
        const confirm = interaction.fields.getTextInputValue("confirm");
        if (confirm.toLowerCase() !== "sim") {
          return interaction.reply({
            content:
              "`❌`・Confirmação inválida, digite 'sim' para confirmar a definição da versão atual.",
            flags: 64,
          });
        }
        yield databases_1.default.products.findByIdAndUpdate(productId, {
          currentReleaseVersion: release.version,
          needToUpdateApplications: true,
        });
        yield databases_1.default.applications.updateMany(
          { productId: productId },
          {
            $set: { updateAttempts: 0, errorOnUpdate: false },
            $unset: { errorOnUpdateMessage: "" },
          },
        );
        yield client.invokeInteraction(
          `select-release:${productId}:${releaseId}`,
          interaction,
        );
        return interaction.followUp({
          content:
            "`✅`・Versão atual definida com sucesso. O processo de atualização será iniciado em breve!",
          flags: 64,
        });
      }
    }),
});
/**
 * Handler do botão "Saiba Mais"
 * Responde com a mensagem ephemeral configurada nas settings do produto.
 */
new fast_discord_js_1.InteractionHandler({
  customId: "saiba-mais",
  run: (_client, interaction, productId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a, _b;
      // .lean() retorna o documento como objeto JS puro, incluindo campos fora do schema
      const product = yield databases_1.default.products
        .findById(productId)
        .lean();
      if (!product) {
        return interaction.reply({
          content: "`❌`・Produto não encontrado.",
          flags: 64,
        });
      }
      const saibaMais =
        (_b =
          (_a = product.messageSettings) === null || _a === void 0
            ? void 0
            : _a.saibaMais) === null || _b === void 0
          ? void 0
          : _b.trim();
      if (!saibaMais) {
        return interaction.reply({
          content:
            "`❌`・Nenhuma informação adicional foi configurada para este produto.",
          flags: 64,
        });
      }
      return interaction.reply({ content: saibaMais, flags: 64 });
    }),
});
/**
 * Handler do botão "Gerenciar Aplicações"
 * Permite ao admin selecionar um canal e enviar uma embed com o botão de gerenciamento.
 * Ao clicar no botão da embed, o usuário acessa o painel invoke-apps (comando /apps).
 */
new fast_discord_js_1.InteractionHandler({
  customId: "send-manage-apps",
  run: (client, interaction, storeId, productId, option) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a, _b;
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
      const product = yield databases_1.default.products.findOne({
        _id: productId,
        storeId,
      });
      if (!product) {
        return interaction.reply({
          content: "`❌`・Produto não encontrado.",
          flags: 64,
        });
      }
      // Etapa 1: Selecionar canal onde a embed será enviada
      if (option === "select-channel") {
        const contents = [
          `# Painel de Gerenciamento de Aplicações`,
          `- Selecione o canal onde deseja enviar o painel de gerenciamento para o produto **${product.name}**!\n`,
        ];
        const components = [
          (0, fast_discord_js_1.CreateRow)([
            new fast_discord_js_1.CreateSelect().ChannelSelectMenuBuilder({
              customId: `send-manage-apps:${storeId}:${productId}:publish`,
              placeholder: "Selecione um canal",
              type: discord_js_1.ChannelType.GuildText,
            }),
          ]),
          (0, fast_discord_js_1.CreateRow)([
            (0, fast_discord_js_1.CreateButton)({
              label: "Cancelar",
              style: 2,
              customId: `edit-product-handler:${storeId}:${productId}`,
              emoji: functions_1.emojis.cancel,
            }),
          ]),
        ];
        return yield interaction.update({
          content: contents.join("\n"),
          files: [],
          components,
        });
      }
      // Etapa 2: Publicar o painel V2 no canal selecionado
      if (option === "publish" && interaction.isAnySelectMenu()) {
        const hasPermissionAdmin =
          (_a = interaction.memberPermissions) === null || _a === void 0
            ? void 0
            : _a.has(discord_js_1.PermissionsBitField.Flags.Administrator);
        if (!hasPermissionAdmin) {
          return interaction.reply({
            content:
              "`❌`・Você precisa da permissão de administrador para publicar o painel.",
            flags: 64,
          });
        }
        const channelId = interaction.values[0];
        const channel =
          (_b = interaction.guild) === null || _b === void 0
            ? void 0
            : _b.channels.cache.get(channelId);
        if (!channel) {
          return interaction.reply({
            content: "`❌`・Canal não encontrado.",
            flags: 64,
          });
        }
        function parseEmojiManage(raw) {
          if (!raw) return undefined;
          if (typeof raw === "object" && (raw.id || raw.name)) return raw;
          if (typeof raw !== "string") return undefined;
          const customMatch = raw.match(/^<?(a?):([^:]+):(\d+)>?$/);
          if (customMatch)
            return {
              animated: customMatch[1] === "a",
              name: customMatch[2],
              id: customMatch[3],
            };
          if (raw.length <= 8) return { name: raw };
          return undefined;
        }
        const folderEmoji = parseEmojiManage(functions_1.emojis.foldder);
        const manageV2Payload = {
          flags: 32768, // IsComponentsV2
          components: [
            {
              type: 17, // Container
              components: [
                // Título
                {
                  type: 10, // TextDisplay
                  content: `## <:bot:1473451347792887953> Gerenciamento de Aplicações`,
                },
                // Separador grande
                { type: 14, divider: true, spacing: 2 },
                // Descrição com bullets
                {
                  type: 10, // TextDisplay
                  content: [
                    "- Acesse o painel completo de gerenciamento das suas aplicações.",
                    "",
                    "> - Visualize o status em tempo real",
                    "> - Inicie, reinicie ou pare sua aplicação",
                    "> - Altere configurações como token e nome",
                    "> - Renove ou atualize seu BOT",
                  ].join("\n"),
                },
                // Separador antes do botão
                { type: 14, divider: true, spacing: 1 },
                // Botão de ação
                {
                  type: 1, // ActionRow
                  components: [
                    {
                      type: 2,
                      style: 2, // Botão azul primário
                      label: "Gerenciar Applicações",
                      custom_id: `open-manage-apps:${storeId}`,
                      emoji: { name: "⚙️" },
                    },
                  ],
                },
              ],
            },
          ],
        };
        try {
          const botToken = interaction.client.token;
          yield discordPost(
            botToken,
            `/channels/${channelId}/messages`,
            manageV2Payload,
          );
          yield client.invokeInteraction(
            `edit-product-handler:${storeId}:${productId}`,
            interaction,
          );
          yield interaction.followUp({
            content: "`✅`・Painel de gerenciamento enviado com sucesso!",
            flags: 64,
          });
        } catch (e) {
          return interaction.reply({
            content: `\`❌\`・Erro ao enviar o painel: ${e.message}`,
            flags: 64,
          });
        }
      }
    }),
});
/**
 * Handler do botão "Gerenciar Applicações" presente na embed enviada no canal.
 * Redireciona para o invoke-apps com seleção de loja, executando o fluxo do /apps.
 */
new fast_discord_js_1.InteractionHandler({
  customId: "open-manage-apps",
  run: (client, interaction, storeId) =>
    __awaiter(void 0, void 0, void 0, function* () {
      if (!interaction.isButton()) return;
      const storeConfig = yield databases_1.default.stores
        .findById(storeId)
        .catch(() => null);
      if (!storeConfig) {
        return interaction.reply({
          content: "`❌`・Loja não encontrada.",
          flags: 64,
        });
      }
      // Invoca o painel de aplicações do /apps diretamente para essa loja
      return client.invokeInteraction(`invoke-apps:${storeId}`, interaction);
    }),
});
// ─────────────────────────────────────────────────────────────────────────────
// Sistema de Teste Grátis
//
// Fluxo:
//   1. Usuário clica "Testar Bot" no painel publicado no canal
//   2. Se já fez o teste → mensagem ephemeral avisando
//   3. Se não fez → cria thread privado com instruções + botão "Enviar Token"
//   4. Clica "Enviar Token" → showModal (nome + token)
//   5. Modal submit → valida token → deploy na CamposCloud com expiresAt = +1 dia
//   6. Sucesso → thread fechado em 8s
// ─────────────────────────────────────────────────────────────────────────────
new fast_discord_js_1.InteractionHandler({
  customId: "free-trial",
  run: (_client, interaction, storeId, productId, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
      try {
        // ── Busca produto e loja ──────────────────────────────────────────
        const product = yield databases_1.default.products
          .findById(productId)
          .lean();
        if (!product) {
          return interaction.reply({
            content: "`❌`・Produto não encontrado.",
            flags: 64,
          });
        }
        const storeConfig = yield databases_1.default.stores
          .findById(storeId)
          .lean();
        if (!storeConfig) {
          return interaction.reply({
            content: "`❌`・Loja não encontrada.",
            flags: 64,
          });
        }
        // ── Teste grátis está ativo? ──────────────────────────────────────
        if (
          !((_a = product.redeemSettings) === null || _a === void 0
            ? void 0
            : _a.active)
        ) {
          return interaction.reply({
            content:
              "`❌`・O teste grátis não está disponível para este produto no momento.",
            flags: 64,
          });
        }
        // ── Usuário já fez o teste? ───────────────────────────────────────
        const alreadyTrialed = yield databases_1.default.applications
          .findOne({
            productId: product._id,
            ownerId: interaction.user.id,
            isTrial: true,
          })
          .lean();
        if (alreadyTrialed) {
          const trialedAt = Math.floor(
            new Date(alreadyTrialed.createdAt).getTime() / 1000,
          );
          const expiresAt = alreadyTrialed.expiresAt
            ? Math.floor(new Date(alreadyTrialed.expiresAt).getTime() / 1000)
            : null;
          return interaction.reply({
            content: [
              "`❌`・**Você já utilizou o teste grátis deste produto!**",
              `> Iniciado em: <t:${trialedAt}:F>`,
              expiresAt ? `> Expira/Expirou em: <t:${expiresAt}:R>` : "",
              `-# Cada conta só pode usar o teste grátis uma vez por produto.`,
            ]
              .filter(Boolean)
              .join("\n"),
            flags: 64,
          });
        }
        // ══════════════════════════════════════════════════════════════════
        // ETAPA 1 — Abre thread e mostra painel de instruções
        // ══════════════════════════════════════════════════════════════════
        if (action === "start" && interaction.isButton()) {
          yield interaction.deferReply({ flags: 64 });
          if (
            ((_b = interaction.channel) === null || _b === void 0
              ? void 0
              : _b.type) !== discord_js_1.ChannelType.GuildText
          ) {
            return interaction.editReply({
              content:
                "`❌`・Este comando só pode ser usado em canais de texto.",
            });
          }
          // Verifica se já tem thread de teste aberto para esse usuário + produto
          const existingThread = yield databases_1.default.cartsBuy
            .findOne({
              userId: interaction.user.id,
              productId: product._id,
              isTrial: true,
              status: { $in: ["opened"] },
            })
            .lean();
          if (
            existingThread &&
            ((_c = interaction.guild) === null || _c === void 0
              ? void 0
              : _c.channels.cache.has(existingThread.channelId))
          ) {
            return interaction.editReply({
              content: `\`❌\`・Você já tem um teste em andamento: <#${existingThread.channelId}>`,
            });
          }
          // Cria thread privado
          const thread = yield interaction.channel.threads.create({
            name: `🎁・teste・${interaction.user.id}`,
            type: discord_js_1.ChannelType.PrivateThread,
            invitable: false,
            reason: `Teste grátis — ${interaction.user.tag}`,
          });
          if (!thread) {
            return interaction.editReply({
              content: "`❌`・Não foi possível criar o thread privado.",
            });
          }
          yield thread.members.add(interaction.user.id);
          // Registra o thread no banco (reutiliza cartsBuy como container, com flag isTrial)
          yield databases_1.default.cartsBuy.create({
            automaticPayment: false,
            channelId: thread.id,
            storeId: storeConfig._id,
            userId: interaction.user.id,
            guildId:
              (_d = interaction.guild) === null || _d === void 0
                ? void 0
                : _d.id,
            productId: product._id,
            status: "opened",
            step: "trial-send-token",
            isTrial: true,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min para enviar o token
          });
          const trialTitle =
            ((_e = product.redeemSettings) === null || _e === void 0
              ? void 0
              : _e.trialTitle) || `🎁 Teste Grátis — ${product.name}`;
          const trialDesc =
            ((_f = product.redeemSettings) === null || _f === void 0
              ? void 0
              : _f.trialDesc) ||
            `Experimente **${product.name}** gratuitamente por **1 dia**!`;
          // Mensagem no thread — painel em content
          const panelContent = [
            trialTitle,
            "",
            trialDesc,
            "",
            `> <@${interaction.user.id}>, clique em **Enviar Token do Bot** para iniciar o teste.`,
            `-# 🔗 [Criar bot no Discord Developers](https://discord.com/developers/applications)`,
          ].join("\n");
          yield thread.send({
            content: panelContent,
            components: [
              (0, fast_discord_js_1.CreateRow)([
                (0, fast_discord_js_1.CreateButton)({
                  label: "Enviar Token do Bot",
                  style: discord_js_1.ButtonStyle.Success,
                  customId: `free-trial:${storeId}:${productId}:show-modal`,
                  emoji: functions_1.emojis.yes,
                }),
                (0, fast_discord_js_1.CreateButton)({
                  label: "Cancelar",
                  style: discord_js_1.ButtonStyle.Danger,
                  customId: `free-trial:${storeId}:${productId}:cancel`,
                  emoji: functions_1.emojis.cancel,
                }),
              ]),
            ],
          });
          return interaction.editReply({
            content: `<:certo:1474402234103238698> Thread criado! Continue o seu teste em <#${thread.id}>`,
          });
        }
        // ══════════════════════════════════════════════════════════════════
        // ETAPA 2 — Mostra modal para coletar nome + token do bot
        // ══════════════════════════════════════════════════════════════════
        if (action === "show-modal" && interaction.isButton()) {
          const modal = (0, fast_discord_js_1.CreateModal)({
            customId: `free-trial:${storeId}:${productId}:submit-modal`,
            title: "Teste Grátis — Enviar Bot",
            inputs: [
              {
                customId: "bot-name",
                label: "Nome do Bot",
                style: discord_js_1.TextInputStyle.Short,
                required: true,
                placeholder: "Digite o nome do bot (máx 25 caracteres)",
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
          return interaction.showModal(modal);
        }
        // ══════════════════════════════════════════════════════════════════
        // ETAPA 3 — Cancela o teste e fecha o thread
        // ══════════════════════════════════════════════════════════════════
        if (action === "cancel" && interaction.isButton()) {
          yield interaction.deferReply({ flags: 64 });
          yield databases_1.default.cartsBuy.updateOne(
            { channelId: interaction.channelId },
            { status: "cancelled" },
          );
          yield interaction.editReply({
            content:
              "<:certo:1474402234103238698> Teste cancelado. Este canal será fechado em 3 segundos.",
          });
          setTimeout(() => {
            var _a;
            (_a = interaction.channel) === null || _a === void 0
              ? void 0
              : _a.delete().catch(() => {});
          }, 3000);
          return;
        }
        // ══════════════════════════════════════════════════════════════════
        // ETAPA 4 — Processa o modal e faz o deploy na CamposCloud
        // ══════════════════════════════════════════════════════════════════
        if (action === "submit-modal" && interaction.isModalSubmit()) {
          const botToken = interaction.fields
            .getTextInputValue("bot-token")
            .trim();
          const botName = interaction.fields
            .getTextInputValue("bot-name")
            .trim();

          if (!botToken || !botName) {
            return interaction.reply({
              content: "`❌`・Preencha o nome e o token do bot.",
              flags: 64,
            });
          }

          if (botName.length > 25) {
            return interaction.reply({
              content:
                "`❌`・O nome do bot não pode ter mais de 25 caracteres.",
              flags: 64,
            });
          }

          const ownerStoreConfig = yield (0,
          functions_1.findStoreOwnerSettings)(databases_1.default, storeConfig);
          if (!ownerStoreConfig) {
            return interaction.reply({
              content:
                "`❌`・Configuração da loja não encontrada. Contate um administrador.",
              flags: 64,
            });
          }

          const hostCapacity = yield (0,
          functions_1.assertStoreHasAvailableMemory)(
            databases_1.default,
            storeConfig,
          ).catch(() => null);
          if (!hostCapacity) {
            const hostLabel = (0, functions_1.getHostLabel)(
              (0, functions_1.getStoreHostProvider)(storeConfig),
            );
            return interaction.reply({
              content: `\`❌\`・Memória insuficiente em ${hostLabel} para criar o bot de teste. Contate um administrador.`,
              flags: 64,
            });
          }

          const releasePath = `releases/${product._id}/${product.currentReleaseVersion}.zip`;
          const existZip = yield promises_1.default
            .access(releasePath)
            .then(() => true)
            .catch(() => false);
          if (!existZip) {
            return interaction.reply({
              content:
                "`❌`・Arquivo do bot não encontrado. Relate isso a um administrador.",
              flags: 64,
            });
          }

          yield interaction.deferReply({ flags: 64 });

          let application = null;
          let uploadedApp = null;

          try {
            const botInfo = yield axios_1.default
              .get("https://discord.com/api/v10/applications/@me", {
                headers: { Authorization: `Bot ${botToken}` },
              })
              .catch(() => null);

            if (
              !(botInfo === null || botInfo === void 0 ? void 0 : botInfo.data)
            ) {
              return interaction.editReply({
                content:
                  "`❌`・Token inválido ou bot não encontrado. Verifique o token e tente novamente.",
              });
            }

            const trialExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

            application = yield databases_1.default.applications.create({
              storeId: storeConfig._id,
              productId: product._id,
              name: botName,
              ownerId: interaction.user.id,
              botId: botInfo.data.id,
              token: botToken,
              hostProvider: (0, functions_1.getStoreHostProvider)(storeConfig),
              expiresAt: trialExpiresAt,
              version: product.currentReleaseVersion,
              lifetime: false,
              isTrial: true,
            });

            const zipFile = new adm_zip_1.default(releasePath);
            uploadedApp = yield (0, functions_1.createManagedApplication)(
              databases_1.default,
              {
                store: storeConfig,
                product,
                appName: `[TRIAL] ${product.name}・${interaction.user.id}`,
                botToken,
                ownerId: interaction.user.id,
                applicationId: application._id.toString(),
                file: zipFile.toBuffer(),
              },
            );

            application.appId = uploadedApp.id;
            application.hostProvider =
              application.hostProvider ||
              (0, functions_1.getStoreHostProvider)(storeConfig);
            yield application.save();

            yield databases_1.default.cartsBuy.updateOne(
              { channelId: interaction.channelId },
              { status: "closed" },
            );

            const expiresTs = Math.floor(trialExpiresAt.getTime() / 1000);
            yield interaction.editReply({
              content: [
                `<:certo:1474402234103238698> **Bot enviado com sucesso! O teste grátis foi iniciado.**`,
                "",
                `> Produto: **${product.name}**`,
                `> Expira: <t:${expiresTs}:R> (<t:${expiresTs}:F>)`,
                "",
                "-# Use /apps para acompanhar e gerenciar seu bot durante o teste.",
                "-# Após o período de 1 dia, o bot será encerrado automaticamente.",
              ].join("\n"),
            });

            setTimeout(() => {
              var _a;
              (_a = interaction.channel) === null || _a === void 0
                ? void 0
                : _a.delete().catch(() => {});
            }, 8000);
            return;
          } catch (e) {
            if (application) {
              yield databases_1.default.applications
                .deleteOne({ _id: application._id })
                .catch(() => {});
            }

            if (uploadedApp) {
              const host = yield (0, functions_1.getHostAdapterForStore)(
                databases_1.default,
                storeConfig,
              ).catch(() => null);
              if (host) {
                yield host.adapter
                  .deleteApplication(uploadedApp.id)
                  .catch(() => {});
              }
            }

            const errorMessage =
              ((_k =
                (_j = e === null || e === void 0 ? void 0 : e.response) ===
                  null || _j === void 0
                  ? void 0
                  : _j.data) === null || _k === void 0
                ? void 0
                : _k.error) ||
              (e === null || e === void 0 ? void 0 : e.message) ||
              "Erro desconhecido";

            return interaction.editReply({
              content: `\`❌\`・${errorMessage}`,
            });
          }
        }
      } catch (e) {
        // Handler global de erros — garante que a interaction sempre responde
        const method =
          interaction.replied || interaction.deferred ? "editReply" : "reply";
        return interaction[method]({
          content: `\`❌\`・${e.message}`,
          flags: 64,
        });
      }
    }),
});
