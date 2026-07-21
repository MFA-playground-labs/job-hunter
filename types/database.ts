// Hand-written to match supabase/migrations/20260718120000_careeros_schema.sql,
// shaped to mirror the exact output of `supabase gen types typescript`
// (Tables/Views/Functions/Enums/CompositeTypes + per-table Relationships) so
// it satisfies @supabase/postgrest-js's GenericSchema constraint.
//
// This is an interim stand-in for `supabase gen types typescript --local`
// (or `--linked` against a real project). Docker isn't installed on this
// machine, so there's no local Supabase instance to generate from yet.
// Regenerate this file for real once either is available, and delete this
// comment when you do.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type CompanyTier = "target_1" | "target_2" | "broad" | "watch";
export type CompanySource = "manual" | "funding_scan" | "seed";
export type AtsType = "greenhouse" | "ashby" | "lever" | "workday" | "custom";

export type JobSource = "greenhouse" | "ashby" | "lever" | "workday" | "custom" | "manual" | "funding_scan" | "cowork";
export type JobStatus =
  | "new"
  | "interested"
  | "passed"
  | "applied"
  | "interviewing"
  | "offer"
  | "rejected"
  | "closed";
export type PassReason =
  | "comp_too_low"
  | "brand_mismatch"
  | "wrong_scope"
  | "location"
  | "domain"
  | "other";

export type RoleContext = "ADP" | "EY-Parthenon" | "Accenture" | "cross-cutting";
export type FactCategory =
  | "scope"
  | "method"
  | "outcome"
  | "artifact"
  | "tradeoff"
  | "domain"
  | "gap"
  | "preference";
export type FactStatus = "proposed" | "verified" | "corrected" | "retired";
export type FactSource =
  | "interview"
  | "obsidian"
  | "resume"
  | "scan_feedback"
  | "seed"
  | "manual"
  | "edit_mining";

export type ResumeCreatedBy = "user" | "ai";

export type SessionType =
  | "coach"
  | "interview"
  | "tailoring"
  | "teardown"
  | "job_scan"
  | "funding_scan"
  | "fact_import"
  | "playbook_import"
  | "edit_mining"
  | "outcome_synthesis";

export type OutreachChannel = "linkedin" | "email" | "intro" | "other";
export type OutreachStatus =
  | "suggested"
  | "drafted"
  | "sent"
  | "replied"
  | "meeting"
  | "dormant"
  | "closed";

export type PlaybookModule =
  | "tailoring"
  | "interviewer"
  | "teardown"
  | "fact_capture"
  | "job_hunter"
  | "career_coach"
  | "outreach";

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          ats_slug: string | null;
          ats_type: AtsType | null;
          tier: CompanyTier;
          source: CompanySource;
          sector: string | null;
          company_type: string | null;
          funding_stage: string | null;
          last_funding_at: string | null;
          funding_source_url: string | null;
          fit_rationale: string | null;
          ats_last_status: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          ats_slug?: string | null;
          ats_type?: AtsType | null;
          tier?: CompanyTier;
          source?: CompanySource;
          sector?: string | null;
          company_type?: string | null;
          funding_stage?: string | null;
          last_funding_at?: string | null;
          funding_source_url?: string | null;
          fit_rationale?: string | null;
          ats_last_status?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          ats_slug?: string | null;
          ats_type?: AtsType | null;
          tier?: CompanyTier;
          source?: CompanySource;
          sector?: string | null;
          company_type?: string | null;
          funding_stage?: string | null;
          last_funding_at?: string | null;
          funding_source_url?: string | null;
          fit_rationale?: string | null;
          ats_last_status?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      jobs: {
        Row: {
          id: string;
          owner_id: string;
          company_id: string | null;
          title: string;
          url: string;
          source: JobSource;
          location: string | null;
          level_signal: string | null;
          comp_range: string | null;
          comp_is_estimate: boolean;
          jd_text: string | null;
          jd_embedding: string | null;
          scanned_at: string | null;
          posting_id: string | null;
          content_hash: string | null;
          first_seen_at: string | null;
          last_seen_at: string | null;
          status: JobStatus;
          pass_reason: PassReason | null;
          pass_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          company_id?: string | null;
          title: string;
          url: string;
          source?: JobSource;
          location?: string | null;
          level_signal?: string | null;
          comp_range?: string | null;
          comp_is_estimate?: boolean;
          jd_text?: string | null;
          jd_embedding?: string | null;
          scanned_at?: string | null;
          posting_id?: string | null;
          content_hash?: string | null;
          first_seen_at?: string | null;
          last_seen_at?: string | null;
          status?: JobStatus;
          pass_reason?: PassReason | null;
          pass_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          company_id?: string | null;
          title?: string;
          url?: string;
          source?: JobSource;
          location?: string | null;
          level_signal?: string | null;
          comp_range?: string | null;
          comp_is_estimate?: boolean;
          jd_text?: string | null;
          jd_embedding?: string | null;
          scanned_at?: string | null;
          posting_id?: string | null;
          content_hash?: string | null;
          first_seen_at?: string | null;
          last_seen_at?: string | null;
          status?: JobStatus;
          pass_reason?: PassReason | null;
          pass_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      calibrations: {
        Row: {
          id: string;
          owner_id: string;
          label: string;
          total_comp_floor: number | null;
          base_floor: number | null;
          brand_weight: number;
          exit_weight: number;
          excluded_domains: string[];
          location_policy: "remote_only" | "remote_preferred" | "nyc_or_remote" | "flexible";
          comp_structure_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          label: string;
          total_comp_floor?: number | null;
          base_floor?: number | null;
          brand_weight?: number;
          exit_weight?: number;
          excluded_domains?: string[];
          location_policy?: "remote_only" | "remote_preferred" | "nyc_or_remote" | "flexible";
          comp_structure_note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          label?: string;
          total_comp_floor?: number | null;
          base_floor?: number | null;
          brand_weight?: number;
          exit_weight?: number;
          excluded_domains?: string[];
          location_policy?: "remote_only" | "remote_preferred" | "nyc_or_remote" | "flexible";
          comp_structure_note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      job_scores: {
        Row: {
          id: string;
          owner_id: string;
          job_id: string;
          calibration_id: string | null;
          composite: number;
          comp_fit: number;
          brand: number;
          exit_opportunity: number;
          role_content_fit: number;
          rationale: string;
          model: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          job_id: string;
          calibration_id?: string | null;
          composite: number;
          comp_fit: number;
          brand: number;
          exit_opportunity: number;
          role_content_fit: number;
          rationale: string;
          model: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          job_id?: string;
          calibration_id?: string | null;
          composite?: number;
          comp_fit?: number;
          brand?: number;
          exit_opportunity?: number;
          role_content_fit?: number;
          rationale?: string;
          model?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_scores_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "job_scores_calibration_id_fkey";
            columns: ["calibration_id"];
            isOneToOne: false;
            referencedRelation: "calibrations";
            referencedColumns: ["id"];
          },
        ];
      };
      facts: {
        Row: {
          id: string;
          owner_id: string;
          role_context: RoleContext;
          category: FactCategory;
          body: string;
          status: FactStatus;
          source: FactSource;
          verified_at: string | null;
          embedding: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          role_context?: RoleContext;
          category: FactCategory;
          body: string;
          status?: FactStatus;
          source?: FactSource;
          verified_at?: string | null;
          embedding?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          role_context?: RoleContext;
          category?: FactCategory;
          body?: string;
          status?: FactStatus;
          source?: FactSource;
          verified_at?: string | null;
          embedding?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      fact_corrections: {
        Row: {
          id: string;
          owner_id: string;
          old_fact_id: string;
          new_fact_id: string;
          reason: string;
          corrected_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          old_fact_id: string;
          new_fact_id: string;
          reason: string;
          corrected_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          old_fact_id?: string;
          new_fact_id?: string;
          reason?: string;
          corrected_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fact_corrections_old_fact_id_fkey";
            columns: ["old_fact_id"];
            isOneToOne: false;
            referencedRelation: "facts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fact_corrections_new_fact_id_fkey";
            columns: ["new_fact_id"];
            isOneToOne: false;
            referencedRelation: "facts";
            referencedColumns: ["id"];
          },
        ];
      };
      resumes: {
        Row: {
          id: string;
          owner_id: string;
          master: boolean;
          target_job_id: string | null;
          label: string;
          body: string;
          derived_from: string | null;
          ats_keyword_report: Json | null;
          created_by: ResumeCreatedBy;
          model: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          master?: boolean;
          target_job_id?: string | null;
          label: string;
          body: string;
          derived_from?: string | null;
          ats_keyword_report?: Json | null;
          created_by?: ResumeCreatedBy;
          model?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          master?: boolean;
          target_job_id?: string | null;
          label?: string;
          body?: string;
          derived_from?: string | null;
          ats_keyword_report?: Json | null;
          created_by?: ResumeCreatedBy;
          model?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resumes_target_job_id_fkey";
            columns: ["target_job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resumes_derived_from_fkey";
            columns: ["derived_from"];
            isOneToOne: false;
            referencedRelation: "resumes";
            referencedColumns: ["id"];
          },
        ];
      };
      applications: {
        Row: {
          id: string;
          owner_id: string;
          job_id: string;
          resume_id: string | null;
          applied_at: string | null;
          outcome_events: Json;
          outcome_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          job_id: string;
          resume_id?: string | null;
          applied_at?: string | null;
          outcome_events?: Json;
          outcome_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          job_id?: string;
          resume_id?: string | null;
          applied_at?: string | null;
          outcome_events?: Json;
          outcome_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_resume_id_fkey";
            columns: ["resume_id"];
            isOneToOne: false;
            referencedRelation: "resumes";
            referencedColumns: ["id"];
          },
        ];
      };
      funding_events: {
        Row: {
          id: string;
          owner_id: string;
          company_id: string | null;
          company_name: string;
          round: string | null;
          amount: string | null;
          sector: string | null;
          announced_at: string | null;
          source_url: string;
          relevance_score: number | null;
          fit_evaluated: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          company_id?: string | null;
          company_name: string;
          round?: string | null;
          amount?: string | null;
          sector?: string | null;
          announced_at?: string | null;
          source_url: string;
          relevance_score?: number | null;
          fit_evaluated?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          company_id?: string | null;
          company_name?: string;
          round?: string | null;
          amount?: string | null;
          sector?: string | null;
          announced_at?: string | null;
          source_url?: string;
          relevance_score?: number | null;
          fit_evaluated?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "funding_events_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      sessions: {
        Row: {
          id: string;
          owner_id: string;
          type: SessionType;
          transcript: Json;
          fact_proposals: Json;
          model_costs: Json;
          summary: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          type: SessionType;
          transcript?: Json;
          fact_proposals?: Json;
          model_costs?: Json;
          summary?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          type?: SessionType;
          transcript?: Json;
          fact_proposals?: Json;
          model_costs?: Json;
          summary?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      obsidian_notes: {
        Row: {
          id: string;
          owner_id: string;
          path: string;
          frontmatter: Json | null;
          body: string | null;
          content_hash: string;
          synced_at: string;
          processed: boolean;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          path: string;
          frontmatter?: Json | null;
          body?: string | null;
          content_hash: string;
          synced_at?: string;
          processed?: boolean;
        };
        Update: {
          id?: string;
          owner_id?: string;
          path?: string;
          frontmatter?: Json | null;
          body?: string | null;
          content_hash?: string;
          synced_at?: string;
          processed?: boolean;
        };
        Relationships: [];
      };
      outreach: {
        Row: {
          id: string;
          owner_id: string;
          contact: string;
          company_id: string | null;
          channel: OutreachChannel | null;
          status: OutreachStatus;
          notes: string | null;
          last_touch: string | null;
          next_follow_up: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          contact: string;
          company_id?: string | null;
          channel?: OutreachChannel | null;
          status?: OutreachStatus;
          notes?: string | null;
          last_touch?: string | null;
          next_follow_up?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          contact?: string;
          company_id?: string | null;
          channel?: OutreachChannel | null;
          status?: OutreachStatus;
          notes?: string | null;
          last_touch?: string | null;
          next_follow_up?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outreach_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
        ];
      };
      playbooks: {
        Row: {
          id: string;
          owner_id: string;
          slug: string;
          module: PlaybookModule;
          title: string;
          body: string;
          content_hash: string;
          source_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          slug: string;
          module: PlaybookModule;
          title: string;
          body: string;
          content_hash: string;
          source_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          slug?: string;
          module?: PlaybookModule;
          title?: string;
          body?: string;
          content_hash?: string;
          source_path?: string | null;
          created_at?: string;
          updated_at?: string;
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
export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type Calibration = Database["public"]["Tables"]["calibrations"]["Row"];
export type JobScore = Database["public"]["Tables"]["job_scores"]["Row"];
export type Fact = Database["public"]["Tables"]["facts"]["Row"];
export type FactCorrection = Database["public"]["Tables"]["fact_corrections"]["Row"];
export type Resume = Database["public"]["Tables"]["resumes"]["Row"];
export type Application = Database["public"]["Tables"]["applications"]["Row"];
export type FundingEvent = Database["public"]["Tables"]["funding_events"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type ObsidianNote = Database["public"]["Tables"]["obsidian_notes"]["Row"];
export type Outreach = Database["public"]["Tables"]["outreach"]["Row"];
export type Playbook = Database["public"]["Tables"]["playbooks"]["Row"];

// Shape of one entry in sessions.model_costs.
export interface ModelCostEntry {
  model: string;
  task: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_usd: number;
  at: string;
}

// Shape of one entry in applications.outcome_events.
export interface OutcomeEvent {
  type: "response" | "screen" | "onsite" | "offer" | "rejection";
  at: string;
  note?: string;
}
