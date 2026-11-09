# Relatório do revisor goldfish: Zoom Out (arquiteto cético)

Alvo: `docs/designs/acesso-plano-admin.md`, arquivo inteiro. Padrão: zoom-out-standard. Revisor sem contexto da conversa.

## Majors

1. **O aceite do M10 falha.** A sessão se renova sozinha por semanas, então registrar só o login não responde "quem acessou ontem". **Correção:** registrar o acesso ao abrir `/livro/[id]` (via `after()`, no máximo 1 por pessoa, livro e dia).
2. **Escopo grande para uma sessão, com retrabalho certo no prompt 2.** **Correção:**
   - Cortar o que for YAGNI.
   - No gate de design, parar no PASS, sem polir telas que serão refeitas.
3. **O fluxo próprio de link mágico reinventa o Supabase Auth.** **Correção:**
   - Usar `signInWithOtp({ shouldCreateUser: false })` com o SMTP do Supabase apontado para o Resend e o modelo usando `{{ .TokenHash }}`.
   - O limite de envio fica com o Supabase.
   - O e-mail de acesso leva só a `/entrar`.
4. **A troca do domínio do QR é irreversível e está escondida num passo de implementação.** **Correção:** registro de decisão em `docs/decisoes/dominio.md` e commit separado.

## Nits

5. **Dois caminhos de leitura do admin** (policies na sessão e RPC). **Correção:** um padrão só, `exigirAdmin()` seguido da chave secreta.
6. **`lib/tokens.ts` chega antes da hora.** **Correção:** fica para o prompt 5, sem `compararHash`.
7. **Colunas `autor_*` e o enum `parentesco` com acento entram cedo demais.** **Correção:** só `autor_nome` agora; o resto vai para o prompt 4, com `text` e `check`.
8. **`/previa` duplica o `/styleguide` do prompt 2.** **Correção:** usar o nome `/styleguide` desde já.
9. **A lista de livros não tem caso na onda 1.** **Correção:**
   - Redirecionar para o livro mais recente.
   - Travar o duplo toque em *Ativar*.
10. **Fonte web não funciona em e-mail.** **Correção:** usar Georgia.
