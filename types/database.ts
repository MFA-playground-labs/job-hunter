// Hand-written to match supabase/migrations/20260718000001_init_schema.sql,
// shaped to mirror the exact output of `supabase gen types typescript`
// (Tables/Views/Functions/Enums/CompositeTypes + per-table Relationships) so
// it satisfies @supabase/postgrest-js's GenericSchema constraint.
//
// This is an interim stand-in for `supabase gen types typescript --local`
// (or `--linked` against a real project). Docker isn't installed on this
// machine, so there's no local Supabase instance to generate from yet.
// Regenerate this file for real once either is available, and delete this
// comment when you do.

export type InteractionType = "message" | "call" | "email";

export type ApplicationStage =
  | "discovered"
  | "interested"
  | "applied"
  | "interviewing"
  | "offer"
  | "closed_won"
  | "closed_lost"
  | "withdrawn";

export type FactCategory =
  | "scope"
  | "method"
  | "outcome"
  | "artifact"
  | "tradeoff"
  | "domain"
  | "gap";

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          tier: string | null;
          funding_stage: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          tier?: string | null;
          funding_stage?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          tier?: string | null;
          funding_stage?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          owner_id: string;
          company_id: string;
          title: string;
          jd_text: string | null;
          source_url: string | null;
          first_seen: string;
          last_seen: string;
          status: string | null;
          comp_score: number | null;
          brand_score: number | null;
          exit_score: number | null;
          content_score: number | null;
          composite_score: number | null;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          company_id: string;
          title: string;
          jd_text?: string | null;
          source_url?: string | null;
          first_seen?: string;
          last_seen?: string;
          status?: string | null;
          comp_score?: number | null;
          brand_score?: number | null;
          exit_score?: number | null;
          content_score?: number | null;
          composite_score?: number | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          company_id?: string;
          title?: string;
          jd_text?: string | null;
          source_url?: string | null;
          first_seen?: string;
          last_seen?: string;
          status?: string | null;
          comp_score?: number | null;
          brand_score?: number | null;
          exit_score?: number | null;
          content_score?: number | null;
          composite_score?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "roles_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      contacts: {
        Row: {
          id: string;
          owner_id: string;
          company_id: string | null;
          name: string;
          relationship_strength: number | null;
          last_contact_date: string | null;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          company_id?: string | null;
          name: string;
          relationship_strength?: number | null;
          last_contact_date?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          company_id?: string | null;
          name?: string;
          relationship_strength?: number | null;
          last_contact_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      interactions: {
        Row: {
          id: string;
          owner_id: string;
          contact_id: string;
          type: InteractionType;
          date: string;
          notes: string | null;
          thread_status: string | null;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          contact_id: string;
          type: InteractionType;
          date: string;
          notes?: string | null;
          thread_status?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          contact_id?: string;
          type?: InteractionType;
          date?: string;
          notes?: string | null;
          thread_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "interactions_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          },
        ];
      };
      resume_versions: {
        Row: {
          id: string;
          owner_id: string;
          role_id: string;
          content: string | null;
          tailoring_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          role_id: string;
          content?: string | null;
          tailoring_notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          role_id?: string;
          content?: string | null;
          tailoring_notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resume_versions_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
        ];
      };
      applications: {
        Row: {
          id: string;
          owner_id: string;
          role_id: string;
          resume_version_id: string | null;
          stage: ApplicationStage;
          applied_date: string | null;
          next_action: string | null;
          next_action_date: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          role_id: string;
          resume_version_id?: string | null;
          stage?: ApplicationStage;
          applied_date?: string | null;
          next_action?: string | null;
          next_action_date?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          role_id?: string;
          resume_version_id?: string | null;
          stage?: ApplicationStage;
          applied_date?: string | null;
          next_action?: string | null;
          next_action_date?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_resume_version_id_fkey";
            columns: ["resume_version_id"];
            isOneToOne: false;
            referencedRelation: "resume_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      facts: {
        Row: {
          id: string;
          owner_id: string;
          category: FactCategory;
          subject_role: string | null;
          fact_text: string;
          verified_date: string | null;
          source_session: string | null;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          category: FactCategory;
          subject_role?: string | null;
          fact_text: string;
          verified_date?: string | null;
          source_session?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          category?: FactCategory;
          subject_role?: string | null;
          fact_text?: string;
          verified_date?: string | null;
          source_session?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type Role = Database["public"]["Tables"]["roles"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type Interaction = Database["public"]["Tables"]["interactions"]["Row"];
export type ResumeVersion = Database["public"]["Tables"]["resume_versions"]["Row"];
export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type Fact = Database["public"]["Tables"]["facts"]["Row"];
