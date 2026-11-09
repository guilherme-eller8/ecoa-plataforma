# Revisão de segurança e arquitetura (goldfish: design critic)

Revisão da primeira versão de `familia-perguntas-enquete.md` (antes das correções). O revisor leu também o `CLAUDE.md`, o design anterior `acesso-plano-admin.md` e as 3 migrations aplicadas.

**Veredito:** não aprovar o SQL como estava. 2 bloqueantes e 10 achados médios. O que foi feito com cada achado está em [resolucao.md](./resolucao.md).

## Bloqueante

### B1. A rota de upload de áudio é uma porta anônima sem limite, e a cota de Storage é a mesma para todos os clientes

- **Problema:**
  - O limite de 20 por hora só valia em `familia_enviar_causo`. O `POST /f/[token]/audio` gerava uma URL assinada de upload a cada chamada, sem contagem nenhuma.
  - Quem tem o link pode pedir milhares de URLs e subir 6 MB em cada uma, sem nunca registrar um causo. Os arquivos ficam órfãos para sempre.
  - No plano grátis do Supabase, o Storage tem 1 GB para o projeto inteiro. Uns 170 uploads esgotam o espaço, e as fotos e áudios de **todas** as famílias param.
- **Correção sugerida:**
  - reserva de upload no banco, com limite contado sob trava;
  - a rota só assina o caminho reservado;
  - o causo exige a reserva;
  - um job apaga os órfãos;
  - rate limit no firewall da Vercel.

### B2. O isolamento por caminho é contornável com `%2e%2e`

- **Problema:**
  - O CHECK aceitava `like 'livros/<A>/causos/%'` e só barrava `..` literal.
  - `livros/<A>/causos/%2e%2e/%2e%2e/<B>/causos/<uuid>.webm` passa nas duas checagens.
  - O supabase-js não codifica o caminho, e o `fetch` normaliza `%2e%2e` como `..`.
  - Com isso, o servidor do livro A assinaria um objeto do livro B (o atacante precisa conhecer o uuid do objeto).
- **Correção sugerida:** regex ancorada nos CHECKs, a mesma validação no servidor antes de assinar e um caso de teste.

## Médio

- **M1. "Voto por aparelho" não é limite:**
  - a função é pública e aceita qualquer `p_aparelho`;
  - um script vota sem fim;
  - sugerido: teto de votantes por enquete e de trocas de voto por hora, sob a trava existente.
- **M2. Corrida no limite de causos:**
  - `count` seguido de `insert` sem trava deixa passar chamadas paralelas;
  - também falta um teto diário;
  - sugerido: trava por livro e teto por dia.
- **M3. Realtime em `poll_votes`:**
  - eventos DELETE não passam pela RLS nem por filtro (sinal entre livros);
  - o comportamento com grant só por coluna não está provado;
  - sugerido: Broadcast em canal privado por livro, ou assinar só INSERT e verificar no aceite.
- **M4. `enquete_salvar` duplica perguntas** com toque duplo ou com dois membros ao mesmo tempo, e conta mesmo quando nada foi gravado.
  - Sugerido: `for update`, `on conflict` e contar só com `found`.
- **M5. O membro escolhe `id` e `token_hash` do link da família:**
  - dá para gravar um token fraco, ou o hash do token do autor;
  - `update (revogado_em)` deixa "des-revogar";
  - sugerido: gerar e trocar só no servidor, com um trigger que impede a volta de `revogado_em` a nulo.
- **M6. O isolamento do autor dependia de uma busca em `prosrc`**, e não de privilégio.
  - Sugerido: um papel `nologin` dono das funções `autor_*`, sem grant nas tabelas da família, e o teste com `has_table_privilege`.
- **M7. O token por HMAC desvia da regra do CLAUDE.md** ("128 bits aleatórios") e não tem versão de chave.
  - Sugerido: registrar o desvio, pedir o OK e versionar a chave.
- **M8. `prompts.estado` é livre para o membro:**
  - dá para voltar uma pergunta para `para_enviar` e apagar;
  - dá para marcar `respondida` à mão;
  - sugerido: trigger de transições; `enviada_em` preenchido pelo banco.
- **M9. Storage e custo:**
  - fotos de 15 MB sem cota;
  - o `transform` do Supabase é recurso pago;
  - HEIC falha fora do Safari;
  - sugerido: cota por livro, miniatura sem `transform` e conversão no navegador.
- **M10. As funções invoker não eram a única porta:**
  - `enquete_abrir(livro, null)` passava;
  - o PostgREST deixava criar enquete vazia, itens demais e reabrir enquete;
  - sugerido: revogar a escrita direta e usar funções definer com checagem explícita.

## Detalhe

- **D1.** O hash do aparelho era igual em todos os livros. Isso permite cruzar famílias.
- **D2.** As funções processavam a entrada antes de checar o tamanho.
- **D3.** Erros de constraint chegavam crus ao anon.
- **D4.** Faltavam `Referrer-Policy: no-referrer` e `X-Robots-Tag: noindex` em `/f/*`.
- **D5.** O link era gerado durante um GET (prefetch e duas abas).
- **D6.** INSERT sob RLS com o plano vencido dá erro, não "0 linhas".
- **D7.** Faltava a versão do texto de consentimento.
- **D8.** Remover votos não impede votar de novo. Isso precisa estar explícito na tela.
- **D9.** O cookie gravado pelo proxy só aparece na requisição seguinte, a menos que entre também na requisição.
