# Laboratório de IA

Transforma áudios de conversa em histórias de livro e aprende com as correções da família. Design: `docs/designs/laboratorio-ia.md`.

Tudo nesta pasta, exceto este README e o `glossario.exemplo.json`, fica **só no seu computador** (está no `.gitignore`): áudios, glossário real, textos e relatórios.

## Antes da primeira rodada real

1. **Consentimento.** Quem vai ser gravado aceitou que as histórias sejam gravadas e processadas com IA. O livro pode continuar surpresa. Registre o consentimento no `glossario.json` (passo 4). Sem ele, o lab não roda.
2. **Retenção nos provedores.** O áudio vai para o ElevenLabs (transcrição) e para a Anthropic (edição), fora do Brasil.
   - No ElevenLabs e no AssemblyAI, ligue a retenção zero ou o apagamento depois do processamento, e o não uso para treino, onde existir. Confira nas configurações da conta.
   - Na Anthropic, os dados da API não são usados para treino por padrão.
3. **Chaves.** Copie `.env.example` para `.env.local` e preencha `ANTHROPIC_API_KEY` e `ELEVENLABS_API_KEY`. `ASSEMBLYAI_API_KEY` só é necessária se for usar `--provedor assemblyai`.
4. **Glossário.** Copie `lab/glossario.exemplo.json` para `lab/glossario.json`. Preencha:
   - **autor:** nome e apelido de quem conta as histórias;
   - **sobre:** algumas linhas sobre a vida dele;
   - **pessoas** e **lugares** que podem aparecer, com apelidos;
   - **consentimento:** quem autorizou, a data e o que foi autorizado.

   Os nomes vão como dica para a transcrição e corrigem a grafia no texto.
5. **Preços.** Confira no site do ElevenLabs o preço por minuto e atualize `PRECOS_TRANSCRICAO_USD_MIN` e `PRECOS_TRANSCRICAO_CONFIRMADOS` em `lib/config.ts`. Enquanto isso não for feito, o custo sai como "provisório".
6. **Áudios.** Coloque os arquivos em `lab/audios/` (.opus, .ogg, .m4a, .mp3, .wav, .webm). Cada arquivo vira uma história.

## Rodar

```bash
npm run lab
```

- Gera `lab/relatorio.md`: veredito, transcrição, texto com ⚠ Confira, perguntas para a próxima conversa, custo e tempo.
- Gera, para cada história, `lab/saidas/<historia>/ia.md`: o texto para a família corrigir.
- `npm run lab -- --tamanhos todos` gera também as versões resumida e detalhada.
- A transcrição fica em cache: rodar de novo depois de mudar um prompt não paga a transcrição outra vez. `--sem-cache` força uma nova.
- `LAB_FAKE=1 npm run lab` faz uma rodada simulada, sem chaves e sem áudio, só para ver o formato.

## Ciclo com o design partner

1. Mande o `ia.md` (ou cole num Google Docs) para quem conhece o autor.
2. A pessoa corrige o texto: tira o que não foi dito, conserta nomes, recoloca expressões dele. Se quiser explicar uma correção, deixa `<!-- motivo: ... -->`.
3. Salve a versão corrigida como `lab/saidas/<historia>/editado.md`, com o título na 1ª linha (`# Título`) e um parágrafo por bloco.
4. Rode `npm run lab -- --comparar <historia>`.
5. Leia `lab/aprendizados.md`:
   - o percentual de parágrafos corrigidos;
   - cada correção classificada: invenção removida, erro de transcrição, voz restaurada, corte excessivo, informação nova da família, ordem ou estilo;
   - uma sugestão de regra para cada correção.
6. **ESCAPE** = a família tirou uma invenção de um parágrafo que não tinha ⚠. É o sinal mais grave: ajuste `lib/ai/prompts/verificar.md` ou `_conectores.md`.
7. Quando um padrão aparecer em 2 histórias, transforme-o em regra no `.md` certo de `lib/ai/prompts/`. Nada muda sozinho.
8. As perguntas da seção "Perguntas para a próxima conversa" viram o roteiro da próxima gravação.

O `ia.json` de uma história que já tem `editado.md` nunca é sobrescrito. Cada rodada nova vai para `historico/`.

## Onde ajustar

| Quero mudar | Arquivo |
| --- | --- |
| O que nunca pode ser inventado | `lib/ai/prompts/_regras.md` |
| O jeito de escrever | `lib/ai/prompts/_estilo.md` |
| Conectores de causa e palavras de emoção vigiados | `lib/ai/prompts/_conectores.md` |
| Expressões de "texto de IA" | `lib/ai/prompts/_anti-slop.md` (não vai para o prompt; só para a checagem) |
| O que o verificador procura | `lib/ai/prompts/verificar.md` |
| Modelos, preços, tamanhos, metas | `lib/config.ts` |

## Termos

- **Confira (⚠):** trecho que pode não estar no áudio. Vem das checagens automáticas (lista de palavras, números) ou do verificador (uma chamada independente do Claude que confere o texto contra a transcrição).
- **Escape:** invenção que passou sem ⚠ e a família pegou.
- **Segmento (S001…):** pedaço da transcrição. Cada parágrafo aponta para os segmentos de onde veio.
- **Primeira palavra:** quanto tempo até o texto começar a aparecer. Meta do PRD: 60 s depois do upload.
- **Anti-slop:** expressões típicas de texto gerado por IA.

## Problemas comuns

- **"Falta ... no .env.local":** veja o passo 3.
- **"não tem consentimento":** veja o passo 1.
- **Erro do provedor (401, 429…):** a chave está errada ou o limite acabou. A mensagem mostra a resposta do provedor.
- **"Scribe: resposta sem 'words'":** o formato da API mudou. A resposta bruta fica em `lab/.cache/transcricao/`; ajuste `lib/ai/transcricao/elevenlabs.ts`.
- **ffmpeg não encontrado:** rode `npm install` de novo (instala o `ffmpeg-static`) ou instale o ffmpeg no sistema.
