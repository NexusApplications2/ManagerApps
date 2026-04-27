# Manager Applications

Este é um bot manager em Node.js para vender, licenciar, provisionar, renovar e gerenciar bots pelo Discord.

Ele foi pensado para quem vende bots como produto: o cliente compra em um painel no Discord, o manager controla pagamento/licença e entrega o bot no formato escolhido.

## O Que Ele Faz

- cria lojas e produtos no Discord;
- publica painéis de compra com select menu e botões;
- cobra por pagamento manual, EFI e Mercado Pago;
- cria carrinhos privados em threads;
- emite licenças para bot pronto no servidor;
- entrega um bot privado só para cada cliente quando o produto precisa de hospedagem própria;
- cria, atualiza, reinicia e renova aplicações em hosts externos;
- separa banco comercial e banco de licenças para facilitar integração com outros bots.

## Formas De Entrega

### Bot Pronto No Servidor

O cliente convida um bot compartilhado para o servidor dele.

Fluxo:

1. o cliente compra no painel do manager;
2. o manager gera uma licença com key;
3. o cliente convida o bot para o servidor;
4. o cliente usa `/resgatar-key` no bot convidado;
5. a licença fica presa a apenas aquele servidor;
6. o cliente acompanha tudo em `/gerenciar`.

Esse fluxo usa `manager_bridge.entitlements` como fonte de verdade.

### Bot Privado Só Seu

O cliente recebe um bot separado, só para ele.

Fluxo:

1. o cliente compra no painel;
2. o manager coleta token quando o produto precisa;
3. o manager cria a aplicação no host configurado;
4. o manager envia a release;
5. o manager controla renovação, expiração, atualização e status.

## Hosts E Pagamentos

Hosts suportados:

- Campos Cloud
- Square Cloud

Gateways suportados:

- pagamento manual;
- EFI;
- Mercado Pago.

## Arquitetura

O projeto é dividido em quatro partes principais.

### Core Comercial

Database sugerida: `manager_core`

Coleções principais:

- `stores`
- `products`
- `applications`
- `carts-buy`
- `carts-renew`
- `coupons`
- `extracts`
- `user-settings`

### Bridge De Licenças

Database sugerida: `manager_bridge`

Coleções principais:

- `entitlements`
- `entitlement_audit`

Essa camada é a ponte entre o manager e bots externos que precisam validar licença por servidor.

Arquivos importantes:

- `src/databases/bridge.js`
- `src/functions/license-bridge.js`
- `src/functions/service-fulfillment.js`
- `src/functions/service-product.js`
- `src/functions/service-release.js`

### Hosts

A pasta `src/functions/hosts` padroniza:

- validação de credenciais;
- consulta de RAM;
- criação de aplicação;
- variáveis de ambiente;
- start, stop, restart e delete;
- commit de release;
- link do dashboard do host.

### Checkout

O servidor HTTP em `src/http/server.js` fornece endpoints para:

- health check;
- checkout transparente do Mercado Pago;
- consulta de status de pagamento;
- webhook do Mercado Pago.

## Começando

### Requisitos

- Node.js 20 ou superior;
- MongoDB;
- um bot Discord configurado no Developer Portal;
- credenciais do host e gateway que você pretende usar.

### Instalação

```bash
npm install
cp .env.example .env.development
npm run dev
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env.development
npm run dev
```

### Variáveis Essenciais

Preencha pelo menos:

```env
BOT_TOKEN=
OWNER_ID=
MONGO_DB_URL=
MANAGER_CORE_DB_NAME=manager_core
MANAGER_BRIDGE_DB_NAME=manager_bridge
```

Para checkout HTTP:

```env
PORT=3000
CHECKOUT_ALLOWED_ORIGINS=
```

Para bot pronto no servidor:

```env
SHARED_BOT_CLIENT_ID=
SHARED_BOT_TOKEN=
SHARED_BOT_INVITE_PERMISSIONS=8
MANAGER_BRIDGE_MONGO_URI=
```

Para bot privado só seu:

```env
MANAGED_SERVICE_SOURCE_PATH=
DEDICATED_BOT_MONGO_URI=
LICENSE_BRIDGE_MONGO_URI=
```

Nunca publique `.env`, `.env.development`, `.env.production`, tokens, strings Mongo com senha ou arquivos de certificado.

## Configurando Produtos

No Discord, acesse o painel de configuração e crie um produto.

Formas de entrega:

- `Bot pronto no servidor`: o cliente convida um bot compartilhado e ativa uma key.
- `Bot privado só seu`: o manager cria um bot separado só para o cliente.
- `Os dois jeitos`: o cliente escolhe no carrinho.

Depois configure:

- valores do bot pronto;
- valores do bot privado;
- mensagem do painel de venda;
- Client ID do bot compartilhado;
- comando e pasta do bot privado.

## Base Bot Compartilhado

Use `templates/Base Bot` como base oficial para o bot compartilhado.

Ele já inclui:

- `/resgatar-key`;
- `/gerenciar`;
- leitura de `manager_bridge.entitlements`;
- `guardInteractionLicense` para bloquear comandos pagos;
- aplicação de nickname por licença;
- `.env.example` próprio.

Setup:

```bash
cd "templates/Base Bot"
npm install
cp .env.example .env
npm run dev
```

Exemplo de comando protegido:

```js
const { guardInteractionLicense } = require("../../utils/license-gate");

async function run(bot, interaction) {
  const licenseGate = await guardInteractionLicense(interaction);

  if (!licenseGate.ok) {
    return;
  }

  // Sua função paga aqui.
}
```

Veja:

- `docs/integracao-bot-pronto.md`
- `templates/Base Bot/README.md`

## Scripts

```bash
npm run dev              # inicia em desenvolvimento
npm start                # inicia em produção
npm run validate         # checa sintaxe/imports do src
npm run smoke            # roda smoke tests
npm run check:templates  # checa sintaxe dos templates
npm run security:scan    # procura segredos óbvios no repositório
npm run ci               # validação completa usada no GitHub Actions
npm test                 # validate + smoke
```

## Segurança

Antes de abrir PR ou publicar release:

```bash
npm run security:scan
```

Se algum segredo já foi exposto:

1. revogue o token/chave imediatamente;
2. gere um novo segredo;
3. remova o valor do histórico do Git antes de publicar;
4. nunca confie apenas no `.gitignore` se o segredo já foi commitado.

Leia também:

- `SECURITY.md`
- `.env.example`

## Contribuindo

Contribuições são bem-vindas.

Boas formas de ajudar:

- corrigir bugs;
- melhorar textos do Discord;
- criar testes;
- melhorar templates;
- documentar fluxos;
- adicionar suporte a novos hosts/gateways.

Leia `CONTRIBUTING.md` antes de abrir pull request.

## Releases

O repositório está preparado para releases por tag.

Padrão sugerido:

```bash
npm version patch
git push --follow-tags
```

Tags no formato `v*` acionam o workflow de release.

## Licença

Distribuído sob licença MIT. Veja `LICENSE`.
