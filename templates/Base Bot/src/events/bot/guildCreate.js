const { Events } = require("discord.js");
const { getLicenseByGuildId } = require("../../utils/license-bridge");
const {
  applyLicenseProfileToGuild,
} = require("../../utils/license-profile");

module.exports = {
  name: Events.GuildCreate,

  async execute(servidor, bot) {
    if (
      !bot.ajustes.sincronizacao.usarComandosGlobais &&
      bot.listaDeComandos.length
    ) {
      try {
        await servidor.commands.set(bot.listaDeComandos);
        bot.painel.success(
          `Comandos sincronizados automaticamente no servidor ${servidor.name}.`,
        );
      } catch (erro) {
        bot.painel.error(
          `Falha ao sincronizar comandos no servidor ${servidor.name}.`,
          erro,
        );
      }
    }

    const license = await getLicenseByGuildId(servidor.id).catch((erro) => {
      bot.painel.warn(
        `Nao foi possivel consultar licenca ao entrar em ${servidor.name}.`,
        erro,
      );
      return null;
    });

    await applyLicenseProfileToGuild(servidor, license, bot.painel);
  },
};
