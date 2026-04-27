const { PermissionFlagsBits } = require("discord.js");

module.exports = {
  prefix: {
    name: "base",
    aliases: ["base"],
    description: "Base de comando por prefixo.",
  },

  async runPrefix(client, mensagem) {
    if (!mensagem.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
      return mensagem.reply(
        "Voce nao possui permissao para utilizar este comando.",
      );
    }

    return mensagem.reply("Comando de prefixo executado com sucesso.");
  },
};
