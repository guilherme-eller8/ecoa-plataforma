// Gerado por `generate_typescript_types` do projeto ecoa-plataforma (sa-east-1).
// Ajuste manual: em admin_listar_livros, autor_nome, passe_vence_em e responsavel_email
// podem ser nulos (left join e livro sem nome do autor). Regerar após cada migration.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
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
          autor_nome: string | null;
          criado_em: string;
          id: string;
          passe_ativado_em: string | null;
          passe_estado: Database["public"]["Enums"]["passe_estado"];
          passe_vence_em: string | null;
        };
        Insert: {
          atualizado_em?: string;
          autor_nome?: string | null;
          criado_em?: string;
          id?: string;
          passe_ativado_em?: string | null;
          passe_estado?: Database["public"]["Enums"]["passe_estado"];
          passe_vence_em?: string | null;
        };
        Update: {
          atualizado_em?: string;
          autor_nome?: string | null;
          criado_em?: string;
          id?: string;
          passe_ativado_em?: string | null;
          passe_estado?: Database["public"]["Enums"]["passe_estado"];
          passe_vence_em?: string | null;
        };
        Relationships: [];
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_ativar_passe: {
        Args: { p_autor_nome: string; p_meses: number; p_responsavel: string };
        Returns: string;
      };
      admin_listar_livros: {
        Args: never;
        Returns: {
          autor_nome: string | null;
          criado_em: string;
          id: string;
          passe_estado: Database["public"]["Enums"]["passe_estado"];
          passe_vence_em: string | null;
          responsavel_email: string | null;
        }[];
      };
      admin_renovar_passe: {
        Args: { p_livro: string; p_meses: number };
        Returns: string;
      };
      admin_trocar_responsavel: {
        Args: { p_livro: string; p_novo: string };
        Returns: undefined;
      };
      admin_usuario_por_email: {
        Args: { p_email: string };
        Returns: string | null;
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
      papel_membro: "responsavel" | "cofacilitador";
      passe_estado: "pendente" | "ativo" | "somente_leitura";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type PasseEstado = Database["public"]["Enums"]["passe_estado"];
export type PapelMembro = Database["public"]["Enums"]["papel_membro"];
export type AtorTipo = Database["public"]["Enums"]["ator_tipo"];
