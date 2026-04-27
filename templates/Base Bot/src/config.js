const { ActivityType, GatewayIntentBits, Partials } = require("discord.js");
require("dotenv").config();

let credenciaisLocais = {};

try {
  credenciaisLocais = require("../token.json");
} catch (erro) {
  credenciaisLocais = {};
}

module.exports = {
  token:
    process.env.DISCORD_TOKEN ||
    process.env.BOT_TOKEN ||
    credenciaisLocais.token ||
    "",
  prefixo: process.env.BOT_PREFIX || credenciaisLocais.prefixo || "!",
  sincronizacao: {
    usarComandosGlobais:
      String(
        process.env.GLOBAL_COMMANDS ??
          credenciaisLocais.globalCommands ??
          false,
      ).toLowerCase() === "true",
    servidores: String(process.env.GUILD_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .concat(
        Array.isArray(credenciaisLocais.guildIds)
          ? credenciaisLocais.guildIds.filter(Boolean)
          : [],
      ),
    servidoresLocais: Array.isArray(credenciaisLocais.guildIds)
      ? credenciaisLocais.guildIds.filter(Boolean)
      : [],
  },
  presenca: {
    status: credenciaisLocais.status || "online",
    activities: [
      {
        name: credenciaisLocais.activityName || "!2Dfxx é toptop!",
        type: ActivityType.Listening,
      },
    ],
  },
  discord: {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [
      Partials.Channel,
      Partials.GuildMember,
      Partials.Message,
      Partials.Reaction,
      Partials.User,
    ],
  },
};
