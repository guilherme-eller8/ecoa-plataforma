# Relatório do crítico de design (egm-design, Sonnet, rodada única)

Revisor sem permissão de escrita; relatório gravado pelo orquestrador, sem edição de conteúdo além do resumo dos achados. Linhas citadas referem-se à primeira versão do design doc.

Veredito do revisor: não aprovar ainda. 1 Crítico, 3 Altos, 5 Médios, 2 Baixos. O isolamento de T5 se sustenta por privilégio: nenhum caminho do token do autor até `causos`, `polls`, `poll_items`, `poll_votes`, `family_access` ou `family_messages`.

| # | Nível | Achado | Correção proposta |
| --- | --- | --- | --- |
| 1 | Crítico | `alter function ... owner to porta_autor` pode falhar no Supabase, onde `postgres` não é superusuário (exige SET em `porta_autor` e CREATE no schema). O PGlite roda como superusuário e esconde isso | `grant porta_autor to current_user`; `grant create on schema` temporário; validar no banco real |
| 2 | Alto | Gravação presa para sempre depois de 7 dias: `autor_preparar_gravacao` devolve a linha velha, que o servidor já recusa | Linha vencida → `gravacao_expirada`; o aparelho gera novo id e reenvia o Blob |
| 3 | Alto | Teto de 30 por dia não limita bytes: link vazado reserva 30 × 50 MB por dia | Teto de bytes do autor, relação tamanho × duração, teto diário em bytes, limite de linhas `enviando` abertas |
| 4 | Alto | Políticas `using (true)` dão ao `porta_autor` todos os livros; o isolamento entre livros depende só do código das funções | `set_config('ecoa.livro', ...)` depois de validar o token e políticas filtrando por ele; grant por coluna em `author_access` |
| 5 | Médio | A confirmação do autor reusa `servico_confirmar_audio`, que não confere o token | `servico_confirmar_gravacao_autor(token, id, tamanho)` |
| 6 | Médio | O teste de isolamento só detecta funções `autor_%` | Detector por dono `porta_autor` e allowlist de privilégios |
| 7 | Médio | Trocar o link deixa gravação local sem destino | Gravação fica guardada com aviso; *Salvar arquivo* como saída |
| 8 | Médio | A ceia tem 1 hora e o gravador corta em 30 min | Encadear nova gravação sem parar o microfone, ou 60 min |
| 9 | Médio | IndexedDB cheio, ordem das escritas no `stop()`, token TUS que expira, Wake Lock perdido ao ocultar | Tratar cada um no gravador |
| 10 | Médio | Reversão trava inteira com dados e apagaria o consentimento (prova de LGPD) | Reversão em duas partes: funções e grants sempre; colunas só sem dados; `begin/commit` |
| 11 | Baixo | `p_ext` nulo, corrida antes do lock, `returns public.author_access` com `select *`, responsável logado abrindo o link vira `authenticated` | Ajustes pontuais no SQL; cliente do autor sempre sem sessão |
| 12 | Baixo | Token na URL vaza por `Referer`; foto e áudio da sugestão voltam como caminho cru sem regra de quem assina | `Referrer-Policy: no-referrer`; o servidor só assina caminhos devolvidos por `autor_pagina` |
