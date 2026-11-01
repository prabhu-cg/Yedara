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
      research_syntheses: {
        Row: {
          id: string;
          owner_id: string;
          project_id: string;
          title: string;
          status: "draft" | "completed";
          completed_at: string | null;
          report: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          project_id: string;
          title: string;
          status?: "draft" | "completed";
          completed_at?: string | null;
          report?: Json;
        };
        Update: {
          project_id?: string;
          title?: string;
          status?: "draft" | "completed";
          completed_at?: string | null;
          report?: Json;
        };
        Relationships: [];
      };
      research_sources: {
        Row: {
          id: string;
          synthesis_id: string;
          name: string;
          source_type: "interview" | "observation_session" | "survey" | "document" | "other";
          participant_ref: string | null;
          conducted_on: string | null;
          notes: string | null;
          file_name: string | null;
          file_size: number | null;
          import_method: "manual" | "paste" | "file";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          synthesis_id: string;
          name: string;
          source_type?: "interview" | "observation_session" | "survey" | "document" | "other";
          participant_ref?: string | null;
          conducted_on?: string | null;
          notes?: string | null;
          file_name?: string | null;
          file_size?: number | null;
          import_method?: "manual" | "paste" | "file";
        };
        Update: {
          name?: string;
          source_type?: "interview" | "observation_session" | "survey" | "document" | "other";
          participant_ref?: string | null;
          conducted_on?: string | null;
          notes?: string | null;
          file_name?: string | null;
          file_size?: number | null;
        };
        Relationships: [];
      };
      research_observations: {
        Row: {
          id: string;
          synthesis_id: string;
          source_id: string | null;
          participant_ref: string | null;
          kind: "observation" | "quote" | "survey_response" | "note";
          content: string;
          tags: Json;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          synthesis_id: string;
          source_id?: string | null;
          participant_ref?: string | null;
          kind?: "observation" | "quote" | "survey_response" | "note";
          content: string;
          tags?: Json;
          position?: number;
        };
        Update: {
          source_id?: string | null;
          participant_ref?: string | null;
          kind?: "observation" | "quote" | "survey_response" | "note";
          content?: string;
          tags?: Json;
          position?: number;
        };
        Relationships: [];
      };
      research_themes: {
        Row: {
          id: string;
          synthesis_id: string;
          title: string;
          notes: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          synthesis_id: string;
          title: string;
          notes?: string | null;
          position?: number;
        };
        Update: {
          title?: string;
          notes?: string | null;
          position?: number;
        };
        Relationships: [];
      };
      affinity_boards: {
        Row: {
          id: string;
          synthesis_id: string;
          zoom: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          synthesis_id: string;
          zoom?: number;
        };
        Update: {
          zoom?: number;
        };
        Relationships: [];
      };
      affinity_cards: {
        Row: {
          id: string;
          synthesis_id: string;
          board_id: string;
          observation_id: string;
          theme_id: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          synthesis_id: string;
          board_id: string;
          observation_id: string;
          theme_id?: string | null;
          position?: number;
        };
        Update: {
          theme_id?: string | null;
          position?: number;
        };
        Relationships: [];
      };
      research_insights: {
        Row: {
          id: string;
          synthesis_id: string;
          theme_id: string | null;
          kind: "direct_observation" | "interpretation" | "hypothesis" | "recommendation";
          observation: string | null;
          pattern: string | null;
          user_need: string | null;
          problem_kind: "problem" | "opportunity" | null;
          problem_text: string | null;
          statement: string;
          confidence: "high" | "medium" | "low";
          recommended_action: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          synthesis_id: string;
          theme_id?: string | null;
          kind?: "direct_observation" | "interpretation" | "hypothesis" | "recommendation";
          observation?: string | null;
          pattern?: string | null;
          user_need?: string | null;
          problem_kind?: "problem" | "opportunity" | null;
          problem_text?: string | null;
          statement: string;
          confidence?: "high" | "medium" | "low";
          recommended_action?: string | null;
          position?: number;
        };
        Update: {
          theme_id?: string | null;
          kind?: "direct_observation" | "interpretation" | "hypothesis" | "recommendation";
          observation?: string | null;
          pattern?: string | null;
          user_need?: string | null;
          problem_kind?: "problem" | "opportunity" | null;
          problem_text?: string | null;
          statement?: string;
          confidence?: "high" | "medium" | "low";
          recommended_action?: string | null;
          position?: number;
        };
        Relationships: [];
      };
      research_insight_evidence: {
        Row: {
          insight_id: string;
          observation_id: string;
          synthesis_id: string;
          created_at: string;
        };
        Insert: {
          insight_id: string;
          observation_id: string;
          synthesis_id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      journeys: {
        Row: {
          id: string;
          owner_id: string;
          project_id: string;
          persona_id: string | null;
          name: string;
          journey_type: "customer" | "user" | "service" | "employee";
          scenario: string | null;
          state: "current" | "future";
          status: "draft" | "completed";
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          project_id: string;
          persona_id?: string | null;
          name: string;
          journey_type?: "customer" | "user" | "service" | "employee";
          scenario?: string | null;
          state?: "current" | "future";
          status?: "draft" | "completed";
          completed_at?: string | null;
        };
        Update: {
          project_id?: string;
          persona_id?: string | null;
          name?: string;
          journey_type?: "customer" | "user" | "service" | "employee";
          scenario?: string | null;
          state?: "current" | "future";
          status?: "draft" | "completed";
          completed_at?: string | null;
        };
        Relationships: [];
      };
      journey_stages: {
        Row: {
          id: string;
          journey_id: string;
          name: string;
          position: number;
          emotion: number | null;
          emotion_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          journey_id: string;
          name: string;
          position?: number;
          emotion?: number | null;
          emotion_note?: string | null;
        };
        Update: {
          name?: string;
          position?: number;
          emotion?: number | null;
          emotion_note?: string | null;
        };
        Relationships: [];
      };
      journey_items: {
        Row: {
          id: string;
          journey_id: string;
          stage_id: string;
          kind: "action" | "goal" | "thought" | "touchpoint" | "channel" | "pain_point" | "opportunity" | "evidence";
          content: string;
          evidence_note: string | null;
          observation_id: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          journey_id: string;
          stage_id: string;
          kind: "action" | "goal" | "thought" | "touchpoint" | "channel" | "pain_point" | "opportunity" | "evidence";
          content: string;
          evidence_note?: string | null;
          observation_id?: string | null;
          position?: number;
        };
        Update: {
          stage_id?: string;
          kind?: "action" | "goal" | "thought" | "touchpoint" | "channel" | "pain_point" | "opportunity" | "evidence";
          content?: string;
          evidence_note?: string | null;
          observation_id?: string | null;
          position?: number;
        };
        Relationships: [];
      };
      opportunity_candidates: {
        Row: {
          id: string;
          owner_id: string;
          project_id: string;
          journey_id: string | null;
          stage_id: string | null;
          source_item_id: string | null;
          observation_id: string | null;
          title: string;
          origin_kind: "pain_point" | "opportunity";
          journey_name: string | null;
          stage_name: string | null;
          evidence_note: string | null;
          status: "candidate";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          project_id: string;
          journey_id?: string | null;
          stage_id?: string | null;
          source_item_id?: string | null;
          observation_id?: string | null;
          title: string;
          origin_kind: "pain_point" | "opportunity";
          journey_name?: string | null;
          stage_name?: string | null;
          evidence_note?: string | null;
          status?: "candidate";
        };
        Update: {
          journey_id?: string | null;
          stage_id?: string | null;
          observation_id?: string | null;
          title?: string;
          journey_name?: string | null;
          stage_name?: string | null;
          evidence_note?: string | null;
          status?: "candidate";
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
      save_affinity_layout: { Args: { p_synthesis_id: string; p_themes: Json; p_cards: Json }; Returns: undefined };
      reorder_journey_stages: { Args: { p_journey_id: string; p_ids: string[] }; Returns: undefined };
      duplicate_journey: { Args: { p_journey_id: string; p_state?: string | null }; Returns: string };
      reorder_research_plan_sections: {
        Args: { p_plan_id: string; p_keys: string[] };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
