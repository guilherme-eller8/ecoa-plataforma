# Relatório de precisão com o código (egm-codebase-details, Sonnet, rodada única)

Revisor sem permissão de escrita; relatório gravado pelo orquestrador, resumido. Linhas citadas referem-se à primeira versão do design doc.

| # | Nível | Achado | Correção proposta |
| --- | --- | --- | --- |
| 1 | Blocker | O doc prometia "limite por IP como a família", mas `app/f/[token]/acoes.ts` não tem nenhum; os limites da família estão no SQL | Tirar a frase; extrair `tokenValido` e `LINK_INVALIDO` para um módulo comum |
| 2 | Major | A reversão deixava `execute` de `porta_autor` em `privado.livro_editavel` e `privado.max_audio_bytes`, e o `drop role` da reversão do prompt 4 falharia (`rls.test.ts:384`) | `revoke execute` no down |
| 3 | Major | `alter function ... owner to porta_autor` só passa no PGlite (superusuário) | `grant porta_autor to current_user` e `create` no schema durante a migration |
| 4 | Major | Testes existentes quebram: `audios.test.ts:239` (`porta_autor` passa a ler `id`) e `:135` (origens) | Reescrever os dois e listá-los no doc |
| 5 | Major | `config-banco.test.ts` (funções novas de `privado`) e `lib/erros-banco.ts` (códigos novos sem frase) | Incluir nos arquivos alterados; frase própria de `link_invalido` para o autor |
| 6 | Major | `lib/supabase/tipos.ts` precisa ser regerado | Incluir, com `lib/autor/tipos.ts` para o jsonb |
| 7 | Major | `linkDoAutor` criando link na renderização contradiz `linkDaFamilia` (só lê; quem cria é a ação). Consumidores esquecidos: kit, perguntas, `tela-kit`, `tela-perguntas`, `AcoesKit`, `ligar-acoes`, exemplos | Só leitura + `pegarLinkDoAutor`/`trocarLinkDoAutor`; a base do link vai ao cliente |
| 8 | Major | O gravador reimplementava o `GravadorCauso`; o fallback `ogg` não é aceito pelo SQL | Extrair o núcleo e compartilhar; remover `ogg` |
| 9 | Major | `tus.ts` usa a impressão digital padrão (um Blob remontado nunca retoma); o id do responsável vem do servidor | Parâmetro `fingerprint`; guardar `preparado` no IndexedDB; reusar `reassinarAudio` e `confirmarAudio` |
| 10 | Major | Ninguém assinava a foto e o áudio da sugestão na página do autor | Assinar no servidor só o que `autor_pagina` devolve; `assinar()` em módulo comum |
| 11 | Major | `proxy.ts` não desvia `/a/` (sessão a cada requisição, token no Referer) | Mesmo desvio de `/f/` e `/a/:path*` no `matcher` |
| 12 | Major | Arquivos esquecidos: cadeia de `prepararAudios`, `eventos-acoes.ts`, `audiosDoLivro` (origem), `tela-nova-historia` (já existe) | Lista completa na seção 8 do doc |

Ressalvas menores: `p_ext` nulo; sinal de "já recebida" na repetição; detector de funções por nome; gravação presa quando o link é trocado.
