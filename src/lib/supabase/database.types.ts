/**
 * Database types matching supabase/migrations. Regenerate from a live project
 * with `npm run db:types` once the Supabase CLI is linked.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProjectStatus =
  | "planning"
  | "in_progress"
  | "review"
  | "completed"
  | "archived";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          job_title: string | null;
          company: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          job_title?: string | null;
          company?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          full_name?: string | null;
          job_title?: string | null;
          company?: string | null;
          avatar_url?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          client: string | null;
          industry: string | null;
          project_type: string;
          product_service: string | null;
          target_audience: string | null;
          research_objectives: string | null;
          status: ProjectStatus;
          previous_status: Exclude<ProjectStatus, "archived"> | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          description?: string | null;
          client?: string | null;
          industry?: string | null;
          project_type?: string;
          product_service?: string | null;
          target_audience?: string | null;
          research_objectives?: string | null;
          status?: ProjectStatus;
          previous_status?: Exclude<ProjectStatus, "archived"> | null;
          archived_at?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          client?: string | null;
          industry?: string | null;
          project_type?: string;
          product_service?: string | null;
          target_audience?: string | null;
          research_objectives?: string | null;
          status?: ProjectStatus;
          previous_status?: Exclude<ProjectStatus, "archived"> | null;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: "editor" | "viewer";
          created_at: string;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      project_settings: {
        Row: {
          id: string;
          project_id: string;
          preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: { project_id: string; preferences?: Json };
        Update: { preferences?: Json };
        Relationships: [];
      };
      research_plans: {
        Row: {
          id: string;
          owner_id: string;
          project_id: string;
          title: string;
          status: "draft" | "completed";
          current_step: number;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          project_id: string;
          title: string;
          status?: "draft" | "completed";
          current_step?: number;
          completed_at?: string | null;
        };
        Update: {
          project_id?: string;
          title?: string;
          status?: "draft" | "completed";
          current_step?: number;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      research_plan_sections: {
        Row: {
          id: string;
          plan_id: string;
          key: string;
          position: number;
          content: Json;
          source: "manual" | "template" | "ai";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          plan_id: string;
          key: string;
          position?: number;
          content?: Json;
          source?: "manual" | "template" | "ai";
        };
        Update: {
          position?: number;
          content?: Json;
          source?: "manual" | "template" | "ai";
        };
        Relationships: [];
      };
      personas: {
        Row: {
          id: string;
          owner_id: string;
          project_id: string;
          name: string;
          persona_type: "research_backed" | "hypothesis" | "proto";
          status: "draft" | "completed";
          current_step: number;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          project_id: string;
          name: string;
          persona_type?: "research_backed" | "hypothesis" | "proto";
          status?: "draft" | "completed";
          current_step?: number;
          completed_at?: string | null;
        };
        Update: {
          project_id?: string;
          name?: string;
          persona_type?: "research_backed" | "hypothesis" | "proto";
          status?: "draft" | "completed";
          current_step?: number;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      persona_sections: {
        Row: {
          id: string;
          persona_id: string;
          key: string;
          position: number;
          content: Json;
          source: "manual" | "template" | "ai";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          persona_id: string;
          key: string;
          position?: number;
          content?: Json;
          source?: "manual" | "template" | "ai";
        };
        Update: { position?: number; content?: Json; source?: "manual" | "template" | "ai" };
        Relationships: [];
      };
      persona_evidence: {
        Row: {
          id: string;
          persona_id: string;
          kind: "research_source" | "observation" | "quote" | "assumption" | "hypothesis";
          content: string;
          source_label: string | null;
          source_url: string | null;
          participant_ref: string | null;
          confidence: "high" | "medium" | "low" | null;
          validation_status: "unvalidated" | "validated" | "invalidated";
          origin: "manual" | "ai";
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          persona_id: string;
          kind: "research_source" | "observation" | "quote" | "assumption" | "hypothesis";
          content: string;
          source_label?: string | null;
          source_url?: string | null;
          participant_ref?: string | null;
          confidence?: "high" | "medium" | "low" | null;
          validation_status?: "unvalidated" | "validated" | "invalidated";
          origin?: "manual" | "ai";
          position?: number;
        };
        Update: {
          kind?: "research_source" | "observation" | "quote" | "assumption" | "hypothesis";
          content?: string;
          source_label?: string | null;
          source_url?: string | null;
          participant_ref?: string | null;
          confidence?: "high" | "medium" | "low" | null;
          validation_status?: "unvalidated" | "validated" | "invalidated";
          origin?: "manual" | "ai";
          position?: number;
        };
        Relationships: [];
      };
      competitor_analyses: {
        Row: {
          id: string;
          owner_id: string;
          project_id: string;
          title: string;
          status: "draft" | "completed";
          current_step: number;
          completed_at: string | null;
          market_context: Json;
          analysis: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          project_id: string;
          title: string;
          status?: "draft" | "completed";
          current_step?: number;
          completed_at?: string | null;
          market_context?: Json;
          analysis?: Json;
        };
        Update: {
          project_id?: string;
          title?: string;
          status?: "draft" | "completed";
          current_step?: number;
          completed_at?: string | null;
          market_context?: Json;
          analysis?: Json;
        };
        Relationships: [];
      };
      competitors: {
        Row: {
          id: string;
          analysis_id: string;
          name: string;
          website_url: string | null;
          competitor_type: "direct" | "indirect" | "substitute" | "emerging";
          description: string | null;
          target_audience: string | null;
          positioning: string | null;
          pricing_info: string | null;
          research_date: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          name: string;
          website_url?: string | null;
          competitor_type?: "direct" | "indirect" | "substitute" | "emerging";
          description?: string | null;
          target_audience?: string | null;
          positioning?: string | null;
          pricing_info?: string | null;
          research_date?: string | null;
          position?: number;
        };
        Update: {
          name?: string;
          website_url?: string | null;
          competitor_type?: "direct" | "indirect" | "substitute" | "emerging";
          description?: string | null;
          target_audience?: string | null;
          positioning?: string | null;
          pricing_info?: string | null;
          research_date?: string | null;
          position?: number;
        };
        Relationships: [];
      };
      competitor_criteria: {
        Row: {
          id: string;
          analysis_id: string;
          name: string;
          category: "core_features" | "capabilities" | "pricing" | "user_experience" | "accessibility" | "integrations" | "support" | "positioning" | "target_audience" | "custom";
          description: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          name: string;
          category?: "core_features" | "capabilities" | "pricing" | "user_experience" | "accessibility" | "integrations" | "support" | "positioning" | "target_audience" | "custom";
          description?: string | null;
          position?: number;
        };
        Update: { name?: string; category?: "core_features" | "capabilities" | "pricing" | "user_experience" | "accessibility" | "integrations" | "support" | "positioning" | "target_audience" | "custom"; description?: string | null; position?: number };
        Relationships: [];
      };
      competitor_sources: {
        Row: {
          id: string;
          analysis_id: string;
          competitor_id: string;
          url: string;
          title: string | null;
          source_type: "website" | "pricing_page" | "product_page" | "review" | "article" | "interview" | "other";
          retrieved_on: string | null;
          origin: "manual" | "automated" | "ai";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          competitor_id: string;
          url: string;
          title?: string | null;
          source_type?: "website" | "pricing_page" | "product_page" | "review" | "article" | "interview" | "other";
          retrieved_on?: string | null;
          origin?: "manual" | "automated" | "ai";
          notes?: string | null;
        };
        Update: {
          url?: string;
          title?: string | null;
          source_type?: "website" | "pricing_page" | "product_page" | "review" | "article" | "interview" | "other";
          retrieved_on?: string | null;
          origin?: "manual" | "automated" | "ai";
          notes?: string | null;
        };
        Relationships: [];
      };
      competitor_comparisons: {
        Row: {
          id: string;
          analysis_id: string;
          competitor_id: string;
          criterion_id: string;
          source_id: string | null;
          value: string | null;
          status: "known" | "unknown" | "unavailable" | "not_applicable";
          notes: string | null;
          origin: "manual" | "automated" | "ai";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          competitor_id: string;
          criterion_id: string;
          source_id?: string | null;
          value?: string | null;
          status?: "known" | "unknown" | "unavailable" | "not_applicable";
          notes?: string | null;
          origin?: "manual" | "automated" | "ai";
        };
        Update: {
          source_id?: string | null;
          value?: string | null;
          status?: "known" | "unknown" | "unavailable" | "not_applicable";
          notes?: string | null;
          origin?: "manual" | "automated" | "ai";
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      duplicate_research_plan: { Args: { p_plan_id: string }; Returns: string };
      duplicate_persona: { Args: { p_persona_id: string }; Returns: string };
      reorder_competitors: { Args: { p_analysis_id: string; p_ids: string[] }; Returns: undefined };
      reorder_competitor_criteria: { Args: { p_analysis_id: string; p_ids: string[] }; Returns: undefined };
      reorder_research_plan_sections: {
        Args: { p_plan_id: string; p_keys: string[] };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
