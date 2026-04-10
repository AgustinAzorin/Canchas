export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      canchas: {
        Row: {
          id: string;
          nombre: string;
          direccion: string | null;
          tipo_cancha: number;
          ubicacion: unknown;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          direccion?: string | null;
          tipo_cancha: number;
          ubicacion: unknown;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          direccion?: string | null;
          tipo_cancha?: number;
          ubicacion?: unknown;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_canchas_cercanas: {
        Args: {
          lat: number;
          lng: number;
          radius_m: number;
          tipos: number[] | null;
        };
        Returns: {
          id: string;
          nombre: string | null;
          direccion: string | null;
          tipo_cancha: number | null;
          lat: number;
          lng: number;
          distancia_m: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}