# Revisão de fatos do código (goldfish: codebase details)

Revisão de `familia-perguntas-enquete.md` depois das correções de segurança, contra o código real (migrations, shim, `banco.ts`, `rls.test.ts`, `lib/*`, `proxy.ts`, `components/ui/*`, styleguide, `lib/exemplos`).

Os nomes citados como existentes conferem, e o SQL é coerente com a revogação global de EXECUTE e com o shim. O que foi feito com cada achado está em [resolucao.md](./resolucao.md).

## Bloqueantes

1. **O INSERT de foto pela sessão falha com "permission denied for function re_uuid".**
   - O CHECK `photos_caminho_do_livro` chama `privado.re_uuid()`, e um CHECK roda com o usuário corrente, que não tem EXECUTE.
   - O teste de fumaça não pegou porque inseriu como superusuário.
   - **Correção:** regex literal no CHECK e um teste de INSERT válido como `authenticated`.
2. **O token com "." pode tirar `/f/[token]` do proxy.**
   - O matcher em `proxy.ts:51` exclui caminhos que terminam em `.<letras/números>`, pensado para arquivos estáticos.
   - `v1.<22 base64url>` casa quando os 22 caracteres não têm `-` nem `_`.
   - Nesses casos não há cookie do aparelho nem os cabeçalhos `no-referrer`/`noindex`, e o voto falha.
   - **Correção:** separador sem ponto, ou isentar `/f/` no matcher, e testar um token só com minúsculas.

## Médios

3. **Ordem do cookie no proxy.** Gravar `ecoa_aparelho` em `request.cookies` antes de `getClaims()`; o cookie da resposta e os cabeçalhos vão na resposta final, inclusive no redirect e no 404.
4. **`livrosDoMembro`** (`lib/sessao.ts:29-45`) não devolve `configuracao`, `autor_apelido` nem `autor_parentesco`. Isso precisa entrar na lista de arquivos.
5. **`LINKS_SEGREDO_V1` em `envServidor()`** derruba o admin, o e-mail e o e2e se a variável faltar. Criar uma função própria (`envLinks()`) e exigir de V1 até a versão atual.
6. **`item_valido`** não confere `causo_id` nem `banco_id`. Um cast inválido ou a FK de outro livro geram erro genérico, fora da lista de códigos. Validar com regex e conferir o livro do causo, com `item_invalido`.
7. **Testes genéricos de `rls.test.ts`:**
   - `:335-341` e `:343-353` mudam (previsto; renomear o título do segundo);
   - `:273-286` deve receber as 7 tabelas novas;
   - `:367-377`, da reversão, passa.
8. **`como()`** em `supabase/tests/banco.ts:41` só aceita `anon` e `authenticated`. Precisa aceitar `porta_autor`.
9. **Reaproveitamento na interface:**
   - o gravador do causo deve compor `components/ui/gravador.tsx` com `lib/ui/tempo.ts`;
   - `Abas` (`components/ui/abas.tsx:29`) precisa de controle externo para `?aba=` e para saber qual aba está aberta;
   - "chips" de parentesco contradiz `Seletor`, que é `<select>` nativo;
   - o cartão de causo, a folha "Enviar ao Jair" e os dados falsos já existem no styleguide do P2 e em `lib/exemplos/livro-jair.ts`, mas `Causo.relacao` não tem coluna.
10. **Home do livro:** dizer o que acontece com `TelaLivroVazio` e com as telas `livro` e `livro-somente-leitura` da vitrine e do `inspecionar-telas.mjs`.

## Detalhes

11. `MAX_FOTOS_POR_ENVIO` repete `MAX_ARQUIVOS_LOTE = 30`.
12. O `CLAUDE.md` já foi ajustado; o doc descreve isso como pendente.
13. `lib/rotas.ts` não muda (`/f/*` já é público); basta o caso em `rotas.test.ts`.
14. Usar `podeEscrever` de `lib/plano.ts:16`.
15. O evento `votou` com `quem: null` não conta pessoas; pôr o `votante` em `detalhes`.
16. "`enquete_abrir` com `null`" é ambíguo: é `p_itens` nulo.
17. A reversão nova não usa `if exists`, ao contrário da convenção.
18. Os relatórios citados no cabeçalho do doc ainda não existiam.
19. O token inteiro tem 25 caracteres, não 22.
20. O texto do WhatsApp do CUJ 5 difere do de `demo-folha.tsx:31`. Unificar em `lib/whatsapp.ts`.
