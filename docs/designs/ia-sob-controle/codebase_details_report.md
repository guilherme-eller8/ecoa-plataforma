# Revisão de código (egm:egm-codebase-details, Sonnet) · prompt 9

Rodada única sobre a v2 de `docs/designs/ia-sob-controle.md` (a 1ª tentativa caiu por limite de uso e foi retomada). Só leitura de arquivos.

## Sobre a seção 11 (C1 a C7)

- **C1** certo (`processar.ts:374-380`). Incompleto: `banco.iniciar` (banco.ts:39-45) devolve todas as gravações da história; o loop transcreveria todas. Passar só a nova.
- **C2** certo (`processar.ts:393`). Incompleto: `gravarEstrutura` (banco.ts:263-269) só grava em história `ouvindo`; precisa de método novo.
- **C3** certo. Também mudam `dispararGravacao` (disparo.ts:25-32), o select de `audioEnviando` (acoes.ts:908) e o da varredura (funcoes.ts:241).
- **C4** incompleto, Alto (achado 1).
- **C5** certo; falta a lista de `config-banco.test.ts:20-49`.
- **C6** subestimado: quebram `lib/config.test.ts:63` e `scripts/lab/opcoes.ts:38-43`; `custo.ts` não quebra. Dois tipos `Tamanho` com o mesmo nome; falta o mapa posição → chave.
- **C7** e **R4** certos.

## Achados novos

1. **Alto — editor depois do aceite** (tela-editor.tsx:105-108; conteudo.ts:196-201; editor-texto.tsx:333): `originais` vem das props, então o próximo salvamento marca os parágrafos novos como `editado: true` (contradiz I3); `definir` emite mudança, salva de novo e troca a origem; `rev` precisa do retorno do aceite.
2. **Alto — consentimento de IA** ausente em `acrescentar_audio`.
3. **Alto — gravar mais** (tela-gravar-conversa.tsx:36-42; local.ts:8-18): o adaptador manda `conversa:{loteId}`, o que viola `recordings_para_historia_avulsa`; a gravação recuperada do IndexedDB criaria história nova. Adaptador próprio, `historiaId` no destino, `emPartes={false}`.
4. **Médio — canal** (regras.ts:36; historias-ao-vivo.tsx:127-139): o `else` assume `tipo: "texto"`; `useCanalDoLivro` não é exportado; fakes do lab e de `processar.test.ts`.
5. **Médio — falha da proposta**: o `onFailure` não marca a proposta; registrar `propor` em `funcoes`; `VARREDURA_PROPOSTA_MIN` repete `VARREDURA_PARADA_MIN`.
6. **Médio — *Tamanho* com áudio `gerando`**: falantes sem papel; recusar.
7. **Médio — marcações** com índice de sublista; guardar `paragrafo_id`. Título, ano e lacunas do *Tamanho* não definidos.
8. **Médio — parágrafos criados depois do pedido** precisam ficar; o erro `travado_alterado` seria enganoso.
9. **Médio — *Revisar* no Tiptap**: `ApiDoTexto` não expõe a seleção; `FolhaInferior` (`showModal`) tira o foco; salvar antes de pedir; UTF-16 vs `char_length`.
10. **Médio — ação síncrona**: sem `maxDuration`; 2 chamadas do modelo capaz; extrair `dependencias()`; ação que morre deixa `trecho` bloqueado 20 min.
11. **Médio — T31**: `aplicar_proposta` não grava `modelos` nem `hash_prompts`.
12. **Médio — motivos de recusa do áudio** viram "Guardada" (`dados.ts:343-353`, `MOTIVOS_ESPERA`).
13. **Baixo** — histórico não lê `tamanho`/`proposta_id` (`dados.ts:586`); regenerar `lib/supabase/tipos.ts`; reversão sem a trava destrutiva; "ids continuando" é o `fixarSegmentoInicial` (TS), não o SQL.

## Conferido e certo

`p1..pN` bate com `normalizarTexto`; `fixarSegmentoInicial` certo em história nascida de divisão (ids com buracos, sem colisão); desvio por `para_historia` em `servico_iniciar_historia` antes do lookup de `story_recordings`; R1 a R3; nome da constraint; premissa de custo e conta de R$ 28; `--comparar` usa a versão 1; reuso de `FolhaInferior`, `DicaPrimeiraVez`, `ControleTamanho`, canal `livro:`, `andamento()`, `fraseDoErro`, `novoId()`. `ControleTamanho` dispara a cada passo: o debounce fica no wrapper.
