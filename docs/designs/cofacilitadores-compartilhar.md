# Co-facilitadores, compartilhar no grupo, lembrar e resumo semanal (prompt 11)

Status: **v2 para aprovação**, revisada por 2 revisores (T28) · 2026-11-14 · PRD: Papéis e permissões, M2 (Quem mais ajuda), Jornadas (Responsável passo 3, Família, Lembretes sem API) · Decisões: P4, P7, P9, P23, P25, P31, P41, P42, P48, P56, P58, T4, T6, T23, T25, T28, T34, T36, T37, T45

Relatórios: `cofacilitadores-compartilhar/critic_report.md` (segurança) e `cofacilitadores-compartilhar/codebase_details_report.md` (código). A seção 12 mostra o que mudou por causa de cada um.

O prompt 11 não traz [EGM], mas mexe em schema, RLS, tokens e links sem login: pela T28, passa pelo EGM (design aprovado nesta sessão, construção na próxima).

## 1. Problema, hipótese e o que está em jogo

Hoje o livro tem um só login. Quem segura o celular na conversa com o avô, ou quem edita à noite, muitas vezes é outro irmão. E a família no grupo só vê a história quando o livro sai impresso.

- **Usuário:** o cliente que está esperando (responsável) e a irmã dele, que vai facilitar junto. Ela é a primeira co-facilitadora de verdade.
- **Hipótese 1 (co-facilitadores):** com um convite por e-mail, a irmã entra sozinha, sem ajuda da Ecoa, e edita histórias como o irmão.
- **Sinal:** convite aceito em até 48 h (`convite_aceito`, gravado pelo banco) e pelo menos 1 versão salva por ela em 7 dias (`story_versions.origem = 'cofacilitador'`).
- **Critério de morte:** o convite não é aceito em 7 dias, ou é aceito e ela não salva nada em 14 dias. Nesse caso, perguntar a ela o porquê antes de investir em mais coisa de co-facilitador (presença ao vivo, avisos entre irmãos).
- **Hipótese 2 (compartilhar):** uma história pronta mandada ao grupo traz a família de volta e gera sugestões de causo.
- **Sinal:** o *Ouvir* do `/o/` tocado por pelo menos 3 redes diferentes por link (`compartilhada_tocada`, 1 por link, rede e hora) e pelo menos 1 causo novo na semana seguinte. **Morte:** 2 compartilhamentos seguidos com o *Ouvir* tocado por 1 rede ou menos.
- **Lembrar e resumo semanal:** baratos, sem hipótese própria; medidos por `lembrou_pergunta` → resposta em 7 dias, e por clique no *Abrir o livro* do resumo.
- **Porta sem volta:** nenhuma. Convites e compartilhamentos são revogáveis; nada vai para o papel.

## 2. Escopo

**Entra:**
1. Convite de até 3 co-facilitadores, **preso ao e-mail** (sua decisão de hoje), enviado por e-mail e com mensagem copiável para o WhatsApp. Aceite com Google ou link por e-mail.
2. Passo *Quem mais ajuda* depois das fotos na configuração inicial (pulável, só para o responsável e só em livro novo), e a tela *Quem ajuda* (`/livro/[id]/pessoas`): o responsável vê, convida, cancela e remove; o co-facilitador vê e pode sair.
3. Permissões no banco, com teste para cada regra (seção 4.2).
4. *Compartilhar no grupo* em cada história marcada como pronta: link `/o/[token]` com título, ano, texto e voz, mais a mensagem pronta para o WhatsApp. Revogável.
5. *Lembrar com carinho* em perguntas enviadas há 3 dias ou mais, abrindo o WhatsApp com uma mensagem gentil.
6. Resumo semanal por e-mail aos membros: histórias novas, perguntas esperando resposta e páginas estimadas.

**Não entra:**
- Publicar, imprimir e pagar (prompts 13 e 14). Eles nascem chamando `privado.eh_responsavel`, que esta migration cria.
- Trocar o responsável pela tela (continua pelo admin, `admin_trocar_responsavel`).
- Presença de quem está online e avisos entre membros.
- Foto no `/o/` (prompt 13, quando o livro tiver fotos por história).
- Limpeza periódica de contas criadas por convite e nunca usadas (seção 6).

## 3. Decisões que preciso de você

| # | Decisão | Recomendo | Por quê | O que se perde |
| --- | --- | --- | --- | --- |
| Q1 | **SQL (seção 7)** | Aprovar | Ensaiado em PGlite com as migrations reais: 20 testes novos; a suíte inteira passa (659); a reversão desce com dados e sobe de novo | — |
| Q2 | **Convite preso ao e-mail, uso único, vale 7 dias.** O servidor confere as regras, cria a conta do convidado (o cadastro é fechado) e só então grava o convite. Aceitar **não usa o token**: quem entra com o e-mail convidado vê *Aceitar* na lista de livros e no próprio link | Assim | Link repassado no WhatsApp não vale para mais ninguém. Sem cookie de "voltar ao convite" depois do Google | A irmã precisa entrar com o e-mail que o irmão digitou. Se usar outro, a tela diz "Este convite é para b•••@gmail.com" |
| Q3 | **Pendentes contam no teto de 3**; reconvidar o mesmo e-mail troca o convite. O convite cai se quem convidou deixa de ser o responsável, e não é aceito com o plano vencido | Assim | O teto nunca estoura (livro travado no banco ao convidar e ao aceitar) | Cancelar um convite parado para abrir vaga |
| Q4 | **Tetos de convite em 24 h:** 10 por livro, 10 por responsável (somando livros), 3 para o mesmo e-mail (somando livros) | Assim | Cada convite cria uma conta e manda e-mail do nosso domínio. Sem teto, uma sessão roubada usa a Ecoa para mandar e-mail a estranhos | Nada no uso normal (no máximo 3 vagas) |
| Q5 | **Só do responsável:** convidar, cancelar convite, remover, confirmar a IA (P41, já é), desligar QR (P58, já é), e publicar, imprimir e pagar quando existirem | Assim | É a lista do prompt e do P7, mais as duas que já eram dele | — |
| Q6 | **Trocar o link do autor ou o da família que já existe: só o responsável. Gerar o primeiro: qualquer membro.** *(mudou da v1)* | Assim | O PRD diz "revogável pelo responsável". Um link trocado tira o avô do ar até ele receber o novo; quem pode fazer isso é quem tem a palavra final (P7). Gerar o primeiro continua livre para o kit funcionar com qualquer um | Se o link vazar à noite, a irmã precisa chamar o irmão |
| Q7 | **Remover:** a pessoa perde o acesso na hora, a trava de edição dela some e **os links `/o/` que ela criou são desligados**. A tela então oferece "Ela conhecia o link do Jair e o da família. Trocar os dois agora?" (não troca sozinho: o avô ficaria sem acesso até receber o novo). Remover e sair valem com o plano vencido. As versões que ela salvou ficam com a autoria | Assim | Ação de segurança, como P58. Quem saiu brigado não deixa link no ar | O responsável decide sobre os links do autor e da família |
| Q8 | **Passo *Quem mais ajuda*** só aparece para o responsável, só em livro novo (que ainda não passou pela configuração). Nos outros, o convite fica em *Configurações → Quem ajuda* | Assim | Não empurra um passo novo para quem já está gravando | — |
| Q9 | **Compartilhar: qualquer membro cria e desliga** *(o revisor de segurança recomenda só o responsável criar)* | Qualquer membro | O prompt põe compartilhar fora da lista do que é só do responsável. A irmã é tão família quanto o irmão. A folha diz antes de copiar: "Quem tiver este link ouve a voz e lê o texto." O responsável vê quem compartilhou e desliga | Um co-facilitador pode mandar ao grupo algo que o responsável ainda não queria mostrar |
| Q10 | **Compartilhar: 1 link por história** (o mesmo link volta ao tocar de novo), só história **marcada como pronta** (`revisada_em`, P48). A voz é o recorte do QR (T45): compartilhar cria o QR da história se ainda não existir. Se não der para ter voz (história sem áudio próprio, áudio dividido com outra história, ou QR desligado), compartilha só o texto, e a mensagem não fala em voz | Assim | O recorte já é só a fala da história, nunca a conversa inteira. Desligar o QR (voz vazada) tira a voz do `/o/` também | Um QR passa a existir antes da página de amostra (é invisível e o livro vai usá-lo) |
| Q11 | **O que o `/o/` mostra:** "Uma história de Jair", título, ano, *Ouvir* e o texto (só os parágrafos; nada de fontes, travas ou lacunas). O texto é o atual: uma correção depois de compartilhar aparece na hora. A prévia do WhatsApp mostra só "Uma história de Jair". História que voltou para rascunho: "Esta história está sendo revisada". Link desligado ou errado: "Este link não está mais disponível" (os dois iguais). Continua com o plano vencido (P4) | Assim | É o que o prompt pede, com o mínimo exposto se o link sair do grupo | — |
| Q12 | **Resumo semanal:** domingo às 18 h (Brasília), para cada membro com o resumo ligado (padrão: ligado), só com plano ativo e só se houver algo (história que ficou pronta na semana ou pergunta esperando). **Só números**, sem título nem trecho (P42). Desligar: 1 clique no rodapé (`List-Unsubscribe`, sem login) ou em *Configurações* | Assim | Sem o descadastro de 1 clique, o Gmail tende a jogar no spam | Mais uma rota sem login, que só sabe desligar o resumo daquela pessoa |
| Q13 | **Páginas estimadas = palavras de todas as histórias com texto ÷ 320**, arredondado para cima, "~34 páginas" | Assim | `PALAVRAS_POR_PAGINA_ESTIMADA` já existe. Fotos ainda não entram no livro | Erra para baixo quando houver fotos (o prompt 13 troca pela renderização real, T20) |
| Q14 | **Lembrar com carinho:** aparece em pergunta *enviada* há 3 dias ou mais; o toque abre o WhatsApp (direto no autor se o celular está cadastrado, P31) e grava `lembrada_em`: o botão some e volta 3 dias depois. Qualquer membro. Sem link do autor ativo, o botão não aparece | Assim | Evita dois irmãos lembrarem no mesmo dia | — |

## 4. Como funciona

### 4.1 Convite

1. Em *Quem ajuda* (ou no passo), o responsável toca em *Convidar*, digita o e-mail e toca em *Enviar convite*.
2. A ação `convidar` (`app/livro/[id]/pessoas/acoes.ts`; o passo a importa e a liga em `ligar-acoes.ts`):
   1. confere `livro.papel === 'responsavel'` e valida o e-mail (zod);
   2. chama `servico_pode_convidar` (as mesmas regras do banco, sem efeito). Falhou → devolve a frase e **não cria nada**;
   3. `contaParaEmail(email)` em `lib/acesso.ts`, extraída de `app/admin/acoes.ts` (que passa a usá-la): acha a conta por `admin_usuario_por_email` ou cria com `createUser({ email, email_confirm: true })`. Conta com identidade fora de `identidadeAceitavel`: a tela diz "Convite enviado" e nada é gravado nem enviado (só o servidor registra);
   4. sorteia o `id`, deriva o token por HMAC (`tokenDoLink("convite", id, versao)`) e chama `servico_criar_convite` (confere tudo de novo, com o livro travado). Se falhar e a conta foi criada agora, apaga a conta (`auth.admin.deleteUser`);
   5. envia `emailConvite` (`lib/email/modelos.ts`, via `enviarEmail`). **Assunto fixo:** "Convite para ajudar num livro de memórias". Corpo: "{Primeiro nome} chamou você para ajudar a fazer o livro de memórias de {apelido}." Os dois nomes passam por `nomeSeguro` (até 30 letras, só letras, espaço, hífen e apóstrofo; sem números, links ou quebras). Botão *Ver o convite* → `/convite/{token}`;
   6. registra `convidou` com `{ convite_id }`.
3. A tela mostra o convite pendente com *Copiar mensagem* (`linkWhatsApp` de `lib/whatsapp.ts`, sem número, P9) e *Cancelar*.

**Aceitar.** `/convite/{token}` passa pelo ramo normal do proxy (renova a sessão) e sai com `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer` e `Cache-Control: private, no-store`. A página calcula o hash e chama `servico_ler_convite` com a chave secreta. O primeiro nome de quem convidou vem de `auth.admin.getUserById(criado_por)` (`full_name`), e o e-mail sai por `mascararEmail` (`lib/acesso.ts`, com teste).
- Sem sessão: "{Nome} chamou você para ajudar no livro de {apelido}." Botão *Entrar para aceitar* → `/entrar`. Depois do login a pessoa cai em `/`, que mostra no topo "Você foi convidado para o livro de {apelido}" com *Aceitar* (`meus_convites()`).
- Com sessão e o e-mail certo: *Aceitar*, que chama a ação `aceitarConvite(conviteId)` → `aceitar_convite`. Aceitou → `/livro/{id}`. O evento `convite_aceito` é gravado pelo banco.
- Com sessão e outro e-mail (o servidor compara o e-mail da sessão com o do convite): "Este convite é para b•••@gmail.com. Saia e entre com esse e-mail."
- Aceito, cancelado ou vencido: "Este convite não vale mais. Peça um novo a quem convidou."

### 4.2 Permissões

| Ação | Responsável | Co-facilitador | Onde o banco confere |
| --- | --- | --- | --- |
| Convidar, cancelar convite, remover | sim | não | `conferir_convite`, `cancelar_convite`, `remover_membro` |
| Ler convites (`book_invites`) | sim | não | RLS com `eh_responsavel` |
| Trocar link do autor ou da família que já existe | sim | não | `servico_trocar_link_*` (substituídas) |
| Gerar o primeiro link do autor ou da família | sim | sim | idem |
| Confirmar a IA, desligar QR | sim | não | `consentir_processamento_ia`, `desativar_qr` (já existiam, agora com teste) |
| Sair do livro | — | sim | `sair_do_livro` |
| Todo o resto (gravar, editar, perguntas, enquete, compartilhar, lembrar) | sim | sim | as portas de membro de sempre |

- As funções `servico_*` conferem o papel à mão porque, com a chave secreta, não há `auth.uid()`. As de `authenticated` usam `privado.eh_responsavel`.
- `consentir_processamento_ia` e `desativar_qr` **não** são reescritas para usar `eh_responsavel`: a conferência delas está certa e agora tem teste; reescrever duas funções em produção para não mudar nada é risco sem ganho (os dois revisores pediram; seção 12).
- A tela recebe `papel` e esconde o que não é dele. O banco é quem garante.

### 4.3 Compartilhar no grupo

1. No editor de uma história marcada como pronta, *Compartilhar no grupo* abre uma folha.
2. A ação `compartilhar` (ao lado do editor):
   1. chama `criar_qr`. Se vier `pedir_audio`, dispara o recorte com o mesmo helper do player (extraído de `abrirQr` em `lib/qr/player.ts`, junto com a assinatura da leitura). Se `criar_qr` levantar `historia_sem_audio`, `historia_audio_compartilhado` ou `qr_desativado`, segue sem voz. Se o QR nasceu agora, registra `qr_criado` como a amostra;
   2. sorteia `id` e hash e chama `servico_compartilhar_historia`, que devolve `(id, chave_versao, criado)`: o link ativo ou o novo. O servidor deriva o token de `id` e `chave_versao` (`tokenDoLink("compartilhar", …)`, `urlCompartilhada`). Registra `compartilhou_historia` com `{ story_id }` quando `criado`.
3. A folha diz "Quem tiver este link ouve a voz e lê o texto." e mostra a mensagem com *Copiar* e *Abrir WhatsApp* (`linkWhatsApp`, sem número):
   > {Apelido} contou: "{título}". Ouça na voz {dele|dela|original} e leia aqui: {link}

   ("dele" para pai, avô, tio; "dela" para mãe, avó, tia; "original" para outro. Sem voz: "{Apelido} contou: "{título}". Leia aqui: {link}".)
4. Embaixo, discreto: *Desligar este link* (`revogar_compartilhamento`, evento `compartilhada_desligada`).

**`/o/[token]`:** ramo próprio no `proxy.ts`, no molde do `/a`: sem sessão nem Supabase, com `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer` e `Cache-Control: private, no-store`; `"/o/:path*"` e `"/convite/:path*"` entram no matcher. A página é dinâmica, calcula o hash e chama `servico_ler_compartilhada` com a chave secreta (sem porta para `anon`):
- `voz: ok` → assina a leitura do recorte por `QR_AUDIO_URL_S`, como o player;
- `voz: preparando` → "A voz chega em instantes" e, se `pedir_audio`, dispara o recorte;
- `voz: sem_voz` → só o texto.

O *Ouvir* chama `servico_compartilhada_tocou(hash, chave de rede)` (a mesma chave de rede do player, `QR_REDE_SEGREDO`), que grava `compartilhada_tocada` no máximo 1 vez por link, rede e hora. No host `ouvir.` o `/o/` não existe (`decidirQr` já devolve 404; só ganha teste). O `/o/` roda no host `app.`, ao contrário do player: aceito, porque a página não usa sessão e o áudio é URL assinada.

Sem limite por IP para token errado: com 132 bits não há o que adivinhar, e cada erro é uma busca por índice único.

### 4.4 Lembrar com carinho

Na aba *Para perguntar*, a pergunta com `estado = 'enviada'` e `greatest(enviada_em, lembrada_em) <= now() - 3 dias` mostra *Lembrar com carinho* (só se o livro tem link do autor ativo). O toque chama a ação `lembrarPergunta`, que grava por `lembrar_pergunta`, registra `lembrou_pergunta` e devolve o link do WhatsApp (`linkWhatsApp` com o celular de `lib/telefone.ts`, P31). A URL do autor é recomposta pelo mesmo helper que o kit e o *Enviar ao autor* usam (`app/livro/[id]/acoes.ts`):
> Oi, {apelido}! Lembrei daquela pergunta: "{pergunta}". Quando tiver um tempinho, grava pra gente? É só tocar aqui: {link do autor}/gravar/{id}

### 4.5 Resumo semanal

- `lib/inngest/resumo.ts`, com o nome do evento em constante própria, e as funções entram no array de `lib/inngest/funcoes.ts`.
- `resumo-semanal`: `triggers: [cron("TZ=America/Sao_Paulo 0 18 * * 0")]`. Lista os livros (`servico_livros_para_resumo`) e manda 1 evento por livro com `step.sendEvent` em lote, id `resumo-{livro}-{AAAA-MM-DD}` (o Inngest descarta repetido).
- `resumo-semanal-livro`: lê os números (`servico_resumo_semanal`); tudo zero, para. Depois, **1 passo por membro** (`servico_membros_para_resumo`), id do passo = id do membro: busca o e-mail (`auth.admin.getUserById`) e o apelido, monta e envia. Retry refaz só aquele membro. Os passos devolvem só ids e números: e-mail e apelido não saem do passo (T36).
- E-mail (`emailResumo`): "Esta semana no livro de {apelido}: 2 histórias novas · 5 perguntas esperando · ~34 páginas." Botão *Abrir o livro*. Cabeçalhos `List-Unsubscribe` e `List-Unsubscribe-Post: List-Unsubscribe=One-Click` apontando para `/resumo/sair/{membro}/{token}`, onde token = HMAC de `resumo:{membro}` (T25). A rota confere o HMAC em tempo constante e chama `servico_desligar_resumo`. GET mostra "Pronto, você não recebe mais o resumo" com um botão (o desligamento é no POST, para robôs de e-mail não desligarem sozinhos).
- Páginas: a conta do banco (`privado.palavras_do_texto`) e a da tela (`lib/livro/paginas.ts`, nova) têm teste de paridade com o mesmo texto.

### 4.6 Passo *Quem mais ajuda*

`PASSOS` continua com 3 itens. `configuracao.ts` ganha `passosDoPapel(papel, cfg)`: o responsável de um livro novo (nenhum passo visto quando a configuração começou) segue de *fotos* para *ajuda*; os outros vão direto ao kit. `pendentes` só inclui `ajuda` se `cfg.ajuda === 'depois'`. `configurar/ajuda` dá 404 para co-facilitador. O texto "Passo X de N" usa o total do papel.

### 4.7 Eventos novos (`lib/eventos-acoes.ts`)

| Ação | Quem grava | Detalhes |
| --- | --- | --- |
| `convidou`, `convite_cancelado` | servidor | `{ convite_id }` |
| `convite_aceito` | banco (`aceitar_convite`) | `{ convite_id }` |
| `removeu_membro`, `saiu_do_livro` | banco | `{ user_id }` |
| `compartilhou_historia`, `compartilhada_desligada` | servidor | `{ story_id }` |
| `compartilhada_tocada` | banco (`servico_compartilhada_tocou`) | `{ story_id }` |
| `lembrou_pergunta` | servidor | `{ prompt_id }` |
| `resumo_enviado` | servidor (job) | `{ membros: n }` |

## 5. Telas (gate de design)

| Tela | Ação principal | Estado vazio / dica |
| --- | --- | --- |
| *Quem ajuda* (`/livro/[id]/pessoas`) | *Convidar* (responsável, até 3) | "Só você por enquanto. Chame um irmão para ajudar." + *Convidar* |
| Folha *Convidar* | *Enviar convite* | — |
| Folha *Remover* | *Remover* | Depois: "Trocar os links do Jair e da família?" |
| Passo *Quem mais ajuda* | *Enviar convite* (*Pular*, *Depois*) | — |
| `/convite/[token]` | *Entrar para aceitar* ou *Aceitar* | — |
| Cartão de convite em `/` | *Aceitar* | — |
| Folha *Compartilhar no grupo* | *Copiar mensagem* | — |
| `/o/[token]` | *Ouvir* | — |
| *Lembrar com carinho* (aba *Para perguntar*) | — | Dica de 1ª vez: "Faz 3 dias? Mande um lembrete gentil." |
| *Configurações*: resumo semanal | Interruptor | — |
| `/resumo/sair/...` | *Não quero mais receber* | — |

Cada tela em `components/telas/tela-*.tsx`, com dados falsos em `lib/exemplos/prompt11.ts`, registrada em `lib/styleguide.ts`, `app/(dev)/styleguide/[tela]/vitrine.tsx` e `scripts/inspecionar-telas.mjs`. `docs/mapa.md` ganha as rotas `/convite`, `/o`, `/resumo/sair`, `/livro/[id]/pessoas` e `lib/inngest/resumo.ts`.

## 6. Segurança

| Ameaça | Defesa |
| --- | --- |
| Link do convite repassado no grupo | Preso ao e-mail confirmado (conferido no banco). O token só apresenta o convite |
| Co-facilitador se dá poderes (convida, remove, entra direto em `book_members`, troca o link do avô) | Nenhum grant de escrita em `book_members` e `book_invites`; funções com o papel conferido. Testado |
| Corrida para passar de 3 | `for update` na linha do livro ao convidar e ao aceitar. **Limite:** o PGlite tem uma conexão só, então o teste cobre a regra, não a corrida; a garantia é o `for update` |
| A Ecoa vira canhão de e-mail ou de phishing | Pré-checagem antes de criar conta; 10 por livro, 10 por responsável e 3 por e-mail em 24 h; assunto fixo; nomes saneados; conta nova apagada se o convite falhar |
| Oráculo de contas | Conta recusada por identidade responde "Convite enviado" sem enviar nada. `ja_membro` só confirma o que o responsável já vê na lista |
| Contas criadas e nunca usadas | Ficam sem livro (a lista de livros mostra vazio). **Risco aceito** até o prompt 15 (LGPD), que limpa contas sem login e sem livro |
| Convite do responsável antigo | Cai sozinho quando ele deixa de ser o responsável (`convite_valido`) |
| `/convite` e `/o/` expostos | `noindex`, `no-referrer`, `no-store`; página dinâmica (revogar vale na hora); `/convite` mostra só apelido, primeiro nome e e-mail mascarado |
| `/o/` vaza mais que a história | Função de serviço, sem grant para `anon`; só parágrafos (sem `fontes`); voz = recorte (T45) com assinatura curta; token de 132 bits só como hash (T6, T25) |
| Removido continua vendo | Perde tudo na próxima requisição; `/o/` dele desligados; trava apagada; troca dos links oferecida. **Risco aceito:** um canal Realtime já aberto (`livro:{id}`, T37) pode seguir recebendo texto ao vivo até reconectar (no máximo até o token renovar, ~1 h) |
| Descadastro do resumo sem login | Só desliga o resumo daquele membro; HMAC conferido em tempo constante; desliga no POST |
| Autor | `porta_autor` não ganha nenhum grant; `book_invites` e `story_shares` fora de qualquer porta do autor |
| E-mails entre membros | `membros_do_livro` mostra o e-mail dos membros do mesmo livro, só para membros. Aceito: é a família |

## 7. SQL

- Subida: `supabase/migrations/20261121120000_cofacilitadores.sql`
- Reversão: `supabase/reversao/20261121120000_cofacilitadores.down.sql`
- Testes: `supabase/tests/cofacilitadores.test.ts` (20), mais as listas de `rls.test.ts` e `config-banco.test.ts` e as frases em `lib/erros-banco.ts`.
- `supabase/tests/auth-shim.sql` ganha `email_confirmed_at` e `raw_user_meta_data`, que o Supabase de verdade já tem.

| Objeto | O quê |
| --- | --- |
| `privado.eh_responsavel`, `convite_valido`, `conferir_convite`, `tirar_cofacilitador`, `palavras_do_texto` | Novas |
| `privado.max_cofacilitadores` (3), `max_convites_dia` (10), `max_convites_por_email_dia` (3), `convite_validade_dias` (7), `palavras_por_pagina` (320) | Espelhos de `config.ts` |
| `book_invites` | Nova. RLS: só o responsável lê (sem `token_hash`); ninguém escreve fora das funções |
| `servico_pode_convidar`, `servico_criar_convite`, `servico_ler_convite` | Só servidor |
| `meus_convites`, `aceitar_convite`, `cancelar_convite`, `membros_do_livro`, `remover_membro`, `sair_do_livro` | `authenticated` |
| `servico_trocar_link_familia`, `servico_trocar_link_autor` | **Substituídas:** trocar um link ativo passa a ser só do responsável (Q6). A reversão devolve as antigas |
| `story_shares` | Nova. 1 ativo por história; membro lê (sem `token_hash`) |
| `servico_compartilhar_historia`, `servico_ler_compartilhada`, `servico_compartilhada_tocou` | Só servidor |
| `revogar_compartilhamento`, `lembrar_pergunta`, `definir_resumo_semanal` | `authenticated` |
| `prompts.lembrada_em`, `book_members.resumo_semanal` | Colunas novas |
| `servico_desligar_resumo`, `servico_livros_para_resumo`, `servico_membros_para_resumo`, `servico_resumo_semanal` | Só servidor; devolvem só ids e números |

A reversão apaga convites, compartilhamentos e as preferências do resumo, **tira os co-facilitadores** (sem `remover_membro`, ninguém conseguiria tirá-los depois) e devolve as funções de troca de link antigas.

## 8. Testes

- **Banco (prontos, 20):** convite só do responsável; aceitar só com o e-mail certo e confirmado; idempotente; co-facilitadora não convida, não cancela, não remove, não lê convites, não escreve em `book_members`, não confirma a IA, não desliga QR, não troca link do autor nem da família (mas gera o primeiro); teto de 3 com pendentes; reconvidar troca; `ja_membro`; teto de 3 por e-mail, também na pré-checagem; convite vencido e de responsável antigo não vale; plano vencido não aceita; remover tira acesso, trava e `/o/` dela e grava o evento; sair; responsável não é removido; nenhuma `servico_*` para `authenticated` ou `anon`; `token_hash` ilegível; compartilhar só membro, link único, sem fontes, revogar; `/o/` conta 1 *Ouvir* por hora; lembrar; resumo só números; reversão com dados.
- **Na construção:** co-facilitadora salva versão (`salvar_historia`, origem `cofacilitador`); `/o/` com voz `ok`, `preparando` e `sem_voz`.
- **Código:** `lib/links.test.ts` (tipos `convite`, `compartilhar`, `resumo`); `lib/rotas.test.ts` e `lib/qr/host.test.ts` (`/convite`, `/o`, `/resumo/sair` sem login; `/o` fora do host `ouvir.`; cabeçalhos); `lib/whatsapp.test.ts` (dele, dela, original, sem voz, lembrete); `mascararEmail`, `nomeSeguro`, `contaParaEmail`; paridade de páginas; `passosDoPapel`; modelos de e-mail sem título e com assunto fixo; `/o/` com link revogado e errado iguais.
- **E2E (styleguide):** responsável vê *Convidar*; co-facilitadora vê *Quem ajuda* sem *Convidar* e com *Sair*.
- **Aceite de verdade (depois do deploy):** você convida um e-mail seu (ou a irmã do cliente), entra com Google por ele, edita uma história e não vê *Convidar*.

## 9. Ordem de entrega (sessão 2)

1. Migration aplicada no Supabase (depois do seu OK), tipos, `config.ts`, eventos.
2. Convite, *Quem ajuda*, passo, `/convite`, cartão em `/`, remover/sair, permissões na tela. Commit.
3. Compartilhar e `/o/` (proxy, cabeçalhos, helper do recorte). Commit.
4. Lembrar e resumo semanal (Inngest, e-mail, descadastro). Commit.
5. Gate de design, gate de fim, prévia na Vercel, aceite com conta real.

## 10. Decisões novas para registrar depois do OK

- **P59** Convite de co-facilitador preso ao e-mail confirmado, uso único, 7 dias; conta criada só depois da pré-checagem; aceitar pelo e-mail, não pelo token; pendentes contam no teto de 3; cai se quem convidou deixa de ser o responsável; tetos de 10 por livro, 10 por responsável e 3 por e-mail em 24 h.
- **P60** Só do responsável: convidar, cancelar, remover, trocar um link do autor ou da família que já existe, confirmar a IA, desligar QR, publicar, imprimir e pagar. Remover desliga os `/o/` da pessoa e oferece trocar os links.
- **P61** Compartilhar no grupo: qualquer membro; 1 link por história marcada como pronta (HMAC); voz = recorte do QR, sem voz quando não houver; só parágrafos; texto atual; vale com plano vencido.
- **P62** Lembrar com carinho: pergunta enviada há 3 dias; o botão volta 3 dias depois do último lembrete.
- **P63** Resumo semanal: domingo 18 h, só números, só se houver algo, 1 passo por membro, descadastro de 1 clique.
- **T47** `book_invites` e `story_shares` sem porta para `anon`: leitura por funções de serviço; tipos de link `convite`, `compartilhar` e `resumo` no HMAC de T25; `/o` e `/convite` com `noindex`, `no-referrer` e `no-store`.

## 11. Fora desta versão (anotado)

- Presença ao vivo entre irmãos e aviso "a Bia editou".
- Foto no `/o/`.
- Limpeza de contas de convite nunca usadas (prompt 15).

## 12. Revisão

Uma rodada, 2 revisores em Sonnet (T28).

### Segurança (`critic_report.md`): "aprovar com correções"

| # | Achado | O que fiz |
| --- | --- | --- |
| 1 | Remover não corta links | **Aceito.** `/o/` da pessoa desligados; folha oferece trocar os links (Q7) |
| 2 | Compartilhar é publicar | **Levado a você (Q9).** Recomendo manter qualquer membro, com aviso na folha |
| 3 | `/o/` sem cabeçalhos | **Aceito** (4.3). Limite por IP recusado: 132 bits, busca por índice |
| 4 | Conta criada antes dos tetos | **Aceito:** pré-checagem, compensação, teto por responsável e por e-mail. Limpeza de órfãs: prompt 15 |
| 5 | Phishing pelo e-mail | **Aceito:** assunto fixo, `nomeSeguro`, teto por e-mail |
| 6A | Co-facilitador troca o link do avô | **Aceito:** trocar link ativo só do responsável (Q6, mudou da v1) |
| 6B | Convite do responsável antigo; plano vencido | **Aceito:** `convite_valido` e `livro_fechado` |
| 7 | Testes faltando; down | **Aceito:** 9 testes novos; o down tira os co-facilitadores. Corrida: limite do PGlite anotado na seção 6 |
| 8 | Oráculo | **Aceito** em parte: recusa por identidade vira sucesso silencioso; `ja_membro` fica |
| 9 | `privado` sem revoke | **Aceito** (revoke explícito das funções novas; um revoke geral no schema arriscaria tirar o que as políticas usam) |
| 10 | Regra em dois lugares | **Recusado:** as duas estão certas e agora testadas; reescrever não muda nada |
| 11 | Eventos fora do banco | **Aceito** para entrar, sair, remover e *Ouvir* do `/o/` |
| 12 | Resumo | **Aceito:** `List-Unsubscribe` de 1 clique, 1 passo por membro, texto de T36 corrigido |

### Código (`codebase_details_report.md`): "não aprovar ainda"

| # | Achado | O que fiz |
| --- | --- | --- |
| 1 | Passo 4 reabre a configuração | **Aceito:** passo condicional, `PASSOS` intacto (4.6) |
| 2 | Eventos inexistentes | **Aceito:** tabela 4.7; nome real `trocou_link_*` |
| 3 | Proxy e matcher | **Aceito** (4.1, 4.3) |
| 4 | `createUser` antes dos tetos | **Aceito** (igual à segurança 4) |
| 5 | Compartilhar × `criar_qr` | **Aceito:** sem voz nos 3 casos, recorte disparado, estado *preparando*, `qr_criado` |
| 6 | Reuso | **Aceito:** `contaParaEmail`, `linkWhatsApp`, `lib/telefone.ts`, helper do link do autor, `urlConvite`/`urlCompartilhada` |
| 7 | Resumo | **Aceito:** `lib/inngest/resumo.ts`, `sendEvent` em lote, `servico_membros_para_resumo`, `pronta_em`, paridade |
| 8 | Plano vencido; exceção; checagens inline | **Aceito** os dois primeiros; o terceiro recusado (igual à segurança 10) |
| 9 | Nome de quem convidou, `mascararEmail` | **Aceito** (4.1) |
| 10 | Onde moram ações e telas | **Aceito** (4.1, 5) |
| 11 | Espelhos de config | **Aceito** (já no SQL e no teste) |
| 12 | "Pronta" em dois sentidos | **Aceito:** "marcada como pronta" = `revisada_em` em todo o texto |
