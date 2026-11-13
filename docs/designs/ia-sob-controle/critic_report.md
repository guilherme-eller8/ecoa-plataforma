# Revisão de segurança e banco (egm:egm-design, Sonnet) · prompt 9

Rodada única sobre a v2 de `docs/designs/ia-sob-controle.md` (a 1ª tentativa caiu por limite de uso e foi retomada depois do reinício do limite). Leitura do SQL da seção 7, da seção 11 e das migrations pipeline, divisao e editor; nada executado.

## Achados

1. **Alto.** `aplicar_proposta` não confere título, ano e lacunas: grava `titulo` e `ano` do `p_conteudo`. Um aceite sem `ano` apaga o ano corrigido à mão; o título da IA sobrescreve o da pessoa; `lacunas` entra livre com origem IA. Correção: exigir título, ano e lacunas iguais aos do texto atual.
2. **Alto.** Ids duplicados no texto atual: com dois `p3` travados idênticos, o texto final só pode ter um, e a checagem "todo atual aparece" passa para os dois; um travado some em silêncio. Correção: recusar ids repetidos no atual e conferir que o tamanho do texto final = atuais fora das mudanças + parágrafos postos.
3. **Médio.** A ordem relativa dos parágrafos que ficam não é conferida; um `p_conteudo` pode reordenar travados.
4. **Médio.** `poe` com id igual ao de um parágrafo atual fora das mudanças: a última checagem compara só o id, e o texto novo é descartado em silêncio. Correção: comparar tudo e recusar a colisão.
5. **Médio.** Revisar trecho: `mudancas_validas` não exige 1 mudança, que tira só o parágrafo pedido e põe no máximo 1.
6. **Médio.** Consentimento de IA não é conferido em `acrescentar_audio` nem em `pedir_proposta`.
7. **Médio.** Os tetos de duração usam a `duracao_s` declarada pelo cliente. Correção: reconferir a duração real depois da transcrição; opcional: CHECK de 1 a 1800 s com `para_historia` e política de insert exigindo história pronta do mesmo livro.
8. **Médio (T36).** `servico_falhar_proposta` grava `p_erro` sem validar; uma violação de CHECK devolve "Failing row contains (...)" com texto, que pode subir ao Inngest. O mesmo nos CHECKs de `servico_gravar_proposta`. O doc também deve dizer que a saída entre passos fica em `servico_gravar_proposta(p_pronta = false)`.
9. **Baixo.** `audios_fora_do_texto`: uma proposta de tamanho aplicada em parte conta todas as gravações como cobertas.
10. **Baixo.** `inicio`/`fim`: a string "12" passa no regex; conferir também `jsonb_typeof = 'number'`.
11. **Baixo.** O corpo de `servico_iniciar_historia` deve ser o de `20261117…_divisao.sql`, com o desvio antes da checagem de `processado_em`.

## Sobre a seção 11 do doc

- R1 a R6 corretos. R5: com cota esgotada o áudio também fica sem ligação à história, e *Usar este áudio* só enxerga áudios ligados.
- "`para_historia` precisa estar pronta" é incompleto: só é conferido no processamento, não no insert.
- "A garantia do travado está no banco" vale só para o conteúdo dos parágrafos; passaram os achados 1 a 4, 6, 7 e 8.

## Correto, sem mudança

Checagens de texto, fontes e `editado` (jsonb como jsonb, `editado` ausente = false); RLS de `story_proposals` sem colunas sensíveis e sem grant para `anon`/`porta_autor`; CHECKs compatíveis com os descartes do servidor; trigger de imutabilidade com a exceção da LGPD; chave composta de `para_historia`; nomes de constraint; funções `privado.*` sem grant; ordem da reversão.
