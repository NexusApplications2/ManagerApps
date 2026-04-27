# Segurança

## Reportando Vulnerabilidades

Se encontrar uma vulnerabilidade, não publique detalhes exploráveis em issue pública.

Abra um contato privado com o mantenedor do repositório ou use o recurso "Report a vulnerability" do GitHub, se estiver habilitado.

Inclua:

- impacto esperado;
- passos mínimos para reproduzir;
- versão/commit afetado;
- logs sem tokens, senhas ou dados pessoais.

## Segredos

Nunca publique:

- `BOT_TOKEN`;
- `DISCORD_TOKEN`;
- URI MongoDB com usuário/senha;
- tokens de gateways;
- certificados `.pem`, `.p12`, `.pfx`;
- arquivos `.env*`;
- dumps de banco;
- releases ZIP com credenciais.

Antes de abrir PR:

```bash
npm run security:scan
```

## Se Um Segredo Vazou

1. Revogue o segredo imediatamente.
2. Gere um novo token/senha.
3. Remova o segredo do histórico antes de publicar o repositório.
4. Verifique logs, releases e anexos.
5. Rode o scanner novamente.

O `.gitignore` evita commits futuros, mas não remove segredos que já entraram no histórico.
