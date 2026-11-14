# Mapa do código

Onde cada coisa mora e os padrões que se repetem. Leia antes de procurar no repositório; abra só os arquivos do assunto da tarefa. Atualize quando criar uma pasta ou um padrão novo.

## Rotas (`app/`)

| Caminho | O que é | Quem entra |
| --- | --- | --- |
| `/entrar`, `/auth/*` | Login (Google, link por e-mail) | público |
| `/` | Lista de livros do membro | sessão |
| `/livro/[id]` | Home do livro | membro |
| `/livro/[id]/configurar/[passo]`, `/kit`, `/configuracoes` | Configuração inicial, kit de início, ajustes | membro |
| `/livro/[id]/perguntas`, `/enquete/nova` | Perguntas, causos, enquete | membro |
| `/livro/[id]/audios` | Áudios recebidos | membro |
| `/livro/[id]/historias` (+ `/nova`, `/gravar`) | Lista e nova história | membro |
| `/livro/[id]/historias/[historiaId]` | Acompanhar ou editar (história pronta) | membro |
| `…/[historiaId]/dividir`, `/versoes`, `/gravar`, `/parar`, `/amostra` | Divisão, histórico, gravar mais, PDF da amostra | membro |
| `/f/[token]` | Link da família (causos, enquete) | sem login |
| `/a/[token]` (+ `/gravar`) | Área do autor | sem login |
| `/ouvir`, `/ouvir/[codigo]` | Player do QR (host `ouvir.` reescreve `/` e `/{código}`) | público |
| `/admin` | Admin | `app_metadata.role = admin` |
| `/api/inngest` | Funções do Inngest | Inngest |
| `/styleguide/[tela]` | Telas com dados falsos (gate de design) | dev ou `ECOA_STYLEGUIDE=1` |

`proxy.ts` decide antes de renderizar: host `ouvir.` (`lib/qr/host.ts`), `/f` e `/a` sem sessão, o resto renova a sessão e aplica `lib/rotas.ts`.

## Padrões

- **Página:** componente síncrono com `<Suspense>` e `params.then(...)` (`cacheComponents`). Dado: `livroDaPagina(id)` em `lib/livro/acesso.ts`.
- **Ação do servidor:** arquivo `acoes.ts` ao lado da página, `"use server"`, ligada com `.bind(null, id, …)` e passada à tela em `acoes={…}`. Acesso: `livroDaAcao(id)`; escrita pelo banco com `clienteSessao()` (RLS) e `rpc` de funções `security definer`. Resposta: `Resposta<T>` de `lib/livro/tipos.ts`; erro do banco vira frase por `fraseDoErro` (`lib/erros-banco.ts`).
- **Tela:** `components/telas/tela-*.tsx` recebe dados e ações por props, sem buscar nada; os exemplos ficam em `lib/exemplos/prompt*.ts` e entram em `lib/styleguide.ts` + `app/(dev)/styleguide/[tela]/vitrine.tsx`. UI base em `components/ui/` (`Botao`, `Campo`, `FolhaInferior`, `DicaPrimeiraVez`, `EstadoVazio`, ícones).
- **Clientes Supabase:** `clienteSessao` (membro, RLS), `clienteAnonimo` (portas sem login: `familia_*`, `autor_*`), `clienteAdmin` (chave secreta: só servidor, só caminhos lidos do banco). Tipos gerados à mão em `lib/supabase/tipos.ts` (acrescente só o que mudou).
- **Storage:** buckets privados `audios`, `acervo`, `causos`, `qr`; leitura por `assinarLeitura` (`lib/storage/assinar.ts`); upload por token assinado no servidor.
- **Eventos:** `registrarEvento` (`lib/eventos.ts`), ação nova = linha em `lib/eventos-acoes.ts`; detalhes só com ids e números.
- **Números de negócio:** só em `lib/config.ts`; os conferidos no banco têm função `privado.*()` espelhada e entram em `supabase/tests/config-banco.test.ts`.
- **Erros do SQL:** `raise exception '<codigo>'` precisa de frase em `lib/erros-banco.ts` (o teste confere).
- **Jobs:** `lib/inngest/funcoes.ts` (pipeline, propostas, varredura) e `lib/inngest/qr.ts`; os passos devolvem só ids e tempos (T36).

## Domínios em `lib/`

| Pasta | Assunto |
| --- | --- |
| `ai/` | Prompts, chamadas ao Claude, transcrição, schemas zod |
| `pipeline/` | Gravação → transcrição → história (passos, banco, canal ao vivo) |
| `divisao/` | Divisão de conversa longa e lote em histórias |
| `editor/` | Texto da história, propostas da IA, ouvir trecho |
| `historias/` | Leitura das histórias para as telas |
| `livro/` | Acesso ao livro, configuração, página de amostra (Typst em `amostra.typ`, fontes em `fontes/`) |
| `qr/` | Código, host, chave de rede, player, recorte da voz |
| `gravacao/`, `audios/` | Gravador no aparelho, TUS, formatos |
| `familia/`, `autor/`, `enquete/`, `perguntas/` | Portas sem login e listas de perguntas |
| `email/`, `fotos/`, `pwa/`, `ui/`, `storage/`, `supabase/` | Apoio |

## Banco (`supabase/`)

- `migrations/AAAAMMDDHHMMSS_nome.sql` + `reversao/…down.sql`. Schema `privado` guarda funções internas; `public` só o que a API expõe.
- Testes em `supabase/tests/*.test.ts` com PGlite e as migrations reais (`banco.ts`: `criarBanco`, `como`, `tenta`). `rls.test.ts` tem a lista de funções que `authenticated` executa: função nova de membro entra lá.
- Isolamento do autor: `autor-isolamento.test.ts` e `lib/autor/rotas-autor.test.ts`, com `TABELAS_DA_FAMILIA` (`lib/familia/tabelas.ts`).

## Testes e scripts

- `npm test` (Vitest: `lib/**`, `supabase/tests/**`), `npm run test:e2e` (Playwright em `e2e/`, sem Supabase, telas do styleguide).
- `npm run taste:lint` e `npm run taste:inspect -- <tela>` (lista em `scripts/inspecionar-telas.mjs`).
- `npm run lab` (laboratório de IA, `scripts/lab/`).

## Documentos

- `docs/decisoes-resumo.md`: uma linha por decisão (ler sempre). `docs/decisoes.md`: detalhe.
- `docs/prd.md`: produto (ler só as seções citadas). `docs/prompts.md`: sequência de prompts.
- `docs/designs/<prompt>.md`: design aprovado de cada prompt. Ler só o do prompt atual ou o que ele cita.
