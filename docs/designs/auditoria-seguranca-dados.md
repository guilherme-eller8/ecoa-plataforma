# Auditoria de segurança e durabilidade dos dados

Autor: Antonio (diretor de segurança). Data: 16/11/2026. Estado: **rascunho para revisão EGM** (egm-design e egm-codebase-details, uma rodada).

## 1. Escopo e o que foi verificado

Escopo: tudo que guarda ou transporta voz, texto, fotos e mensagens das famílias, do aparelho à gráfica. Commit lido: `81e7d1b` (branch `claude/project-launch-review-f5p9gk`).

| Método | O que cobriu |
| --- | --- |
| Leitura das 22 migrations e dos testes de banco | RLS, grants, `security definer`, FKs, triggers de imutabilidade, CHECK de caminho |
| Banco vivo (`ecoa-plataforma`, sa-east-1), **só catálogo** | `get_advisors(security)`, `list_migrations`, `pg_class.relrowsecurity`, `pg_policies` (public, storage, realtime), `information_schema.role_table_grants` e `column_privileges`, `pg_proc` (prosecdef, proconfig, dono, `has_function_privilege`), `storage.buckets`, `pg_trigger`, `cron.job`, `pg_roles`. Contagens agregadas apenas (2 livros, 8 gravações, 0 QR, 0 versões publicadas, 10 objetos, ~3 MB) |
| `get_organization` | Plano do Supabase |
| Leitura do código | proxy, links, storage, gravador e TUS, ações de `/livro`, `/a`, `/f`, `/m`, QR, PDFs, Inngest, transcrição |
| `git grep` e histórico | Padrões de chave, `.env*` no histórico, `NEXT_PUBLIC_*`, `console.*` |

Não verificado: cabeçalhos da produção ao vivo (o proxy desta sessão devolveu 403 para `app.ecoa-memorias.com.br`), configuração da Vercel (proteção de prévia, logs, acesso do time), MFA das contas, contratos dos fornecedores. Nada foi escrito no banco nem no Storage; nenhum conteúdo de usuário foi lido.

## 2. Arquitetura atual de proteção

- **Captura:** o gravador (`MediaRecorder`) grava pedaços de 1 s no IndexedDB do aparelho (T30). Ao tocar *Enviar*, o servidor cria a linha `recordings` (`enviando`), assina um upload só daquele caminho e o navegador envia por TUS direto ao Storage. O servidor confere o tamanho e confirma no banco (`servico_confirmar_*`); só então o aparelho apaga a cópia local.
- **Guarda:** Postgres (31 tabelas, todas com RLS) e Storage em 6 buckets privados (`audios`, `acervo`, `causos`, `mensagens`, `qr`, `exportacoes`), sem nenhuma política em `storage.objects`: só URLs assinadas pelo servidor com a chave secreta.
- **Leitura:** membro (sessão Supabase, RLS por `privado.eh_membro`); autor (`/a`, token → funções com dono `porta_autor`); família (`/f`, `/m`, token → funções `familia_*`/`servico_*`); público (QR `/ouvir`, `/o`). Admin por `app_metadata.role`, com leituras agregadas pela chave secreta.
- **Processamento:** Inngest (sinal assinado) chama a Vercel; o áudio vai ao ElevenLabs (Scribe) e o texto ao Claude (Anthropic), fora do Brasil (P41). PDFs no Typst com o texto como JSON (T43).
- **Links:** token = `v{n}_` + HMAC-SHA256(`LINKS_SEGREDO_V{n}`, `"{tipo}:{id}"`) cortado em 22 caracteres (132 bits); o banco guarda `sha256(token)` (`lib/links.ts:14-34`). QR: 8 símbolos de 31 (~39,6 bits), com limites de erro por rede e global (T44).

## 3. Modelo de ameaças

| Ator | Quer | Barreiras atuais |
| --- | --- | --- |
| Estranho com um link (vazado no WhatsApp, print) | Ouvir/ler o livro, injetar conteúdo | Um recurso por link; `/m` só escreve; `/f` sem mensagens; troca do link |
| Estranho sem link | Adivinhar token ou QR, derrubar o player | 132 bits; QR com teto por rede e global |
| Membro malicioso de outra família | Ler ou alterar outro livro | RLS + CHECK de caminho com `book_id` + testes de isolamento |
| Autor (link pessoal) | Ver as mensagens surpresa | `porta_autor` com política restritiva `false` em `family_messages` (T5, T46) |
| Co-facilitador removido | Continuar entrando | `tirar_cofacilitador` apaga o vínculo e desliga os `/o` dele |
| Funcionário/admin | Ler conteúdo sem motivo | Admin só números; texto com consentimento por livro (P68) |
| Fornecedor (ElevenLabs, Anthropic, Vercel, Supabase, Inngest, Resend) | Reter ou reutilizar | Contratos padrão; Inngest sem texto (T36) |
| Falha de infraestrutura / erro de código | Perder arquivo ou linha | FKs `restrict`, triggers só-insert; **sem backup** (D1) |

## 4. Achados preliminares

### Segurança da informação

**S1 — LGPD sem base operacional (Alta).**
Evidência: não há rota de termos nem de privacidade (`ls app/`); não há exportar nem excluir dados; o comentário em `20261112120000_audios.sql:20` cita exclusão "por pedido formal (LGPD)" sem processo. O consentimento do autor só é exigido no link `/a` (`20261114120000_gravador_autor.sql:198`); as gravações feitas pela família (modo conversa, upload 5A) passam pelo pipeline só com o consentimento do responsável (`lib/inngest/funcoes.ts:396`). O autor que aceitou a v1 nunca vê a v2, que cita a IA (`gravador_autor.sql:177-178`: `where autor_consentimento_em is null`).
Cenário: o idoso (titular da voz, que não é o cliente) ou um herdeiro pede para apagar ou exportar, e a Ecoa não tem como cumprir o prazo; a voz foi a fornecedores fora do Brasil sem o consentimento dele.
Correção: termos e privacidade (prompt 15) com a base legal de cada dado; o consentimento do autor também na primeira gravação feita pela família ("o autor sabe e aceita", registrado); renovar o consentimento quando a versão sobe; um runbook de pedido do titular (exportar = ZIP dos áudios + textos; excluir = procedimento do admin que respeite QR e versões publicadas, documentado como exceção).

**S2 — O bloqueio global do QR derruba todos os players (Média).**
Evidência: `20261123120000_montar_livro.sql:193-199` (`servico_ouvir_qr`): com 3.000 erros de todas as redes em 10 min (`lib/config.ts:324`), a função devolve `limite` **antes** de procurar o código, inclusive para códigos válidos. O teto por rede é 10 (`config.ts:323`).
Cenário: 300 redes (IPv4 ou /64 baratos) × 10 códigos inventados a cada 10 min deixam todo livro impresso sem voz, indefinidamente.
Correção: quando o global estoura, ainda atender redes sem erro na janela (quem escaneia um QR impresso acerta de primeira); teto de taxa também no firewall da Vercel; alerta ao admin quando o global estourar.

**S3 — Co-facilitador removido mantém os links sem login (Média).**
Evidência: `20261121120000_cofacilitadores.sql:219-220`: "Os links do autor e da família ele pode ter visto: a tela oferece trocar". A troca é opcional. Pelo `/a` ele vê as perguntas enviadas e as fotos ligadas (`gravador_autor.sql:152-169`) e grava áudios no livro; pelo `/f` e `/m` sugere e escreve.
Correção: remover = trocar automaticamente `/a`, `/f` e `/m` (com aviso de que é preciso reenviar ao grupo), ou exigir uma escolha explícita registrada em `events`.

**S4 — Um segredo único deriva todos os links, e a rotação não os invalida (Média).**
Evidência: `lib/links.ts:14-29`: o token depende só do segredo e do id da linha (uuid que os membros leem). O banco guarda o hash do token, então criar `LINKS_SEGREDO_V2` não muda nenhum hash: os tokens da V1 continuam válidos.
Cenário: o vazamento das variáveis da Vercel (ou de um `.env.local`) mais uma lista de ids basta para entrar em todos os livros.
Correção: um runbook de incidente com troca em massa (função de serviço que gira `author_access`, `family_access` e `message_access` de todos os livros e um e-mail aos responsáveis); avaliar um sal aleatório por linha no HMAC (exigir banco + segredo).

**S5 — Sem cabeçalhos de segurança globais (Média).**
Evidência: `next.config.ts:43-66` só define cabeçalhos para `/ouvir/:path*` e `/sw.js`; `proxy.ts` só põe `Referrer-Policy`, `X-Robots-Tag` e cache nas rotas com token. Não há CSP, `frame-ancestors` nem `X-Frame-Options`. HSTS não está no código (*suspeita*: a Vercel pode pôr por padrão; não conferi ao vivo).
Cenário: clickjacking da tela do autor (gravar, consentir) ou de *Publicar* dentro de um iframe de terceiros.
Correção: `frame-ancestors 'none'` e `X-Frame-Options: DENY` globais; CSP com nonce (conferir a compatibilidade com `cacheComponents`); HSTS explícito.

**S6 — Tokens no caminho da URL vão para os logs da plataforma (Baixa, suspeita).**
Evidência: `/a/{token}`, `/f/{token}`, `/m/{token}`, `/o/{token}` e `/convite/{token}` estão no caminho. O código não loga URL (`instrumentation.ts` grava só a rota-padrão), mas os logs de requisição da Vercel registram o caminho.
Correção: limitar quem do time vê logs; retenção curta; documentar como risco aceito.

**S7 — Fotos do acervo sem conferência dos bytes (Baixa).**
Evidência: `app/livro/[id]/acoes.ts:278-340`: `registrarFotos` não confere se o objeto existe nem os primeiros bytes; só vale o `allowed_mime_types` do bucket, que confia no tipo declarado. Causos e mensagens conferem (`lib/storage/upload.ts:20-35`).
Correção: o mesmo `conferirArquivo` (JPEG pelos bytes, tamanho) antes de inserir em `photos`.

**S8 — Política ampla para `porta_autor` em `author_access` (Baixa).**
Evidência (banco vivo): `pg_policies` → `author_access` "porta do autor", `SELECT using (true)`. Hoje só as funções do autor rodam como `porta_autor`, e os testes travam as colunas (`autor-isolamento.test.ts:104-161`); um bug numa função futura leria os hashes de todos os livros (sha256 de 132 bits: não reversível).
Correção: restringir a política à linha do token em uso (`privado.livro_do_autor_atual()`), como em `books`.

**S9 — Fornecedores e transferência internacional (Média, suspeita).**
Evidência: `lib/ai/transcricao/elevenlabs.ts:31-46` envia o áudio inteiro sem opção de não reter (*suspeita*: no ElevenLabs, o modo sem retenção depende do plano). Anthropic com a retenção padrão da API. P41 cobre só o consentimento do responsável.
Correção: confirmar por escrito a retenção e o uso para treino de cada fornecedor (ElevenLabs, Anthropic, AssemblyAI se ligado), assinar os DPAs e citá-los na política; mandar só o necessário (o nome do arquivo não deve carregar nome de pessoa).

**S10 — Banco vivo diferente do repositório (Baixa).**
Evidência: `list_migrations` mostra `20261128120000_evals_fase1a`, que não existe em `supabase/migrations/` nem no histórico git; `20261113120000_enquete_por_fase` não aparece na lista, mas as funções dela existem (registrada com outro nome).
Correção: toda migration aplicada entra no repo com a reversão; um teste de CI que compara `list_migrations` com os arquivos.

### Durabilidade

**D1 — Não há backup, e o Storage não tem cópia em lugar nenhum (Crítica).**
Evidência: `get_organization` → plano **free** (sem backups diários acessíveis, sem PITR; projeto free pode ser pausado por inatividade). Os backups do Supabase, em qualquer plano, cobrem só o Postgres: os arquivos do Storage (áudio original, fotos, recortes do QR, PDFs) ficam fora. Nenhum código replica o Storage (busquei `upload`, `copy`, buckets externos).
Cenário: um `remove` errado, uma conta comprometida, um incidente do provedor ou um projeto pausado e perdido apagam a voz de alguém que talvez já tenha morrido. RPO hoje: infinito para os arquivos. RTO: sem plano.
Correção: (1) Supabase Pro + PITR antes do 1º cliente pagante; (2) um job diário (Inngest) que copia os objetos novos de `audios`, `acervo`, `causos`, `mensagens` e `exportacoes` para um bucket em outro provedor e outra conta (por exemplo R2 ou S3 com versionamento e object lock), com o manifesto `caminho → sha256 → tamanho`; (3) dump lógico semanal do banco no mesmo cofre; (4) teste de restauração trimestral com um livro de teste; (5) metas por escrito: RPO ≤ 24 h para o Storage e ≤ 5 min para o banco (PITR), RTO ≤ 24 h.

**D2 — Uma retentativa pode apagar os PDFs de uma versão já publicada (Alta).**
Evidência: `servico_export_pronto` devolve `false` se `estado <> 'gerando'` (`20261123120000_montar_livro.sql:660-661`); `gravarPronto` trata `false` como "expirou" e apaga a pasta (`lib/livro/armazenar.ts:115-118`); o passo `gravar` também apaga a pasta em qualquer erro (`lib/inngest/livro.ts:46-50`).
Cenário: a 1ª chamada grava `pronta` no banco, mas a resposta se perde (timeout, função morta perto dos 300 s); o Inngest repete o passo; agora a função devolve `false` e o código apaga a pasta que a linha `pronta` (imutável pelo trigger `book_exports_imutavel`) aponta. O livro publicado fica sem PDF e a linha não pode ser corrigida.
Correção: tornar o passo idempotente (devolver `true` se a linha já está `pronta` com a mesma `pasta`); apagar só se a `pasta` gravada no banco for outra; nunca apagar no `catch` sem reler a linha.

**D3 — O áudio original pode ser sobrescrito e não tem impressão digital (Média).**
Evidência: o upload é assinado com `upsert: true` (`app/livro/[id]/acoes.ts:815`, `app/a/[token]/acoes.ts:89`) e o TUS manda `x-upsert: true` (`lib/audios/tus.ts:53`). O token vale 2 h (`lib/gravacao/envio.ts:27`) e continua valendo depois da confirmação; a confirmação confere só o tamanho (`acoes.ts:986-993`, `a/[token]/acoes.ts:209-214`). Nenhum sha256 do arquivo é guardado. `recordings` não tem trigger de imutabilidade (o `pg_trigger` vivo só mostra os triggers de `qr_codes`, `book_exports`, `story_versions`, `transcripts` e `family_messages`).
Cenário: quem tem o token (membro ou o link do autor) regrava o arquivo depois de confirmado; um bug que reenvie outro blob para o mesmo caminho troca a voz sem rastro; não dá para provar a integridade depois.
Correção: `upsert: false` (conferir se a retomada do TUS precisa dele: pergunta 6); guardar `sha256` e tamanho quando o pipeline baixa o áudio para transcrever e conferir na cópia de D1; trigger em `recordings` que impeça mudar `caminho`, `tamanho_bytes` e apagar a linha; avaliar um trigger em `storage.objects` que recuse UPDATE e DELETE nos buckets `audios` e `qr` fora de um caminho de serviço (suspeita: confirmar a compatibilidade com a Storage API).

**D4 — "Nunca apagado" vale para as linhas, não para os arquivos (Média).**
Evidência: o banco protege bem as linhas (FK `restrict` em `recordings`, `stories`, `qr_codes` e `book_exports`; triggers só-insert). No Storage há 7 chamadas `remove` com a chave secreta: `app/livro/[id]/mensagens/acoes.ts:199`, `app/f/[token]/acoes.ts:197`, `lib/storage/upload.ts:34`, `lib/qr/recortar.ts:141` e `:144`, `lib/livro/armazenar.ts:92`, `lib/inngest/funcoes.ts:543`. Todas li e parecem corretas hoje (apagam arquivo recusado, rascunho vencido, mensagem apagada pelo responsável fora de versão publicada, recorte antigo, pasta de tentativa), mas nada no Storage impede um `remove` errado no futuro, e o Supabase Storage não tem lixeira nem versionamento.
Correção: uma única porta `lib/storage/apagar.ts` com a lista de buckets e prefixos permitidos (`audios` nunca), mais um teste que proíba `.remove(` fora dela (como `lib/eventos.ts`); a cópia de D1 com versionamento cobre o resto.

**D5 — A gravação vive só no aparelho até *Enviar*, e pode ficar órfã (Média).**
Evidência: T30/P38: nada sobe sozinho. `pedirPersistencia()` só é chamado ao começar e o resultado é ignorado (`components/gravacao/gravar.tsx:278`); o próprio código lembra que o Safari apaga após 7 dias sem uso (`lib/gravacao/local.ts:170`). As pendentes aparecem só na tela do mesmo destino, e para o autor o destino inclui o token (`gravar.tsx:34-39`, `95-98`): se o responsável troca o link, a gravação feita no link antigo não aparece no novo (*suspeita*: confirmar o que o link antigo mostra depois de trocado).
Cenário: a avó grava 40 minutos, fecha sem tocar *Enviar*, o iPhone limpa o site na semana seguinte; ou o link foi trocado e a gravação fica invisível.
Correção: listar as pendentes de todos os destinos do aparelho em qualquer tela de gravação; sem `persist()` concedido, avisar e oferecer *Salvar no celular*; avaliar o envio automático ao parar (mudança de P38/T30: precisa de decisão do Guilherme).

Pontos sólidos da gravação: o local só é apagado depois da confirmação do servidor (`lib/gravacao/envio.ts:139-142`, inclusive no caso `recebida`); uma falha de escrita no IndexedDB encerra a gravação guardando o que já foi gravado (`gravar.tsx:211-229`); os pedaços de 1 s formam um arquivo tocável mesmo cortado.

**D6 — Corrida que pode apagar o recorte vivo do QR (Baixa, suspeita).**
Evidência: o caminho do recorte depende da fonte (`lib/qr/recortar.ts:25-27`). Se a fonte for F1 → F2 → F1 → F3 durante um job, o job planejado com F1 sobrescreve o arquivo vivo e depois, recusado (`fonte_velha`), apaga esse mesmo caminho (`recortar.ts:139-142`). O QR fica mudo até o job F3 terminar; se ele falhar, mudo de vez.
Correção: no ramo `fonte_velha`, não apagar se o caminho for igual ao `audio_caminho` atual (a função SQL pode devolvê-lo).

## 5. O que está sólido (verificado)

- **RLS:** 31 de 31 tabelas com RLS no banco vivo, igual às migrations; `rls.test.ts:331` trava isso. As 5 tabelas sem política (`ai_usage`, `book_context`, `edit_locks`, `events`, `qr_consultas`) ficam fechadas, de propósito.
- **Funções:** toda `security definer` em `public` e `privado` fixa `search_path = ''` (consulta: 0 sem). O `anon` executa só 6 portas (`autor_*` e `familia_*`, com token); o `authenticated` executa as 38 da lista do teste e 3 de `privado` usadas pelas políticas. Nenhuma função tem EXECUTE para `public`.
- **Grants por coluna mínimos:** por exemplo, `books` só deixa mudar dados do autor e `configuracao` (o plano não); `porta_autor` não tem privilégio de tabela inteira.
- **T5/T46:** `family_messages`, `message_access`, `book_exports` e `book_layouts` com política restritiva `false` para `anon` e `porta_autor`; teste que procura as tabelas da família nas funções do autor.
- **Caminhos presos ao livro** por CHECK com regex de `book_id` (`recordings`, `photos`, `causos`, `qr_codes`, `book_exports`, mensagens): um membro não aponta para o arquivo de outro livro.
- **Storage:** 6 buckets privados com teto e tipo; nenhuma política em `storage.objects`; leitura assinada por 1 h, QR por 10 min.
- **Links:** 132 bits, só o hash no banco, comparação em tempo constante no descadastro, `no-referrer`/`noindex`/`no-store` nas páginas com token; QR com chave de rede por HMAC diário, sem guardar IP.
- **Imutabilidade:** `qr_codes`, `book_exports`, `story_versions` e `transcripts` recusam UPDATE/DELETE/TRUNCATE (triggers vivos); `mensagem_apagar` recusa mensagem com QR ou em versão publicada.
- **Inngest** com assinatura e trava de `INNGEST_DEV` na nuvem (`lib/pipeline/env.ts:26-34`, chamada em `lib/inngest/cliente.ts`); payloads só com ids (T36). Styleguide só com `ECOA_STYLEGUIDE=1`. Admin conferido no servidor (`lib/sessao.ts:28`), papel só em `app_metadata`.
- **Injeção:** Typst recebe o texto como JSON; nenhum `dangerouslySetInnerHTML`; o editor monta a partir do documento JSON. O canal Realtime exige membro do livro (`realtime.messages`).
- **Segredos:** nenhum padrão de chave no repo nem no histórico; `.env.local` ignorado e nunca commitado; só 2 `NEXT_PUBLIC_` (URL e chave publicável); logs com ids e códigos.

## 6. Perguntas abertas para os revisores

1. As prévias da Vercel usam o mesmo projeto Supabase de produção com a chave secreta? Há proteção de acesso nas prévias? (Uma branch com bug roda contra os dados reais.)
2. Quais cabeçalhos a produção devolve hoje (HSTS, X-Frame-Options)? Conferir com `curl -sI` fora deste ambiente.
3. As contas Supabase, Vercel, Inngest, Resend, Google (admin) e GitHub têm MFA? Quem tem acesso?
4. D2: há outro caminho em que `servico_export_pronto` volte `false` depois de `pronta` (cancelamento, replay manual do Inngest)?
5. S2: aceitar redes sem erro quando o global estoura reabre a enumeração de um jeito que importe? Qual o teto certo?
6. D3: a retomada do TUS do Supabase com token assinado funciona com `upsert: false`?
7. D3/D4: um trigger em `storage.objects` que recuse DELETE/UPDATE é seguro com a Storage API (ela apaga primeiro a linha ou o objeto)?
8. Editor: versões são só-insert e há cópia local (`components/telas/tela-editor.tsx:94-103`); a cópia que conflita com a revisão do servidor é mostrada ou descartada?
9. S1: a voz entra como dado pessoal sensível (biométrico) na LGPD neste uso? Isso muda a base legal.
10. S3/S4: trocar os links automaticamente ao remover um co-facilitador conflita com P10 (link permanente do grupo)? Precisa de decisão nova.
11. D5: o envio automático ao parar contraria P38/T30; vale propor uma decisão nova?
