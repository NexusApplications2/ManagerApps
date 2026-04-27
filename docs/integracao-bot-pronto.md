# Integração de Bot Pronto

Use `templates/Base Bot` como base oficial para bot compartilhado.

A integração não depende mais de copiar três arquivos soltos para um bot genérico. A pasta `templates/Base Bot` já vem com:

- conexão com `manager_bridge`;
- leitura de `manager_bridge.entitlements`;
- `/resgatar-key` para vincular a key a um servidor;
- `/gerenciar` para mostrar a licença do servidor;
- helper `guardInteractionLicense` para bloquear comandos pagos sem licença ativa;
- sincronização de nickname por licença no `ready` e no `guildCreate`;
- `.env.example` com as variáveis necessárias.

## Como usar

1. Entre em `templates/Base Bot`.
2. Instale as dependências com `npm install`.
3. Crie um `.env` a partir de `.env.example`.
4. Configure `DISCORD_TOKEN`, `MANAGER_BRIDGE_MONGO_URI` e `MANAGER_BRIDGE_DB_NAME`.
5. Rode `npm run dev` ou `npm start`.
6. No manager, abra o produto e informe o Client ID desse bot na configuração rápida.
7. Configure os valores em `Valores do bot pronto`.

## Fluxo do cliente

1. O cliente compra no painel do manager.
2. O manager cria uma licença em `manager_bridge.entitlements` e entrega uma key.
3. O cliente convida o Base Bot para o servidor.
4. No servidor, o cliente usa `/resgatar-key key:<key>`.
5. O bot vincula a licença ao `guildId` atual.
6. O cliente usa `/gerenciar` para consultar status, vencimento e dados da licença.

## Como proteger comandos pagos

Dentro de qualquer slash command do Base Bot:

```js
const { guardInteractionLicense } = require("../../utils/license-gate");

async function run(bot, interaction) {
  const licenseGate = await guardInteractionLicense(interaction);

  if (!licenseGate.ok) {
    return;
  }

  // Execute aqui a funcao paga do seu bot.
}
```

O comando `templates/Base Bot/src/commands/base/base_slashh.js` já mostra esse padrão em funcionamento.

## Variáveis principais

- `DISCORD_TOKEN`: token do bot compartilhado.
- `BOT_PREFIX`: prefixo opcional para comandos de prefixo.
- `GLOBAL_COMMANDS`: `true` para registrar slash commands globais.
- `GUILD_IDS`: IDs separados por vírgula para registrar slash commands locais em desenvolvimento.
- `MANAGER_BRIDGE_MONGO_URI`: conexão MongoDB que o manager usa para o bridge.
- `MANAGER_BRIDGE_DB_NAME`: normalmente `manager_bridge`.
- `AUTO_ENSURE_BRIDGE_INDEXES`: cria índices pelo bot se estiver `true`.
- `APPLY_LICENSE_AVATAR`: tenta aplicar `profile.avatarUrl` como avatar global do bot. Use com cuidado.

Aliases aceitos para conexão:

- `LICENSE_BRIDGE_MONGO_URI`
- `MONGO_DB_URL`
- `MONGO_URI`

## Regras da licença

- Uma key vincula apenas um servidor.
- Um servidor não deve consumir duas licenças diferentes ao mesmo tempo.
- O bot libera funções pagas somente quando `status` é `active`.
- O bot também bloqueia se `expiresAt` já passou.
- O manager continua sendo a autoridade para compra, renovação, expiração e geração de key.

## Perfil do bot

O Base Bot aplica `profile.nickname` por servidor quando existe licença ativa.

Avatar de bot no Discord é global na prática. Por isso `profile.avatarUrl` só é aplicado quando `APPLY_LICENSE_AVATAR=true`, para evitar trocar o avatar do bot em todos os servidores sem querer.
