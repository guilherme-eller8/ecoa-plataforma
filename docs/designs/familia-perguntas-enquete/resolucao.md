# Resolução dos achados goldfish

Cada achado foi classificado como **Aceito** (o design mudou) ou **Contestado** (fica como está, com o motivo). Os revisores de escopo (zoom out) e de design inicial caíram por limite de uso; com o OK do Guilherme, rodaram de novo só prontidão e código, sobre o doc já corrigido.

## Segurança ([critic_report.md](./critic_report.md))

| Achado | Decisão | Onde mudou |
| --- | --- | --- |
| B1 upload anônimo sem limite | Aceito, com outro desenho: em vez de uma tabela de reservas, o próprio causo é a reserva. O causo nasce antes do áudio (o limite de 20/h e 40/dia vale ali), o caminho é fixado pelo banco, e o servidor só assina para um causo que espera áudio há menos de 30 min, sem sobrescrever. Áudio de no máximo 2 MB (48 kbps). Não sobra arquivo órfão: sem causo não há URL. **Contestado** o job de limpeza: um causo sem áudio não tem arquivo, e o pior caso de um link vazado é de 80 MB por dia. O firewall da Vercel fica como reforço opcional | Causos, SQL (`familia_enviar_causo`, `servico_caminho_audio_causo`, `servico_confirmar_audio_causo`), riscos |
| B2 `%2e%2e` | Aceito: regex ancorada nos CHECKs (`^livros/<livro>/causos/<id>\.(webm\|m4a\|ogg)$` e `^livros/<livro>/acervo/<uuid>\.jpg$`), a mesma regex em `lib/arquivos.ts` antes de assinar, e um teste | SQL, Causos, Fotos, testes |
| M1 voto sem limite | Aceito: 150 votantes por enquete e 300 trocas por hora, sob a trava; o texto do risco foi corrigido | SQL (`familia_votar`), Voto por aparelho |
| M2 corrida no limite | Aceito: `pg_advisory_xact_lock` por livro e teto diário de 40 | SQL |
| M3 Realtime | Aceito, e indo além: o Realtime sai deste prompt. A tela consulta a cada 4 s enquanto está visível; o Realtime por Broadcast entra no prompt 6 | Mudanças, Ranking, Alternativa F |
| M4 `enquete_salvar` duplica | Aceito: `for update`, `on conflict` e contagem só com `found` | SQL |
| M5 membro grava o hash do link | Aceito: `authenticated` só lê; `servico_trocar_link_familia` (chave secreta) confere o membro e troca numa transação; trigger impede "des-revogar" | SQL, Links |
| M6 isolamento do autor por grep | Aceito: papel `porta_autor` (nologin) sem grant nas tabelas da família; o teste usa `has_table_privilege` e prova o mecanismo com uma função de teste; o grep fica como complemento | SQL, Token do autor, testes |
| M7 HMAC x CLAUDE.md | Aceito: o Guilherme aprovou o HMAC (10/11/2026); a chave ganhou versão (`v1_` no token, `chave_versao` no banco, `LINKS_SEGREDO_V{n}`); o CLAUDE.md foi ajustado | Mudanças, Links, `CLAUDE.md` |
| M8 estado livre | Aceito: trigger de transições; `respondida` só pelo servidor; `enviada_em` pelo banco | SQL |
| M9 Storage grátis | Aceito: compressão para JPEG de até 3000 px no navegador (converte HEIC), miniatura sem `transform`, 200 fotos por livro conferidas no banco, bucket de 5 MB só JPEG | Fotos, SQL |
| M10 invariantes da enquete | Aceito: sem escrita direta para `authenticated`; 5 funções `enquete_*` com `membro_editando` | SQL, Quem pode o quê |
| D1 a D9 | Aceitos | SQL, Voto, Links, Causos, Quem pode o quê |

## Prontidão ([implementation_readiness_report.md](./implementation_readiness_report.md))

| Achado | Decisão | Onde mudou |
| --- | --- | --- |
| 1 CHECK com função sem grant | Aceito: regex literal; `re_uuid` removida; teste de INSERT e UPDATE pela sessão (reproduzido e corrigido no PGlite) | SQL, testes |
| 2 player reinicia | Aceito: URL assinada no toque (`urlDoAudio`), guardada no cliente; a atualização pausa com áudio tocando | Comportamento detalhado |
| 3 textos maiores que as colunas | Aceito: `item_valido` exige 3 a 500 caracteres; causo corta em 500; só áudio vira "Conte a história que {nome} pediu" | SQL, Comportamento |
| 4 erros genéricos e 0 linhas | Aceito: frase de reserva por SQLSTATE; `.select("id")` com 0 linhas vira `livro_fechado`; `Resultado` e `Aviso` sob a ação | Comportamento |
| 5 `link_ja_revogado` | Aceito | Quem pode o quê |
| 6 tentar de novo o áudio | Aceito: confirma primeiro; só assina de novo se `info()` não achar o arquivo; `contentType` sem codecs | Comportamento |
| 7 fotos parciais | Aceito: registra as que subiram, "Tentar de novo" por foto, órfão aceito; actions em `app/livro/[id]/fotos/acoes.ts` | Comportamento, Arquivos |
| 8 estado da configuração | Aceito: `pendentes` inclui passos sem estado; sem redirecionar com plano vencido | Configuração, Comportamento |
| 9 estados vazios | Aceito: tabela de estados vazios | Comportamento |
| 10 puladas e desfazer | Aceito: grupo "Puladas (n)" e "Desfazer envio" | Comportamento |
| 11 candidatos da enquete | Aceito: banco, texto próprio e causos; perguntas já na lista não entram; salvar aberta ou encerrada; causo salvo vira `virou_pergunta` (no SQL) | Comportamento, SQL |
| 12 upsert no índice parcial | Aceito: lê os `banco_id` e filtra antes | Configuração, Comportamento |
| 13 status de `/f` inválido | Aceito: 200 com `noindex` e a frase; validar no proxy custaria uma chamada ao banco por acesso | Comportamento |
| 14 arquivos | Aceito: lista corrigida, com criar/alterar | Arquivos |
| 15 verificações | Aceito: obj. 1 (3 toques), obj. 7 e 10 com teste, `enquete_remover_votos` testada | Objetivos, Arquivos |
| 16 medição | Aceito: as funções devolvem `livro` e `votante`; medir por `count(distinct votante)` | Hipótese, SQL |
| 17 a 24 | Aceitos, menos `MAX_FOTOS_POR_ENVIO` (ver código, 11) | Ordem, Ranking, Comportamento, Links, Proxy |

## Código ([codebase_details_report.md](./codebase_details_report.md))

| Achado | Decisão | Onde mudou |
| --- | --- | --- |
| 1 CHECK com `re_uuid` | Aceito (o mesmo achado da prontidão) | SQL |
| 2 ponto no token | Aceito: `v1_` e `/f/:path*` explícito no `matcher` | Links, Proxy |
| 3 ordem do cookie no proxy | Aceito | Comportamento |
| 4 `livrosDoMembro` | Aceito: traz `autor_apelido`, `autor_parentesco` e `configuracao` | Arquivos |
| 5 segredo em `envServidor()` | Aceito: `envLinks()` em `lib/env-links.ts`, valida de V1 até a atual | Links, Arquivos |
| 6 `item_valido` | Aceito: regex de `banco_id` e `causo_id`, causo do mesmo livro, `item_invalido` | SQL |
| 7 testes genéricos | Aceito: listas e título atualizados; tabela de `anon` ganha as 7 | Arquivos |
| 8 `como()` | Aceito: `porta_autor` e `service_role` | Arquivos |
| 9 reaproveitamento | Aceito: gravador do P2 e `lib/ui/tempo.ts`; `Abas` controlável; `Seletor` no parentesco; exemplos do styleguide; `Causo.relacao` sai | Comportamento |
| 10 home do livro | Aceito: `tela-livro.tsx` substitui `tela-livro-vazio.tsx`; vitrine e inspeção atualizadas | Arquivos, Comportamento |
| 11 `MAX_FOTOS_POR_ENVIO` duplica `MAX_ARQUIVOS_LOTE` | **Contestado:** são números de negócio diferentes (lote de áudios do M4 e envio de fotos do M2), que podem mudar separados. Ficam as duas constantes | — |
| 12 CLAUDE.md já mudou | Aceito: texto atualizado | Mudanças, Links |
| 13 `lib/rotas.ts` não muda | Aceito | Arquivos |
| 14 `podeEscrever` | Aceito | Comportamento |
| 15 evento `votou` | Aceito: `votante` em `detalhes` | Comportamento |
| 16 `p_itens` nulo | Aceito | Arquivos (teste) |
| 17 `if exists` na reversão | Aceito | SQL de reversão |
| 18 relatórios no cabeçalho | Aceito: links corrigidos; o de zoom out não rodou (limite de uso) e saiu do cabeçalho | Cabeçalho |
| 19 25 caracteres | Aceito | Links, Arquivos |
| 20 texto do WhatsApp | Aceito: tudo sai de `lib/whatsapp.ts`, inclusive o exemplo | Comportamento |

## Depois da aprovação (10/11/2026)

| Ponto | Decisão | Onde mudou |
| --- | --- | --- |
| Guilherme: a saída não é necessariamente "Enviar ao autor"; o filho pode gravar o pai na mesa | Aceito. A 1ª aba vira "Para perguntar" (o enum continua `para_enviar`). O cartão tem "Enviar ao autor" sem pressão para enviar, e "Gravar agora" entra no prompt 5 com o mesmo peso. Uma pergunta gravada ao vivo vai direto para Respondidas pelo servidor; o trigger de transições já permite, porque só restringe a sessão. Sem mudança de schema | Mudanças, Comportamento detalhado, telas |
