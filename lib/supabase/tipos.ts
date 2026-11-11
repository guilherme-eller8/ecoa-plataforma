// Gerado por `generate_typescript_types` do projeto ecoa-plataforma (sa-east-1).
// Regerar após cada migration. Ajustes manuais (o gerador não sabe que podem ser nulos):
// - admin_listar_livros: autor_nome, plano_vence_em e responsavel_email (left join).
// - familia_enviar_causo: p_texto e p_audio_tipo (um ou outro).
// - servico_caminho_audio_causo: devolve null quando o causo não aceita upload.
// - familia_pagina, familia_votar, familia_enviar_causo: retorno tipado em lib/familia/tipos.ts.
// - autor_preparar_gravacao: p_prompt (história livre); servico_caminho_gravacao_autor devolve null.
// - autor_pagina, autor_preparar_gravacao: retorno tipado em lib/autor/tipos.ts.
// - servico_iniciar_historia: historia, estado e motivo (um ou outro é null).

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
          etapa: string;
          id: number;
          id_requisicao: string | null;
          minutos_audio: number | null;
          modelo: string;
          ms: number | null;
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
          etapa: string;
          id?: number;
          id_requisicao?: string | null;
          minutos_audio?: number | null;
          modelo: string;
          ms?: number | null;
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
          etapa?: string;
          id?: number;
          id_requisicao?: string | null;
          minutos_audio?: number | null;
          modelo?: string;
          ms?: number | null;
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
      book_members: {
        Row: {
          book_id: string;
          criado_em: string;
          id: string;
          papel: Database["public"]["Enums"]["papel_membro"];
          user_id: string;
        };
        Insert: {
          book_id: string;
          criado_em?: string;
          id?: string;
          papel: Database["public"]["Enums"]["papel_membro"];
          user_id: string;
        };
        Update: {
          book_id?: string;
          criado_em?: string;
          id?: string;
          papel?: Database["public"]["Enums"]["papel_membro"];
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
      recordings: {
        Row: {
          author_access_id: string | null;
          lote_id: string | null;
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
          atualizado_em: string;
          book_id: string;
          criado_em: string;
          erro: string | null;
          erro_etapa: string | null;
          estado: Database["public"]["Enums"]["story_estado"];
          estrutura: Json | null;
          id: string;
          prompt_id: string | null;
          pronta_em: string | null;
          rascunho: Json | null;
          titulo: string | null;
          vista_em: string | null;
        };
        Insert: {
          atualizado_em?: string;
          book_id: string;
          criado_em?: string;
          erro?: string | null;
          erro_etapa?: string | null;
          estado?: Database["public"]["Enums"]["story_estado"];
          estrutura?: Json | null;
          id?: string;
          prompt_id?: string | null;
          pronta_em?: string | null;
          rascunho?: Json | null;
          titulo?: string | null;
          vista_em?: string | null;
        };
        Update: {
          atualizado_em?: string;
          book_id?: string;
          criado_em?: string;
          erro?: string | null;
          erro_etapa?: string | null;
          estado?: Database["public"]["Enums"]["story_estado"];
          estrutura?: Json | null;
          id?: string;
          prompt_id?: string | null;
          pronta_em?: string | null;
          rascunho?: Json | null;
          titulo?: string | null;
          vista_em?: string | null;
        };
        Relationships: [];
      };
      story_recordings: {
        Row: {
          book_id: string;
          ordem: number;
          recording_id: string;
          segmento_inicial: number;
          story_id: string;
        };
        Insert: {
          book_id: string;
          ordem: number;
          recording_id: string;
          segmento_inicial?: number;
          story_id: string;
        };
        Update: {
          book_id?: string;
          ordem?: number;
          recording_id?: string;
          segmento_inicial?: number;
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
      marcar_historia_vista: { Args: { p_story: string }; Returns: undefined };
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
      servico_sugerir_nomes: {
        Args: { p_nomes: Json; p_story: string };
        Returns: number;
      };
    };
    Enums: {
      glossario_estado: "sugerido" | "aceito" | "recusado";
      glossario_tipo: "pessoa" | "lugar";
      story_estado: "ouvindo" | "escrevendo" | "pronta" | "falhou";
      versao_origem: "ia" | "responsavel" | "cofacilitador" | "autor";
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

export const PARENTESCOS: readonly Parentesco[] = [
  "pai",
  "mae",
  "avo",
  "avoa",
  "tio",
  "tia",
  "outro",
];
