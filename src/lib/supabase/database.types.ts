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
    };
    Views: Record<string, never>;
    Functions: {
      duplicate_research_plan: { Args: { p_plan_id: string }; Returns: string };
      reorder_research_plan_sections: {
        Args: { p_plan_id: string; p_keys: string[] };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
