# Revisão de segurança — mensagens da família (prompt 12, v1)

Revisor: `egm:egm-design` (Sonnet), 14/11/2026, escopo fechado (design doc, SQL, `family_messages` do prompt 10, link da família, `app/f/[token]/acoes.ts`, `proxy.ts`). Veredito: **não aprovar ainda**. Nenhum caminho pelo qual o autor ou quem tem o link leia mensagens de outros; o que sobra é abuso, LGPD, integridade e um risco latente de sigilo.

**Alta**
1. **Abuso do link.** `mensagem_criar`/`mensagem_enviar` abertas ao `anon`; aparelho escolhido pelo chamador; cota só por livro (rascunhos contam, então 30 convites esbarram em 20/h); spam guardado para sempre. Correção: só o servidor chama; teto por aparelho; limite por hora só de enviadas; teto e exclusão de arquivadas.
2. **LGPD: exclusão impossível.** Gatilho recusa DELETE até para a chave secreta; FK restrict; quem enviou não tem como pedir remoção. Correção: exclusão controlada agora, com auditoria; contato na tela de enviada; retenção de arquivadas.

**Média**
3. **Duração vem do cliente; custo não se sustenta.** 8 MB em bitrate baixo = horas. Correção: bytes por tipo menores, validar com a duração do Scribe, cota diária de transcrição.
4. **Mensagem só com áudio.** `texto_enviado` nulo fura a imutabilidade; membro digita texto atribuído ao parente. Correção: exigir texto confirmado no envio (ou marcar origem).
5. **Autor com login no futuro (P55).** Se o autor virar `authenticated` e membro, lê tudo. Correção: políticas nunca para o autor; teste.
6. **Consentimento agrupado e transferência internacional.** Correção: texto específico (destino, prazo, quem vê); DPA; considerar transcrever só após *Enviar*.
7. **Limpeza altera fala; `transcricao` não é a da máquina.** "não não", "tchau tchau" somem; o bruto se perde. Correção: guardar o bruto; tirar a regra de repetição.
8. **Upload.** URL assinada vale 2 h (não 30 min); foto órfã quando o envio zera o caminho; conteúdo não validado. Correção: não perder o caminho, conferir os primeiros bytes, recodificar a foto antes do PDF.

**Baixa**
9. **Reserva sem dono e sem checar plano.** A falha de A libera a reserva de B. Correção: id de reserva; `livro_editavel` na reserva.
10. **`/m` ainda não está no proxy.** Sem `no-referrer`/`noindex`. Correção: `proxyMensagem` antes do ramo com sessão, com teste.
11. **Vazamentos menores.** `coalesce` mostra o nome completo do autor; `livro` devolvido ao anon; `p_usuario` precisa vir da sessão. 
12. **Evidência do Q1 e leitura de áudio.** PGlite não reproduz Storage; regra id → leitura por RLS → assinatura precisa estar escrita e testada.

Decisões que o revisor considerou erradas: Q8, Q10, Q3 (regra de repetição), Q7 (só áudio), Q5 (recarregar queima cota), Q12 (o `coalesce`). De acordo: Q2, Q4, Q6, Q9, Q11.
