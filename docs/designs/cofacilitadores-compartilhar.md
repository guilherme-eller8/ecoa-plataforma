# Co-facilitadores, compartilhar no grupo, lembrar e resumo semanal (prompt 11)

Status: **v1 para revisão** · 2026-11-14 · PRD: Papéis e permissões, M2 (Quem mais ajuda), Jornadas (Responsável passo 3, Família, Lembretes sem API) · Decisões: P4, P7, P9, P23, P25, P41, P42, P56, P58, T4, T6, T23, T25, T28, T34, T36, T37, T45

O prompt 11 não traz [EGM], mas mexe em schema, RLS, tokens e links sem login: pela T28, passa pelo EGM (design aprovado nesta sessão, construção na próxima).

## 1. Problema, hipótese e o que está em jogo

Hoje o livro tem um só login. Quem segura o celular na conversa com o avô, ou quem edita à noite, muitas vezes é outro irmão. E a família no grupo só vê a história quando o livro sai impresso.

- **Usuário:** o cliente que está esperando (responsável) e a irmã dele, que vai facilitar junto. Ela é a primeira co-facilitadora de verdade.
- **Hipótese 1 (co-facilitadores):** com um convite por e-mail, a irmã entra sozinha, sem ajuda da Ecoa, e edita histórias como o irmão.
- **Sinal:** convite aceito em até 48 h (`convite_aceito`) e pelo menos 1 versão salva por ela em 7 dias (`story_versions.origem = 'cofacilitador'`).
- **Critério de morte:** o convite não é aceito em 7 dias, ou é aceito e ela não salva nada em 14 dias. Nesse caso, perguntar a ela o porquê antes de investir em mais coisa de co-facilitador (presença ao vivo, avisos entre irmãos).
- **Hipótese 2 (compartilhar):** uma história pronta mandada ao grupo traz a família de volta e gera sugestões de causo.
- **Sinal:** cada livro com link compartilhado tem o *Ouvir* tocado no `/o/` e pelo menos 1 causo novo na semana seguinte. **Morte:** ninguém toca o *Ouvir* em 2 compartilhamentos seguidos.
- **Lembrar e resumo semanal:** baratos, sem hipótese própria; medidos por `pergunta_lembrada` → resposta em 7 dias, e por clique no *Abrir o livro* do resumo.
- **Porta sem volta:** nenhuma. Convites e compartilhamentos são revogáveis; nada vai para o papel.

## 2. Escopo

**Entra:**
1. Convite de até 3 co-facilitadores, **preso ao e-mail** (sua decisão de hoje), enviado por e-mail e com link copiável para o WhatsApp. Aceite com Google ou link por e-mail.
2. Passo 4 da configuração inicial, *Quem mais ajuda* (pulável, só para o responsável), e a tela *Quem ajuda* (`/livro/[id]/pessoas`): o responsável vê, convida, cancela convites e remove; o co-facilitador vê e pode sair.
3. Permissões no banco: `privado.eh_responsavel`, usada por tudo que é só do responsável, com teste para cada regra.
4. *Compartilhar no grupo* em cada história marcada como pronta: link `/o/[token]` com título, ano, texto e voz, mais a mensagem pronta para o WhatsApp. Revogável.
5. *Lembrar com carinho* em perguntas enviadas há 3 dias ou mais, abrindo o WhatsApp com uma mensagem gentil.
6. Resumo semanal por e-mail aos membros: histórias novas, perguntas esperando resposta e páginas estimadas.

**Não entra:**
- Publicar, imprimir e pagar (prompts 13 e 14). Eles nascem chamando `privado.eh_responsavel`, que esta migration cria.
- Trocar o responsável pela tela (continua pelo admin, `admin_trocar_responsavel`).
- Presença de quem está online e avisos entre membros.
- Link de descadastro sem login no e-mail do resumo (Q11).

## 3. Decisões que preciso de você

| # | Decisão | Recomendo | Por quê | O que se perde |
| --- | --- | --- | --- | --- |
| Q1 | **SQL (seção 7)** | Aprovar | Ensaiado em PGlite com as migrations reais: 11 testes novos passam; a reversão desce e sobe de novo | — |
| Q2 | **Convite preso ao e-mail, uso único, vale 7 dias.** O servidor cria a conta do convidado na hora do convite (o cadastro é fechado). Aceitar **não usa o token**: quem entra com o e-mail convidado vê *Aceitar* na lista de livros e no próprio link | Assim | Link repassado no WhatsApp não vale para mais ninguém. Sem cookie de "voltar ao convite" depois do Google: a lista de livros já sabe pelo e-mail | A irmã precisa entrar com o e-mail que o irmão digitou. Se usar outro, a tela diz "Este convite é para b•••@gmail.com" |
| Q3 | **Convites pendentes contam no teto de 3**; reconvidar o mesmo e-mail troca o convite, não soma | Assim | O teto nunca estoura por corrida (livro travado no banco ao convidar e ao aceitar) | Cancelar um convite parado para abrir vaga |
| Q4 | **Até 10 convites por livro em 24 h** (`MAX_CONVITES_DIA`) | Assim | Cada convite cria uma conta e manda e-mail do nosso domínio. Sem teto, um responsável (ou uma sessão roubada) usa a Ecoa para mandar e-mail a estranhos | Nada no uso normal (no máximo 3 vagas) |
| Q5 | **Só do responsável:** convidar, cancelar convite, remover co-facilitador, confirmar a IA (P41, já é), desligar QR (P58, já é); publicar, imprimir e pagar quando existirem | Assim | É a lista do prompt e do P7, mais as duas que já eram dele | — |
| Q6 | **Trocar o link do autor e o da família continua com qualquer membro** | Assim | O prompt diz "tudo, menos convidar, publicar, imprimir e pagar". Se o link do avô vazar à noite, a irmã corta na hora. O PRD diz "revogável pelo responsável", mas é sobre quem pode, não sobre quem só pode | O irmão pode ser surpreendido por um link novo (o evento `link_*_trocado` fica no registro) |
| Q7 | **Remover e sair valem com o plano vencido**; a trava de edição de quem sai some; as versões que a pessoa salvou ficam com a autoria | Assim | Tirar alguém é ação de segurança, como desligar QR (P58) | — |
| Q8 | **Passo 4 *Quem mais ajuda*** só aparece para o responsável e não reabre a configuração dos livros que já passaram por ela (lá, o convite fica em *Configurações → Quem ajuda*) | Assim | Não empurra um passo novo para quem já está gravando | — |
| Q9 | **Compartilhar:** 1 link por história, derivado por HMAC (o mesmo link volta ao tocar de novo), só história marcada como pronta, qualquer membro cria e desliga. A voz é o recorte do QR (T45): compartilhar cria o QR da história se ainda não existir | Assim | Recorte já é só a fala da história, nunca a conversa inteira. Desligar o QR (voz vazada) tira a voz do `/o/` também | Um QR passa a existir antes da página de amostra (é invisível e o livro vai usá-lo) |
| Q10 | **O que o `/o/` mostra:** "Uma história de Jair", título, ano, *Ouvir* e o texto (só os parágrafos; nada de fontes, travas ou lacunas). Sem foto nesta versão. A prévia do WhatsApp mostra só "Uma história de Jair". História que voltou para rascunho mostra "Esta história está sendo revisada"; link desligado ou errado mostra "Este link não está mais disponível". Continua com o plano vencido (P4) | Assim | É o que o prompt pede, com o mínimo exposto se o link sair do grupo | Sem foto: entra quando o livro tiver fotos por história (prompt 13) |
| Q11 | **Resumo semanal:** domingo às 18 h (Brasília), para cada membro com o resumo ligado (padrão: ligado), só com plano ativo e só se houver algo (história nova ou pergunta esperando). **Só números**, sem título nem trecho (P42). Desliga em *Configurações* (o rodapé do e-mail leva lá) | Assim | Sem link de descadastro sem login: menos uma porta. Somos remetente pequeno, a regra de 1 clique do Gmail não nos alcança | Desligar pede login |
| Q12 | **Páginas estimadas = palavras de todas as histórias com texto ÷ 320**, arredondado para cima, mostrado como "~34 páginas" | Assim | `PALAVRAS_POR_PAGINA_ESTIMADA` já está em `config.ts`. Fotos ainda não entram no livro | Erra para baixo quando o livro tiver fotos (o prompt 13 troca pela renderização real, T20) |
| Q13 | **Lembrar com carinho:** aparece em pergunta *enviada* há 3 dias ou mais; o toque abre o WhatsApp (direto no autor se o celular está cadastrado, P31) e grava `lembrada_em`: o botão some e volta 3 dias depois. Qualquer membro | Assim | Evita lembrar duas vezes no mesmo dia (dois irmãos) | — |

## 4. Como funciona

### 4.1 Convite

1. Na tela *Quem ajuda* (ou no passo 4), o responsável toca em *Convidar*, digita o e-mail e toca em *Enviar convite*.
2. A ação (`app/livro/[id]/pessoas/acoes.ts`) confere `livro.papel === 'responsavel'`, valida o e-mail (zod), procura a conta pelo e-mail (`admin_usuario_por_email`) e, se não existe, cria com `auth.admin.createUser({ email, email_confirm: true })`, como o admin já faz. Conta existente com identidade fora de `identidadeAceitavel` é recusada com a mesma frase genérica.
3. Sorteia o `id`, deriva o token por HMAC (`tokenDoLink("convite", id, versao)`) e chama `servico_criar_convite` com o hash. O banco confere responsável, plano ativo, teto de 3, teto de 10 por dia e se o e-mail já é membro.
4. Envia o e-mail (`emailConvite` em `lib/email/modelos.ts`): "{Primeiro nome do responsável} chamou você para ajudar a fazer o livro de memórias de {apelido}." Botão *Ver o convite* → `/convite/{token}`. Sem foto, sem texto de história.
5. A tela mostra o convite pendente com *Copiar mensagem* (para o WhatsApp, P9) e *Cancelar*.

**Aceitar.** `/convite/{token}` (sem login, `noindex`, `no-referrer`, `no-store`):
- Sem sessão: "{Nome} chamou você para ajudar no livro de {apelido}." Botão *Entrar para aceitar* → `/entrar`. Depois do login a pessoa cai em `/`, que mostra no topo "Você foi convidado para o livro de {apelido}" com *Aceitar* (`meus_convites()`).
- Com sessão e o e-mail certo: *Aceitar* direto. Aceitou → vai para `/livro/{id}`.
- Com sessão e outro e-mail: "Este convite é para b•••@gmail.com. Saia e entre com esse e-mail." O e-mail aparece mascarado.
- Convite aceito, cancelado ou vencido: "Este convite não vale mais. Peça um novo a quem convidou."

### 4.2 Permissões

- `privado.eh_responsavel(livro)` entra no lugar das conferências escritas à mão (`consentir_processamento_ia`, `desativar_qr` continuam iguais nesta migration; troca só se a revisão pedir).
- A tela recebe `papel` e esconde o que não é dele: *Convidar*, *Cancelar*, *Remover*, *Confirmar a IA*, *Desligar este QR*. O banco é quem garante.
- Os eventos já gravam `livro.papel` como `ator_tipo`, e as versões já gravam a origem `cofacilitador` (`salvar_historia`).

### 4.3 Compartilhar no grupo

1. No editor de uma história marcada como pronta, *Compartilhar no grupo* abre uma folha.
2. A ação chama `criar_qr` (se a história ainda não tem QR, pede o recorte como a amostra) e `servico_compartilhar_historia`, que devolve o link ativo ou cria um.
3. A folha mostra a mensagem pronta e *Copiar* / *Abrir WhatsApp* (sem número: o responsável escolhe o grupo):
   > {Apelido} contou: "{título}". Ouça na voz {dele|dela|original} e leia aqui: {link}
   ("dele" para pai, avô, tio; "dela" para mãe, avó, tia; "original" para outro.)
4. Embaixo, discreto: *Desligar este link*.

`/o/[token]`: o servidor calcula o hash, chama `servico_ler_compartilhada` com a chave secreta (sem porta para `anon`) e assina a leitura do recorte por pouco tempo, como o player. No host `ouvir.` o `/o/` não existe. Evento `historia_compartilhada` ao criar; `compartilhada_tocada` no *Ouvir*, no máximo 1 por link a cada hora (conferido antes de gravar).

### 4.4 Lembrar com carinho

Na aba *Para perguntar*, a pergunta enviada com `greatest(enviada_em, lembrada_em) <= now() - 3 dias` mostra *Lembrar com carinho*. O toque chama `lembrar_pergunta` e abre o WhatsApp com:
> Oi, {apelido}! Lembrei daquela pergunta: "{pergunta}". Quando tiver um tempinho, grava pra gente? É só tocar aqui: {link do autor}/gravar/{id}

### 4.5 Resumo semanal

- Inngest: `resumo-semanal` (cron `TZ=America/Sao_Paulo 0 18 * * 0`) lista os livros (`servico_livros_para_resumo`) e manda 1 evento por livro, com id `resumo-{livro}-{data}` (o Inngest descarta repetido).
- `resumo-semanal-livro`: lê os números (`servico_resumo_semanal`); se tudo zero, para. Num passo só, busca os e-mails dos membros com o resumo ligado (chave secreta) e envia. Os passos devolvem só números (T36): nenhum e-mail nem texto sai do passo.
- E-mail: "Esta semana no livro de {apelido}: 2 histórias novas · 5 perguntas esperando o Jair · ~34 páginas." Botão *Abrir o livro*. Rodapé: "Não quer receber? Desligue em Configurações."

## 5. Telas (gate de design)

| Tela | Ação principal | Estado vazio / dica |
| --- | --- | --- |
| *Quem ajuda* (`/livro/[id]/pessoas`) | *Convidar* (responsável, até 3) | "Só você por enquanto. Chame um irmão para ajudar." + *Convidar* |
| Folha *Convidar* | *Enviar convite* | — |
| Passo 4 *Quem mais ajuda* | *Enviar convite* (*Pular*, *Depois*) | — |
| `/convite/[token]` | *Entrar para aceitar* ou *Aceitar* | — |
| Cartão de convite em `/` | *Aceitar* | — |
| Folha *Compartilhar no grupo* | *Copiar mensagem* | — |
| `/o/[token]` | *Ouvir* | — |
| *Lembrar com carinho* (botão na aba *Para perguntar*) | — | Dica de 1ª vez: "Faz 3 dias? Mande um lembrete gentil." |
| *Configurações*: resumo semanal | Interruptor | — |

Todas entram no styleguide com dados falsos (`lib/exemplos/prompt11.ts`) e no `scripts/inspecionar-telas.mjs`.

## 6. Segurança

| Ameaça | Defesa |
| --- | --- |
| Link do convite repassado no grupo | Preso ao e-mail: aceitar confere `auth.users.email` (confirmado) no banco. O token só apresenta o convite |
| Co-facilitador se dá poderes (convida, remove, entra direto em `book_members`) | Nenhum grant de escrita em `book_members` e `book_invites`; funções com `eh_responsavel`. Testado |
| Corrida para passar de 3 | `for update` na linha do livro ao convidar e ao aceitar |
| A Ecoa vira canhão de e-mail | Só responsável com plano ativo, 10 por livro em 24 h; a frase de erro não diz se a conta já existia |
| `/convite` expõe dados | Só apelido do autor, primeiro nome de quem convidou e e-mail mascarado. `noindex`, `no-referrer`, `no-store` |
| `/o/` vaza mais que a história | Função de serviço, sem grant para `anon`; devolve só parágrafos (sem `fontes` nem ids de segmento); voz = recorte (T45), assinatura curta; token de 132 bits só como hash (T6, T25) |
| Removido continua vendo | RLS por `book_members`: perde tudo na próxima requisição. **Risco aceito:** um canal Realtime já aberto (`livro:{id}`, T37) pode seguir recebendo o texto ao vivo até reconectar (no máximo até o token renovar, ~1 h) |
| Autor | `porta_autor` não ganha nenhum grant; `book_invites` e `story_shares` não aparecem em nenhuma porta do autor |
| E-mails entre membros | `membros_do_livro` mostra o e-mail dos outros membros do mesmo livro, e só para membros. Aceito: é a família |

## 7. SQL

- Subida: `supabase/migrations/20261121120000_cofacilitadores.sql`
- Reversão: `supabase/reversao/20261121120000_cofacilitadores.down.sql`
- Testes: `supabase/tests/cofacilitadores.test.ts` (11)
- `supabase/tests/auth-shim.sql` ganha `email_confirmed_at` e `raw_user_meta_data`, que o Supabase de verdade já tem.

Resumo do que muda:

| Objeto | O quê |
| --- | --- |
| `privado.eh_responsavel`, `max_cofacilitadores` (3), `max_convites_dia` (10), `convite_validade_dias` (7), `palavras_por_pagina` (320), `palavras_do_texto` | Novas |
| `book_invites` | Nova. RLS: só o responsável lê (sem a coluna `token_hash`); ninguém escreve fora das funções |
| `servico_criar_convite`, `servico_ler_convite` | Só servidor |
| `meus_convites`, `aceitar_convite`, `cancelar_convite`, `membros_do_livro`, `remover_membro`, `sair_do_livro`, `definir_resumo_semanal` | `authenticated` |
| `book_members.resumo_semanal` | Nova coluna, padrão `true` |
| `story_shares` | Nova. 1 ativo por história; membro lê (sem `token_hash`) |
| `servico_compartilhar_historia`, `servico_ler_compartilhada` | Só servidor |
| `revogar_compartilhamento`, `lembrar_pergunta` | `authenticated` |
| `prompts.lembrada_em` | Nova coluna |
| `servico_livros_para_resumo`, `servico_resumo_semanal` | Só servidor; devolvem só ids e números |

A reversão apaga convites, compartilhamentos e as preferências do resumo; os co-facilitadores que já aceitaram continuam em `book_members` (a tabela já existia).

## 8. Testes

- **Banco (prontos):** convite só do responsável; aceitar só com o e-mail certo e confirmado; idempotente; co-facilitador não convida, não cancela, não remove, não lê convites, não escreve em `book_members`, não confirma a IA; teto de 3 com pendentes; reconvidar troca; `ja_membro`; membros só do próprio livro; sair e remover; responsável não é removido; compartilhar só membro, link único por história, leitura sem fontes, `anon` sem porta, revogar; lembrar só pergunta enviada; resumo só números; reversão.
- **A acrescentar na construção:** `desativar_qr` negado à co-facilitadora; co-facilitadora salva versão (`salvar_historia`, origem `cofacilitador`); `rls.test.ts` com as funções novas; frases em `lib/erros-banco.ts` (`ja_membro`, `limite_convites`, `limite_cofacilitadores`, `convite_invalido`); `config-banco.test.ts` com os espelhos.
- **Código:** `lib/links.test.ts` com os tipos `convite` e `compartilhar`; `lib/rotas.test.ts` com `/convite` e `/o` sem login e `/o` fora do host `ouvir.`; mensagens do WhatsApp (dele/dela/original); modelo do e-mail sem título.
- **E2E (styleguide):** o aceite do prompt em telas: responsável convida, co-facilitadora vê *Quem ajuda* sem *Convidar*.
- **Aceite de verdade (depois do deploy):** você convida a irmã do cliente (ou um e-mail seu), ela entra com Google, edita uma história e não vê *Convidar*.

## 9. Ordem de entrega (sessão 2)

1. Migration aplicada (depois do seu OK), tipos, frases de erro, `config.ts`, testes de banco.
2. Convite, *Quem ajuda*, passo 4, `/convite`, cartão em `/`, permissões na tela. Commit.
3. Compartilhar e `/o/`. Commit.
4. Lembrar e resumo semanal. Commit.
5. Gate de design, gate de fim, prévia na Vercel, aceite com conta real.

## 10. Decisões novas para registrar depois do OK

- **P59** Convite de co-facilitador preso ao e-mail, uso único, 7 dias, conta criada no convite; aceitar pelo e-mail, não pelo token; pendentes contam no teto de 3; 10 convites por livro em 24 h.
- **P60** Só do responsável: convidar, cancelar, remover, confirmar a IA, desligar QR, publicar, imprimir e pagar. Trocar links do autor e da família: qualquer membro.
- **P61** Compartilhar no grupo: 1 link por história pronta (HMAC), voz = recorte do QR, só parágrafos; revogável por qualquer membro; vale com plano vencido.
- **P62** Lembrar com carinho: pergunta enviada há 3 dias; o botão volta 3 dias depois do último lembrete.
- **P63** Resumo semanal: domingo 18 h, só números, só se houver algo, desliga em Configurações.
- **T47** `book_invites` e `story_shares` sem porta para `anon`: leitura por funções de serviço; tipos de link `convite` e `compartilhar` no HMAC de T25.

## 11. Revisão

(preenchida depois dos revisores)
