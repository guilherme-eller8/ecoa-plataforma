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
| M7 HMAC x CLAUDE.md | Aceito: o Guilherme aprovou o HMAC (10/11/2026); a chave ganhou versão (`v1.` no token, `chave_versao` no banco, `LINKS_SEGREDO_V{n}`); o CLAUDE.md foi ajustado | Mudanças, Links, `CLAUDE.md` |
| M8 estado livre | Aceito: trigger de transições; `respondida` só pelo servidor; `enviada_em` pelo banco | SQL |
| M9 Storage grátis | Aceito: compressão para JPEG de até 3000 px no navegador (converte HEIC), miniatura sem `transform`, 200 fotos por livro conferidas no banco, bucket de 5 MB só JPEG | Fotos, SQL |
| M10 invariantes da enquete | Aceito: sem escrita direta para `authenticated`; 5 funções `enquete_*` com `membro_editando` | SQL, Quem pode o quê |
| D1 a D9 | Aceitos | SQL, Voto, Links, Causos, Quem pode o quê |
