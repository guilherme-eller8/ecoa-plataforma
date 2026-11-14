-- Reversão de 20261121120000_mensagens_familia.sql.
-- Volta family_messages ao formato do prompt 10 (id, book_id, criado_em), vazia e fechada.
-- ATENÇÃO: com mensagem guardada, apagaria a voz e o texto de quem escreveu para o livro.

-- Trava: com mensagem (ou link) criada, só roda com `set ecoa.reversao_destrutiva = 'sim'`.
do $$
begin
  if (exists (select 1 from public.family_messages)
      or (to_regclass('public.message_access') is not null and exists (select 1 from public.message_access)))
     and coalesce(current_setting('ecoa.reversao_destrutiva', true), '') <> 'sim' then
    raise exception 'reversao_com_mensagens: rode com ecoa.reversao_destrutiva = sim';
  end if;
end $$;

drop function if exists public.mensagem_apagar(uuid);
drop function if exists public.mensagem_arquivar(uuid, boolean);
drop function if exists public.mensagem_no_livro(uuid, boolean);
drop function if exists public.mensagem_editar(uuid, text);
drop function if exists public.servico_mensagem_apagar_rascunhos(uuid[]);
drop function if exists public.servico_mensagem_rascunhos_vencidos(integer);
drop function if exists public.servico_trocar_link_mensagem(uuid, uuid, uuid, text, smallint);
drop function if exists public.servico_mensagem_transcricao_falhou(text, text, uuid, uuid);
drop function if exists public.servico_mensagem_transcrita(text, text, uuid, uuid, text, numeric);
drop function if exists public.servico_mensagem_reservar_transcricao(text, text, uuid);
drop function if exists public.servico_confirmar_foto_mensagem(text, text, uuid);
drop function if exists public.servico_confirmar_audio_mensagem(text, text, uuid, integer);
drop function if exists public.servico_caminho_mensagem(text, text, uuid, text);
drop function if exists public.servico_mensagem_enviar(text, text, uuid, text);
drop function if exists public.servico_mensagem_criar(text, text, text, text, text, boolean, boolean, smallint);
drop function if exists public.servico_mensagem_pagina(text);
drop function if exists privado.rascunho_do_aparelho(text, text, uuid);
drop function if exists privado.link_da_mensagem(text);

-- Os gatilhos saem antes de apagar as linhas (a trava acima já autorizou).
drop trigger if exists family_messages_sem_truncate on public.family_messages;
drop trigger if exists family_messages_regras on public.family_messages;
drop function if exists privado.mensagem_sem_truncate();
drop function if exists privado.mensagem_regras();
delete from public.family_messages;

drop policy if exists "membro lê enviadas" on public.family_messages;
revoke all on public.family_messages from authenticated;
drop index if exists public.family_messages_aparelho;
drop index if exists public.family_messages_rascunhos;
drop index if exists public.family_messages_livro_estado;
alter table public.family_messages
  drop constraint if exists family_messages_link_do_livro,
  drop column if exists access_id,
  drop column if exists aparelho_hash,
  drop column if exists nome,
  drop column if exists relacao,
  drop column if exists estado,
  drop column if exists audio_caminho,
  drop column if exists audio_recebido_em,
  drop column if exists duracao_s,
  drop column if exists audio_recusado,
  drop column if exists foto_caminho,
  drop column if exists foto_recebida_em,
  drop column if exists transcricao,
  drop column if exists transcricao_tentativas,
  drop column if exists transcricao_reserva,
  drop column if exists transcricao_pedida_em,
  drop column if exists texto,
  drop column if exists texto_enviado,
  drop column if exists consentimento_em,
  drop column if exists consentimento_versao,
  drop column if exists enviada_em,
  drop column if exists no_livro,
  drop column if exists no_livro_em,
  drop column if exists no_livro_por,
  drop column if exists editado_em,
  drop column if exists editado_por;
drop type if exists public.mensagem_estado;

drop table if exists public.message_access;

-- O bucket só sai vazio (os arquivos são apagados à mão pelo painel, se for o caso).
do $$ begin
  if to_regclass('storage.buckets') is not null then
    if not exists (select 1 from storage.objects where bucket_id = 'mensagens') then
      delete from storage.buckets where id = 'mensagens';
    end if;
  end if;
end $$;

drop function if exists privado.mensagem_rascunho_dura_h();
drop function if exists privado.max_transcricoes_por_dia();
drop function if exists privado.max_transcricoes_por_mensagem();
drop function if exists privado.max_mensagem_caracteres();
drop function if exists privado.max_mensagem_audio_s();
drop function if exists privado.max_rascunhos_por_aparelho();
drop function if exists privado.max_rascunhos_por_dia();
drop function if exists privado.max_mensagens_por_dia();
drop function if exists privado.max_mensagens_por_hora();
