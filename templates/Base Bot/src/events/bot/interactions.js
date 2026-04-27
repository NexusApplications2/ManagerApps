const { Events } = require("discord.js");

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction, bot) {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const comandoEscolhido = bot.comandos.get(interaction.commandName);

    if (!comandoEscolhido) {
      await interaction
        .reply({
          content: "Esse comando nao foi encontrado na coleção atual.",
          ephemeral: true,
        })
        .catch(() => null);
      return;
    }

    try {
      await comandoEscolhido.execute(bot, interaction);
    } catch (erro) {
      bot.painel.error(
        `Falha ao executar o comando /${interaction.commandName}.`,
        erro,
      );

      const respostaDeErro = {
        content: "Ocorreu um erro ao executar este comando.",
        ephemeral: true,
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(respostaDeErro).catch(() => null);
        return;
      }

      await interaction.reply(respostaDeErro).catch(() => null);
    }
  },
};
