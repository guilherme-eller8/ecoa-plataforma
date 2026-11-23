// Gerado por `generate_typescript_types` do projeto ecoa-plataforma (sa-east-1).
// Regerar após cada migration. Ajustes manuais (o gerador não sabe que podem ser nulos):
// - admin_listar_livros: autor_nome, plano_vence_em e responsavel_email (left join).
// - familia_enviar_causo: p_texto e p_audio_tipo (um ou outro).
// - servico_caminho_audio_causo: devolve null quando o causo não aceita upload.
// - familia_pagina, familia_votar, familia_enviar_causo: retorno tipado em lib/familia/tipos.ts.
// - autor_preparar_gravacao: p_prompt (história livre); servico_caminho_gravacao_autor devolve null.
// - autor_pagina, autor_preparar_gravacao: retorno tipado em lib/autor/tipos.ts.
// - servico_iniciar_historia: historia, estado e motivo (um ou outro é null).
// - servico_qr_audio_pronto: anterior é null quando não havia recorte; servico_ouvir_qr e
//   servico_qr_trechos: retorno tipado em lib/qr/tipos.ts.
// - Prompt 13: qr_codes.story_id pode ser nulo (QR de mensagem); book_layouts e book_exports
//   só leitura; montagem_conteudo e servico_export_conteudo: conteúdo tipado em lib/livro/montagem.ts.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      ai_usage: {
        Row: {
          book_id: string;
          criado_em: string;
          custo_usd: number;
          detalhes: Json | null;
          erro_codigo: string | null;
          etapa: string;
          id: number;
          id_requisicao: string | null;
          minutos_audio: number | null;
          modelo: string;
          ms: number | null;
          ms_desde_envio: number | null;
          ms_primeira_palavra: number | null;
          ok: boolean;
          provedor: string;
          recording_id: string | null;
          story_id: string | null;
          tentativa: number;
          tokens_cache_gravado: number;
          tokens_cache_lido: number;
          tokens_entrada: number;
          tokens_saida: number;
        };
        Insert: {
          book_id: string;
          criado_em?: string;
          custo_usd: number;
          detalhes?: Json | null;
          erro_codigo?: string | null;
          etapa: string;
          id?: number;
          id_requisicao?: string | null;
          minutos_audio?: number | null;
          modelo: string;
          ms?: number | null;
          ms_desde_envio?: number | null;
          ms_primeira_palavra?: number | null;
          ok: boolean;
          provedor: string;
          recording_id?: string | null;
          story_id?: string | null;
          tentativa?: number;
          tokens_cache_gravado?: number;
          tokens_cache_lido?: number;
          tokens_entrada?: number;
          tokens_saida?: number;
        };
        Update: {
          book_id?: string;
          criado_em?: string;
          custo_usd?: number;
          detalhes?: Json | null;
          erro_codigo?: string | null;
          etapa?: string;
          id?: number;
          id_requisicao?: string | null;
          minutos_audio?: number | null;
          modelo?: string;
          ms?: number | null;
          ms_desde_envio?: number | null;
          ms_primeira_palavra?: number | null;
          ok?: boolean;
          provedor?: string;
          recording_id?: string | null;
          story_id?: string | null;
          tentativa?: number;
          tokens_cache_gravado?: number;
          tokens_cache_lido?: number;
          tokens_entrada?: number;
          tokens_saida?: number;
        };
        Relationships: [];
      };
      author_access: {
        Row: {
          chave_versao: number;
          book_id: string;
          criado_em: string;
          criado_por: string | null;
          id: string;
          revogado_em: string | null;
          token_hash: string;
        };
        Insert: {
          chave_versao?: number;
          book_id: string;
          criado_em?: string;
          criado_por?: string | null;
          id?: string;
          revogado_em?: string | null;
          token_hash: string;
        };
        Update: {
          chave_versao?: number;
          book_id?: string;
          criado_em?: string;
          criado_por?: string | null;
          id?: string;
          revogado_em?: string | null;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "author_access_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      book_context: {
        Row: {
          atualizado_em: string;
          book_id: string;
          resumo: string;
          story_id: string;
          temas: string[];
        };
        Insert: {
          atualizado_em?: string;
          book_id: string;
          resumo: string;
          story_id: string;
          temas?: string[];
        };
        Update: {
          atualizado_em?: string;
          book_id?: string;
          resumo?: string;
          story_id?: string;
          temas?: string[];
        };
        Relationships: [];
      };
      // Prompt 11: convites de co-facilitador (token_hash fica fora do grant de leitura).
      book_invites: {
        Row: {
          aceito_em: string | null;
          aceito_por: string | null;
          book_id: string;
          chave_versao: number;
          criado_em: string;
          criado_por: string | null;
          dono_hash: string | null;
          email: string | null;
          email_definido_em: string | null;
          email_trocas: number;
          expira_em: string;
          id: string;
          nome: string | null;
          revogado_em: string | null;
          token_hash: string;
        };
        Insert: {
          aceito_em?: string | null;
          aceito_por?: string | null;
          book_id: string;
          chave_versao: number;
          criado_em?: string;
          criado_por?: string | null;
          dono_hash?: string | null;
          email?: string | null;
          email_definido_em?: string | null;
          email_trocas?: number;
          expira_em: string;
          id: string;
          nome?: string | null;
          revogado_em?: string | null;
          token_hash: string;
        };
        Update: { revogado_em?: string | null };
        Relationships: [];
      };
      // Prompt 11: compartilhar no grupo (/o/{token}).
      story_shares: {
        Row: {
          book_id: string;
          chave_versao: number;
          criado_em: string;
          criado_por: string | null;
          id: string;
          revogado_em: string | null;
          revogado_por: string | null;
          story_id: string;
          token_hash: string;
        };
        Insert: {
          book_id: string;
          chave_versao: number;
          criado_em?: string;
          criado_por?: string | null;
          id: string;
          revogado_em?: string | null;
          revogado_por?: string | null;
          story_id: string;
          token_hash: string;
        };
        Update: { revogado_em?: string | null };
        Relationships: [];
      };
      book_members: {
        Row: {
          book_id: string;
          criado_em: string;
          id: string;
          papel: Database["public"]["Enums"]["papel_membro"];
          resumo_semanal: boolean;
          user_id: string;
        };
        Insert: {
          book_id: string;
          criado_em?: string;
          id?: string;
          papel: Database["public"]["Enums"]["papel_membro"];
          resumo_semanal?: boolean;
          user_id: string;
        };
        Update: {
          book_id?: string;
          criado_em?: string;
          id?: string;
          papel?: Database["public"]["Enums"]["papel_membro"];
          resumo_semanal?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "book_members_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      books: {
        Row: {
          autor_consentimento_em: string | null;
          autor_consentimento_versao: number | null;
          ia_consentimento_em: string | null;
          ia_consentimento_por: string | null;
          ia_consentimento_versao: number | null;
          atualizado_em: string;
          autor_apelido: string | null;
          autor_celular: string | null;
          autor_foto_id: string | null;
          autor_nome: string | null;
          autor_parentesco: Database["public"]["Enums"]["parentesco"] | null;
          configuracao: Json;
          criado_em: string;
          id: string;
          plano_ativado_em: string | null;
          plano_estado: Database["public"]["Enums"]["plano_estado"];
          plano_vence_em: string | null;
        };
        Insert: {
          autor_consentimento_em?: string | null;
          autor_consentimento_versao?: number | null;
          ia_consentimento_em?: string | null;
          ia_consentimento_por?: string | null;
          ia_consentimento_versao?: number | null;
          atualizado_em?: string;
          autor_apelido?: string | null;
          autor_celular?: string | null;
          autor_foto_id?: string | null;
          autor_nome?: string | null;
          autor_parentesco?: Database["public"]["Enums"]["parentesco"] | null;
          configuracao?: Json;
          criado_em?: string;
          id?: string;
          plano_ativado_em?: string | null;
          plano_estado?: Database["public"]["Enums"]["plano_estado"];
          plano_vence_em?: string | null;
        };
        Update: {
          autor_consentimento_em?: string | null;
          autor_consentimento_versao?: number | null;
          ia_consentimento_em?: string | null;
          ia_consentimento_por?: string | null;
          ia_consentimento_versao?: number | null;
          atualizado_em?: string;
          autor_apelido?: string | null;
          autor_celular?: string | null;
          autor_foto_id?: string | null;
          autor_nome?: string | null;
          autor_parentesco?: Database["public"]["Enums"]["parentesco"] | null;
          configuracao?: Json;
          criado_em?: string;
          id?: string;
          plano_ativado_em?: string | null;
          plano_estado?: Database["public"]["Enums"]["plano_estado"];
          plano_vence_em?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "books_autor_foto_do_livro";
            columns: ["id", "autor_foto_id"];
            isOneToOne: false;
            referencedRelation: "photos";
            referencedColumns: ["book_id", "id"];
          },
        ];
      };
      causos: {
        Row: {
          audio_caminho: string | null;
          audio_recebido_em: string | null;
          book_id: string;
          consentimento_em: string;
          consentimento_versao: number;
          criado_em: string;
          duracao_s: number | null;
          estado: Database["public"]["Enums"]["causo_estado"];
          id: string;
          nome: string;
          texto: string | null;
          tipo: Database["public"]["Enums"]["prompt_tipo"];
        };
        Insert: {
          audio_caminho?: string | null;
          audio_recebido_em?: string | null;
          book_id: string;
          consentimento_em: string;
          consentimento_versao: number;
          criado_em?: string;
          duracao_s?: number | null;
          estado?: Database["public"]["Enums"]["causo_estado"];
          id?: string;
          nome: string;
          texto?: string | null;
          tipo?: Database["public"]["Enums"]["prompt_tipo"];
        };
        Update: {
          audio_caminho?: string | null;
          audio_recebido_em?: string | null;
          book_id?: string;
          consentimento_em?: string;
          consentimento_versao?: number;
          criado_em?: string;
          duracao_s?: number | null;
          estado?: Database["public"]["Enums"]["causo_estado"];
          id?: string;
          nome?: string;
          texto?: string | null;
          tipo?: Database["public"]["Enums"]["prompt_tipo"];
        };
        Relationships: [
          {
            foreignKeyName: "causos_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          acao: string;
          ator_id: string | null;
          ator_tipo: Database["public"]["Enums"]["ator_tipo"];
          book_id: string | null;
          criado_em: string;
          detalhes: Json;
          id: number;
        };
        Insert: {
          acao: string;
          ator_id?: string | null;
          ator_tipo: Database["public"]["Enums"]["ator_tipo"];
          book_id?: string | null;
          criado_em?: string;
          detalhes?: Json;
          id?: never;
        };
        Update: {
          acao?: string;
          ator_id?: string | null;
          ator_tipo?: Database["public"]["Enums"]["ator_tipo"];
          book_id?: string | null;
          criado_em?: string;
          detalhes?: Json;
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: "events_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      family_access: {
        Row: {
          book_id: string;
          chave_versao: number;
          criado_em: string;
          criado_por: string | null;
          id: string;
          revogado_em: string | null;
          token_hash: string;
        };
        Insert: {
          book_id: string;
          chave_versao?: number;
          criado_em?: string;
          criado_por?: string | null;
          id?: string;
          revogado_em?: string | null;
          token_hash: string;
        };
        Update: {
          book_id?: string;
          chave_versao?: number;
          criado_em?: string;
          criado_por?: string | null;
          id?: string;
          revogado_em?: string | null;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "family_access_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      family_messages: {
        Row: {
          access_id: string;
          aparelho_hash: string;
          audio_caminho: string | null;
          audio_recebido_em: string | null;
          audio_recusado: boolean;
          book_id: string;
          consentimento_em: string;
          consentimento_versao: number;
          criado_em: string;
          duracao_s: number | null;
          editado_em: string | null;
          editado_por: string | null;
          enviada_em: string | null;
          estado: Database["public"]["Enums"]["mensagem_estado"];
          foto_caminho: string | null;
          foto_recebida_em: string | null;
          id: string;
          no_livro: boolean;
          no_livro_em: string | null;
          no_livro_por: string | null;
          nome: string;
          relacao: string;
          texto: string | null;
          texto_enviado: string | null;
          transcricao: string | null;
          transcricao_pedida_em: string | null;
          transcricao_reserva: string | null;
          transcricao_tentativas: number;
        };
        Insert: {
          access_id?: string;
          aparelho_hash?: string;
          audio_caminho?: string | null;
          audio_recebido_em?: string | null;
          audio_recusado?: boolean;
          book_id?: string;
          consentimento_em?: string;
          consentimento_versao?: number;
          criado_em?: string;
          duracao_s?: number | null;
          editado_em?: string | null;
          editado_por?: string | null;
          enviada_em?: string | null;
          estado?: Database["public"]["Enums"]["mensagem_estado"];
          foto_caminho?: string | null;
          foto_recebida_em?: string | null;
          id?: string;
          no_livro?: boolean;
          no_livro_em?: string | null;
          no_livro_por?: string | null;
          nome?: string;
          relacao?: string;
          texto?: string | null;
          texto_enviado?: string | null;
          transcricao?: string | null;
          transcricao_pedida_em?: string | null;
          transcricao_reserva?: string | null;
          transcricao_tentativas?: number;
        };
        Update: {
          access_id?: string;
          aparelho_hash?: string;
          audio_caminho?: string | null;
          audio_recebido_em?: string | null;
          audio_recusado?: boolean;
          book_id?: string;
          consentimento_em?: string;
          consentimento_versao?: number;
          criado_em?: string;
          duracao_s?: number | null;
          editado_em?: string | null;
          editado_por?: string | null;
          enviada_em?: string | null;
          estado?: Database["public"]["Enums"]["mensagem_estado"];
          foto_caminho?: string | null;
          foto_recebida_em?: string | null;
          id?: string;
          no_livro?: boolean;
          no_livro_em?: string | null;
          no_livro_por?: string | null;
          nome?: string;
          relacao?: string;
          texto?: string | null;
          texto_enviado?: string | null;
          transcricao?: string | null;
          transcricao_pedida_em?: string | null;
          transcricao_reserva?: string | null;
          transcricao_tentativas?: number;
        };
        Relationships: [
          {
            foreignKeyName: "family_messages_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      message_access: {
        Row: {
          book_id: string;
          chave_versao: number;
          criado_em: string;
          criado_por: string | null;
          id: string;
          revogado_em: string | null;
          token_hash: string;
        };
        Insert: {
          book_id: string;
          chave_versao?: number;
          criado_em?: string;
          criado_por?: string | null;
          id?: string;
          revogado_em?: string | null;
          token_hash: string;
        };
        Update: {
          book_id?: string;
          chave_versao?: number;
          criado_em?: string;
          criado_por?: string | null;
          id?: string;
          revogado_em?: string | null;
          token_hash?: string;
        };
        Relationships: [];
      };
      glossary_entries: {
        Row: {
          apelidos: string[];
          atualizado_em: string;
          book_id: string;
          chave: string | null;
          criado_em: string;
          estado: Database["public"]["Enums"]["glossario_estado"];
          id: string;
          nome: string;
          observacao: string | null;
          origem_story_id: string | null;
          tipo: Database["public"]["Enums"]["glossario_tipo"];
        };
        Insert: {
          apelidos?: string[];
          atualizado_em?: string;
          book_id: string;
          chave?: string | null;
          criado_em?: string;
          estado?: Database["public"]["Enums"]["glossario_estado"];
          id?: string;
          nome: string;
          observacao?: string | null;
          origem_story_id?: string | null;
          tipo: Database["public"]["Enums"]["glossario_tipo"];
        };
        Update: {
          apelidos?: string[];
          atualizado_em?: string;
          book_id?: string;
          chave?: string | null;
          criado_em?: string;
          estado?: Database["public"]["Enums"]["glossario_estado"];
          id?: string;
          nome?: string;
          observacao?: string | null;
          origem_story_id?: string | null;
          tipo?: Database["public"]["Enums"]["glossario_tipo"];
        };
        Relationships: [];
      };
      photos: {
        Row: {
          altura: number | null;
          book_id: string;
          caminho: string;
          criado_em: string;
          criado_por: string | null;
          id: string;
          largura: number | null;
          legenda: string | null;
        };
        Insert: {
          altura?: number | null;
          book_id: string;
          caminho: string;
          criado_em?: string;
          criado_por?: string | null;
          id?: string;
          largura?: number | null;
          legenda?: string | null;
        };
        Update: {
          altura?: number | null;
          book_id?: string;
          caminho?: string;
          criado_em?: string;
          criado_por?: string | null;
          id?: string;
          largura?: number | null;
          legenda?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "photos_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      poll_items: {
        Row: {
          banco_id: string | null;
          book_id: string;
          causo_id: string | null;
          id: string;
          ordem: number;
          poll_id: string;
          prompt_id: string | null;
          texto: string;
          tipo: Database["public"]["Enums"]["prompt_tipo"];
        };
        Insert: {
          banco_id?: string | null;
          book_id: string;
          causo_id?: string | null;
          id?: string;
          ordem?: number;
          poll_id: string;
          prompt_id?: string | null;
          texto: string;
          tipo?: Database["public"]["Enums"]["prompt_tipo"];
        };
        Update: {
          banco_id?: string | null;
          book_id?: string;
          causo_id?: string | null;
          id?: string;
          ordem?: number;
          poll_id?: string;
          prompt_id?: string | null;
          texto?: string;
          tipo?: Database["public"]["Enums"]["prompt_tipo"];
        };
        Relationships: [
          {
            foreignKeyName: "poll_items_book_id_causo_id_fkey";
            columns: ["book_id", "causo_id"];
            isOneToOne: false;
            referencedRelation: "causos";
            referencedColumns: ["book_id", "id"];
          },
          {
            foreignKeyName: "poll_items_book_id_poll_id_fkey";
            columns: ["book_id", "poll_id"];
            isOneToOne: false;
            referencedRelation: "polls";
            referencedColumns: ["book_id", "id"];
          },
          {
            foreignKeyName: "poll_items_book_id_prompt_id_fkey";
            columns: ["book_id", "prompt_id"];
            isOneToOne: false;
            referencedRelation: "prompts";
            referencedColumns: ["book_id", "id"];
          },
        ];
      };
      poll_votes: {
        Row: {
          aparelho_hash: string;
          book_id: string;
          criado_em: string;
          id: string;
          nome: string;
          poll_id: string;
          poll_item_id: string;
          votante: string;
        };
        Insert: {
          aparelho_hash: string;
          book_id: string;
          criado_em?: string;
          id?: string;
          nome: string;
          poll_id: string;
          poll_item_id: string;
          votante: string;
        };
        Update: {
          aparelho_hash?: string;
          book_id?: string;
          criado_em?: string;
          id?: string;
          nome?: string;
          poll_id?: string;
          poll_item_id?: string;
          votante?: string;
        };
        Relationships: [
          {
            foreignKeyName: "poll_votes_book_id_poll_id_fkey";
            columns: ["book_id", "poll_id"];
            isOneToOne: false;
            referencedRelation: "polls";
            referencedColumns: ["book_id", "id"];
          },
          {
            foreignKeyName: "poll_votes_poll_id_poll_item_id_fkey";
            columns: ["poll_id", "poll_item_id"];
            isOneToOne: false;
            referencedRelation: "poll_items";
            referencedColumns: ["poll_id", "id"];
          },
        ];
      };
      polls: {
        Row: {
          aberta_em: string;
          book_id: string;
          encerrada_em: string | null;
          estado: Database["public"]["Enums"]["enquete_estado"];
          id: string;
          trocas: number;
          trocas_desde: string;
        };
        Insert: {
          aberta_em?: string;
          book_id: string;
          encerrada_em?: string | null;
          estado?: Database["public"]["Enums"]["enquete_estado"];
          id?: string;
          trocas?: number;
          trocas_desde?: string;
        };
        Update: {
          aberta_em?: string;
          book_id?: string;
          encerrada_em?: string | null;
          estado?: Database["public"]["Enums"]["enquete_estado"];
          id?: string;
          trocas?: number;
          trocas_desde?: string;
        };
        Relationships: [
          {
            foreignKeyName: "polls_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      prompts: {
        Row: {
          sugestao_audio_caminho: string | null;
          sugestao_nome: string | null;
          atualizado_em: string;
          banco_id: string | null;
          book_id: string;
          causo_id: string | null;
          criado_em: string;
          criado_por: string | null;
          enviada_em: string | null;
          lembrada_em: string | null;
          estado: Database["public"]["Enums"]["prompt_estado"];
          id: string;
          ordem: number;
          origem: Database["public"]["Enums"]["prompt_origem"];
          photo_id: string | null;
          texto: string;
          tipo: Database["public"]["Enums"]["prompt_tipo"];
        };
        Insert: {
          sugestao_audio_caminho?: string | null;
          sugestao_nome?: string | null;
          atualizado_em?: string;
          banco_id?: string | null;
          book_id: string;
          causo_id?: string | null;
          criado_em?: string;
          criado_por?: string | null;
          enviada_em?: string | null;
          lembrada_em?: string | null;
          estado?: Database["public"]["Enums"]["prompt_estado"];
          id?: string;
          ordem?: number;
          origem: Database["public"]["Enums"]["prompt_origem"];
          photo_id?: string | null;
          texto: string;
          tipo?: Database["public"]["Enums"]["prompt_tipo"];
        };
        Update: {
          sugestao_audio_caminho?: string | null;
          sugestao_nome?: string | null;
          atualizado_em?: string;
          banco_id?: string | null;
          book_id?: string;
          causo_id?: string | null;
          criado_em?: string;
          criado_por?: string | null;
          enviada_em?: string | null;
          lembrada_em?: string | null;
          estado?: Database["public"]["Enums"]["prompt_estado"];
          id?: string;
          ordem?: number;
          origem?: Database["public"]["Enums"]["prompt_origem"];
          photo_id?: string | null;
          texto?: string;
          tipo?: Database["public"]["Enums"]["prompt_tipo"];
        };
        Relationships: [
          {
            foreignKeyName: "prompts_book_id_causo_id_fkey";
            columns: ["book_id", "causo_id"];
            isOneToOne: false;
            referencedRelation: "causos";
            referencedColumns: ["book_id", "id"];
          },
          {
            foreignKeyName: "prompts_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prompts_book_id_photo_id_fkey";
            columns: ["book_id", "photo_id"];
            isOneToOne: false;
            referencedRelation: "photos";
            referencedColumns: ["book_id", "id"];
          },
        ];
      };
      // ── Prompt 13: montar e publicar (sem Insert/Update: escrita só por função) ──
      book_layouts: {
        Row: {
          atualizado_em: string;
          atualizado_por: string | null;
          book_id: string;
          capa_cor: string;
          capa_foco_x: number;
          capa_foco_y: number;
          capa_foto_id: string | null;
          dedicatoria: string | null;
          fora: string[];
          ordem_historias: string[];
          ordem_mensagens: string[];
          rev: number;
          subtitulo: string | null;
          titulo: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      // O membro lê todas as colunas menos `conteudo` (grant por coluna).
      book_exports: {
        Row: {
          book_id: string;
          capa_bytes: number | null;
          conteudo: Json;
          criado_em: string;
          erro: string | null;
          espec: Json | null;
          estado: "gerando" | "pronta" | "falhou";
          id: string;
          lombada_mm: number | null;
          miolo_bytes: number | null;
          paginas: number | null;
          pasta: string | null;
          publicado_por: string | null;
          qr_esperados: number;
          terminado_em: string | null;
          versao: number;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      qr_codes: {
        Row: {
          audio_caminho: string | null;
          audio_duracao_s: number | null;
          audio_fonte: string | null;
          audio_pedido_em: string | null;
          audio_pronto_em: string | null;
          book_id: string;
          codigo: string;
          criado_em: string;
          criado_por: string | null;
          desativado_em: string | null;
          desativado_por: string | null;
          message_id: string | null;
          story_id: string | null;
        };
        Insert: {
          audio_caminho?: string | null;
          audio_duracao_s?: number | null;
          audio_fonte?: string | null;
          audio_pedido_em?: string | null;
          audio_pronto_em?: string | null;
          book_id: string;
          codigo: string;
          criado_em?: string;
          criado_por?: string | null;
          desativado_em?: string | null;
          desativado_por?: string | null;
          message_id?: string | null;
          story_id?: string | null;
        };
        Update: {
          audio_caminho?: string | null;
          audio_duracao_s?: number | null;
          audio_fonte?: string | null;
          audio_pedido_em?: string | null;
          audio_pronto_em?: string | null;
          book_id?: string;
          codigo?: string;
          criado_em?: string;
          criado_por?: string | null;
          desativado_em?: string | null;
          desativado_por?: string | null;
          message_id?: string | null;
          story_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "qr_codes_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qr_codes_book_id_story_id_fkey";
            columns: ["book_id", "story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["book_id", "id"];
          },
        ];
      };
      qr_consultas: {
        Row: {
          chave: string;
          janela: string;
          n: number;
          tipo: string;
        };
        Insert: {
          chave: string;
          janela: string;
          n?: number;
          tipo: string;
        };
        Update: {
          chave?: string;
          janela?: string;
          n?: number;
          tipo?: string;
        };
        Relationships: [];
      };
      recordings: {
        Row: {
          arquivado_em: string | null;
          author_access_id: string | null;
          lote_id: string | null;
          lote_ordem: number | null;
          lote_total: number | null;
          para_historia: string | null;
          book_id: string;
          caminho: string;
          content_type: string;
          criado_em: string;
          criado_por: string | null;
          duracao_s: number | null;
          id: string;
          nome_arquivo: string;
          origem: Database["public"]["Enums"]["recording_origem"];
          processado_em: string | null;
          prompt_id: string | null;
          recebido_em: string | null;
          tamanho_bytes: number;
          titulo: string | null;
          upload: Database["public"]["Enums"]["recording_upload"];
        };
        Insert: {
          author_access_id?: string | null;
          lote_id?: string | null;
          lote_ordem?: number | null;
          lote_total?: number | null;
          para_historia?: string | null;
          book_id: string;
          caminho: string;
          content_type: string;
          criado_em?: string;
          criado_por?: string | null;
          duracao_s?: number | null;
          id: string;
          nome_arquivo: string;
          origem?: Database["public"]["Enums"]["recording_origem"];
          processado_em?: string | null;
          prompt_id?: string | null;
          recebido_em?: string | null;
          tamanho_bytes: number;
          titulo?: string | null;
          upload?: Database["public"]["Enums"]["recording_upload"];
        };
        Update: {
          author_access_id?: string | null;
          lote_id?: string | null;
          lote_ordem?: number | null;
          lote_total?: number | null;
          para_historia?: string | null;
          book_id?: string;
          caminho?: string;
          content_type?: string;
          criado_em?: string;
          criado_por?: string | null;
          duracao_s?: number | null;
          id?: string;
          nome_arquivo?: string;
          origem?: Database["public"]["Enums"]["recording_origem"];
          processado_em?: string | null;
          prompt_id?: string | null;
          recebido_em?: string | null;
          tamanho_bytes?: number;
          titulo?: string | null;
          upload?: Database["public"]["Enums"]["recording_upload"];
        };
        Relationships: [
          {
            foreignKeyName: "recordings_author_access_id_fkey";
            columns: ["author_access_id"];
            isOneToOne: false;
            referencedRelation: "author_access";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recordings_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recordings_book_id_prompt_id_fkey";
            columns: ["book_id", "prompt_id"];
            isOneToOne: false;
            referencedRelation: "prompts";
            referencedColumns: ["book_id", "id"];
          },
        ];
      };
      stories: {
        Row: {
          arquivada_em: string | null;
          atualizado_em: string;
          book_id: string;
          criado_em: string;
          divisao: Json | null;
          divisao_de: string | null;
          erro: string | null;
          erro_etapa: string | null;
          estado: Database["public"]["Enums"]["story_estado"];
          estrutura: Json | null;
          id: string;
          prompt_id: string | null;
          pergunta_sugerida: string | null;
          pronta_em: string | null;
          rascunho: Json | null;
          sugestao_ignorada: boolean;
          titulo: string | null;
          texto: Json | null;
          texto_marcacoes: Json;
          texto_rev: number;
          versao_rev: number;
          texto_por: string | null;
          texto_origem: Database["public"]["Enums"]["versao_origem"] | null;
          texto_em: string | null;
          ano: number | null;
          revisada_em: string | null;
          revisada_por: string | null;
          vista_em: string | null;
        };
        Insert: {
          atualizado_em?: string;
          book_id: string;
          criado_em?: string;
          divisao?: Json | null;
          divisao_de?: string | null;
          erro?: string | null;
          erro_etapa?: string | null;
          estado?: Database["public"]["Enums"]["story_estado"];
          estrutura?: Json | null;
          id?: string;
          prompt_id?: string | null;
          pergunta_sugerida?: string | null;
          pronta_em?: string | null;
          rascunho?: Json | null;
          sugestao_ignorada?: boolean;
          titulo?: string | null;
          texto?: Json | null;
          texto_marcacoes?: Json;
          texto_rev?: number;
          versao_rev?: number;
          texto_por?: string | null;
          texto_origem?: Database["public"]["Enums"]["versao_origem"] | null;
          texto_em?: string | null;
          ano?: number | null;
          revisada_em?: string | null;
          revisada_por?: string | null;
          vista_em?: string | null;
        };
        Update: {
          atualizado_em?: string;
          book_id?: string;
          criado_em?: string;
          divisao?: Json | null;
          divisao_de?: string | null;
          erro?: string | null;
          erro_etapa?: string | null;
          estado?: Database["public"]["Enums"]["story_estado"];
          estrutura?: Json | null;
          id?: string;
          prompt_id?: string | null;
          pergunta_sugerida?: string | null;
          pronta_em?: string | null;
          rascunho?: Json | null;
          sugestao_ignorada?: boolean;
          titulo?: string | null;
          texto?: Json | null;
          texto_marcacoes?: Json;
          texto_rev?: number;
          versao_rev?: number;
          texto_por?: string | null;
          texto_origem?: Database["public"]["Enums"]["versao_origem"] | null;
          texto_em?: string | null;
          ano?: number | null;
          revisada_em?: string | null;
          revisada_por?: string | null;
          vista_em?: string | null;
        };
        Relationships: [];
      };
      edit_locks: {
        Row: {
          aba: string;
          book_id: string;
          desde: string;
          expira_em: string;
          nome: string;
          story_id: string;
          user_id: string;
        };
        Insert: {
          aba: string;
          book_id: string;
          desde?: string;
          expira_em: string;
          nome: string;
          story_id: string;
          user_id: string;
        };
        Update: {
          aba?: string;
          book_id?: string;
          desde?: string;
          expira_em?: string;
          nome?: string;
          story_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      story_photos: {
        Row: {
          ao_lado: boolean;
          book_id: string;
          criado_em: string;
          ordem: number;
          photo_id: string;
          recorte_a: number | null;
          recorte_l: number | null;
          recorte_x: number | null;
          recorte_y: number | null;
          story_id: string;
        };
        Insert: {
          ao_lado?: boolean;
          book_id: string;
          criado_em?: string;
          ordem?: number;
          photo_id: string;
          recorte_a?: number | null;
          recorte_l?: number | null;
          recorte_x?: number | null;
          recorte_y?: number | null;
          story_id: string;
        };
        Update: {
          ao_lado?: boolean;
          book_id?: string;
          criado_em?: string;
          ordem?: number;
          photo_id?: string;
          recorte_a?: number | null;
          recorte_l?: number | null;
          recorte_x?: number | null;
          recorte_y?: number | null;
          story_id?: string;
        };
        Relationships: [];
      };
      story_proposals: {
        Row: {
          id: string;
          story_id: string;
          book_id: string;
          tipo: Database["public"]["Enums"]["proposta_tipo"];
          estado: Database["public"]["Enums"]["proposta_estado"];
          tamanho: string;
          pedido: Json;
          gravacoes: string[];
          travados: Json;
          mudancas: Json | null;
          ordem: string[] | null;
          marcacoes: Json;
          erro: string | null;
          modelos: Json | null;
          hash_prompts: Json | null;
          aplicadas: string[] | null;
          versao: number | null;
          pedida_por: string | null;
          pedida_em: string;
          pronta_em: string | null;
          decidida_por: string | null;
          decidida_em: string | null;
        };
        Insert: {
          id?: string;
          story_id: string;
          book_id: string;
          tipo: Database["public"]["Enums"]["proposta_tipo"];
          estado?: Database["public"]["Enums"]["proposta_estado"];
          tamanho: string;
          pedido?: Json;
          gravacoes?: string[];
          travados?: Json;
          mudancas?: Json | null;
          ordem?: string[] | null;
          marcacoes?: Json;
          erro?: string | null;
          modelos?: Json | null;
          hash_prompts?: Json | null;
          aplicadas?: string[] | null;
          versao?: number | null;
          pedida_por?: string | null;
          pedida_em?: string;
          pronta_em?: string | null;
          decidida_por?: string | null;
          decidida_em?: string | null;
        };
        Update: {
          id?: string;
          story_id?: string;
          book_id?: string;
          tipo?: Database["public"]["Enums"]["proposta_tipo"];
          estado?: Database["public"]["Enums"]["proposta_estado"];
          tamanho?: string;
          pedido?: Json;
          gravacoes?: string[];
          travados?: Json;
          mudancas?: Json | null;
          ordem?: string[] | null;
          marcacoes?: Json;
          erro?: string | null;
          modelos?: Json | null;
          hash_prompts?: Json | null;
          aplicadas?: string[] | null;
          versao?: number | null;
          pedida_por?: string | null;
          pedida_em?: string;
          pronta_em?: string | null;
          decidida_por?: string | null;
          decidida_em?: string | null;
        };
        Relationships: [];
      };
      story_recordings: {
        Row: {
          book_id: string;
          ordem: number;
          recording_id: string;
          segmento_inicial: number;
          segmentos: number[] | null;
          story_id: string;
        };
        Insert: {
          book_id: string;
          ordem: number;
          recording_id: string;
          segmento_inicial?: number;
          segmentos?: number[] | null;
          story_id: string;
        };
        Update: {
          book_id?: string;
          ordem?: number;
          recording_id?: string;
          segmento_inicial?: number;
          segmentos?: number[] | null;
          story_id?: string;
        };
        Relationships: [];
      };
      story_versions: {
        Row: {
          book_id: string;
          conteudo: Json;
          criado_em: string;
          criado_por: string | null;
          hash_prompts: Json | null;
          id: string;
          marcacoes: Json;
          modelos: Json | null;
          numero: number;
          origem: Database["public"]["Enums"]["versao_origem"];
          proposta_id: string | null;
          restaurada_de: number | null;
          story_id: string;
          tamanho: string;
        };
        Insert: {
          book_id: string;
          conteudo: Json;
          criado_em?: string;
          criado_por?: string | null;
          hash_prompts?: Json | null;
          id?: string;
          marcacoes?: Json;
          modelos?: Json | null;
          numero: number;
          origem: Database["public"]["Enums"]["versao_origem"];
          proposta_id?: string | null;
          restaurada_de?: number | null;
          story_id: string;
          tamanho: string;
        };
        Update: {
          book_id?: string;
          conteudo?: Json;
          criado_em?: string;
          criado_por?: string | null;
          hash_prompts?: Json | null;
          id?: string;
          marcacoes?: Json;
          modelos?: Json | null;
          numero?: number;
          origem?: Database["public"]["Enums"]["versao_origem"];
          proposta_id?: string | null;
          restaurada_de?: number | null;
          story_id?: string;
          tamanho?: string;
        };
        Relationships: [];
      };
      transcripts: {
        Row: {
          book_id: string;
          criado_em: string;
          minutos: number;
          modelo: string;
          palavras: Json;
          provedor: string;
          recording_id: string;
          segmentos: Json;
        };
        Insert: {
          book_id: string;
          criado_em?: string;
          minutos: number;
          modelo: string;
          palavras: Json;
          provedor: string;
          recording_id: string;
          segmentos: Json;
        };
        Update: {
          book_id?: string;
          criado_em?: string;
          minutos?: number;
          modelo?: string;
          palavras?: Json;
          provedor?: string;
          recording_id?: string;
          segmentos?: Json;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_ativar_plano: {
        Args: { p_autor_nome: string; p_meses: number; p_responsavel: string };
        Returns: string;
      };
      admin_custos_por_livro: {
        Args: never;
        Returns: {
          book_id: string;
          chamadas: number;
          custo_usd: number;
          falhas: number;
          minutos_audio: number;
        }[];
      };
      admin_cotas_24h: {
        Args: { p_fracao: number };
        Returns: { book_id: string; minutos: number; pedidos: number }[];
      };
      admin_primeira_palavra: {
        Args: { p_desde: string; p_faixas_min: number[]; p_parada_ms: number };
        Returns: {
          esperas: number;
          faixa: number;
          p50_ms: number | null;
          p95_ms: number | null;
          paradas: number;
        }[];
      };
      admin_uso_por_dia: {
        Args: { p_ate: string; p_desde: string };
        Returns: {
          chamadas: number;
          custo_falhas_usd: number;
          custo_usd: number;
          dia: string;
          etapa: string;
          falhas: number;
          minutos_audio: number;
          modelo: string;
          repetidas: number;
          tokens_cache_gravado: number;
          tokens_cache_lido: number;
          tokens_entrada: number;
          tokens_saida: number;
        }[];
      };
      admin_listar_livros: {
        Args: never;
        Returns: {
          autor_nome: string | null;
          criado_em: string;
          id: string;
          plano_estado: Database["public"]["Enums"]["plano_estado"];
          plano_vence_em: string | null;
          responsavel_email: string | null;
        }[];
      };
      admin_renovar_plano: {
        Args: { p_livro: string; p_meses: number };
        Returns: string;
      };
      admin_trocar_responsavel: {
        Args: { p_livro: string; p_novo: string };
        Returns: undefined;
      };
      admin_usuario_por_email: { Args: { p_email: string }; Returns: string };
      autor_consentir: {
        Args: { p_token: string; p_versao: number };
        Returns: boolean;
      };
      autor_pagina: { Args: { p_token: string }; Returns: Json };
      autor_preparar_gravacao: {
        Args: {
          p_duracao_s: number;
          p_ext: string;
          p_id: string;
          p_prompt: string | null;
          p_tamanho_bytes: number;
          p_token: string;
        };
        Returns: Json;
      };
      enquete_abrir: {
        Args: { p_itens: Json; p_livro: string };
        Returns: string;
      };
      enquete_adicionar_item: {
        Args: { p_enquete: string; p_item: Json };
        Returns: string;
      };
      enquete_encerrar: { Args: { p_enquete: string }; Returns: undefined };
      enquete_remover_votos: {
        Args: { p_enquete: string; p_votante: string };
        Returns: number;
      };
      enquete_salvar: {
        Args: { p_enquete: string; p_itens: string[] };
        Returns: number;
      };
      familia_enviar_causo: {
        Args: {
          p_audio_tipo: string | null;
          p_consentimento: boolean;
          p_consentimento_versao: number;
          p_nome: string;
          p_texto: string | null;
          p_tipo?: Database["public"]["Enums"]["prompt_tipo"];
          p_token: string;
        };
        Returns: Json;
      };
      familia_pagina: {
        Args: { p_aparelho: string; p_token: string };
        Returns: Json;
      };
      familia_votar: {
        Args: {
          p_aparelho: string;
          p_itens: string[];
          p_nome: string;
          p_token: string;
        };
        Returns: Json;
      };
      servico_caminho_audio_causo: {
        Args: { p_causo: string; p_token: string };
        Returns: string | null;
      };
      servico_confirmar_audio: {
        Args: { p_id: string; p_tamanho_bytes: number };
        Returns: boolean;
      };
      servico_caminho_gravacao_autor: {
        Args: { p_id: string; p_token: string };
        Returns: string | null;
      };
      servico_confirmar_audio_causo: {
        Args: { p_causo: string; p_duracao_s: number; p_token: string };
        Returns: boolean;
      };
      servico_confirmar_gravacao_autor: {
        Args: { p_id: string; p_tamanho_bytes: number; p_token: string };
        Returns: boolean;
      };
      servico_trocar_link_autor: {
        Args: {
          p_chave_versao: number;
          p_id: string;
          p_livro: string;
          p_token_hash: string;
          p_usuario: string;
        };
        Returns: undefined;
      };
      servico_trocar_link_familia: {
        Args: {
          p_chave_versao: number;
          p_id: string;
          p_livro: string;
          p_token_hash: string;
          p_usuario: string;
        };
        Returns: undefined;
      };
      consentir_processamento_ia: {
        Args: { p_book: string; p_versao: number };
        Returns: boolean;
      };
      confirmar_divisao: {
        Args: { p_historias: Json; p_story: string };
        Returns: string[];
      };
      editar_historia: {
        Args: {
          p_story: string;
          p_aba: string;
          p_pegar?: boolean;
          p_assumir?: boolean;
        };
        Returns: {
          editando: boolean;
          outra_tela: boolean;
          nome: string | null;
        }[];
      };
      salvar_historia: {
        Args: {
          p_story: string;
          p_aba: string;
          p_rev: number;
          p_conteudo: Json;
          p_marcacoes: Json;
        };
        Returns: number;
      };
      parar_de_editar: {
        Args: { p_story: string; p_aba: string };
        Returns: undefined;
      };
      pedir_proposta: {
        Args: {
          p_story: string;
          p_aba: string;
          p_tipo: Database["public"]["Enums"]["proposta_tipo"];
          p_tamanho?: string | null;
          p_pedido?: Json;
        };
        Returns: string;
      };
      aplicar_proposta: {
        Args: {
          p_story: string;
          p_aba: string;
          p_rev: number;
          p_proposta: string;
          p_aplicadas: string[];
          p_conteudo: Json;
          p_marcacoes: Json;
        };
        Returns: number;
      };
      descartar_proposta: {
        Args: { p_story: string; p_aba: string; p_proposta: string };
        Returns: boolean;
      };
      servico_gravar_proposta: {
        Args: {
          p_proposta: string;
          p_mudancas: Json;
          p_ordem: string[] | null;
          p_marcacoes: Json;
          p_pronta: boolean;
          p_modelos?: Json | null;
          p_hash?: Json | null;
        };
        Returns: boolean;
      };
      servico_falhar_proposta: {
        Args: { p_proposta: string; p_erro: string };
        Returns: boolean;
      };
      restaurar_versao: {
        Args: { p_story: string; p_aba: string; p_numero: number };
        Returns: number;
      };
      marcar_historia_pronta: {
        Args: { p_story: string; p_pronta: boolean };
        Returns: boolean;
      };
      marcar_historia_vista: { Args: { p_story: string }; Returns: undefined };
      responder_sugestao: {
        Args: { p_aceitar: boolean; p_story: string };
        Returns: boolean;
      };
      servico_concluir_historia: {
        Args: {
          p_hash: Json;
          p_modelos: Json;
          p_story: string;
          p_tamanho: string;
        };
        Returns: boolean;
      };
      servico_iniciar_historia: {
        Args: { p_recording: string };
        Returns: {
          estado: Database["public"]["Enums"]["story_estado"] | null;
          historia: string | null;
          motivo: string | null;
        }[];
      };
      servico_mudar_etapa: {
        Args: {
          p_erro?: string;
          p_erro_etapa?: string;
          p_para: Database["public"]["Enums"]["story_estado"];
          p_story: string;
        };
        Returns: boolean;
      };
      servico_propor_divisao: {
        Args: { p_proposta: Json; p_story: string };
        Returns: boolean;
      };
      servico_sugerir_nomes: {
        Args: { p_nomes: Json; p_story: string };
        Returns: number;
      };
      servico_sugerir_pergunta: {
        Args: { p_prompt: string; p_story: string };
        Returns: boolean;
      };
      // ── Prompt 11 ──
      servico_pode_convidar: {
        Args: { p_email: string; p_livro: string; p_usuario: string };
        Returns: undefined;
      };
      servico_criar_convite: {
        Args: {
          p_chave_versao: number;
          p_email: string;
          p_id: string;
          p_livro: string;
          p_token_hash: string;
          p_usuario: string;
        };
        Returns: undefined;
      };
      // Convite pelo nome (P81, T59).
      servico_criar_convite_nome: {
        Args: {
          p_chave_versao: number;
          p_id: string;
          p_livro: string;
          p_nome: string;
          p_token_hash: string;
          p_usuario: string;
        };
        Returns: undefined;
      };
      servico_pode_definir_email: {
        Args: {
          p_dono_hash: string | null;
          p_email: string;
          p_token_hash: string;
        };
        Returns: string;
      };
      servico_definir_email_convite: {
        Args: { p_dono_hash: string; p_email: string; p_token_hash: string };
        Returns: string;
      };
      definir_e_aceitar_convite: {
        Args: { p_dono_hash?: string | null; p_token_hash: string };
        Returns: { definiu: boolean; livro_id: string }[];
      };
      servico_ler_convite: {
        Args: { p_dono_hash?: string | null; p_token_hash: string };
        Returns: {
          autor: string | null;
          book_id: string;
          convite_id: string;
          criado_por: string | null;
          e_dono: boolean;
          email: string | null;
          email_definido: boolean;
          estado: string;
          nome: string | null;
          trocas_restantes: number;
        }[];
      };
      meus_convites: {
        Args: never;
        Returns: {
          autor: string | null;
          book_id: string;
          convite_id: string;
          criado_por: string | null;
          expira_em: string;
        }[];
      };
      aceitar_convite: { Args: { p_convite: string }; Returns: string };
      cancelar_convite: { Args: { p_convite: string }; Returns: boolean };
      membros_do_livro: {
        Args: { p_livro: string };
        Returns: {
          criado_em: string;
          email: string | null;
          nome: string | null;
          papel: Database["public"]["Enums"]["papel_membro"];
          user_id: string;
        }[];
      };
      remover_membro: {
        Args: { p_livro: string; p_usuario: string };
        Returns: boolean;
      };
      sair_do_livro: { Args: { p_livro: string }; Returns: boolean };
      servico_compartilhar_historia: {
        Args: {
          p_chave_versao: number;
          p_id: string;
          p_story: string;
          p_token_hash: string;
          p_usuario: string;
        };
        Returns: { chave_versao: number; criado: boolean; id: string }[];
      };
      revogar_compartilhamento: { Args: { p_story: string }; Returns: boolean };
      servico_ler_compartilhada: {
        Args: { p_token_hash: string };
        Returns: Json;
      };
      servico_compartilhada_tocou: {
        Args: { p_chave: string; p_token_hash: string };
        Returns: boolean;
      };
      lembrar_pergunta: { Args: { p_prompt: string }; Returns: boolean };
      definir_resumo_semanal: {
        Args: { p_ligado: boolean; p_livro: string };
        Returns: boolean;
      };
      servico_desligar_resumo: { Args: { p_membro: string }; Returns: boolean };
      servico_livros_para_resumo: { Args: never; Returns: string[] };
      servico_membros_para_resumo: {
        Args: { p_livro: string };
        Returns: { membro_id: string; user_id: string }[];
      };
      servico_resumo_semanal: {
        Args: { p_livro: string };
        Returns: {
          historias_novas: number;
          paginas_estimadas: number;
          perguntas_esperando: number;
        }[];
      };
      criar_qr: {
        Args: { p_story: string };
        Returns: {
          audio_pronto: boolean;
          codigo: string;
          pedir_audio: boolean;
        }[];
      };
      desativar_qr: {
        Args: { p_codigo: string; p_desligar: boolean };
        Returns: boolean;
      };
      servico_ouvir_qr: {
        Args: { p_chave: string; p_codigo: string };
        Returns: Json;
      };
      servico_qr_audio_pronto: {
        Args: {
          p_caminho: string;
          p_codigo: string;
          p_duracao_s: number;
          p_fonte: string;
        };
        Returns: {
          anterior: string | null;
          gravado: boolean;
        }[];
      };
      servico_qr_tocou: {
        Args: { p_chave: string; p_codigo: string };
        Returns: boolean;
      };
      servico_qr_trechos: {
        Args: { p_codigo: string };
        Returns: Json;
      };
      servico_qr_limpar_consultas: {
        Args: never;
        Returns: number;
      };
      historia_arquivar: {
        Args: { p_arquivar: boolean; p_book: string; p_id: string };
        Returns: undefined;
      };
      audio_arquivar: {
        Args: { p_arquivar: boolean; p_book: string; p_id: string };
        Returns: boolean;
      };
      // ── Prompt 13: montar e publicar ──
      montagem_conteudo: { Args: { p_book: string }; Returns: Json };
      montagem_reservar_uso: { Args: { p_book: string }; Returns: boolean };
      montagem_salvar: {
        Args: {
          p_book: string;
          p_capa_cor: string;
          p_capa_foco_x: number;
          p_capa_foco_y: number;
          p_capa_foto: string | null;
          p_dedicatoria: string | null;
          p_fora: string[];
          p_ordem_historias: string[];
          p_ordem_mensagens: string[];
          p_rev: number;
          p_subtitulo: string | null;
          p_titulo: string | null;
        };
        Returns: number;
      };
      publicar_livro: {
        Args: { p_book: string; p_hash: string };
        Returns: { export_id: string; pedir_audio: string[]; versao: number }[];
      };
      servico_export_conteudo: {
        Args: { p_id: string };
        Returns: {
          book_id: string;
          conteudo: Json;
          criado_em: string;
          estado: "gerando" | "pronta" | "falhou";
          versao: number;
        }[];
      };
      servico_export_pronto: {
        Args: {
          p_capa_bytes: number;
          p_espec: Json;
          p_lombada_mm: number;
          p_miolo_bytes: number;
          p_paginas: number;
          p_pasta: string;
          p_qr_conferidos: number;
          p_id: string;
        };
        Returns: boolean;
      };
      servico_export_falhou: {
        Args: { p_erro: string; p_id: string };
        Returns: boolean;
      };
      // ── Prompt 12: mensagens da família ──
      servico_mensagem_pagina: { Args: { p_token: string }; Returns: Json };
      servico_mensagem_criar: {
        Args: {
          p_aparelho: string;
          p_audio_tipo: string | null;
          p_consentimento: boolean;
          p_consentimento_versao: number;
          p_foto: boolean;
          p_nome: string;
          p_relacao: string;
          p_token: string;
        };
        Returns: Json;
      };
      servico_mensagem_enviar: {
        Args: {
          p_aparelho: string;
          p_id: string;
          p_texto: string;
          p_token: string;
        };
        Returns: Json;
      };
      servico_caminho_mensagem: {
        Args: {
          p_aparelho: string;
          p_id: string;
          p_tipo: string;
          p_token: string;
        };
        Returns: string | null;
      };
      servico_confirmar_audio_mensagem: {
        Args: {
          p_aparelho: string;
          p_duracao_s: number;
          p_id: string;
          p_token: string;
        };
        Returns: boolean;
      };
      servico_confirmar_foto_mensagem: {
        Args: { p_aparelho: string; p_id: string; p_token: string };
        Returns: boolean;
      };
      servico_mensagem_reservar_transcricao: {
        Args: { p_aparelho: string; p_id: string; p_token: string };
        Returns: Json;
      };
      servico_mensagem_transcrita: {
        Args: {
          p_aparelho: string;
          p_fim_s: number;
          p_id: string;
          p_reserva: string;
          p_texto: string;
          p_token: string;
        };
        Returns: string;
      };
      servico_mensagem_transcricao_falhou: {
        Args: {
          p_aparelho: string;
          p_id: string;
          p_reserva: string;
          p_token: string;
        };
        Returns: undefined;
      };
      servico_trocar_link_mensagem: {
        Args: {
          p_chave_versao: number;
          p_id: string;
          p_livro: string;
          p_token_hash: string;
          p_usuario: string;
        };
        Returns: undefined;
      };
      servico_mensagem_rascunhos_vencidos: {
        Args: { p_limite: number };
        Returns: {
          audio_caminho: string | null;
          foto_caminho: string | null;
          id: string;
        }[];
      };
      servico_mensagem_apagar_rascunhos: {
        Args: { p_ids: string[] };
        Returns: number;
      };
      mensagem_editar: {
        Args: { p_id: string; p_texto: string };
        Returns: undefined;
      };
      mensagem_no_livro: {
        Args: { p_id: string; p_incluir: boolean };
        Returns: undefined;
      };
      mensagem_arquivar: {
        Args: { p_arquivar: boolean; p_id: string };
        Returns: undefined;
      };
      mensagem_apagar: {
        Args: { p_id: string };
        Returns: {
          audio_caminho: string | null;
          foto_caminho: string | null;
        }[];
      };
    };
    Enums: {
      glossario_estado: "sugerido" | "aceito" | "recusado";
      glossario_tipo: "pessoa" | "lugar";
      story_estado:
        | "ouvindo"
        | "escrevendo"
        | "pronta"
        | "falhou"
        | "dividindo"
        | "separar";
      versao_origem: "ia" | "responsavel" | "cofacilitador" | "autor";
      proposta_tipo: "tamanho" | "trecho" | "audio";
      proposta_estado:
        "gerando" | "pronta" | "aplicada" | "descartada" | "falhou";
      ator_tipo:
        | "responsavel"
        | "cofacilitador"
        | "autor"
        | "familia"
        | "admin"
        | "sistema";
      causo_estado: "novo" | "virou_pergunta" | "na_enquete" | "arquivado";
      enquete_estado: "aberta" | "encerrada";
      papel_membro: "responsavel" | "cofacilitador";
      parentesco: "pai" | "mae" | "avo" | "avoa" | "tio" | "tia" | "outro";
      plano_estado: "pendente" | "ativo" | "somente_leitura";
      prompt_estado: "para_enviar" | "enviada" | "respondida" | "pulada";
      prompt_origem: "banco" | "propria" | "causo" | "enquete";
      prompt_tipo: "pergunta" | "causo";
      recording_origem: "autor" | "livre" | "conversa" | "upload" | "lote";
      recording_upload: "enviando" | "recebido";
      mensagem_estado: "rascunho" | "enviada" | "arquivada";
      export_estado: "gerando" | "pronta" | "falhou";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type Enums = Database["public"]["Enums"];
export type PlanoEstado = Enums["plano_estado"];
export type PapelMembro = Enums["papel_membro"];
export type AtorTipo = Enums["ator_tipo"];
export type Parentesco = Enums["parentesco"];
export type PromptTipo = Enums["prompt_tipo"];
export type PromptOrigem = Enums["prompt_origem"];
export type PromptEstado = Enums["prompt_estado"];
export type CausoEstado = Enums["causo_estado"];
export type EnqueteEstado = Enums["enquete_estado"];
export type RecordingOrigem = Enums["recording_origem"];
export type RecordingUpload = Enums["recording_upload"];
export type MensagemEstado = Enums["mensagem_estado"];

export const PARENTESCOS: readonly Parentesco[] = [
  "pai",
  "mae",
  "avo",
  "avoa",
  "tio",
  "tia",
  "outro",
];
