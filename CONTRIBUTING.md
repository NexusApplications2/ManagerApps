# Contribuindo

Obrigado por considerar contribuir com o Manager Niox JS.

## Como Ajudar

- Corrigir bugs.
- Melhorar textos e fluxos do Discord.
- Melhorar documentação.
- Adicionar testes.
- Melhorar a Base Bot.
- Adicionar suporte a hosts ou gateways.

## Ambiente Local

```bash
npm install
cp .env.example .env.development
npm run dev
```

Preencha somente valores locais no `.env.development`. Nunca envie segredos em commits.

## Antes Do Pull Request

Rode:

```bash
npm run ci
```

O PR deve:

- explicar o problema resolvido;
- manter compatibilidade com produtos existentes quando possível;
- evitar mudanças fora do escopo;
- atualizar README/docs quando mudar comportamento visível;
- não incluir `.env`, tokens, dumps, releases geradas ou credenciais.

## Padrão De Branch

Sugestões:

- `fix/nome-curto`
- `feat/nome-curto`
- `docs/nome-curto`
- `chore/nome-curto`

## Commits

Use mensagens objetivas:

- `fix: corrige renovacao de carrinho`
- `feat: adiciona suporte a novo gateway`
- `docs: melhora guia do bot compartilhado`
- `chore: atualiza workflow de CI`

## Segurança

Se você encontrou uma falha de segurança ou vazamento de segredo, não abra issue pública com detalhes exploráveis. Siga `SECURITY.md`.
