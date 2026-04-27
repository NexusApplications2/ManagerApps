const { Client, Collection } = require("discord.js");
const ajustesDaBase = require("./config");
const painel = require("./utils/logger");
const carregarBase = require("./handler");

function conectarAvisosDoProcesso() {
  process.on("unhandledRejection", (motivo) => {
    painel.error("Unhandled rejection detectada.", motivo);
  });

  process.on("uncaughtException", (erro) => {
    painel.error("Uncaught exception detectada.", erro);
  });

  process.on("uncaughtExceptionMonitor", (erro) => {
    painel.error("Exception monitor detectou uma falha.", erro);
  });
}

async function iniciarAplicacao() {
  if (!ajustesDaBase.token) {
    painel.error("Token não encontrado. Defina DISCORD_TOKEN no .env ou preencha o token.json.");
    process.exit(1);
  }

  const bot = new Client(ajustesDaBase.discord);

  // Essas colecoes e contadores deixam o resto da base organizado e facil de consultar.
  bot.ajustes = ajustesDaBase;
  bot.painel = painel;
  bot.comandos = new Collection();
  bot.comandosDePrefixo = new Collection();
  bot.aliasesDePrefixo = new Collection();
  bot.listaDeComandos = [];
  bot.resumoDaBase = {
    totalDeComandos: 0,
    totalDeComandosDePrefixo: 0,
    totalDeEventos: 0,
  };

  conectarAvisosDoProcesso();
  await carregarBase(bot);
  await bot.login(ajustesDaBase.token);
}

iniciarAplicacao().catch((erro) => {
  painel.error("Falha ao iniciar a aplicacao.", erro);
  process.exit(1);
});
