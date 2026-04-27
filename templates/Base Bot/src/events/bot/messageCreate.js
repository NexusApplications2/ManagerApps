const { Events } = require("discord.js");

module.exports = {
  name: Events.MessageCreate,

  async execute(mensagem, bot) {
    if (!mensagem.guild || mensagem.author.bot) {
      return;
    }

    const prefixo = bot.ajustes.prefixo;

    if (!mensagem.content.startsWith(prefixo)) {
      return;
    }

    const conteudoSemPrefixo = mensagem.content.slice(prefixo.length).trim();

    if (!conteudoSemPrefixo) {
      return;
    }

    const partes = conteudoSemPrefixo.split(/\s+/);
    const nomeInformado = partes.shift()?.toLowerCase();
    const argumentos = partes;

    const nomePrincipal =
      bot.aliasesDePrefixo.get(nomeInformado) || nomeInformado;
    const comando = bot.comandosDePrefixo.get(nomePrincipal);

    if (!comando?.executePrefix) {
      return;
    }

    try {
      await comando.executePrefix(bot, mensagem, argumentos);
    } catch (erro) {
      bot.painel.error(
        `Falha ao executar o comando de prefixo ${prefixo}${nomePrincipal}.`,
        erro,
      );

      await mensagem.reply(
        "Ocorreu um erro ao executar esse comando de prefixo.",
      ).catch(() => null);
    }
  },
};
