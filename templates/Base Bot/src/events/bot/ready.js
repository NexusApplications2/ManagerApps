const { Events } = require("discord.js");
const {
  syncKnownGuildProfiles,
} = require("../../utils/license-profile");

async function sincronizarComandosNosServidores(bot, idsDosServidores) {
  const resultados = await Promise.allSettled(
    idsDosServidores.map(async (idDoServidor) => {
      const servidor =
        bot.guilds.cache.get(idDoServidor) || (await bot.guilds.fetch(idDoServidor));

      await servidor.commands.set(bot.listaDeComandos);
      return servidor.name;
    }),
  );

  const servidoresSincronizados = resultados
    .filter((resultado) => resultado.status === "fulfilled")
    .map((resultado) => resultado.value);

  const servidoresComFalha = resultados.filter(
    (resultado) => resultado.status === "rejected",
  );

  if (servidoresSincronizados.length) {
    bot.painel.success(
      `Comandos sincronizados em ${servidoresSincronizados.length} servidor(es): ${servidoresSincronizados.join(", ")}`,
    );
  }

  if (servidoresComFalha.length) {
    bot.painel.warn(
      `${servidoresComFalha.length} sincronizacao(oes) de comandos falharam. Verifique os IDs configurados.`,
    );
  }
}

async function sincronizarComandos(bot) {
  if (!bot.listaDeComandos.length) {
    bot.painel.warn("Nenhum comando foi encontrado para registrar.");
    return;
  }

  if (bot.ajustes.sincronizacao.usarComandosGlobais) {
    await bot.application.commands.set(bot.listaDeComandos);
    bot.painel.success("Comandos globais sincronizados com sucesso.");
    return;
  }

  const idsDosServidores = bot.ajustes.sincronizacao.servidores.length
    ? bot.ajustes.sincronizacao.servidores
    : bot.guilds.cache.map((servidor) => servidor.id);

  if (!idsDosServidores.length) {
    bot.painel.warn(
      "Nao ha servidores em cache para registrar comandos locais.",
    );
    return;
  }

  await sincronizarComandosNosServidores(bot, idsDosServidores);
}

module.exports = {
  name: Events.ClientReady,
  once: true,

  async execute(bot) {
    // O ready liga a presenca do bot, registra os slash commands
    // e informa qual prefixo esta valendo na sessao atual.
    bot.user.setPresence(bot.ajustes.presenca);

    bot.painel.success(`Logado como ${bot.user.tag}.`);
    bot.painel.info(
      `Pronto em ${bot.guilds.cache.size} servidor(es) com ${bot.users.cache.size} usuario(s) em cache.`,
    );
    bot.painel.info(
      `Prefixo ativo: ${bot.ajustes.prefixo} | comandos de prefixo: ${bot.resumoDaBase.totalDeComandosDePrefixo}.`,
    );

    await sincronizarComandos(bot);

    const totalDePerfisAplicados = await syncKnownGuildProfiles(bot).catch(
      (erro) => {
        bot.painel.warn(
          "Nao foi possivel sincronizar perfis de licenca no ready.",
          erro,
        );
        return 0;
      },
    );

    if (totalDePerfisAplicados) {
      bot.painel.success(
        `Perfil de licenca aplicado em ${totalDePerfisAplicados} servidor(es).`,
      );
    }
  },
};
