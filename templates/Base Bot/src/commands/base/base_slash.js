const { ApplicationCommandType, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "exemplo_slash",
  description: "Base de slash command no formato antigo.",
  type: ApplicationCommandType.ChatInput,

  async run(client, interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "Voce nao possui permissao para utilizar este comando.",
        ephemeral: true,
      });
    }

    return interaction.reply({
      content: "Comando slash de exemplo executado com sucesso.",
      ephemeral: true,
    });
  },
};
