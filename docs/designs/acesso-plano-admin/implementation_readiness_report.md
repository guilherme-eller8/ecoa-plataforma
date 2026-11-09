# Relatório do revisor goldfish: Prontidão de implementação e aderência ao código

Alvo: `docs/designs/acesso-plano-admin.md`, a partir de "Plano de implementação detalhado". Padrão: implementation-readiness-standard. Revisor sem contexto da conversa. Confirmou nas versões instaladas:

- `generateLink(...).data.properties.hashed_token`
- `verifyOtp({ token_hash, type })`
- `getClaims()` com `app_metadata`
- `createUser({ email_confirm })`
- `proxy.ts` rodando em Node
- `refresh()` de `next/cache`
- `affectedRows` no PGlite

## Bloqueador

- **B1. `server-only` lança erro no Vitest** (`vitest.config.mts` sem alias). **Correção:** alias para `server-only/empty.js`.

## Majors

- **M1. `livrosDoUsuario` pela RLS devolve todos os livros para o admin.** **Correção:** filtrar `book_members.user_id` explicitamente.
- **M2. `env.ts` único quebra no navegador.** `server-only` vale para o arquivo inteiro, e `NEXT_PUBLIC_*` só entra no bundle com acesso literal. **Correção:** dividir em `env-publico.ts` e `env-servidor.ts`.
- **M3. `urlDoApp` em produção cairia na URL do branch.** **Correção:** em produção, usar `https://DOMINIO_APP`.
- **M4. `notFound()` e `redirect` dentro de `<Suspense>` devolvem 200.** **Correção:**
  - Checar `ECOA_PREVIA` no topo da página.
  - Usar `generateStaticParams` com a lista de telas.
  - Fazer o redirect de `/` no proxy.
- **M5. `?erro=1` com `useSearchParams` precisa de `<Suspense>`.**
- **M6. Falta definir como as telas puras se ligam aos formulários e às Server Actions.** Em aberto: as props, o tipo de retorno das actions, o uso de `useActionState` e a confirmação do *Renovar*.
- **M7. `pedirLink` deixa decisões para quem implementa.** Em aberto: como saber se é admin, a consulta do limite e o papel do evento.
- **M8. Decisões em aberto e dependências fora de ordem.**
  - "`revalidatePath` ou `refresh`": fixar `refresh()`.
  - Os tipos gerados e o cliente admin são usados antes de serem criados.
- **M9. `taste:inspect` aceita uma URL só.** **Correção:**
  - Um comando por rota.
  - Rodar o e2e antes do servidor de prévia.
- **M10. Faltam testes automáticos para:**
  - a resposta igual para qualquer e-mail;
  - o limite de envio;
  - o redirect do proxy;
  - `urlDoApp`.
- **M11. O conteúdo do shim do `auth` está só resumido.** **Correção:** copiar o SQL que já rodou.
- **M12. GET em `/auth/confirmar` é consumido por scanners de e-mail.** **Correção:** página com botão que faz POST.

## Nits

- `ANTHROPIC_API_KEY` continua no `.env.example`?
- Listar as variáveis falsas do Playwright.
- O que acontece com o teste atual da `/`.
- Trocar todas as ocorrências do domínio no PRD.
- Usar nomes exatos de arquivos, sem globs.
- O item de `package.json` não tem ação.
- `registrarEvento` aparece com 3 assinaturas diferentes.
- Quem não é membro gera evento?
- Lista de redirects: incluir o domínio de produção e estreitar o curinga.
- O nome da migration no MCP tem que bater com o arquivo.
- Como achar o e-mail do responsável.
