# Prontidão para implementação (goldfish: implementation readiness)

Revisão de `familia-perguntas-enquete.md` depois das correções de segurança, contra o repositório e a documentação do Next 16.4.3.

**Veredito:** quase pronto, mas ainda não. O que foi feito com cada achado está em [resolucao.md](./resolucao.md).

## Bloqueantes

1. **INSERT e UPDATE em `photos` falham para `authenticated`.**
   - O CHECK chama `privado.re_uuid()` sem grant: "permission denied for function re_uuid".
   - **Correção:** regex literal e um teste de INSERT válido pela sessão.
2. **O player do causo reinicia a cada 4 s.**
   - `router.refresh()` gera URLs assinadas novas, o `src` do `<audio>` muda e o áudio recomeça.
   - **Correção:** assinar no toque, guardar a URL no cliente ou pausar a atualização durante o áudio.

## Médios

3. **Textos maiores que as colunas.** O texto do causo (2000) é maior que `prompts.texto` e `poll_items.texto` (500). `item_valido` aceitava 2000. Falta a regra para causo só de áudio.
4. **Erros que não são códigos nossos.**
   - Constraint, cast, conflito e RLS ficam sem frase.
   - UPDATE e DELETE com plano vencido afetam 0 linhas sem erro.
   - Falta dizer onde o erro aparece na tela.
5. **`link_ja_revogado` fora da lista de códigos.**
6. **"Tentar de novo" do áudio.**
   - Se o upload subiu e a confirmação falhou, assinar de novo sem sobrescrever dá 409.
   - Falta dizer como conferir existência e tamanho, e o `contentType`.
7. **Falha parcial no upload de fotos** e o lugar de `prepararFotos` e `registrarFotos`.
8. **Estado da configuração.**
   - Quem para depois do passo 1 perde os passos restantes.
   - Com o plano vencido, a pessoa é levada a telas em que nada salva.
9. **Estados vazios** de cada aba e de `/f`.
10. **Perguntas puladas e "desfazer envio"** sem lugar na tela.
11. **Candidatos da "Nova enquete":**
    - não está dito de onde vêm;
    - há risco de duplicata com perguntas próprias;
    - falta definir o salvar com a enquete aberta e o estado do causo salvo.
12. **Passo 2:** o upsert do PostgREST não alcança o índice parcial.
13. **Status de `/f` com token inválido:** com `cacheComponents`, o `notFound()` dentro de `<Suspense>` sai com 200.
14. **Arquivos fora da lista ou sem a marca criar/alterar:**
    - `lib/sessao.ts`;
    - `[tela]/page.tsx`;
    - `perguntas.json`;
    - `tela-livro.tsx`;
    - os `lib/*` novos;
    - `como()` com `service_role`.
15. **Objetivos sem verificação que feche:**
    - obj. 1: são 3 toques, não 4;
    - obj. 10 (kit) sem verificação;
    - obj. 7 sem teste;
    - `enquete_remover_votos` sem teste.
16. **Medição da hipótese:** os eventos `votou` e `sugeriu` sairiam sem `book_id`.

## Detalhes

17. **Ordem:** o JSON precisa vir antes de `lib/perguntas/banco.ts`; `config-banco.test.ts` depende de `lib/config.ts` e de `lib/erros-banco.ts`.
18. **Ranking:** "nomes únicos" apagaria a "Ana" duplicada do CUJ 6. O empate deve usar `poll_items.ordem`.
19. **Grant por coluna:** `select('*')` em `poll_votes`, `polls` e `family_access` falha.
20. **Ponto no token:** o `matcher` do proxy pode excluir `/f/v1.xxx`.
21. **Cookie no proxy:**
    - precisa entrar em `request.cookies` antes do `NextResponse.next({ request })`;
    - precisa ir também no redirect e no 404;
    - falta a regra do `Secure`.
22. **Contradições pequenas:**
    - o token tem 25 caracteres, não 22;
    - "4 funções" deveria ser 3;
    - `MAX_FOTOS_POR_ENVIO`;
    - texto e áudio juntos no mesmo causo.
23. **Variáveis do link:** validar toda versão em uso de `LINKS_SEGREDO_V{n}` e pôr um valor falso no `env` do Playwright.
24. **Telas e Next:**
    - N = 0 no "Salvar";
    - onde o nome fica lembrado;
    - a ordem entre o `wa.me` e a action;
    - `params.then` dentro de `<Suspense>`;
    - `RouteContext` com `await params`.
    - `router.refresh()` e `after()` existem na 16.4.3.
