export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          action: string | null
          adate: string | null
          case_type: string | null
          count_days: number | null
          created_at: string
          evidence_url: string | null
          guardian_name: string | null
          id: string
          notes: string | null
          seq: string | null
          student_name: string | null
          student_no: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action?: string | null
          adate?: string | null
          case_type?: string | null
          count_days?: number | null
          created_at?: string
          evidence_url?: string | null
          guardian_name?: string | null
          id?: string
          notes?: string | null
          seq?: string | null
          student_name?: string | null
          student_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          action?: string | null
          adate?: string | null
          case_type?: string | null
          count_days?: number | null
          created_at?: string
          evidence_url?: string | null
          guardian_name?: string | null
          id?: string
          notes?: string | null
          seq?: string | null
          student_name?: string | null
          student_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      behavior: {
        Row: {
          action: string | null
          bdate: string | null
          created_at: string
          evidence_url: string | null
          followup_at: string | null
          id: string
          notes: string | null
          observation: string | null
          referral_source: string | null
          result: string | null
          seq: string | null
          student_name: string | null
          student_no: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          action?: string | null
          bdate?: string | null
          created_at?: string
          evidence_url?: string | null
          followup_at?: string | null
          id?: string
          notes?: string | null
          observation?: string | null
          referral_source?: string | null
          result?: string | null
          seq?: string | null
          student_name?: string | null
          student_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          action?: string | null
          bdate?: string | null
          created_at?: string
          evidence_url?: string | null
          followup_at?: string | null
          id?: string
          notes?: string | null
          observation?: string | null
          referral_source?: string | null
          result?: string | null
          seq?: string | null
          student_name?: string | null
          student_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          edate: string | null
          etime: string | null
          etype: string | null
          id: string
          linked_ref: string | null
          notes: string | null
          priority: string | null
          seq: string | null
          status: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          edate?: string | null
          etime?: string | null
          etype?: string | null
          id?: string
          linked_ref?: string | null
          notes?: string | null
          priority?: string | null
          seq?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          edate?: string | null
          etime?: string | null
          etype?: string | null
          id?: string
          linked_ref?: string | null
          notes?: string | null
          priority?: string | null
          seq?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      committees: {
        Row: {
          attendees: string | null
          created_at: string
          decisions: string | null
          due_date: string | null
          evidence_url: string | null
          id: string
          mdate: string | null
          meeting_type: string | null
          notes: string | null
          responsible: string | null
          seq: string | null
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attendees?: string | null
          created_at?: string
          decisions?: string | null
          due_date?: string | null
          evidence_url?: string | null
          id?: string
          mdate?: string | null
          meeting_type?: string | null
          notes?: string | null
          responsible?: string | null
          seq?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          attendees?: string | null
          created_at?: string
          decisions?: string | null
          due_date?: string | null
          evidence_url?: string | null
          id?: string
          mdate?: string | null
          meeting_type?: string | null
          notes?: string | null
          responsible?: string | null
          seq?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      counseling_cases: {
        Row: {
          case_no: string | null
          case_status: string | null
          closed_at: string | null
          created_at: string
          domain: string | null
          followup_at: string | null
          id: string
          intervention_plan: string | null
          last_followup: string | null
          next_action: string | null
          notes: string | null
          opened_at: string | null
          priority: string | null
          referral_source: string | null
          student_name: string | null
          student_no: string | null
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          case_no?: string | null
          case_status?: string | null
          closed_at?: string | null
          created_at?: string
          domain?: string | null
          followup_at?: string | null
          id?: string
          intervention_plan?: string | null
          last_followup?: string | null
          next_action?: string | null
          notes?: string | null
          opened_at?: string | null
          priority?: string | null
          referral_source?: string | null
          student_name?: string | null
          student_no?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          case_no?: string | null
          case_status?: string | null
          closed_at?: string | null
          created_at?: string
          domain?: string | null
          followup_at?: string | null
          id?: string
          intervention_plan?: string | null
          last_followup?: string | null
          next_action?: string | null
          notes?: string | null
          opened_at?: string | null
          priority?: string | null
          referral_source?: string | null
          student_name?: string | null
          student_no?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      evidences: {
        Row: {
          created_at: string
          description: string | null
          doc_status: string | null
          edate: string | null
          etype: string | null
          file_url: string | null
          id: string
          linked_ref: string | null
          linked_type: string | null
          name: string | null
          notes: string | null
          reviewed_by: string | null
          seq: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          doc_status?: string | null
          edate?: string | null
          etype?: string | null
          file_url?: string | null
          id?: string
          linked_ref?: string | null
          linked_type?: string | null
          name?: string | null
          notes?: string | null
          reviewed_by?: string | null
          seq?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          doc_status?: string | null
          edate?: string | null
          etype?: string | null
          file_url?: string | null
          id?: string
          linked_ref?: string | null
          linked_type?: string | null
          name?: string | null
          notes?: string | null
          reviewed_by?: string | null
          seq?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interviews: {
        Row: {
          channel: string | null
          created_at: string
          evidence_url: string | null
          followup_at: string | null
          id: string
          idate: string | null
          itype: string | null
          notes: string | null
          participant: string | null
          recommendations: string | null
          result: string | null
          seq: string | null
          student_name: string | null
          student_no: string | null
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          evidence_url?: string | null
          followup_at?: string | null
          id?: string
          idate?: string | null
          itype?: string | null
          notes?: string | null
          participant?: string | null
          recommendations?: string | null
          result?: string | null
          seq?: string | null
          student_name?: string | null
          student_no?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          evidence_url?: string | null
          followup_at?: string | null
          id?: string
          idate?: string | null
          itype?: string | null
          notes?: string | null
          participant?: string | null
          recommendations?: string | null
          result?: string | null
          seq?: string | null
          student_name?: string | null
          student_no?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lookups: {
        Row: {
          category: string | null
          created_at: string
          id: string
          sort_order: number | null
          updated_at: string
          user_id: string
          value: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          sort_order?: number | null
          updated_at?: string
          user_id?: string
          value?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          sort_order?: number | null
          updated_at?: string
          user_id?: string
          value?: string | null
        }
        Relationships: []
      }
      plan_tasks: {
        Row: {
          created_at: string
          doc_status: string | null
          domain: string | null
          done_date: string | null
          due_date: string | null
          exec_status: string | null
          id: string
          indicator: string | null
          notes: string | null
          required_evidence: string | null
          seq: string | null
          target_group: string | null
          task: string | null
          term: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_status?: string | null
          domain?: string | null
          done_date?: string | null
          due_date?: string | null
          exec_status?: string | null
          id?: string
          indicator?: string | null
          notes?: string | null
          required_evidence?: string | null
          seq?: string | null
          target_group?: string | null
          task?: string | null
          term?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          doc_status?: string | null
          domain?: string | null
          done_date?: string | null
          due_date?: string | null
          exec_status?: string | null
          id?: string
          indicator?: string | null
          notes?: string | null
          required_evidence?: string | null
          seq?: string | null
          target_group?: string | null
          task?: string | null
          term?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          beneficiaries: number | null
          created_at: string
          domain: string | null
          end_date: string | null
          exec_status: string | null
          goal: string | null
          id: string
          indicator: string | null
          name: string | null
          notes: string | null
          program_no: string | null
          ptype: string | null
          required_evidence: string | null
          start_date: string | null
          target_group: string | null
          term: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          beneficiaries?: number | null
          created_at?: string
          domain?: string | null
          end_date?: string | null
          exec_status?: string | null
          goal?: string | null
          id?: string
          indicator?: string | null
          name?: string | null
          notes?: string | null
          program_no?: string | null
          ptype?: string | null
          required_evidence?: string | null
          start_date?: string | null
          target_group?: string | null
          term?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          beneficiaries?: number | null
          created_at?: string
          domain?: string | null
          end_date?: string | null
          exec_status?: string | null
          goal?: string | null
          id?: string
          indicator?: string | null
          name?: string | null
          notes?: string | null
          program_no?: string | null
          ptype?: string | null
          required_evidence?: string | null
          start_date?: string | null
          target_group?: string | null
          term?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          attachments: string | null
          created_at: string
          id: string
          notes: string | null
          reason: string | null
          referral_date: string | null
          referral_no: string | null
          referred_to: string | null
          reply_date: string | null
          result: string | null
          status: string | null
          student_name: string | null
          student_no: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string | null
          referral_date?: string | null
          referral_no?: string | null
          referred_to?: string | null
          reply_date?: string | null
          result?: string | null
          status?: string | null
          student_name?: string | null
          student_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          attachments?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reason?: string | null
          referral_date?: string | null
          referral_no?: string | null
          referred_to?: string | null
          reply_date?: string | null
          result?: string | null
          status?: string | null
          student_name?: string | null
          student_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          notes: string | null
          period: string | null
          prepared_by: string | null
          report_date: string | null
          report_no: string | null
          report_type: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          period?: string | null
          prepared_by?: string | null
          report_date?: string | null
          report_no?: string | null
          report_type?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          period?: string | null
          prepared_by?: string | null
          report_date?: string | null
          report_no?: string | null
          report_type?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      school_settings: {
        Row: {
          academic_year: string | null
          counselor_name: string | null
          created_at: string
          education_dept: string | null
          education_office: string | null
          id: string
          logo_url: string | null
          principal_name: string | null
          school_name: string | null
          semester: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_year?: string | null
          counselor_name?: string | null
          created_at?: string
          education_dept?: string | null
          education_office?: string | null
          id?: string
          logo_url?: string | null
          principal_name?: string | null
          school_name?: string | null
          semester?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          academic_year?: string | null
          counselor_name?: string | null
          created_at?: string
          education_dept?: string | null
          education_office?: string | null
          id?: string
          logo_url?: string | null
          principal_name?: string | null
          school_name?: string | null
          semester?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          address: string | null
          classroom: string | null
          created_at: string
          full_name: string | null
          gender: string | null
          grade: string | null
          guardian_name: string | null
          guardian_phone: string | null
          health_status: string | null
          id: string
          national_id: string | null
          notes: string | null
          social_status: string | null
          stage: string | null
          status: string | null
          student_no: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          classroom?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          grade?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          health_status?: string | null
          id?: string
          national_id?: string | null
          notes?: string | null
          social_status?: string | null
          stage?: string | null
          status?: string | null
          student_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          address?: string | null
          classroom?: string | null
          created_at?: string
          full_name?: string | null
          gender?: string | null
          grade?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          health_status?: string | null
          id?: string
          national_id?: string | null
          notes?: string | null
          social_status?: string | null
          stage?: string | null
          status?: string | null
          student_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
