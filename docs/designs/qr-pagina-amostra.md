# QR permanente, player e página de amostra (prompt 10, sem as telas do autor)

Status: **v2 aprovada pelo Guilherme em 2026-11-13** (Q1 a Q15 como recomendado; P55 a P58 e T43 a T46), revisada por 2 revisores (T28) · 2026-11-13 · PRD: M7 (aceite de `family_messages`), M9 (página de amostra), Livro pronto para a gráfica (QR permanentes, motor de PDF), Segurança, LGPD · Decisões: P4, P8, P24, P36, T5, T6, T19, T21, T22, T23, T25, T28, T29, T34, T36, T40

Relatórios: `qr-pagina-amostra/critic_report.md` (segurança) e `qr-pagina-amostra/codebase_details_report.md` (código). A seção 12 mostra o que mudou por causa de cada um.

## 1. Problema, hipótese e o que está em jogo

O QR é a promessa que diferencia a Ecoa de um livro comum: cada história impressa toca a voz original, para sempre. A página de amostra é a primeira vez que essa promessa sai do celular e vai para o papel.

- **Usuário:** André (filho do Nelson, parceiro de design) e o responsável do segundo livro parceiro. Eles geram e imprimem a página; quem escaneia é a família.
- **Hipótese:** com uma página impressa de uma história real, a família escaneia o QR e **toca** a voz do autor sem ajuda.
- **Sinal de sucesso (sai de `events`):** cada parceiro gera ao menos 1 página até 26/12 (`amostra_gerada`), e cada QR impresso tem *Ouvir* tocado por ao menos 3 redes diferentes na semana do Natal (`qr_tocou`: 1 por código, rede e hora; prévia do WhatsApp e robô não contam, porque não tocam).
- **Critério de morte:** a página é impressa e o QR é tocado por 1 rede ou menos (só quem imprimiu). Nesse caso, o QR é detalhe técnico, não argumento de venda, e a promessa da landing é revista antes da onda 2. Critério técnico: se o QR de 2 cm não abrir a 20 cm numa impressora comum, `QR_LADO_MM` sobe para 25 antes de qualquer livro.
- **Porta sem volta:** o código impresso, o alfabeto, o domínio e o formato da URL nunca mais mudam depois da primeira página impressa (`docs/decisoes/dominio.md`). Por isso Q3 e Q4 pesam mais que o resto, e Q4 só fecha depois do teste com aparelhos reais.

### O que ficou de fora e por quê (sua decisão de hoje, P55)

O design do prompt 5 tem um critério de morte: *"As telas do prompt 10 só começam depois desse sinal"* (algum autor grava sozinho pelo link em até 7 dias). Consulta no banco de produção em 13/11:

| Fato | Número |
| --- | --- |
| Gravações feitas pelo link do autor | **0** |
| Gravações no total | 5 (4 uploads e 1 conversa, todas do responsável) |
| Eventos do autor | 1 consentimento, em 10/11 |
| Fim da janela de 7 dias | 17/11 |

*Minhas histórias* e *Meu livro* esperam o sinal. Se ele não vier até 17/11, saem da onda 1. `family_messages` e o teste do token do autor entram agora, porque protegem o segredo do produto e não dependem da hipótese.

## 2. Escopo

**Entra:**
1. `family_messages` vazia e fechada, com RLS e política restritiva, e os testes de que nada acessado com o token do autor chega nela (item 2 do prompt).
2. `qr_codes`: código de 8 caracteres sorteado no banco, sem letras ambíguas, nunca apagado, desligável pelo responsável.
3. Player público em `ouvir.ecoa-memorias.com.br/{código}` e a raiz do subdomínio com um campo para digitar o código impresso.
4. Recorte do áudio do QR: só os trechos da história, em .m4a, num bucket próprio.
5. Teste de 1 dia Typst × Paged.js (seção 4), já feito, com recomendação.
6. *Página de amostra* numa história marcada como pronta: PDF de 1 página em 21 × 21 cm com 3 mm de sangria, liberado só com a voz pronta e com o QR decodificado por software antes do download.
7. Folha de teste do QR (Q4) e guia do subdomínio (seção 9).

**Não entra:**
- *Minhas histórias* e *Meu livro* do autor (P55).
- Colunas e telas de `family_messages`, e a coluna de mensagem em `qr_codes` (prompt 12, com EGM próprio).
- Guardar o PDF da amostra: ele é gerado na hora. Versão congelada é `book_exports` (prompt 13, T22).
- Alerta de foto abaixo de 300 DPI (prompt 13).
- `TrimBox` e `BleedBox` no PDF: nenhum dos dois motores grava (seção 4). Entra no prompt 13, depois da especificação da gráfica.
- Exclusão total por pedido formal (LGPD): desenho na seção 6, construção no prompt 15.

## 3. Decisões que preciso de você

| # | Decisão | Recomendo | Por quê | O que se perde |
| --- | --- | --- | --- | --- |
| Q1 | **SQL (seção 7)** | Aprovar | Ensaiado em PGlite com as migrations reais: 34 testes novos; a suíte inteira passa (598) | — |
| Q2 | **Motor de PDF** | **Typst** (seção 4). Confirma T19 | Sangria e página exata na 1ª tentativa, 1 a 20 ms por página, roda numa função comum da Vercel, sem navegador | Ajustes visuais na linguagem do Typst, não em CSS |
| Q3 | **Código do QR: 8 caracteres, sorteado no banco, guardado como está** (sem hash): exceção declarada a T6 | Assim, com 3 limites no banco: 10 códigos errados por rede em 10 min, 3.000 errados no total em 10 min, 60 aberturas certas por rede por minuto | O código vai impresso: é público por natureza. Com ~40 bits, um hash no banco não protege nada. 128 bits obrigariam um QR maior (versão 5, módulo de 0,44 mm em 2 cm) e um código impossível de digitar. Separar erros de acertos segura força bruta sem castigar a família na mesma rede (CGNAT) | Um atacante com muitas redes ainda acha códigos, devagar: com 3.000 erros por 10 min no total, ~430 mil tentativas por dia, 1 acerto a cada ~80 dias com 25 mil QR no ar |
| Q4 | **URL do QR em maiúsculas** (`HTTPS://OUVIR.ECOA-MEMORIAS.COM.BR/7KQ2M9XA`), **se passar no teste de aparelhos** | Gerar uma folha com os dois formatos; você escaneia com iPhone (câmera), 2 ou 3 Androids (câmera), WhatsApp e Google Lens. Se o maiúsculo falhar em qualquer um, fica o minúsculo | Maiúsculo: QR versão 3 em vez de 4, módulo 13% maior no mesmo 2 cm. Risco apontado pela revisão: leitores antigos podem não tratar `HTTPS://` maiúsculo como link | Uma rodada de teste com papel antes de imprimir a amostra de verdade |
| Q5 | **Sem dígito verificador** no código | Assim | Quase ninguém digita (a câmera lê); o limite de erros já absorve o erro de digitação. Um verificador tiraria ~5 bits de um código que já é curto | Erro de digitação consulta o banco (e conta 1 erro) |
| Q6 | **Áudio do QR = recorte só com os trechos da história**, .m4a (AAC 48 kbps, mono), sem metadados, num bucket `qr` próprio, feito com ffmpeg num passo do Inngest. Complementa T34 | Assim | Uma história pode ser 10 min de 1 h da ceia (T40). Tocar o arquivo inteiro entregaria a conversa toda. O banco recusa recorte mais longo que a fala da história + 30 s, e o player nunca toca recorte velho (falha fechado) | Mais um binário na função do Inngest (~77 MB, cabe no limite de 250 MB) |
| Q7 | **O QR nasce no primeiro *Página de amostra***, só para história **marcada como pronta**, por qualquer membro | Assim | Papel só com texto revisado. Gerar o PDF não é *Enviar para impressão* (essa sim é só do responsável, P7) | Quem quer imprimir antes de revisar precisa tocar em *Marcar como pronta* |
| Q8 | **Voltar a história para rascunho não desliga o QR** | Assim | O QR pode já estar no papel. Só o responsável desliga, de propósito (Q10) | Um QR de história em revisão continua tocando a voz (a voz não muda com a revisão do texto) |
| Q9 | **Player mínimo:** título, ano e *Ouvir*. Sem nome do autor, texto ou foto. Raiz do subdomínio: campo "Digite o código embaixo do QR" | Assim | Quem tem o QR tem o livro na mão. Menos dado exposto se um código vazar | O player não "vende" a Ecoa (rodapé discreto "Ecoa Memórias") |
| Q10 | **Desligar um QR: só o responsável**, num link discreto na folha da página de amostra ("Desligar este QR"), religável. Vale com o plano vencido | Assim | Voz de idoso é o dado mais sensível; a família precisa poder cortar um QR vazado sem falar com a Ecoa | Uma página impressa com QR desligado mostra "Este áudio não está mais disponível" |
| Q11 | **PDF só sai com a voz pronta** | A folha mostra "Preparando a voz…" (normalmente menos de 1 min) e o *Baixar PDF* aparece quando o recorte fica pronto | Uma página impressa com o player em "preparando" para sempre seria a pior primeira impressão | Espera de segundos antes do primeiro download |
| Q12 | **`family_messages` mínima agora** (`id`, `book_id`, `criado_em`), fechada, com política restritiva que nega `anon` e `porta_autor` para sempre; `qr_codes` sem coluna de mensagem | Assim | O prompt 12 desenha as colunas com EGM (a razão de P36). Uma coluna de mensagem no QR agora abriria porta pública para algo sem desenho | Nada |
| Q13 | **Texto da amostra:** o que couber, terminando no fim de um parágrafo, com "Continua no livro." quando cortar. Foto: a 1ª da história; sem foto, a página começa no título | Assim | Uma página só. Cortar no meio da frase parece erro de impressão | Histórias longas mostram só o começo |
| Q14 | **Segredo próprio `QR_REDE_SEGREDO`** para a chave de rede. Eu gero e cadastro na Vercel (Production e Preview), sem nunca mostrar o valor | Assim | Se o segredo dos links vazar, a chave de rede não cai junto (e vice-versa) | — |
| Q15 | **Subdomínio:** eu ligo `ouvir.ecoa-memorias.com.br` ao projeto na Vercel e você cria 1 CNAME no registro.br (seção 9) | Assim | O DNS fica no registro.br, como o do `app.` | — |

## 4. Teste de 1 dia: Typst × HTML com Paged.js

A mesma página (foto sangrando no topo, ano, título, 4 parágrafos em Newsreader e o QR de 24 mm com o código embaixo), gerada pelos dois motores neste container. Script: `qr-pagina-amostra/teste-motores.mjs`. Imagens: `qr-pagina-amostra/teste-typst.png` e `teste-pagedjs.png`.

| Critério | Typst (`@myriaddreamin/typst-ts-node-compiler` 0.7.0) | HTML + Paged.js 0.4.3 (Chromium sem tela) |
| --- | --- | --- |
| **Tamanho da página** | 216,0 × 216,0 mm, exato | 215,9 × 215,9 mm (o Chromium arredonda) |
| **Sangria** | A foto sangra 3 mm na 1ª tentativa | A foto não sangrou: o Paged.js corta o que passa da margem. Pede manipular a caixa da página por script |
| **Paginação** | 1 página na 1ª tentativa | 3 páginas na 1ª tentativa; 1 página depois de reescrever o layout |
| **Tipografia** | Justificado bom, Newsreader embutida (Regular e SemiBold) | Hifenização melhor ("locomo-tiva"), Newsreader embutida |
| **Tempo** | 13 a 23 ms na 1ª página, **1 a 2 ms** nas seguintes | **290 a 360 ms** por página, com o navegador já aberto |
| **Servidor** | Binário nativo de 51 MB na função da Vercel. Sem navegador | Chromium empacotado (~65 MB comprimido), 1 a 2 GB de memória, partida a frio de segundos |
| **QR decodificado do PDF** (72, 150 e 300 DPI) | Lido nos 3 | Lido nos 3 |
| **Texto da família** | Entra como dado (JSON lido pelo template), nunca como código | Entra como HTML: exige escapar tudo |
| `TrimBox`/`BleedBox` | Não grava | Não grava |

**Recomendação em 5 linhas:**
1. Typst. Acertou sangria e tamanho exato de primeira; o Paged.js precisou de duas rodadas e ainda não sangrou.
2. Gera uma página em 1 a 2 ms, contra ~300 ms: o livro de 80 páginas sai em menos de 1 s, folgado na meta de 2 min.
3. Roda numa função comum da Vercel, sem Chromium, sem partida a frio de segundos nem 2 GB de memória.
4. O texto da família entra como dado, nunca como código: some uma classe inteira de erro de escape.
5. O que se perde: hifenização um pouco pior e ajustes visuais na linguagem do Typst, não em CSS. Vale a troca.

## 5. Como funciona

### 5.1 A folha *Página de amostra* (no editor)

- O botão fica no bloco **"Pronta para o livro"** do editor (`components/telas/tela-editor.tsx`, ramo `revisada`), que é onde a história marcada como pronta já mostra o que fazer a seguir. Uma ação: *Página de amostra*.
- Tocar abre uma folha (o componente de folha que o editor já usa) e chama a ação `criarQr` (nova, ligada em `acoes` da página da história, como as do editor):
  - `criar_qr(story)` sorteia o código **no banco**, ou devolve o que já existe. Se `pedir_audio`, a ação envia o evento `qr/recortar` com **só o código** e registra `qr_criado` (`registrarEvento`) quando o QR nasceu agora.
  - Se `audio_pronto`: a folha mostra *Baixar PDF*. Senão: "Preparando a voz…", e a folha consulta a ação `estadoQr` a cada 3 s até ficar pronta (Q11). Passou de 2 min: "Está demorando. Feche e tente de novo daqui a pouco."
- *Baixar PDF* é um link comum (`<a href=".../amostra">`) para o GET da seção 5.3; o QR já existe quando o link aparece.
- Na mesma folha, para o responsável: link discreto *Desligar este QR* (com confirmação de 1 linha) ou *Ligar de novo* (Q10). Evento `qr_desligado`/`qr_religado`.
- Dica de primeira vez (1 linha, na folha): "Imprima e aponte a câmera do celular para o quadrado."

### 5.2 O recorte (`lib/inngest/qr-recortar.ts`, função `qr-recortar`)

- Gatilho `qr/recortar` com `{ codigo }`; `concurrency: { key: "event.data.codigo", limit: 1 }`; novas tentativas como as outras funções (`TENTATIVAS_POR_PASSO`). Entra no array `funcoes` de `lib/inngest/funcoes.ts`.
- **Passo 1, trechos.** Lê `story_recordings` da história na ordem (fora os áudios acrescentados que ainda não entraram no texto: `privado.audios_fora_do_texto`), `recordings.caminho` e `content_type`, e de `transcripts.segmentos` só `id`, `inicio` e `fim`.
  - `story_recordings.segmentos` guarda os **mesmos ids** de `transcripts.segmentos` (já contínuos na história), sem somar `segmento_inicial`; `inicio` e `fim` são segundos dentro daquele arquivo. Filtra sempre por `recording_id`. Reusa `temposDosSegmentos` de `lib/historias/dados.ts` (passa a ser exportada).
  - `segmentos` nulo = a gravação inteira, e aí a transcrição pode nem existir: usa `0` a `duracao_s`.
  - **Junção:** dois segmentos seguidos da história viram um trecho só se **nenhum segmento de fora da história** estiver entre eles naquela gravação. Folga nas pontas: até 0,25 s, limitada à metade do espaço até o segmento vizinho de fora.
  - Calcula a fonte com `privado.fonte_audio_da_historia`. Devolve só caminhos, tempos e a fonte: nenhum texto passa pelo Inngest (T36).
- **Passo 2, cortar.** Baixa cada original para `/tmp` (URL assinada curta; tamanho conferido contra `MAX_AUDIO_MB`). ffmpeg endurecido:
  - `-protocol_whitelist file` e o demuxer forçado pelo `content_type` validado (`mov`, `mp3`, `ogg`, `wav`, `webm`): nenhuma playlist ou URL dentro do arquivo é seguida;
  - `-ss`/`-to` na entrada de cada trecho (não decodifica 1 h para tirar 10 min), fade de 50 ms em cada emenda;
  - `-vn -map_metadata -1 -map_chapters -1`: sai sem capa, GPS, aparelho ou título do arquivo original;
  - AAC 48 kbps mono, `+faststart`; tempo limite por execução e saída limitada a `MAX_AUDIO_MB`.
  - Mede a duração do resultado e sobe para o bucket **`qr`** em `livros/{livro}/{código}-{12 hex da fonte}.m4a`.
  - O binário vem de `ffmpeg-static` (passa de devDependencies para dependencies). A resolução sai de `scripts/lab/audio.ts` (`caminhoFfmpeg`) para `lib/audio/ffmpeg.ts`, usada pelos dois.
- **Passo 3, gravar.** `servico_qr_audio_pronto(código, caminho, fonte, duração)`, com o mesmo lock da história que `criar_qr` usa. O banco recusa fonte velha (a história mudou durante o corte) e duração maior que a fala da história + 30 s. Gravou: apaga do bucket `qr` o recorte anterior que o banco devolveu.
- Falhou em todos os passos: o player mostra "preparando" e o próximo acesso (folha ou player) pede de novo, depois de 10 min.

### 5.3 A página de amostra (PDF)

- `GET /livro/[id]/historias/[historiaId]/amostra` (route handler, só membro pela sessão; `/livro` já é protegido em `lib/rotas.ts`). `maxDuration = 60`. Só lê: texto atual (`stories.texto`, tipo de `lib/editor/tipos.ts`), título, ano, a 1ª foto da história (`story_photos` → `photos.caminho`, bucket `acervo`) e o QR. Sem QR ou com a voz não pronta: 409 com uma página HTML curta ("Volte e toque em *Página de amostra* de novo").
- Monta um JSON (título, ano, parágrafos) e passa ao compilador pelos arquivos virtuais (`mapShadow`) junto com os bytes da foto e o SVG do QR. O template `lib/livro/amostra.typ` lê `json("dados.json")`: o texto nunca vira código Typst. Fontes Newsreader estáticas em `lib/livro/fontes/` (licença OFL junto).
- **Caber numa página:** tenta todos os parágrafos; se der mais de 1 página, procura por divisão binária o maior número de parágrafos inteiros que cabe e acrescenta "Continua no livro." (Q13). ~2 ms por tentativa.
- **Conferência antes do download:** rasteriza o PDF a 150 DPI com mupdf (WASM) e decodifica com jsQR. Só libera se o texto lido for exatamente a URL do código e se o PDF tiver 1 página. Falhou: 422 com página HTML "Não conseguimos conferir o QR. Tente de novo." Nenhum PDF sai.
- Resposta: `application/pdf`, `Content-Disposition: attachment; filename="amostra.pdf"; filename*=UTF-8''amostra-{título sem acento, só letras, números e hífen, até 60}.pdf`, `Cache-Control: private, no-store`. Evento `amostra_gerada` (só ids).
- QR vetorial (pacote `qrcode`), correção Q, 20 mm de símbolo + margem de silêncio de 4 módulos, preto puro, com "aponte e ouça" e o código em dois grupos de 4 (`7KQ2 M9XA`).
- **Empacotamento:** `@myriaddreamin/typst-ts-node-compiler` e `mupdf` em `serverExternalPackages`; `outputFileTracingIncludes` da rota com o template, as fontes e os `.wasm` do mupdf. Typst e mupdf nunca são importados por `lib/inngest/funcoes.ts`, e o ffmpeg só pela função do Inngest: cada função fica bem abaixo dos 250 MB.
- **Folha de teste do QR (Q4):** a mesma rota com `?teste=1`, só no ambiente de prévia, gera uma página com os dois formatos lado a lado (maiúsculo e minúsculo), cada um com 20 mm, rotulados A e B.

### 5.4 O player

- **`proxy.ts`, nesta ordem, antes de `/f` e `/a`:**
  - host = `DOMINIO_QR` (`lib/config.ts`): `/` reescreve para `/ouvir`; `/{8 símbolos do alfabeto, em qualquer caixa}` reescreve para `/ouvir/{código em maiúsculas}`; tudo o mais é 404 (inclusive `/f`, `/a`, `/livro`). Os arquivos do Next (`/_next/*`) e os com extensão já passam por fora do proxy pelo matcher, e servem a página.
  - host = `DOMINIO_APP` e caminho `/ouvir…`: redireciona (308) para o mesmo código em `DOMINIO_QR`. O player não roda na origem dos cookies de sessão.
  - outros hosts (prévias `*.vercel.app`) e caminho `/ouvir…`: serve direto, sem sessão nem Supabase (como `proxyAutor`), para conferir o deploy antes do DNS.
- **Cabeçalhos** em `next.config.ts` (`headers()`) para `/ouvir/:path*`: `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`.
- **`/ouvir/[codigo]`** (com `<Suspense>` e `params.then`, como as outras páginas dinâmicas):
  - IP do cabeçalho que a Vercel escreve (`x-real-ip`, depois `x-vercel-forwarded-for`), nunca o primeiro item de um `x-forwarded-for` do cliente. IPv6 vira o prefixo /64. Sem IP (só em desenvolvimento): `"sem-ip"`.
  - chave de rede = HMAC-SHA256(`QR_REDE_SEGREDO`, `"qr-rede:" + IP ou /64 + ":" + data UTC`), em hex (64). Nova função `chaveDeRede` em `lib/links.ts`, com o segredo lido de `lib/env-servidor.ts`.
  - `servico_ouvir_qr(código, chave)` pela chave secreta. `pedir_audio = true`: envia `qr/recortar` (o recorte se cura sozinho, mesmo com o plano vencido).
  - Estado `ok`: assina o recorte por 10 min (`assinarLeitura` ganha o bucket `qr` e um parâmetro de validade).
- **Telas, uma ação cada:**
  - **ok:** ano pequeno, título em Newsreader (sem título: "Uma história"), botão grande *Ouvir* (toca e pausa), barra de progresso. O primeiro *Ouvir* chama a ação `tocou` → `servico_qr_tocou` (1 evento por código, rede e hora). Rodapé: "Ecoa Memórias".
  - **preparando:** "A voz ainda está sendo preparada. Tente de novo em alguns minutos." + *Tentar de novo*.
  - **não encontrado:** "Não achamos este código. Confira as letras embaixo do QR." + o campo.
  - **desativado:** "Este áudio não está mais disponível."
  - **limite:** "Muitas tentativas agora. Tente daqui a alguns minutos."
  - **erro inesperado** (banco fora, chave inválida): "Não deu certo agora. Tente de novo." + *Tentar de novo*.
  - **raiz (`/ouvir`):** campo "Digite o código embaixo do QR". Passa para maiúsculas e tira espaço e hífen. Como `0`, `O`, `1`, `I` e `L` não existem no alfabeto, não há troca automática: se aparecer um deles, a tela diz "O código não tem 0, O, 1, I nem L. Confira a letra." sem consultar o banco.
- Funciona com o plano vencido (P4).

### 5.5 `family_messages` e o token do autor

- Tabela vazia, RLS ligada, grant só para o servidor e uma política **restritiva** `using (false)` para `anon` e `porta_autor`: mesmo que o prompt 12 crie uma política permissiva por engano, os dois papéis continuam sem ler (Q12).
- **Testes de banco:** `family_messages` entra em `TABELAS_DA_FAMILIA` de `autor-isolamento.test.ts` (privilégio de `porta_autor` e `anon`, detector de funções do autor). Em `qr.test.ts`: `has_table_privilege` **e** `has_any_column_privilege` falsos para `anon`, `authenticated` e `porta_autor`; a política restritiva conferida; `qr_codes` e `qr_consultas` sem nada para `anon` e `porta_autor`.
- **Teste das rotas do autor** (`lib/autor/rotas-autor.test.ts`, novo): lê `app/a/**` e `lib/autor/**`, extrai cada `.from("…")` e `.rpc("…")` e **reprova qualquer nome de `TABELAS_DA_FAMILIA`** (lista movida para `lib/familia/tabelas.ts`, usada pelos dois testes). É uma lista do que é proibido, não do que é permitido: não quebra quando o autor ganha uma função nova. Limite declarado: não pega nome de tabela montado em variável. Por isso as duas camadas do banco continuam sendo a defesa principal.

## 6. Segurança

| Ameaça | Defesa |
| --- | --- |
| Adivinhar códigos | 31^8 ≈ 8,5 × 10¹¹; 10 erros por rede e 3.000 no total a cada 10 min; quem errou 10 vezes não consulta nem código válido na janela |
| Atacante com muitas redes (IPv6, proxies) | Chave por /64 no IPv6 e o teto global de erros. Opcional: regra de limite no Firewall da Vercel (conferir no Hobby) |
| Família na mesma rede (CGNAT) travada | Acertos têm balde próprio (60/min); quem lê o QR certo quase nunca erra |
| Um QR vazado expõe a conversa inteira da ceia | Só o recorte com os trechos da história, em bucket próprio; o player nunca recebe o caminho do original. Recorte velho nunca toca (o player compara a fonte e responde "preparando") |
| O job entrega áudio demais | O banco recusa recorte mais longo que a fala da história + 30 s |
| Arquivo malicioso no ffmpeg (playlist, URL, metadados) | Arquivo local, `-protocol_whitelist file`, demuxer forçado, `-map_metadata -1`, tempo e tamanho limitados |
| URL do áudio compartilhada | Assinada por 10 min, de um arquivo que só tem a história |
| Player vira porta para dados do livro | `servico_ouvir_qr` devolve só estado, título, ano e o caminho do recorte; só a chave secreta chama |
| IP da família guardado | O app não guarda o IP: a chave é um HMAC com segredo próprio e a data, e `qr_consultas` guarda 2 h. Os logs da Vercel e do Supabase seguem a retenção de cada provedor (para o texto de LGPD do prompt 15) |
| Código impresso apagado ou trocado | Gatilho recusa apagar, truncar e trocar código, livro ou história, até para a chave secreta. Mudam só o recorte e o desligamento |
| QR vazado ou impresso por engano | O responsável desliga e religa (Q10), com evento |
| Cliente escolhe o código | O código é sorteado dentro de `criar_qr`; a função não recebe código |
| Texto da família vira código no PDF | JSON lido pelo template |
| Token do autor alcança mensagens | Sem grant, política restritiva, e o teste das rotas |
| Host `ouvir.` servindo o app | No host `ouvir.`, o proxy só conhece `/` e `/{código}`; `/ouvir` no host `app.` redireciona para `ouvir.` |

**Exclusão por pedido formal (LGPD, construção no prompt 15):** uma função do admin, `admin_excluir_livro`, liga uma variável de sessão explícita (como a da reversão) que o gatilho de `qr_codes` respeita só para aquele livro, apaga os recortes do bucket `qr` e os originais, e registra o pedido. O responsável recebe o aviso de que os QR impressos deixam de tocar. Até lá, desligar (Q10) cobre o caso urgente.

## 7. SQL

Arquivos: `supabase/migrations/20261120120000_qr_amostra.sql` (subida) e `supabase/reversao/20261120120000_qr_amostra.down.sql` (reversão). Resumo da subida:

```sql
-- Espelhados em lib/config.ts (config-banco.test.ts confere)
qr_erros_por_chave() = 10, qr_erros_global() = 3000, qr_acertos_por_minuto() = 60,
qr_audio_espera_s() = 600, qr_folga_recorte_s() = 30

-- 1. family_messages (id, book_id, criado_em). RLS; grant só service_role;
--    política RESTRICTIVE "sem login nunca lê" para anon e porta_autor: using (false).
-- 2. Bucket privado 'qr' (audio/mp4, 50 MB), sem políticas em storage.objects.
-- 3. qr_codes
create table public.qr_codes (
  codigo text primary key check (codigo ~ '^[2-9A-HJKMNP-Z]{8}$'),
  book_id uuid not null references public.books (id) on delete restrict,
  story_id uuid not null unique,
  audio_caminho text,              -- livros/{livro}/{codigo}-{12 hex}.m4a no bucket qr (CHECK)
  audio_fonte text, audio_duracao_s numeric(7,2),     -- os 4 do recorte: todos ou nenhum (CHECK)
  audio_pedido_em timestamptz, audio_pronto_em timestamptz,
  desativado_em timestamptz, desativado_por uuid,
  criado_por uuid, criado_em timestamptz not null default now(),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete restrict
);
--    Gatilhos: nada apaga nem trunca; código, livro, história e criado_em nunca mudam.
--    authenticated: select das colunas sem o caminho do recorte, só do próprio livro.
-- 4. qr_consultas (chave hash, tipo erro|acerto|tocou, janela, n). Só service_role.
-- 5. privado.qr_sortear_codigo(): gen_random_uuid + rejeição (sem viés).
-- 6. privado.fonte_audio_da_historia(story): sha256 das gravações e trechos no texto de hoje.
--    privado.qr_reservar_audio(codigo): reserva o recorte por 10 min se a fonte mudou.
-- 7. criar_qr(story) → (codigo, audio_pronto, pedir_audio): lock da história primeiro;
--    membro, plano ativo, história pronta e revisada, com áudio, sem gravação inteira
--    dividida com outra história; QR desligado = erro. Idempotente.
-- 8. desativar_qr(codigo, desligar): só o responsável; vale com o plano vencido.
-- 9. servico_qr_audio_pronto(codigo, caminho, fonte, duracao) → (gravado, anterior):
--    mesmo lock; só a fonte de agora; duração ≤ fala + 30 s.
-- 10. servico_ouvir_qr(codigo, chave) → jsonb: limite de erros (rede e global) antes de tudo;
--     erro conta nos dois baldes; acerto no dele; recorte velho = preparando + pedir_audio.
-- 11. servico_qr_tocou(codigo, chave): 1 evento qr_tocou por código, rede e hora.
-- 12. servico_qr_limpar_consultas(): chamada pela varredura do Inngest (apaga > 2 h).
```

Reversão: trava se houver QR ou mensagem; só roda forçada com `set ecoa.reversao_destrutiva = 'sim'`; o bucket só sai vazio. Depois da primeira página impressa, **nunca roda em produção**.

## 8. Testes

**Banco (feitos e passando):** `supabase/tests/qr.test.ts`, 34 testes:
- `family_messages`: sem privilégio de tabela nem de coluna para `anon`, `authenticated` e `porta_autor`; RLS com só a política restritiva; membro não lê nem com linha guardada; `qr_codes` e `qr_consultas` sem nada para `anon` e `porta_autor`.
- Sorteio: 2.000 códigos no alfabeto, sem repetição, os 31 símbolos aparecem; `criar_qr` não aceita código.
- `criar_qr`: outro livro, anon, não revisada, sem áudio, gravação inteira compartilhada, idempotência e reserva, plano vencido.
- Recorte: grava a fonte atual e libera o PDF; fonte velha não grava; duração acima da fala + folga recusada; recorte novo devolve o anterior; caminho de outro livro recusado; áudio acrescentado fora do texto fica fora da fonte.
- Imutabilidade com a chave secreta; membro lê só o próprio livro, sem o caminho, e não insere; desligar só pelo responsável (nem o co-facilitador), desligado não gera página nem toca, religar volta.
- Player: anon e authenticated barrados; estados; história mudada = preparando e pede uma vez; plano vencido; 10 erros travam a rede e outra segue; 60 acertos por minuto; teto global; chave inválida e a global recusadas.
- `qr_tocou` 1 por código, rede e hora, só com ids; limpeza; reversão trava, forçada passa, sobe de novo.
- Mais `autor-isolamento` com `family_messages`, `config-banco` com os 5 números e `rls` com `criar_qr` e `desativar_qr` na lista do `authenticated`. Suíte inteira: 598 testes passando.

**Unidade (a fazer):** normalização do código digitado; junção de trechos (segmento de fora no meio, folga limitada, `segmentos` nulo sem transcrição); argumentos do ffmpeg (whitelist, demuxer, sem metadados); caber na página; `chaveDeRede` (IPv4, IPv6 /64, sem IP); teste das rotas do autor; o proxy nos 3 hosts.

**Integração (a fazer, sem rede):** amostra de uma história de exemplo com o Typst real (1 página, 216 × 216 mm, Newsreader embutida, QR decodificado); PDF com QR trocado recusado; recorte de um .m4a com metadados de teste sai sem eles e com a duração certa.

**Tela (Playwright, a fazer):** player nos 6 estados e na raiz (exemplos no styleguide); folha da amostra (preparando → *Baixar PDF*, desligar).

**Gate de fim e de design:** como no `CLAUDE.md`. **Aceite do prompt:** você imprime a página numa impressora comum e o QR de 2 cm abre o player a 20 cm. Antes, a folha de teste da Q4.

## 9. Configuração do subdomínio

Hoje: o DNS do `ecoa-memorias.com.br` é do registro.br (`d.sec.dns.br`, `e.sec.dns.br`). O `app.` aponta para a Vercel por CNAME e está verificado. O `ouvir.` ainda não existe na Vercel.

1. **Eu, com o seu OK na Q15:** adiciono `ouvir.ecoa-memorias.com.br` ao projeto `ecoa-plataforma` na Vercel (produção) e cadastro `QR_REDE_SEGREDO` (Q14).
2. **Você, no registro.br** (Domínios → `ecoa-memorias.com.br` → DNS → Editar zona → Nova entrada):
   - Tipo: `CNAME`
   - Nome: `ouvir`
   - Dados: `fb39d318f8d07408.vercel-dns-017.com.` (o mesmo alvo do `app.`, recomendado pela Vercel)
   - Salvar. A propagação leva de minutos a 2 horas.
3. **Eu confiro** pela Vercel que o domínio ficou verificado e com certificado, e abro `https://ouvir.ecoa-memorias.com.br/` no deploy de produção.
4. **Antes de imprimir qualquer página (pendências suas):**
   - pagar o domínio por vários anos no registro.br (aceita até 10) e ligar a renovação automática: deixar vencer apaga todos os QR impressos;
   - anotar quem é o titular do domínio e quem herda o acesso (o domínio precisa viver tanto quanto os livros).

## 10. Ordem de entrega

- **A. Banco:** migration, testes de banco, `lib/config.ts`, frases dos erros. *(Feito no ensaio; aplica no Supabase depois do OK.)*
- **B. Player e subdomínio:** proxy, `/ouvir` e `/ouvir/[codigo]`, `chaveDeRede`, segredo, exemplos no styleguide, domínio.
- **C. Recorte:** `lib/audio/ffmpeg.ts`, função `qr-recortar`, limpeza na varredura, bucket `qr`.
- **D. Página de amostra:** dependências (`@myriaddreamin/typst-ts-node-compiler` 0.7.0, `mupdf` 1.28.6, `jsqr` 1.4.0, `qrcode` 1.5.4; `ffmpeg-static` 5.3.0 para dependencies), template e fontes, rota do PDF com a conferência, folha no editor, desligar, folha de teste da Q4.
- **E. Gate:** build, lint, testes, e2e, design, prévia na Vercel e conferência das rotas novas.

Se o tempo apertar, D vem antes de C só com a folha de teste da Q4 (que não depende do recorte): é o teste com papel que mais cedo destrava a decisão irreversível.

## 11. Decisões novas para registrar depois do OK

- **P55:** telas do autor do prompt 10 (*Minhas histórias*, *Meu livro*) esperam o sinal da hipótese 2 do prompt 5; sem sinal até 17/11, saem da onda 1. O resto do prompt 10 segue.
- **P56:** página de amostra de história marcada como pronta, por qualquer membro; texto até onde couber, em parágrafos inteiros, com "Continua no livro."; o PDF só sai com a voz pronta (Q7, Q11, Q13).
- **P57:** player mínimo (título, ano, *Ouvir*); raiz do subdomínio com campo para o código; métrica = *Ouvir* tocado, 1 por código, rede e hora (Q9).
- **P58:** o responsável desliga e religa um QR; voltar a história para rascunho não desliga (Q8, Q10).
- **T43:** Typst confirmado como motor de PDF pelo teste de 1 dia (Q2). Confirma T19.
- **T44:** código do QR com 8 símbolos de `QR_ALFABETO`, sorteado no banco e guardado como está (exceção a T6: impresso e público), com limites separados de erros e acertos no banco e chave de rede com segredo próprio; formato da URL (maiúsculo ou minúsculo) decidido pela folha de teste com aparelhos reais; sem dígito verificador (Q3, Q4, Q5, Q14).
- **T45:** áudio do QR é um recorte .m4a só com os trechos da história, sem metadados, no bucket `qr`, feito com ffmpeg endurecido num passo do Inngest; o banco confere a fonte e a duração; o original nunca é servido pelo player (Q6). Complementa T34.
- **T46:** `family_messages` nasce mínima e fechada no prompt 10, com política restritiva para `anon` e `porta_autor`; colunas, políticas de membro e o QR de mensagem no prompt 12 (Q12).
- **T21 e o PRD** (`ecoamemorias.com.br`, sem hífen) ganham "Substituída por `docs/decisoes/dominio.md`".

## 12. Revisão

Uma rodada, 2 revisores em Sonnet (T28). Os dois terminaram.

### Segurança (`critic_report.md`): "não aprovar ainda"

| # | Achado | O que mudou |
| --- | --- | --- |
| 1 | Recorte velho servido quando a história muda; duração sem freio; arquivo órfão; bucket próprio | **Aceito.** Player falha fechado (compara a fonte); o banco confere a duração; o recorte anterior é apagado; bucket `qr`. Recusa de gravação inteira dividida com outra história. Não fiz o gatilho em `story_recordings`: a comparação da fonte já cobre e é mais simples |
| 2 | Limite por IP não segura força bruta e castiga CGNAT | **Aceito.** Erros e acertos em baldes separados, teto global, /64 no IPv6, IP da Vercel. Dígito verificador: recomendo não (Q5) |
| 3 | Escrita por consulta; métrica poluída | **Aceito.** Limpeza na varredura; a métrica passa a ser *Ouvir* tocado, 1 por código, rede e hora |
| 4 | ffmpeg com entrada não confiável | **Aceito** por inteiro (5.2) |
| 5 | Sem desligar e sem caminho LGPD | **Aceito.** `desativar_qr` só do responsável; `criar_qr` recusa QR desligado; desenho da exclusão na seção 6, construção no prompt 15 |
| 6 | Teste estático é frágil; grant por coluna; `message_id` | **Aceito em parte.** `message_id` saiu; política restritiva; `has_any_column_privilege`. **Recusado:** regra do ESLint proibindo a chave secreta em `app/a/**` (as rotas do autor já usam, de propósito, para `recordings` e o storage) e o teste de integração que grava acessos (o e2e roda sem Supabase) |
| 7 | PDF sem a voz; maiúsculas em leitores antigos; domínio | **Aceito.** Q11, folha de teste da Q4, pendências do domínio na seção 9, T21/PRD marcados |
| 8 | Junção e folga invadem outra história | **Aceito** (5.2) |
| 9 | Lock, corrida, `unique_violation`, co-facilitador | **Aceito:** lock antes de ler, mesmo lock no recorte, sorteio no banco. **Recusado:** player "desativado" quando a história volta para rascunho (desligaria um QR já impresso; Q8). Co-facilitador gera a página: Q7 |
| 10 | Ativos do Next, origem do `app.`, `filename`, cache | **Aceito** (5.3, 5.4) |
| 11 | Segredo reaproveitado; promessa sobre IP | **Aceito** (Q14 e seção 6) |

### Código (`codebase_details_report.md`)

| # | Achado | O que mudou |
| --- | --- | --- |
| 1 | Allowlist das rotas do autor inviável | **Aceito:** virou lista do que é proibido, com o limite declarado |
| 2 | Semântica dos ids do recorte | **Aceito** e confirmado no SQL da divisão (5.2) |
| 3 | Áudio acrescentado com `segmentos` nulo e fora do texto | **Aceito:** fica fora da fonte até entrar no texto; nulo sem transcrição usa a duração |
| 4 | Proxy: ordem, matcher, host `app.`, regex | **Aceito** (5.4) |
| 5 | Reuso de `envLinks`/`assinarLeitura`; cabeçalho do IP | **Aceito**, com segredo próprio em vez de `envLinks` (achado 11 da segurança) |
| 6 | Empacotamento | **Aceito** (5.3, 10.D) |
| 7 | Script do teste não estava no repositório | **Aceito:** `qr-pagina-amostra/teste-motores.mjs` |
| 8 | Não há "menu da história" | **Aceito:** bloco "Pronta para o livro"; fluxo em 2 passos (5.1) |
| 9 | `cacheComponents`, `maxDuration`, erro em resposta PDF | **Aceito** (5.3, 5.4) |
| 10 | Contagem de testes; `caminhoFfmpeg` | **Aceito** |
| 11 | Limpeza por chamada; `qr_aberto`; código escolhido pelo cliente | **Aceito** (os três) |
| 12 | Lacunas | **Aceito:** tela de erro inesperado, normalização, título nulo, nome do arquivo, formato do texto, foto do `acervo`, configuração do job |
