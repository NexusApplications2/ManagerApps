# Base Bot Compartilhado

Base pronta para usar com o formato `Bot pronto no servidor` do manager.

Ela já vem integrada ao `manager_bridge` e inclui:

- `/resgatar-key`: ativa a key de compra no servidor atual;
- `/gerenciar`: mostra status, vencimento e dados da licença;
- `src/utils/license-bridge.js`: leitura e vinculação de licenças;
- `src/utils/license-gate.js`: bloqueio de comandos pagos sem licença ativa;
- `src/utils/license-profile.js`: aplicação de nickname por licença;
- exemplo de comando pago em `src/commands/base/base_slashh.js`.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Configure no `.env`:

```env
DISCORD_TOKEN=
MANAGER_BRIDGE_MONGO_URI=
MANAGER_BRIDGE_DB_NAME=manager_bridge
```

Em desenvolvimento, use `GUILD_IDS=ID_DO_SERVIDOR` para registrar os slash commands mais rápido. Em produção, use `GLOBAL_COMMANDS=true`.

`token.json` é ignorado pelo Git. Se preferir esse formato localmente, copie `token.example.json` para `token.json` e preencha apenas na sua máquina.

## Como o cliente ativa

1. Compra no painel do manager.
2. Recebe a key.
3. Convida este bot para o servidor.
4. Executa `/resgatar-key key:<key>`.
5. Usa `/gerenciar` para acompanhar a licença.

## Como proteger um comando

```js
const { guardInteractionLicense } = require("../../utils/license-gate");

async function run(bot, interaction) {
  const licenseGate = await guardInteractionLicense(interaction);

  if (!licenseGate.ok) {
    return;
  }

  // Sua funcao paga aqui.
}
```

## Observações

- Prefira `.env`. Se usar `token.json`, mantenha somente local.
- Nickname é aplicado por servidor.
- Avatar de bot é global, então `APPLY_LICENSE_AVATAR` vem desativado por segurança.
