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
const axios_1 = __importDefault(require("axios"));
const discord_js_1 = require("discord.js");
const fast_discord_js_1 = require("fast-discord-js");
new fast_discord_js_1.SlashCommand({
  name: "configbot",
  description: "Configurações do BOT",
  type: discord_js_1.ApplicationCommandType.ChatInput,
  run: (client, interaction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      return client.invokeInteraction("config-bot", interaction);
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "config-bot",
  run: (client, interaction) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const hasPermission = interaction.user.id === process.env.OWNER_ID;
      if (!hasPermission) {
        return interaction.reply({
          content: `\`❌\`・Você não tem permissão para acessar essa área`,
          flags: 64,
        });
      }
      const registredUsers =
        yield databases_1.default.userSettings.countDocuments();
      const hostedApplications =
        yield databases_1.default.applications.countDocuments();
      const createdProducts =
        yield databases_1.default.products.countDocuments();
      const openedCarts = yield databases_1.default.cartsBuy.countDocuments({
        status: "opened",
      });
      const contents = [
        `# Configurações do BOT`,
        `- Aqui você poderá configurar o manager.\n`,
        `- Informações do Processo`,
        `> \`⏳\`・Uptime: \`${(0, functions_1.formatUptime)(client.uptime)}\``,
        `> \`💾\`・Memória RAM: \`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB\`\n`,
        `- Presença`,
        `> \`🏰\`・Servidores: \`${client.guilds.cache.size}\``,
        `> \`👥\`・Usuários : \`${client.users.cache.size}\`\n`,
        `- Estatísticas`,
        `> \`👤\`・Usuários registrados: \`${registredUsers}\``,
        `> \`📦\`・Aplicações hospedadas: \`${hostedApplications}\``,
        `> \`🛒\`・Produtos criados: \`${createdProducts}\``,
        `> \`🛍️\`・Carrinhos abertos: \`${openedCarts}\`\n`,
        `- Selecione uma das opções abaixo para configurar o BOT`,
      ];
      const components = [
        (0, fast_discord_js_1.CreateRow)([
          new fast_discord_js_1.CreateSelect().StringSelectMenuBuilder({
            customId: "config-bot-[s]",
            placeholder: "Selecione uma opção",
            options: [
              {
                label: "Avatar",
                value: "avatar",
                description: "Configure o avatar do BOT",
                emoji: functions_1.emojis.config,
              },
              {
                label: "Configurar BIO",
                value: "bio",
                description: "Configure a BIO do BOT",
                emoji: functions_1.emojis.config,
              },
              {
                label: "Configurar Rich Presence",
                value: "rich-presence",
                description: "Configure a presença do BOT no servidor",
                emoji: functions_1.emojis.config,
              },
            ],
            getValueInLastParam: true,
          }),
        ]),
        (0, fast_discord_js_1.CreateRow)([
          (0, fast_discord_js_1.CreateButton)({
            label: "Atualizar painel",
            customId: "config-bot",
            emoji: functions_1.emojis.reload,
          }),
          (0, fast_discord_js_1.CreateButton)({
            label: "Voltar ao menu principal",
            customId: "invoke-config",
            emoji: functions_1.emojis.back,
            style: 2,
          }),
        ]),
      ];
      if (interaction.isCommand()) {
        return interaction.reply({
          content: contents.join("\n"),
          components,
          flags: 64,
        });
      } else {
        return yield interaction.update({
          content: contents.join("\n"),
          components,
          files: [],
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "set-rich-presence",
  run: (client, interaction, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      if (action === "show-modal") {
        const currentValuesDB = yield databases_1.default.userSettings.findOne({
          key: "presences",
        });
        const currentValues =
          (currentValuesDB === null || currentValuesDB === void 0
            ? void 0
            : currentValuesDB.value) || [];
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Configurar Rich Presence",
          customId: "set-rich-presence:submit-modal",
          inputs: [
            {
              label: "Presence #1",
              required: false,
              style: 1,
              placeholder: "Jogando Minecraft",
              customId: "presence-1",
              value: currentValues[0],
            },
            {
              label: "Presence #2",
              required: false,
              style: 1,
              placeholder: "Jogando Minecraft",
              customId: "presence-2",
              value: currentValues[1],
            },
            {
              label: "Presence #3",
              required: false,
              style: 1,
              placeholder: "Jogando Minecraft",
              customId: "presence-3",
              value: currentValues[2],
            },
            {
              label: "Presence #4",
              required: false,
              style: 1,
              placeholder: "Jogando Minecraft",
              customId: "presence-4",
              value: currentValues[3],
            },
            {
              label: "Presence #5",
              required: false,
              style: 1,
              placeholder: "Jogando Minecraft",
              customId: "presence-5",
              value: currentValues[4],
            },
          ],
        });
        yield modal.show(interaction);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        const presences = [
          interaction.fields.getTextInputValue("presence-1"),
          interaction.fields.getTextInputValue("presence-2"),
          interaction.fields.getTextInputValue("presence-3"),
          interaction.fields.getTextInputValue("presence-4"),
          interaction.fields.getTextInputValue("presence-5"),
        ];
        yield databases_1.default.userSettings.updateOne(
          { key: "presences" },
          { value: presences },
          { upsert: true },
        );
        yield client.invokeInteraction("config-bot", interaction);
        yield interaction.followUp({
          content: `\`✅\`・Rich Presence configurado com sucesso`,
          flags: 64,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "set-avatar",
  run: (client, interaction, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      var _a, _b;
      if (action === "show-modal") {
        const currentAvatar =
          (_a = client.user) === null || _a === void 0
            ? void 0
            : _a.displayAvatarURL();
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Configurar avatar do BOT",
          customId: "set-avatar:submit-modal",
          inputs: [
            {
              label: "Novo avatar",
              required: true,
              style: 1,
              placeholder: "URL da imagem",
              customId: "new-avatar",
              value: currentAvatar,
            },
          ],
        });
        yield modal.show(interaction);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        const newAvatar = interaction.fields.getTextInputValue("new-avatar");
        try {
          yield (_b = client.user) === null || _b === void 0
            ? void 0
            : _b.setAvatar(newAvatar);
          yield client.invokeInteraction("config-bot", interaction);
          yield interaction.followUp({
            content: `\`✅\`・Avatar do BOT alterado com sucesso`,
            flags: 64,
          });
        } catch (e) {
          return interaction.reply({
            content: `\`❌\`・${e.message || "Erro não reconhecido"}`,
            flags: 64,
          });
        }
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "set-bio",
  run: (client, interaction, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      const axiosInstance = axios_1.default.create({
        baseURL: "https://discord.com/api/v10",
        headers: {
          Authorization: `Bot ${process.env.BOT_TOKEN}`,
        },
      });
      if (action === "show-modal") {
        const currentBio = yield axiosInstance
          .get("/applications/@me")
          .then((response) => response.data)
          .catch(() => "Erro ao buscar BIO");
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Configurar BIO do BOT",
          customId: "set-bio:submit-modal",
          inputs: [
            {
              label: "Nova BIO",
              required: true,
              style: 2,
              placeholder: "Nova BIO do BOT",
              customId: "new-bio",
              value: currentBio.description,
            },
          ],
        });
        yield modal.show(interaction);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        const newBio = interaction.fields.getTextInputValue("new-bio");
        try {
          yield axiosInstance.patch("/applications/@me", {
            description: newBio,
          });
          yield client.invokeInteraction("config-bot", interaction);
          yield interaction.followUp({
            content: `\`✅\`・BIO do BOT alterada com sucesso`,
            flags: 64,
          });
        } catch (e) {
          return interaction.reply({
            content: `\`❌\`・${e.message || "Erro não reconhecido"}`,
            flags: 64,
          });
        }
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "set-rich-presence",
  run: (client, interaction, action) =>
    __awaiter(void 0, void 0, void 0, function* () {
      if (action === "show-modal") {
        const currentValuesDB =
          yield databases_1.default.globalSettings.findOne({
            key: "rich_presences",
          });
        const currentValues =
          (currentValuesDB === null || currentValuesDB === void 0
            ? void 0
            : currentValuesDB.value) || [];
        const modal = (0, fast_discord_js_1.CreateModal)({
          title: "Configurar Rich Presence",
          customId: "set-rich-presence:submit-modal",
          inputs: [
            {
              label: "Presence #1",
              required: false,
              style: 1,
              placeholder: "Jogando Minecraft",
              customId: "presence-1",
              value: currentValues[0] || "",
            },
            {
              label: "Presence #2",
              required: false,
              style: 1,
              placeholder: "Jogando Minecraft",
              customId: "presence-2",
              value: currentValues[1] || "",
            },
            {
              label: "Presence #3",
              required: false,
              style: 1,
              placeholder: "Jogando Minecraft",
              customId: "presence-3",
              value: currentValues[2] || "",
            },
            {
              label: "Presence #4",
              required: false,
              style: 1,
              placeholder: "Jogando Minecraft",
              customId: "presence-4",
              value: currentValues[3] || "",
            },
            {
              label: "Presence #5",
              required: false,
              style: 1,
              placeholder: "Jogando Minecraft",
              customId: "presence-5",
              value: currentValues[4] || "",
            },
          ],
        });
        yield modal.show(interaction);
      }
      if (action === "submit-modal" && interaction.isModalSubmit()) {
        const presences = [
          interaction.fields.getTextInputValue("presence-1"),
          interaction.fields.getTextInputValue("presence-2"),
          interaction.fields.getTextInputValue("presence-3"),
          interaction.fields.getTextInputValue("presence-4"),
          interaction.fields.getTextInputValue("presence-5"),
        ].filter((p) => p.trim() !== "");
        yield databases_1.default.globalSettings.updateOne(
          { key: "rich_presences" },
          { value: presences },
          { upsert: true },
        );
        yield client.invokeInteraction("config-bot", interaction);
        yield interaction.followUp({
          content: `\`✅\`・Rich Presence configurado com sucesso`,
          flags: 64,
        });
      }
    }),
});
new fast_discord_js_1.InteractionHandler({
  customId: "config-bot-[s]",
  run: (client, interaction, value) =>
    __awaiter(void 0, void 0, void 0, function* () {
      if (value === "rich-presence") {
        client.invokeInteraction("set-rich-presence:show-modal", interaction);
        return;
      }
      if (value === "avatar") {
        client.invokeInteraction("set-avatar:show-modal", interaction);
        return;
      }
      if (value === "bio") {
        client.invokeInteraction("set-bio:show-modal", interaction);
        return;
      }
      return interaction.reply({
        content: `\`❌\`・Opção inválida`,
        flags: 64,
      });
    }),
});
