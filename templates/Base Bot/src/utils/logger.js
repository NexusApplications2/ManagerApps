function gerarHorarioAtual() {
  return new Date().toLocaleString("pt-BR", {
    hour12: false,
  });
}

function escreverNoConsole(cor, etiqueta, detalhes) {
  const prefixo = `\x1b[${cor}m[${etiqueta} ${gerarHorarioAtual()}]\x1b[0m`;
  console.log(prefixo, ...detalhes);
}

module.exports = {
  info: (...detalhes) => escreverNoConsole("36", "INFO", detalhes),
  success: (...detalhes) => escreverNoConsole("32", "OK", detalhes),
  warn: (...detalhes) => escreverNoConsole("33", "WARN", detalhes),
  error: (...detalhes) => escreverNoConsole("31", "ERROR", detalhes),
};
