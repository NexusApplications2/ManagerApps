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

function normalizarComandoSlash(comandoCarregado) {
  const executarComando = comandoCarregado.execute || comandoCarregado.run;

  if (!executarComando) {
    return null;
  }

  if (comandoCarregado.data?.toJSON) {
    const dados = comandoCarregado.data.toJSON();

    return {
      nome: dados.name,
      dados,
      executar: executarComando,
    };
  }

  if (!comandoCarregado.name || !comandoCarregado.description) {
    return null;
  }

  return {
    nome: comandoCarregado.name,
    dados: {
      name: comandoCarregado.name,
      description: comandoCarregado.description,
      type: comandoCarregado.type,
      options: comandoCarregado.options || [],
      defaultMemberPermissions:
        comandoCarregado.defaultMemberPermissions ?? null,
      dmPermission: comandoCarregado.dmPermission ?? false,
    },
    executar: executarComando,
  };
}

function normalizarComandoDePrefixo(comandoCarregado) {
  const executarPrefixo =
    comandoCarregado.executePrefix ||
    comandoCarregado.runPrefix ||
    comandoCarregado.prefixRun;

  const configuracaoDePrefixo = comandoCarregado.prefix || null;

  if (!executarPrefixo && !configuracaoDePrefixo) {
    return null;
  }

  const nomePrincipal =
    configuracaoDePrefixo?.name ||
    configuracaoDePrefixo?.comando ||
    comandoCarregado.name;

  if (!nomePrincipal) {
    return null;
  }

  const aliases = Array.isArray(configuracaoDePrefixo?.aliases)
    ? configuracaoDePrefixo.aliases
    : [];

  return {
    nome: String(nomePrincipal).toLowerCase(),
    aliases: aliases.map((alias) => String(alias).toLowerCase()),
    descricao:
      configuracaoDePrefixo?.description ||
      comandoCarregado.description ||
      "Sem descricao.",
    executar:
      executarPrefixo ||
      (async (bot, mensagem) => {
        await mensagem.reply(
          "Esse comando possui prefixo registrado, mas ainda nao tem um executor de mensagem.",
        );
      }),
  };
}

module.exports = async (bot) => {
  const pastaDeComandos = path.join(__dirname, "../commands");
  const arquivosDeComando = listarArquivosJavaScript(pastaDeComandos);
  const comandosParaRegistrar = new Map();

  for (const caminhoDoArquivo of arquivosDeComando) {
    delete require.cache[require.resolve(caminhoDoArquivo)];

    const comandoCarregado = require(caminhoDoArquivo);

    if (comandoCarregado?.ignorarNaBase) {
      continue;
    }

    const slashNormalizado = normalizarComandoSlash(comandoCarregado);
    const prefixoNormalizado = normalizarComandoDePrefixo(comandoCarregado);

    if (!slashNormalizado && !prefixoNormalizado) {
      bot.painel.warn(
        `Comando ignorado por estar incompleto: ${path.relative(process.cwd(), caminhoDoArquivo)}`,
      );
      continue;
    }

    if (slashNormalizado) {
      if (bot.comandos.has(slashNormalizado.nome)) {
        bot.painel.warn(
          `Ja existe um slash command com o nome ${slashNormalizado.nome}. O ultimo carregado venceu.`,
        );
      }

      bot.comandos.set(slashNormalizado.nome, {
        ...comandoCarregado,
        execute: slashNormalizado.executar,
      });

      comandosParaRegistrar.set(
        slashNormalizado.nome,
        slashNormalizado.dados,
      );
    }

    if (prefixoNormalizado) {
      bot.comandosDePrefixo.set(prefixoNormalizado.nome, {
        ...comandoCarregado,
        executePrefix: prefixoNormalizado.executar,
        nomeDoPrefixo: prefixoNormalizado.nome,
        aliases: prefixoNormalizado.aliases,
        description: prefixoNormalizado.descricao,
      });

      for (const alias of prefixoNormalizado.aliases) {
        bot.aliasesDePrefixo.set(alias, prefixoNormalizado.nome);
      }
    }
  }

  bot.listaDeComandos = [...comandosParaRegistrar.values()];
  bot.resumoDaBase.totalDeComandos = bot.comandos.size;
  bot.resumoDaBase.totalDeComandosDePrefixo = bot.comandosDePrefixo.size;
};
