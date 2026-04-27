const carregarComandos = require("./commands");
const carregarEventos = require("./Events");

module.exports = async (bot) => {
  await carregarComandos(bot);
  await carregarEventos(bot);

  bot.painel.success(
    `Base carregada com ${bot.resumoDaBase.totalDeComandos} slash command(s), ${bot.resumoDaBase.totalDeComandosDePrefixo} comando(s) de prefixo e ${bot.resumoDaBase.totalDeEventos} evento(s).`,
  );
};
