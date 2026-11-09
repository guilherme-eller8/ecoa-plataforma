// Gerado por `generate_typescript_types` do projeto ecoa-plataforma (sa-east-1).
// Regerar após cada migration. Ajustes manuais (o gerador não sabe que podem ser nulos):
// - admin_listar_livros: autor_nome, plano_vence_em e responsavel_email (left join).
// - familia_enviar_causo: p_texto e p_audio_tipo (um ou outro).
// - servico_caminho_audio_causo: devolve null quando o causo não aceita upload.
// - familia_pagina, familia_votar, familia_enviar_causo: retorno tipado em lib/familia/tipos.ts.

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
      author_access: {
        Row: {
          book_id: string;
          criado_em: string;
          criado_por: string | null;
          id: string;
          revogado_em: string | null;
          token_hash: string;
        };
        Insert: {
          book_id: string;
          criado_em?: string;
          criado_por?: string | null;
          id?: string;
          revogado_em?: string | null;
          token_hash: string;
        };
        Update: {
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
          atualizado_em: string;
          autor_apelido: string | null;
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
          atualizado_em?: string;
          autor_apelido?: string | null;
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
          atualizado_em?: string;
          autor_apelido?: string | null;
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
      servico_confirmar_audio_causo: {
        Args: { p_causo: string; p_duracao_s: number; p_token: string };
        Returns: boolean;
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
    };
    Enums: {
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

export const PARENTESCOS: readonly Parentesco[] = [
  "pai",
  "mae",
  "avo",
  "avoa",
  "tio",
  "tia",
  "outro",
];
