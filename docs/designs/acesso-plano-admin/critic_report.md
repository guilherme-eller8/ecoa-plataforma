# Relatório do revisor goldfish: Design Critic (segurança)

Alvo: `docs/designs/acesso-plano-admin.md`, linhas 1–492. Padrão: feature-spec-standard. Revisor sem contexto da conversa.

## Bloqueadores

- **B1. Redirect curinga `https://*.vercel.app/**`** aceita deploy de qualquer pessoa na Vercel. Um atacante inicia o OAuth com o próprio PKCE e `redirect_to` para um domínio dele, e o código de login da Ana cai lá. **Correção:** URLs exatas, ou curinga com o escopo do time (`https://*-<time>.vercel.app/**`); em produção, só `APP_URL`.
- **B2. Conta criada antes por um estranho.** Com cadastro aberto e login por senha habilitado, um estranho cria `ana@…` com senha própria. Depois, o "acha ou cria" do `ativarPlano` encontra essa conta e a torna responsável. **Correção:**
  - Desligar o cadastro público e o login por senha.
  - No `ativarPlano`, recusar usuário que tenha outra identidade além de e-mail ou Google.
  - Ajustar o CUJ 6.

## Majors

- **M1. Limite de envio contornável.** `signInWithOtp` é público e a contagem em `events` tem três falhas: não trava se a gravação falhar, tem corrida e não limita por IP. **Correção:** limites de Auth no painel, limite por IP e contagem atômica.
- **M2. Enumeração por tempo de resposta.** Para membro, a resposta demora mais (gera o link e envia o e-mail). **Correção:** enviar em segundo plano (`after()`).
- **M3. Scanners de e-mail queimam o link de uso único** (Outlook Safe Links e antivírus corporativos abrem o link antes da pessoa). **Correção:** a rota de confirmação mostra um botão que faz POST.
- **M4. A chave secreta ignora `livro_editavel`.** **Correção:** registrar a regra. Escrita do usuário usa o cliente da sessão; caminhos com a chave secreta checam a regra explicitamente.
- **M5. `autor_foto_path` editável aponta para arquivo de outro livro.** **Correção:** `check` com o prefixo `<id do livro>/`.
- **M6. Os grants padrão voltam em objetos futuros.** **Correção:**
  - `alter default privileges` no schema `privado`.
  - Teste de que `anon` não tem grant de tabela nem executa função `security definer`.
- **M7. E-mail digitado errado entrega o livro a um estranho.** **Correção:** confirmação antes de ativar e troca de responsável.
- **M8. Falta a seção de riscos.**

## Nits

- Admin com MFA (`aal2`) e revogação de admin que só vale quando o token expira.
- Validade do link definida no painel.
- Exigir `APP_URL` em produção.
- Callback sem parâmetro `next`.
- Testes que faltam: usuário sem livro, `insert` em `books`, `anon` em `admin_listar_livros`.
- Objetivos 1 e 6 sem verificação automática.
- Alternativas sem trade-off concreto.
- O que pode entrar em `events.detalhes`.
- `update` com plano vencido devolve 0 linhas, e a tela precisa distinguir isso de "não achou".

## Veredito

Não aprovar ainda: B1 e B2 permitem a um estranho entrar num livro.
