# Changelog

Todas as mudanças relevantes deste projeto devem ser registradas aqui.

O formato segue uma variação simples de "Keep a Changelog", e as versões devem seguir SemVer quando possível.

## [Unreleased]

### Added

- Estrutura pública do repositório com CI, documentação, licença e templates de contribuição.
- Scanner local para segredos óbvios.
- Validação de sintaxe para templates.

### Security

- `.gitignore` reforçado para ambientes, tokens, certificados, logs e artefatos gerados.
- Arquivos `.env` locais sanitizados para publicação.

## [1.0.0] - 2026-04-27

### Added

- Manager Discord para produtos, carrinhos, licenças e aplicações hospedadas.
- Fluxo de bot pronto no servidor com `manager_bridge.entitlements`.
- Fluxo de bot privado só seu.
- Integração com Campos Cloud e Square Cloud.
- Integração com EFI, Mercado Pago e pagamento manual.
- Base Bot compartilhado em `templates/Base Bot`.
