# QR permanente, player e página de amostra (prompt 10, sem as telas do autor)

Status: **v1 para revisão** · 2026-11-13 · PRD: M7 (aceite de `family_messages`), M9 (página de amostra), Livro pronto para a gráfica (QR permanentes, motor de PDF), Segurança · Decisões: P4, P8, P24, P34, T5, T6, T19, T21, T22, T23, T25, T28, T29, T34, T36

Prompt com [EGM] e banco: design doc + SQL de subida e reversão para o OK. Revisores (T28): `egm:egm-design` e `egm:egm-codebase-details`, em Sonnet, numa rodada.

## 1. Problema, hipótese e o que está em jogo

O QR é a promessa que diferencia a Ecoa de um livro comum: cada história impressa toca a voz original, para sempre. A página de amostra é a primeira vez que essa promessa sai do celular e vai para o papel.

- **Usuário:** André (filho do Nelson, parceiro de design) e o responsável do segundo livro parceiro. Eles geram e imprimem a página; quem escaneia é a família.
- **Hipótese:** com uma página impressa de uma história real, a família escaneia o QR e ouve a voz do autor sem ajuda.
- **Sinal de sucesso (sai de `events`, sem nada novo):** cada parceiro gera ao menos 1 página até 26/12 (`amostra_gerada`), e cada QR impresso abre o player ao menos 3 vezes na semana do Natal (`qr_aberto`).
- **Critério de morte:** a página é impressa e o QR abre 1 vez ou menos (só quem imprimiu). Nesse caso, o QR é detalhe técnico, não argumento de venda, e a promessa da landing é revista antes da onda 2. Critério técnico: se o QR de 2 cm não abrir a 20 cm numa impressora comum, `QR_LADO_MM` sobe para 25 antes de qualquer livro.
- **Porta sem volta:** o código impresso, o alfabeto, o domínio e o formato da URL nunca mais mudam depois da primeira página impressa (`docs/decisoes/dominio.md`). Por isso as decisões Q3 e Q4 pesam mais que o resto.

### O que ficou de fora e por quê (decisão de hoje, P55)

O design do prompt 5 tem um critério de morte: *"As telas do prompt 10 só começam depois desse sinal"* (algum autor grava sozinho pelo link em até 7 dias). Consulta no banco de produção em 13/11:

| Fato | Número |
| --- | --- |
| Gravações feitas pelo link do autor | **0** |
| Gravações no total | 5 (4 uploads e 1 conversa, todas do responsável) |
| Eventos do autor | 1 consentimento, em 10/11 |
| Fim da janela de 7 dias | 17/11 |

Você escolheu dividir: *Minhas histórias* e *Meu livro* esperam o sinal. Se ele não vier até 17/11, saem da onda 1. A tabela `family_messages` e o teste do token do autor entram agora, porque protegem o segredo do produto e não dependem da hipótese.

## 2. Escopo

**Entra:**
1. `family_messages` vazia, fechada, com RLS, e o teste de que nada acessado com o token do autor chega nela (item 2 do prompt).
2. `qr_codes`: código de 8 caracteres sem letras ambíguas, nunca apagado.
3. Player público em `ouvir.ecoa-memorias.com.br/{código}` e a raiz do subdomínio com um campo para digitar o código impresso.
4. Recorte do áudio do QR: só os trechos da história, em .m4a.
5. Teste de 1 dia Typst × Paged.js (seção 4), já feito, com recomendação.
6. Botão *Página de amostra* numa história marcada como pronta: PDF de 1 página em 21 × 21 cm com 3 mm de sangria, com o QR decodificado por software antes do download.
7. Guia do subdomínio (seção 9).

**Não entra:**
- *Minhas histórias* e *Meu livro* do autor (P55, acima).
- Colunas e telas de `family_messages` (prompt 12, com EGM próprio).
- Guardar o PDF da amostra: ele é gerado na hora, a partir do texto atual. Versão congelada é `book_exports` (prompt 13, T22).
- Alerta de foto abaixo de 300 DPI (alertas são do prompt 13). A amostra usa a foto como está.
- `TrimBox` e `BleedBox` no PDF: nenhum dos dois motores grava (seção 4). Entra no prompt 13, depois da especificação da gráfica.

## 3. Decisões que preciso de você

| # | Decisão | Recomendo | Por quê | O que se perde |
| --- | --- | --- | --- | --- |
| Q1 | **SQL (seção 7)** | Aprovar | Ensaiado em PGlite com as migrations reais: 23 testes (seção 8) | — |
| Q2 | **Motor de PDF** | **Typst** (seção 4). Confirma T19 | Sangria e página exata na 1ª tentativa, 1 a 20 ms por página, roda numa função comum da Vercel, sem navegador | Ajustes visuais pedem a linguagem do Typst, não CSS |
| Q3 | **Código do QR: 8 caracteres, guardado como está** (sem hash), exceção declarada a T6 | Assim, com limite de 30 consultas por minuto por rede e o player mostrando só título, ano e a voz | O código vai impresso no papel: é público por natureza. Com 8 símbolos (~40 bits), um hash no banco não protege nada (dá para testar todos em minutos). 128 bits obrigariam um QR maior (versão 5, módulo de 0,44 mm em 2 cm) e um código impossível de digitar | Quem acertar um código por sorte ouve uma história. Com 25 mil QR no ar, é 1 acerto a cada ~34 milhões de tentativas, com o limite segurando cada rede em 30 por minuto |
| Q4 | **URL do QR em maiúsculas**: `HTTPS://OUVIR.ECOA-MEMORIAS.COM.BR/7KQ2M9XA` | Assim | O QR cai da versão 4 para a 3 (29 × 29 módulos): módulo 13% maior no mesmo 2 cm, leitura mais fácil a 20 cm. Domínio e esquema não diferenciam maiúscula; o player aceita o código em qualquer caixa | Nada: quem lê vê o mesmo endereço |
| Q5 | **Áudio do QR = recorte só com os trechos da história**, em .m4a (AAC, 48 kbps, mono), feito com ffmpeg num passo do Inngest. Complementa T34 ("sem ffmpeg nesta fase") | Assim | Uma história pode ser 10 min de uma gravação de 1 h da ceia (T40). Tocar o arquivo inteiro entregaria a conversa toda (outras histórias, conversa de mesa) a quem tiver o QR. O .m4a também toca no Safari de qualquer iPhone | Mais um binário no servidor (~75 MB). Se o pacote da função passar do limite, o recorte ganha um endpoint do Inngest só dele |
| Q6 | **O QR nasce no primeiro *Página de amostra*** e só para história **marcada como pronta** (`revisada_em`) | Assim | O papel só deve ter texto que a família revisou. Um QR por história, criado uma vez | Quem quer imprimir antes de revisar precisa tocar em *Marcar como pronta* |
| Q7 | **Player mínimo:** título, ano e um botão *Ouvir*. Sem o nome do autor, sem o texto, sem foto. A raiz do subdomínio mostra um campo "Digite o código embaixo do QR" | Assim | Quem tem o QR tem o livro na mão; o player não precisa repetir o que está no papel. Menos dado exposto se um código vazar | O player não "vende" a Ecoa. Um rodapé discreto "Ecoa Memórias" fica |
| Q8 | **`family_messages` mínima agora:** só `id`, `book_id`, `criado_em`, fechada para todos menos o servidor | Assim | O prompt 12 desenha as colunas com EGM próprio; criar agora nome, relação, áudio e foto seria adivinhar e alterar de novo (a mesma razão de P36). O teste do autor vale desde já | Nada |
| Q9 | **Texto da amostra:** o que couber na página, sempre terminando no fim de um parágrafo, com "Continua no livro." quando cortar. Foto: a 1ª da história; sem foto, a página começa no título | Assim | Uma página só. Cortar no meio da frase parece erro de impressão | Histórias longas mostram só o começo |
| Q10 | **Subdomínio:** eu ligo `ouvir.ecoa-memorias.com.br` ao projeto `ecoa-plataforma` na Vercel (com o seu OK) e você cria 1 registro CNAME no registro.br (seção 9) | Assim | O DNS fica no registro.br, como o do `app.` | — |

## 4. Teste de 1 dia: Typst × HTML com Paged.js

A mesma página (foto sangrando no topo, ano, título, 4 parágrafos em Newsreader e o QR de 24 mm com o código embaixo), gerada pelos dois motores neste container. Script e PDFs: `scripts/lab/pdf-motor/` (seção 10, fase C).

| Critério | Typst (`@myriaddreamin/typst-ts-node-compiler` 0.7) | HTML + Paged.js (Chromium sem tela) |
| --- | --- | --- |
| **Tamanho da página** | 216,0 × 216,0 mm, exato | 215,9 × 215,9 mm (o Chromium arredonda) |
| **Sangria** | A foto sangra 3 mm na 1ª tentativa (`place` com deslocamento negativo) | A foto não sangrou: o Paged.js corta o que passa da margem. Pede manipular a caixa da página por script |
| **Paginação** | 1 página na 1ª tentativa | 3 páginas na 1ª tentativa (posição absoluta quebrou o fluxo); 1 página depois de reescrever o layout |
| **Tipografia** | Justificado bom, Newsreader embutida (Regular e SemiBold) | Justificado com hifenização melhor ("locomo-tiva"), Newsreader embutida |
| **Tempo** | 13 a 23 ms na 1ª página, **1 a 2 ms** nas seguintes | **290 a 360 ms** por página, com o navegador já aberto |
| **Servidor** | Binário nativo de 51 MB dentro da função da Vercel. Sem navegador | Chromium empacotado (`@sparticuz/chromium`), ~65 MB comprimido, 1 a 2 GB de memória, partida a frio de segundos |
| **QR decodificado do PDF** (72, 150 e 300 DPI) | Lido nos 3 | Lido nos 3 |
| **Texto da família** | Entra por um arquivo JSON lido pelo template: o texto nunca vira código Typst | Entra como HTML: exige escapar tudo |
| `TrimBox`/`BleedBox` | Não grava | Não grava |

**Recomendação em 5 linhas:**
1. Typst. Ele acertou sangria e tamanho exato de primeira; o Paged.js precisou de duas rodadas e ainda não sangrou.
2. Gera uma página em 1 a 2 ms, contra ~300 ms: o livro de 80 páginas sai em menos de 1 s, folgado na meta de 2 min.
3. Roda numa função comum da Vercel, sem Chromium, sem partida a frio de segundos nem 2 GB de memória.
4. O texto da família entra como dado (JSON), nunca como código: some uma classe inteira de erro de escape.
5. O que se perde: hifenização um pouco pior e ajustes visuais na linguagem do Typst, não em CSS. Vale a troca.

## 5. Como funciona

### 5.1 Criar o QR e pedir o recorte

1. Na história marcada como pronta, o menu da história ganha *Página de amostra*.
2. A ação do servidor sorteia um código (`crypto.randomInt` sobre `QR_ALFABETO`) e chama `criar_qr(story, código)`. Se a história já tem QR, o banco devolve o mesmo. Colisão (`qr_colisao`) = sorteia outro, até 5 vezes.
3. Se o banco responde `precisa_audio = true`, a ação envia o evento `qr/recortar` ao Inngest com **só o código**. O banco reserva o pedido por 10 min (`QR_AUDIO_ESPERA_MIN`): dois toques não geram dois recortes.
4. A tela leva para o download (5.3). O PDF não espera o recorte: o QR já aponta para o código.

### 5.2 O recorte (`lib/inngest/qr-recortar.ts`)

- **Passo 1, trechos:** lê `story_recordings` (na ordem), `recordings.caminho` e, em `transcripts.segmentos`, só `id`, `inicio` e `fim` dos segmentos que a história usa (`segmentos` nulo = a gravação inteira). Junta trechos com menos de 2 s de intervalo e acrescenta 0,25 s nas pontas. Calcula a fonte com `privado.fonte_audio_da_historia`. Devolve só caminhos, tempos e a fonte: nenhum texto passa pelo Inngest (T36).
- **Passo 2, cortar:** baixa os originais por URL assinada curta, corta e emenda com ffmpeg (fade de 50 ms em cada emenda), grava em .m4a com `+faststart` e sobe para `audios/livros/{livro}/qr/{código}-{12 hex}.m4a`. Os 12 hex vêm da fonte: um recorte novo nunca sobrescreve o antigo.
- **Passo 3, gravar:** `servico_qr_audio_pronto(código, caminho, fonte)`. Se a história mudou durante o corte (outro áudio acrescentado), o banco recusa e o próximo *Página de amostra* pede um recorte novo.
- Erro em qualquer passo: novas tentativas do Inngest; depois disso, o player mostra "preparando" até o próximo pedido.

### 5.3 A página de amostra

- `GET /livro/[id]/historias/[historiaId]/amostra` (só membro, sessão). Lê o texto atual (`stories.texto`), título, ano, a 1ª foto da história e o QR já criado. Não cria nada: só lê.
- Monta um JSON com título, ano, parágrafos e caminhos de foto e QR, mapeia no compilador junto com o template `lib/livro/amostra.typ` e as fontes Newsreader do repositório (`lib/livro/fontes/`, licença OFL), e compila.
- **Caber numa página:** tenta todos os parágrafos; se der mais de 1 página, procura por divisão binária o maior número de parágrafos inteiros que cabe, e acrescenta "Continua no livro." (Q9). Cada tentativa custa ~2 ms.
- **Conferência antes do download:** rasteriza o PDF a 150 DPI com mupdf (WASM, sem binário) e decodifica com jsQR. Só libera se o texto lido for exatamente a URL do código e se o PDF tiver 1 página. Falhou: tela "Não conseguimos conferir o QR. Tente de novo." e nenhum PDF sai.
- Resposta: `application/pdf`, `Content-Disposition: attachment; filename="amostra-{titulo-sem-acento}.pdf"`, `Cache-Control: no-store`. Evento `amostra_gerada` (só ids).
- O QR do PDF é vetorial (SVG do pacote `qrcode`), correção Q, 20 mm de símbolo + margem de silêncio de 4 módulos, preto puro, com "aponte e ouça" e o código impresso embaixo em dois grupos de 4 (`7KQ2 M9XA`).

### 5.4 O player

- `proxy.ts`: se o host é `ouvir.ecoa-memorias.com.br`, só três caminhos existem. `/` reescreve para `/ouvir`; `/{8 caracteres}` reescreve para `/ouvir/{código em maiúsculas}`; qualquer outro é 404. Nada de sessão nem Supabase no proxy. Cabeçalhos: `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`.
- `/ouvir/[codigo]` (página dinâmica, sem cache): calcula a chave de rede = HMAC-SHA256(segredo dos links da versão atual, `"qr-ip:" + IP + ":" + data`) e chama `servico_ouvir_qr` com a chave secreta. O IP nunca vai ao banco nem ao log. Se o estado é `ok`, assina a URL do recorte por 10 min (`QR_AUDIO_URL_S`).
- Telas, uma ação cada:
  - **ok:** ano pequeno, título em Newsreader, botão grande *Ouvir* (toca/pausa), barra de progresso. Rodapé: "Ecoa Memórias".
  - **preparando:** "A voz ainda está sendo preparada. Tente de novo em alguns minutos." + *Tentar de novo*.
  - **não encontrado:** "Não achamos este código. Confira as letras embaixo do QR." + campo para digitar.
  - **desativado:** "Este áudio não está mais disponível."
  - **limite:** "Muitas tentativas agora. Tente daqui a um minuto."
  - **raiz (`/ouvir`):** campo "Digite o código embaixo do QR", que aceita minúsculas, espaço e hífen.
- Funciona com o plano vencido (P4): `servico_ouvir_qr` não olha o plano.
- Também responde em `app.ecoa-memorias.com.br/ouvir/{código}`: é como o deploy de prévia é conferido antes do DNS.

### 5.5 `family_messages` e o token do autor

- Tabela vazia, RLS ligada, sem política, sem grant para `anon`, `authenticated` e `porta_autor`; só o servidor (Q8).
- **Teste de banco** (`supabase/tests/autor-isolamento.test.ts`): `family_messages` entra na lista das tabelas da família. Vale para privilégio de `porta_autor` e de `anon`, para o detector de funções do autor que citam a tabela e para o dono das funções.
- **Teste das rotas** (`lib/autor/rotas-autor.test.ts`, novo): lê todo arquivo em `app/a/**` e `lib/autor/**` e os que eles importam de `lib/`, extrai cada `.from("…")` e `.rpc("…")`, e exige que a lista esteja numa lista permitida (`recordings`, `author_access`, bucket `audios`, `autor_*`, `servico_caminho_gravacao_autor`). Qualquer tabela da família, inclusive `family_messages`, derruba o teste. É o que cobre a chave secreta, que o RLS não segura.

## 6. Segurança

| Ameaça | Defesa |
| --- | --- |
| Adivinhar códigos | 31^8 ≈ 8,5 × 10¹¹ combinações; 30 consultas por minuto por rede no banco; código fora do formato nem consulta o QR (mas conta no limite) |
| Um QR vazado expõe a conversa inteira da ceia | O player só toca o recorte com os trechos da história (Q5); nunca recebe o caminho do original |
| URL do áudio compartilhada | Assinada por 10 min, de um arquivo que só tem a história |
| Player vira porta para dados do livro | `servico_ouvir_qr` devolve só estado, título, ano e o caminho do recorte. Sem nome do autor, texto, foto ou ids. Só a chave secreta chama |
| IP da família guardado | A chave de rede é um HMAC com a data: não volta ao IP e muda todo dia. `qr_consultas` guarda só os últimos 10 min |
| Código impresso apagado ou trocado | Gatilho no banco recusa apagar, truncar e trocar código, livro ou destino, até para a chave secreta. Só `desativado_em` e o recorte mudam |
| Texto da família vira código no PDF | Entra como JSON lido pelo template (`json()` do Typst), nunca concatenado ao fonte |
| Token do autor alcança mensagens | Sem grant (privilégio), sem política (RLS) e o teste das rotas (seção 5.5) |
| Outro host servindo o app | No host `ouvir.`, o proxy só conhece `/` e `/{código}`; o resto é 404. Os cookies do app são do host `app.` |

## 7. SQL

Arquivos: `supabase/migrations/20261120120000_qr_amostra.sql` (subida) e `supabase/reversao/20261120120000_qr_amostra.down.sql` (reversão). Resumo da subida:

```sql
-- Espelhados em lib/config.ts
privado.qr_consultas_por_minuto() = 30, privado.qr_audio_espera_s() = 600

-- 1. family_messages: id, book_id, criado_em, unique (book_id, id).
--    RLS ligada, sem política. Grant só para service_role.

-- 2. qr_codes
create table public.qr_codes (
  codigo text primary key check (codigo ~ '^[2-9A-HJKMNP-Z]{8}$'),
  book_id uuid not null references public.books (id) on delete restrict,
  story_id uuid, message_id uuid,              -- exatamente um (CHECK)
  audio_caminho text,                           -- livros/{livro}/qr/{codigo}-{12 hex}.m4a (CHECK)
  audio_fonte text, audio_pedido_em timestamptz, audio_pronto_em timestamptz,
  desativado_em timestamptz,
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (story_id), unique (message_id),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete restrict,
  foreign key (book_id, message_id) references public.family_messages (book_id, id) on delete restrict
);
-- Gatilhos: nada apaga nem trunca; código, livro, destino e criado_em nunca mudam.
-- authenticated: select de colunas sem o caminho do recorte, só do próprio livro.

-- 3. qr_consultas (chave hash, minuto, n): limite do player. Só service_role.

-- 4. privado.fonte_audio_da_historia(story): sha256 das gravações e trechos, na ordem.
-- 5. criar_qr(story, codigo) → (codigo, precisa_audio): membro, plano ativo, história
--    pronta e revisada, com áudio. Idempotente por história; reserva o recorte por 10 min.
-- 6. servico_qr_audio_pronto(codigo, caminho, fonte): só aceita a fonte de agora.
-- 7. servico_ouvir_qr(codigo, chave) → jsonb: limite primeiro, depois o código;
--    registra qr_aberto; ignora o plano (P4).
```

Reversão: trava se houver QR ou mensagem (como a da divisão e a das propostas); só roda forçada com `set ecoa.reversao_destrutiva = 'sim'`. Depois da primeira página impressa, **nunca roda em produção**.

## 8. Testes

**Banco (feitos e passando, `supabase/tests/qr.test.ts`, 23 testes):** `family_messages` sem privilégio para `anon`, `authenticated` e `porta_autor`, RLS sem política, membro não lê nem com linha guardada · `criar_qr`: outro livro, anon, história não revisada, sem áudio, código fora do alfabeto, idempotência, colisão, plano vencido · recorte: fonte velha recusada, caminho de outro livro recusado, história mudada pede recorte de novo · imutabilidade com a chave secreta (apagar, trocar código, trocar destino, truncar) e desativar permitido · membro só lê o próprio livro e não insere · player: anon e authenticated barrados, os 4 estados, plano vencido, evento só com ids, limite na 31ª consulta e outra chave seguindo, chave que não é hash · reversão trava, forçada passa, sobe de novo. Mais `autor-isolamento` com `family_messages` e `config-banco` com os 2 números novos.

**Unidade (a fazer):** código sorteado sempre no alfabeto; normalização do código digitado; junção de trechos (intervalo < 2 s, pontas de 0,25 s, `segmentos` nulo); caber na página (divisão binária, "Continua no livro."); o teste das rotas do autor.

**Integração (a fazer, sem rede):** gera a amostra de uma história de exemplo com o Typst real, confere 1 página, 216 × 216 mm, Newsreader embutida e o QR decodificado; um PDF com QR trocado é recusado.

**Tela (Playwright, a fazer):** player nos 5 estados e na raiz (exemplos no styleguide, como as outras telas sem Supabase); botão *Página de amostra* só em história pronta.

**Gate de fim e de design:** como no `CLAUDE.md`. Aceite do prompt: você imprime a página numa impressora comum e o QR de 2 cm abre o player a 20 cm.

## 9. Configuração do subdomínio

Hoje: o DNS do `ecoa-memorias.com.br` é do registro.br (`d.sec.dns.br`, `e.sec.dns.br`). O `app.` aponta para a Vercel por CNAME e está verificado. O `ouvir.` ainda não existe na Vercel.

1. **Eu, com o seu OK no Q10:** adiciono `ouvir.ecoa-memorias.com.br` ao projeto `ecoa-plataforma` na Vercel (produção).
2. **Você, no registro.br** (Domínios → `ecoa-memorias.com.br` → DNS → Editar zona → Nova entrada):
   - Tipo: `CNAME`
   - Nome: `ouvir`
   - Dados: `fb39d318f8d07408.vercel-dns-017.com.` (o mesmo alvo do `app.`, recomendado pela Vercel)
   - Salvar. A propagação leva de minutos a 2 horas.
3. **Eu confiro** pela Vercel que o domínio ficou verificado e com certificado, e abro `https://ouvir.ecoa-memorias.com.br/` no deploy de produção.
4. **Pendência que este prompt torna crítica:** ligar a renovação automática do domínio no registro.br. Deixar vencer apaga todos os QR impressos (`docs/decisoes/dominio.md`).

## 10. Ordem de entrega

- **A. Banco:** migration, testes de banco, `lib/config.ts`, frases dos erros. *(Feito no ensaio; aplica no Supabase depois do OK.)*
- **B. Player e subdomínio:** proxy, `/ouvir` e `/ouvir/[codigo]`, chave de rede, recorte no Inngest, exemplos no styleguide, domínio.
- **C. Página de amostra:** template Typst, fontes, rota do PDF com a conferência do QR, botão no editor, script do teste dos motores em `scripts/lab/pdf-motor/`.
- **D. Gate:** build, lint, testes, e2e, design, prévia na Vercel e conferência das rotas novas.

Se o tempo apertar, B e C são independentes do autor; o recorte (B) é o primeiro candidato a virar sessão curta, porque a página impressa funciona antes dele (o player mostra "preparando").

## 11. Decisões novas para registrar depois do OK

- **P55:** telas do autor do prompt 10 (*Minhas histórias*, *Meu livro*) esperam o sinal da hipótese 2 do prompt 5; sem sinal até 17/11, saem da onda 1. O resto do prompt 10 segue.
- **P56:** página de amostra só de história marcada como pronta; texto até onde couber, em parágrafos inteiros, com "Continua no livro." (Q6, Q9).
- **P57:** player mínimo: título, ano e *Ouvir*; raiz do subdomínio com campo para o código (Q7).
- **T43:** Typst confirmado como motor de PDF pelo teste de 1 dia (Q2). Confirma T19.
- **T44:** código do QR com 8 símbolos de `QR_ALFABETO`, guardado como está (exceção a T6: é impresso e público), com limite por rede no banco e URL em maiúsculas no QR (Q3, Q4).
- **T45:** áudio do QR é um recorte .m4a só com os trechos da história, feito com ffmpeg num passo do Inngest; o original nunca é servido pelo player (Q5). Complementa T34.
- **T46:** `family_messages` nasce mínima e fechada no prompt 10; colunas e políticas no prompt 12 (Q8).

## 12. Revisão

*(preenchida depois dos revisores)*
