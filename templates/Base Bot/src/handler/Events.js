const fs = require("fs");
const path = require("path");

function listarArquivosJavaScript(pastaAlvo) {
  if (!fs.existsSync(pastaAlvo)) {
    return [];
  }

  const itensDaPasta = fs.readdirSync(pastaAlvo, { withFileTypes: true });

  return itensDaPasta.flatMap((item) => {
    const caminhoCompleto = path.join(pastaAlvo, item.name);

    if (item.isDirectory()) {
      return listarArquivosJavaScript(caminhoCompleto);
    }

    return item.name.endsWith(".js") ? [caminhoCompleto] : [];
  });
}

module.exports = async (bot) => {
  const pastaDeEventos = path.join(__dirname, "../events");
  const arquivosDeEvento = listarArquivosJavaScript(pastaDeEventos);
  let totalDeEventos = 0;

  for (const caminhoDoArquivo of arquivosDeEvento) {
    delete require.cache[require.resolve(caminhoDoArquivo)];

    const eventoCarregado = require(caminhoDoArquivo);
    const executarEvento = eventoCarregado.execute || eventoCarregado.run;

    if (!eventoCarregado?.name || !executarEvento) {
      bot.painel.warn(
        `Evento ignorado por estar incompleto: ${path.relative(process.cwd(), caminhoDoArquivo)}`,
      );
      continue;
    }

    const ouvirEvento = (...argumentos) =>
      executarEvento(...argumentos, bot);

    if (eventoCarregado.once) {
      bot.once(eventoCarregado.name, ouvirEvento);
    } else {
      bot.on(eventoCarregado.name, ouvirEvento);
    }

    totalDeEventos += 1;
  }

  bot.resumoDaBase.totalDeEventos = totalDeEventos;
};
