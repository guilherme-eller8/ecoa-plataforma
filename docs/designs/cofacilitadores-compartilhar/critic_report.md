# Revisão de segurança (egm:egm-design, Sonnet) — prompt 11, v1

Veredito: **aprovar com correções**. Itens 1 e 2 são decisões de produto; 4, 5 e 7 entram no SQL e nos testes.

1. **Alta** — Remover/sair não corta os links que a pessoa conhecia (`/a/`, `/f/`, `/o/` que ela criou). Revogar os `/o/` do removido e oferecer trocar os links do autor e da família.
2. **Alta** — Compartilhar no grupo é publicar, e qualquer membro pode. Recomenda criar só pelo responsável; revogar, qualquer membro. Texto do `/o/` é ao vivo.
3. **Média** — `/o/` sem `no-store`, `noindex`, `no-referrer`; revogação pode não valer na hora se cacheado. Limite por IP para tokens inválidos.
4. **Média** — Conta criada antes de o banco conferir os tetos: contas confirmadas órfãs; teto só por livro. Pré-checar, teto por responsável e global, limpar órfãs.
5. **Média** — E-mail do convite como canal de phishing (nomes em texto livre). Assunto fixo, campos saneados, teto por destinatário.
6. **Média** — (A) Co-facilitador hostil troca o link do avô sem parar. (B) Convites do responsável antigo sobrevivem a `admin_trocar_responsavel`; `aceitar_convite` não confere `livro_editavel`.
7. **Média** — Testes faltando: `limite_convites`, convite vencido/cancelado, remoção real, `desativar_qr`, `servico_*` negado a `authenticated`, `token_hash` ilegível, reversão com dados. O down deixava co-facilitadores sem como removê-los.
8. **Baixa** — Oráculo de conta (recusa por identidade) e de membro (`ja_membro`).
9. **Baixa** — Funções novas em `privado` sem `revoke ... from public`.
10. **Baixa** — Regra do responsável em dois lugares (`desativar_qr`, `consentir_processamento_ia`).
11. **Baixa** — Entrar/sair/remover sem evento gravado no banco.
12. **Baixa** — Resumo: sem `List-Unsubscribe`; retry reenvia a todos; passo manipula e-mails (T36).
