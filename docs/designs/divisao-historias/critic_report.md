# Revisão de segurança e banco: divisão em histórias (prompt 7)

Revisor: `egm:egm-design` (Sonnet), rodada única (T28) · 2026-11-13 · revisou a v1 do design doc. O revisor só tinha ferramentas de leitura; o relatório foi gravado aqui pela sessão principal, sem mudança de conteúdo.

**Veredito:** aprovar com correções. Não achei vazamento entre livros, acesso do `porta_autor` nem injeção pelos argumentos jsonb. Os três achados Altos (1 a 3) são de correção do fluxo da ceia e de custo, e entram na v2. Do 4 ao 12 (Médios), cada um vira teste de banco ou de prévia. Os Baixos (13 a 20) são ajustes pequenos.

**Conferido:**
- **Isolamento entre livros.**
  - Toda consulta de grupo em `servico_iniciar_historia` filtra `book_id` e `lote_id`.
  - Um `lote_id` repetido em outro livro não faz nada.
  - As FKs `(book_id, divisao_de)` e `(book_id, pergunta_sugerida)` são compostas.
  - Em `confirmar_divisao`, `prompt_id` e `sugerida` são conferidos contra o livro do contêiner.
  - O universo de segmentos vem só das gravações do contêiner.
  - Ids de outro livro caem em `sem_permissao` ou `divisao_invalida`.
- **`porta_autor`.**
  - Não tem grant em `stories`, nem nas colunas novas, nem em `lote_total`/`lote_id` (só `authenticated` recebe insert).
  - Perde o execute das 4 funções novas (`revoke ... porta_autor`).
  - Os grants do prompt 5 não mudam.
  - O autor continua sem `lote_id`, então cada gravação dele segue avulsa.
- **Injeção.** Não há SQL dinâmico. O `search_path` é vazio e os nomes são qualificados. Os valores do jsonb só chegam a casts e comparações, nunca a texto de SQL.
- **Duas confirmações.** `for update` mais a guarda de estado `separar` fazem a segunda cair em `divisao_ja_confirmada`.
- **Enum.** Os valores novos só aparecem em literais dentro de plpgsql (`::text`), nunca em CHECK, índice ou função `language sql`. A subida numa transação só não é um problema porque nada usa o valor antes do commit.
- **`estrutura` copiada para as filhas.** Guarda só `falantes`, `vazios` e `mudancasDeAssunto` (ids), então não passa texto de uma história para outra.
- **T36.** Os passos devolvem contagens, a proposta fica em `stories.divisao` e o canal Realtime leva só a etapa.
- **P42.** O e-mail sai sem título.

| # | Sev. | Achado | Correção proposta |
| --- | --- | --- | --- |
| 1 | Alto | **Lote sem `lote_total` fecha no primeiro arquivo recebido, e é o caso principal da ceia.** O modo conversa chama `prepararAudios` uma parte por vez, então a linha da parte 2 só existe depois que a parte 1 subiu. Com `lote_total` null, `recebidas >= coalesce(null, recebidas + enviando)` dá verdadeiro com `enviando = 0`. A migration 20261116 (P43) impedia isso (parte de 29 min ou mais esperava); a v1 tirou essa proteção. **Cenário:** PWA antiga em cache, gravação já guardada no IndexedDB sem `totalPartes` ou recuperada (P38). A parte 1 (30 min) vira contêiner de 1 gravação; a parte 2 segue sozinha. A ceia vira duas histórias gigantes, sem divisão (P27). | Para `origem = 'conversa'` com `lote_total` null, manter a regra do P43: não fechar enquanto a parte tiver 29 min ou mais; fechar só pelo prazo de 6 h, ou quando a parte tiver menos de 29 min e for a única. Exigir `lote_total` nas linhas novas de lote e conversa e rejeitar no servidor o aparelho que não o envia. Teste: conversa de 2 partes sem total, parte 1 de 30 min → `lote_incompleto`. |
| 2 | Alto | **Uma confirmação dispara até 30 edições de IA, sem relação com os minutos de áudio.** `confirmar_divisao` aceita de 1 a 30 histórias com 1 segmento cada. O mínimo de "1 min de fala" existe só no prompt da IA; T38 conta só minutos de transcrição, e cada história paga editar, verificar, memória e retries. **Cenário:** um co-facilitador (ou um bug do aparelho) manda 30 itens de 1 segmento direto na RPC, em vários contêineres de 100 arquivos curtos. | No banco: fala mínima por história (por exemplo, 30 s somando `fim - inicio`), máximo de histórias proporcional ao áudio do contêiner (`ceil(min / 2)`) e teto diário de histórias mandadas à edição por livro (`MAX_EDICOES_DIA`). `escrever-historia` com concorrência global pequena. Teste: 30 itens de 1 segmento → `divisao_invalida`. |
| 3 | Alto | **A cota diária (T38) tem corrida e um beco sem saída.** A conferência olha `ai_usage` ao criar o contêiner; o uso só é gravado depois da transcrição. **Corrida:** lotes criados juntos (a trava é por `lote_id`) passam todos pela mesma leitura. **Beco:** um grupo com soma acima de 240 min nunca passa, volta `cota_diaria` para sempre, a varredura para de reenviar depois de 24 h, e a família vê "Guardada" sem motivo. | `pg_advisory_xact_lock` por livro e reserva de minutos: somar os contêineres ainda sem transcrição. Grupo acima do teto: motivo próprio (`lote_grande`) visível, ou fatiar. Teste: 2 lotes simultâneos de 150 min → o segundo recebe `cota_diaria`; lote de 300 min → motivo visível. |
| 4 | Médio | **A varredura deixa histórias válidas como `falhou`.** (a) O contêiner fica `ouvindo` durante toda a transcrição e nenhum passo atualiza a linha: um contêiner grande passa dos 20 min ainda rodando. (b) As filhas nascem `ouvindo`; a concorrência por `historiaId` não limita o conjunto, e a 15ª história pode esperar mais de 20 min na fila e ser marcada `falhou`. | Cada passo toca `atualizado_em` por função de servidor, ou o limite sobe com o tamanho do grupo. Teste: contêiner de 8 partes com passos lentos não é parado. |
| 5 | Médio | **Evento perdido depois de confirmar deixa a família sem saída.** `historia.confirmada` sai em `after()`; se falhar, as filhas ficam `ouvindo` sem execução e viram `falhou` em 20 min. A varredura de órfãs não cobre. O evento não tem `id`. | A varredura reenvia `historia.confirmada` para história `ouvindo` nascida de divisão e sem progresso. `id` do evento `confirmada:{historiaId}`; id novo no *Tentar de novo* do admin. |
| 6 | Médio | **D2 contraria P17 sem marcar.** P17 pede confirmação do responsável no lote. D2 segue direto quando a divisão acha 1 história, inclusive para lote de 8 áudios. | Marcar P44 como "substitui em parte P17" e justificar, ou manter a confirmação para grupo de 2 ou mais gravações. |
| 7 | Médio | **A reversão (5.2) não está inteira e perde proteções.** (a) Os 3 `create or replace` aparecem abreviados; o CLAUDE.md pede o SQL inteiro. (b) A trava só olha `divisao_de`: contêiner de várias gravações sem filhas passa, e o pipeline antigo escreveria uma história só com o lote inteiro. (c) Contêiner confirmado com descartes e sem filhas volta a usar a gravação inteira. | Mostrar os corpos inteiros. Estender a trava a `divisao is not null`, `segmentos is not null` ou contêiner com mais de 1 gravação; na reversão forçada, mandar esses contêineres para `falhou` (`reversao`). |
| 8 | Médio | **`dividir` e o "decide" não são idempotentes.** (a) Se cair depois de `servico_propor_divisao`, a nova tentativa não sabe o que fazer com `mudar_etapa(dividindo)` = false: repaga a IA ou marca `falhou`. (b) Uma segunda execução atrasada recalcula o "decide" sobre o contêiner já confirmado (mudanças zeradas) e cai em `escrever`. | Todo passo com custo começa lendo o estado e sai sem IA se a transição falhar ou se `divisao` já existir. O "decide" sai com `divisao` ou `divisao_de`. Validar `chave` com zod. Teste: reexecutar `dividir` em `separar` → zero chamadas à IA. |
| 9 | Médio | **URLs assinadas e rota `[historiaId]` sem checagem especificada.** Assinar com a chave secreta a partir de id vindo do aparelho deixaria um membro assinar áudio de outro livro. | Ler com a sessão (RLS) e assinar só os caminhos dessa leitura, com `book_id = [id]`. Teste de isolamento. |
| 10 | Médio | **A ordem do grupo pode embaralhar a conversa.** `criado_em` reflete a ordem de envio; `conversa-parte-10` vem antes de `conversa-parte-2` na ordem textual. | Gravar a posição (`parte`) e ordenar por ela; upload por ordem natural do nome. Teste: partes 2, 10 e 1 fora de ordem. |
| 11 | Médio | **Sem teto de minutos por contêiner.** Até 240 min numa chamada de `estruturar` e `dividir`, sem medida acima de 1 h. | `MAX_MIN_CONTEINER` (por exemplo, 120 min) com o excesso em outro contêiner, ou janelas. Medir no gate com 120 min. |
| 12 | Médio | **Arquivo excluído como gatilho não cria o contêiner dos outros.** Se o último a chegar for longo ou sem duração, a função devolve o motivo dele e os outros esperam a varredura. | Criar o contêiner dos demais na mesma chamada e devolver o motivo só para o excluído. Teste: lote de 3 com a 3ª de 40 min. |
| 13 | Baixo | `for update` antes de `eh_membro` deixa usuário de outro livro segurar o lock. | Conferir membro antes de travar. |
| 14 | Baixo | Casts do jsonb lançam erro cru (500) e o valor pode ir ao log; sem limite por item. | Validar tipos e tamanhos e devolver `divisao_invalida`; zod na ação. |
| 15 | Baixo | Ids sobrepostos entre transcrições do contêiner dão duplicatas em `v_todos`. | Recusar se houver id repetido. |
| 16 | Baixo | Descartar tudo deixa o contêiner em `separar` para sempre. | Aceitar lista vazia: gravações marcadas e contêiner em estado final. |
| 17 | Baixo | `responder_sugestao(aceitar)` não confere o estado da pergunta; `p_aceitar = null` vira ignorar. | Conferir estado; null → `false` sem efeito. |
| 18 | Baixo | LGPD: "descartar" não apaga; `confirmada_por` no jsonb não vira null ao apagar o usuário; rascunho no `localStorage`. | Texto "Fora das histórias"; não guardar `confirmada_por` no jsonb; apagar o rascunho ao confirmar e após 7 dias. |
| 19 | Baixo | `divisao.final` guarda só ids, sem a gravação; o vínculo descartado some. | Guardar `recording_id` com os trechos. |
| 20 | Baixo | Rótulos de falante podem colidir entre gravações. | Conferir que o rótulo é prefixado pela gravação (`g1:speaker_0`). |

**Decisões anteriores:** contrariada sem marcar: P17 (achado 6). Marcadas: P40 e P43. Respeitadas: T36, P42, T38 (com o achado 3), T35 (com o achado 11), T31, "áudio original nunca apagado" (achado 19).
