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
          student_id: string | null
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
          student_id?: string | null
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
          student_id?: string | null
          student_name?: string | null
          student_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          changed_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          changed_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          changed_at?: string
          id?: number
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
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
          student_id: string | null
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
          student_id?: string | null
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
          student_id?: string | null
          student_name?: string | null
          student_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
          student_id: string | null
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
          student_id?: string | null
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
          student_id?: string | null
          student_name?: string | null
          student_no?: string | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "counseling_cases_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      deleted_records: {
        Row: {
          deleted_at: string
          deleted_by: string | null
          id: string
          record_data: Json
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          record_data: Json
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          deleted_at?: string
          deleted_by?: string | null
          id?: string
          record_data?: Json
          record_id?: string | null
          table_name?: string
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
          file_name: string | null
          file_path: string | null
          file_url: string | null
          id: string
          linked_ref: string | null
          linked_type: string | null
          mime_type: string | null
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
          file_name?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          linked_ref?: string | null
          linked_type?: string | null
          mime_type?: string | null
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
          file_name?: string | null
          file_path?: string | null
          file_url?: string | null
          id?: string
          linked_ref?: string | null
          linked_type?: string | null
          mime_type?: string | null
          name?: string | null
          notes?: string | null
          reviewed_by?: string | null
          seq?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback_messages: {
        Row: {
          assigned_channel: string | null
          assigned_to: string
          category: string
          created_at: string
          id: string
          internal_notes: string | null
          message: string
          responded_at: string | null
          response_note: string | null
          satisfaction: number | null
          sender_contact: string | null
          sender_name: string
          sender_role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_channel?: string | null
          assigned_to?: string
          category?: string
          created_at?: string
          id?: string
          internal_notes?: string | null
          message: string
          responded_at?: string | null
          response_note?: string | null
          satisfaction?: number | null
          sender_contact?: string | null
          sender_name: string
          sender_role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          assigned_channel?: string | null
          assigned_to?: string
          category?: string
          created_at?: string
          id?: string
          internal_notes?: string | null
          message?: string
          responded_at?: string | null
          response_note?: string | null
          satisfaction?: number | null
          sender_contact?: string | null
          sender_name?: string
          sender_role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interviews: {
        Row: {
          case_id: string | null
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
          student_id: string | null
          student_name: string | null
          student_no: string | null
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
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
          student_id?: string | null
          student_name?: string | null
          student_no?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          case_id?: string | null
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
          student_id?: string | null
          student_name?: string | null
          student_no?: string | null
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "counseling_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
      noor_export_jobs: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          noor_reference: string | null
          pause_reason: string | null
          payload: Json
          source_id: string
          source_table: string
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          noor_reference?: string | null
          pause_reason?: string | null
          payload?: Json
          source_id: string
          source_table: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          noor_reference?: string | null
          pause_reason?: string | null
          payload?: Json
          source_id?: string
          source_table?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
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
      posts: {
        Row: {
          author_name: string | null
          body: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_public: boolean
          kind: string
          published_at: string | null
          slug: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name?: string | null
          body?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_public?: boolean
          kind?: string
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          author_name?: string | null
          body?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_public?: boolean
          kind?: string
          published_at?: string | null
          slug?: string
          title?: string
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
          noor_sync_ref: string | null
          noor_synced_at: string | null
          notes: string | null
          plan_task_id: string | null
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
          noor_sync_ref?: string | null
          noor_synced_at?: string | null
          notes?: string | null
          plan_task_id?: string | null
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
          noor_sync_ref?: string | null
          noor_synced_at?: string | null
          notes?: string | null
          plan_task_id?: string | null
          program_no?: string | null
          ptype?: string | null
          required_evidence?: string | null
          start_date?: string | null
          target_group?: string | null
          term?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_plan_task_id_fkey"
            columns: ["plan_task_id"]
            isOneToOne: false
            referencedRelation: "plan_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      public_requests: {
        Row: {
          classroom: string | null
          counselor_notes: string | null
          created_at: string
          details: string
          handled_at: string | null
          id: string
          is_anonymous: boolean
          kind: string
          linked_record_id: string | null
          linked_table: string | null
          preferred_time: string | null
          request_no: string
          requester_contact: string | null
          requester_name: string | null
          requester_role: string | null
          status: string
          student_grade: string | null
          student_name: string | null
          topic: string | null
          tracking_code: string | null
          updated_at: string
          urgency: string
          user_id: string
        }
        Insert: {
          classroom?: string | null
          counselor_notes?: string | null
          created_at?: string
          details: string
          handled_at?: string | null
          id?: string
          is_anonymous?: boolean
          kind: string
          linked_record_id?: string | null
          linked_table?: string | null
          preferred_time?: string | null
          request_no?: string
          requester_contact?: string | null
          requester_name?: string | null
          requester_role?: string | null
          status?: string
          student_grade?: string | null
          student_name?: string | null
          topic?: string | null
          tracking_code?: string | null
          updated_at?: string
          urgency?: string
          user_id: string
        }
        Update: {
          classroom?: string | null
          counselor_notes?: string | null
          created_at?: string
          details?: string
          handled_at?: string | null
          id?: string
          is_anonymous?: boolean
          kind?: string
          linked_record_id?: string | null
          linked_table?: string | null
          preferred_time?: string | null
          request_no?: string
          requester_contact?: string | null
          requester_name?: string | null
          requester_role?: string | null
          status?: string
          student_grade?: string | null
          student_name?: string | null
          topic?: string | null
          tracking_code?: string | null
          updated_at?: string
          urgency?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          attachments: string | null
          case_id: string | null
          case_no: string | null
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
          student_id: string | null
          student_name: string | null
          student_no: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: string | null
          case_id?: string | null
          case_no?: string | null
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
          student_id?: string | null
          student_name?: string | null
          student_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          attachments?: string | null
          case_id?: string | null
          case_no?: string | null
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
          student_id?: string | null
          student_name?: string | null
          student_no?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "counseling_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
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
          summary: string | null
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
          summary?: string | null
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
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      school_join_codes: {
        Row: {
          join_code: string
          school_id: string
          updated_at: string
        }
        Insert: {
          join_code: string
          school_id: string
          updated_at?: string
        }
        Update: {
          join_code?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_join_codes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_members: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_admin: boolean
          joined_at: string | null
          member_status: string
          permissions: Json
          role: string
          school_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_admin?: boolean
          joined_at?: string | null
          member_status?: string
          permissions?: Json
          role?: string
          school_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_admin?: boolean
          joined_at?: string | null
          member_status?: string
          permissions?: Json
          role?: string
          school_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_members_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_report_handoff_events: {
        Row: {
          actor_member_id: string | null
          actor_name: string
          actor_role: string
          created_at: string
          event_type: string
          handoff_id: string
          id: string
          note: string | null
          root_handoff_id: string
          school_id: string
          target_member_id: string | null
          target_name: string | null
          target_role: string | null
        }
        Insert: {
          actor_member_id?: string | null
          actor_name: string
          actor_role: string
          created_at?: string
          event_type: string
          handoff_id: string
          id?: string
          note?: string | null
          root_handoff_id: string
          school_id: string
          target_member_id?: string | null
          target_name?: string | null
          target_role?: string | null
        }
        Update: {
          actor_member_id?: string | null
          actor_name?: string
          actor_role?: string
          created_at?: string
          event_type?: string
          handoff_id?: string
          id?: string
          note?: string | null
          root_handoff_id?: string
          school_id?: string
          target_member_id?: string | null
          target_name?: string | null
          target_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_report_handoff_events_actor_member_id_fkey"
            columns: ["actor_member_id"]
            isOneToOne: false
            referencedRelation: "school_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_report_handoff_events_handoff_id_fkey"
            columns: ["handoff_id"]
            isOneToOne: false
            referencedRelation: "school_report_handoffs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_report_handoff_events_root_handoff_id_fkey"
            columns: ["root_handoff_id"]
            isOneToOne: false
            referencedRelation: "school_report_handoffs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_report_handoff_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_report_handoff_events_target_member_id_fkey"
            columns: ["target_member_id"]
            isOneToOne: false
            referencedRelation: "school_members"
            referencedColumns: ["id"]
          },
        ]
      }
      school_report_handoffs: {
        Row: {
          archived_at: string | null
          decision_at: string | null
          decision_by_member_id: string | null
          decision_note: string | null
          id: string
          note: string | null
          parent_handoff_id: string | null
          read_at: string | null
          recipient_member_id: string
          recipient_name: string
          recipient_role: string
          root_handoff_id: string
          school_id: string
          sender_member_id: string
          sender_name: string
          sender_role: string
          sent_at: string
          snapshot: Json
          status: string
          title: string
        }
        Insert: {
          archived_at?: string | null
          decision_at?: string | null
          decision_by_member_id?: string | null
          decision_note?: string | null
          id?: string
          note?: string | null
          parent_handoff_id?: string | null
          read_at?: string | null
          recipient_member_id: string
          recipient_name: string
          recipient_role: string
          root_handoff_id: string
          school_id: string
          sender_member_id: string
          sender_name: string
          sender_role: string
          sent_at?: string
          snapshot: Json
          status?: string
          title: string
        }
        Update: {
          archived_at?: string | null
          decision_at?: string | null
          decision_by_member_id?: string | null
          decision_note?: string | null
          id?: string
          note?: string | null
          parent_handoff_id?: string | null
          read_at?: string | null
          recipient_member_id?: string
          recipient_name?: string
          recipient_role?: string
          root_handoff_id?: string
          school_id?: string
          sender_member_id?: string
          sender_name?: string
          sender_role?: string
          sent_at?: string
          snapshot?: Json
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_report_handoffs_decision_by_member_id_fkey"
            columns: ["decision_by_member_id"]
            isOneToOne: false
            referencedRelation: "school_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_report_handoffs_parent_fk"
            columns: ["parent_handoff_id"]
            isOneToOne: false
            referencedRelation: "school_report_handoffs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_report_handoffs_recipient_member_id_fkey"
            columns: ["recipient_member_id"]
            isOneToOne: false
            referencedRelation: "school_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_report_handoffs_root_fk"
            columns: ["root_handoff_id"]
            isOneToOne: false
            referencedRelation: "school_report_handoffs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_report_handoffs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_report_handoffs_sender_member_id_fkey"
            columns: ["sender_member_id"]
            isOneToOne: false
            referencedRelation: "school_members"
            referencedColumns: ["id"]
          },
        ]
      }
      school_settings: {
        Row: {
          academic_year: string | null
          announcement: string | null
          contact_email: string | null
          contact_phone: string | null
          counselor_name: string | null
          counselor_signature: string | null
          created_at: string
          education_dept: string | null
          education_office: string | null
          id: string
          logo_url: string | null
          ministry_logo_url: string | null
          mission: string | null
          office_hours: string | null
          principal_name: string | null
          principal_signature: string | null
          private_blog_token: string
          public_feedback_token: string
          public_requests_enabled: boolean | null
          public_slug: string | null
          school_name: string | null
          semester: string | null
          show_counselor_on_documents: boolean
          show_principal_on_documents: boolean
          theme: string
          updated_at: string
          user_id: string
          vision: string | null
        }
        Insert: {
          academic_year?: string | null
          announcement?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          counselor_name?: string | null
          counselor_signature?: string | null
          created_at?: string
          education_dept?: string | null
          education_office?: string | null
          id?: string
          logo_url?: string | null
          ministry_logo_url?: string | null
          mission?: string | null
          office_hours?: string | null
          principal_name?: string | null
          principal_signature?: string | null
          private_blog_token?: string
          public_feedback_token?: string
          public_requests_enabled?: boolean | null
          public_slug?: string | null
          school_name?: string | null
          semester?: string | null
          show_counselor_on_documents?: boolean
          show_principal_on_documents?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
          vision?: string | null
        }
        Update: {
          academic_year?: string | null
          announcement?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          counselor_name?: string | null
          counselor_signature?: string | null
          created_at?: string
          education_dept?: string | null
          education_office?: string | null
          id?: string
          logo_url?: string | null
          ministry_logo_url?: string | null
          mission?: string | null
          office_hours?: string | null
          principal_name?: string | null
          principal_signature?: string | null
          private_blog_token?: string
          public_feedback_token?: string
          public_requests_enabled?: boolean | null
          public_slug?: string | null
          school_name?: string | null
          semester?: string | null
          show_counselor_on_documents?: boolean
          show_principal_on_documents?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
          vision?: string | null
        }
        Relationships: []
      }
      school_tasks: {
        Row: {
          approved_at: string | null
          approved_by_member_id: string | null
          assignee_member_id: string
          cadence: string
          category: string
          completed_at: string | null
          completion_note: string | null
          created_at: string
          creator_member_id: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          returned_note: string | null
          school_id: string
          status: string
          template_key: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_member_id?: string | null
          assignee_member_id: string
          cadence?: string
          category?: string
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          creator_member_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          returned_note?: string | null
          school_id: string
          status?: string
          template_key?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_member_id?: string | null
          assignee_member_id?: string
          cadence?: string
          category?: string
          completed_at?: string | null
          completion_note?: string | null
          created_at?: string
          creator_member_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          returned_note?: string | null
          school_id?: string
          status?: string
          template_key?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_tasks_approved_by_member_id_fkey"
            columns: ["approved_by_member_id"]
            isOneToOne: false
            referencedRelation: "school_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_tasks_assignee_member_id_fkey"
            columns: ["assignee_member_id"]
            isOneToOne: false
            referencedRelation: "school_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_tasks_creator_member_id_fkey"
            columns: ["creator_member_id"]
            isOneToOne: false
            referencedRelation: "school_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_tasks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          education_dept: string | null
          education_office: string | null
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          education_dept?: string | null
          education_office?: string | null
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          education_dept?: string | null
          education_office?: string | null
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
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
          nationality: string | null
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
          nationality?: string | null
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
          nationality?: string | null
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
      subscriptions: {
        Row: {
          cases_limit: number
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cases_limit?: number
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          cases_limit?: number
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          job_title: string
          phone: string | null
          school_role: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          job_title?: string
          phone?: string | null
          school_role?: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          job_title?: string
          phone?: string | null
          school_role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_school_task_template: {
        Args: {
          p_assignee_member_id: string
          p_cadence?: string
          p_category?: string
          p_description?: string
          p_due_date?: string
          p_priority?: string
          p_template_key: string
          p_title: string
        }
        Returns: string
      }
      approve_school_member: {
        Args: { p_is_admin?: boolean; p_member_id: string; p_role: string }
        Returns: undefined
      }
      archive_school_report_handoff: {
        Args: { p_handoff_id: string }
        Returns: undefined
      }
      can_manage_school_configuration: { Args: never; Returns: boolean }
      can_read_school_handoff_chain: {
        Args: { p_root_handoff_id: string; p_school_id: string }
        Returns: boolean
      }
      can_use_guidance_workspace: { Args: never; Returns: boolean }
      create_school_report_handoff: {
        Args: {
          p_note: string
          p_recipient_member_id: string
          p_snapshot: Json
          p_title: string
        }
        Returns: string
      }
      create_school_task: {
        Args: {
          p_assignee_member_id: string
          p_cadence?: string
          p_category?: string
          p_description?: string
          p_due_date?: string
          p_priority?: string
          p_title: string
        }
        Returns: string
      }
      create_school_workspace: {
        Args: {
          p_education_dept?: string
          p_education_office?: string
          p_name: string
          p_role?: string
        }
        Returns: string
      }
      get_guidance_profile: {
        Args: { p_slug: string }
        Returns: {
          announcement: string
          contact_email: string
          contact_phone: string
          counselor_name: string
          education_dept: string
          logo_url: string
          mission: string
          office_hours: string
          requests_enabled: boolean
          school_name: string
          vision: string
        }[]
      }
      get_my_school_context: { Args: never; Returns: Json }
      get_private_counselor_blog: {
        Args: { p_token: string }
        Returns: {
          author_name: string
          body: string
          counselor_name: string
          cover_url: string
          created_at: string
          excerpt: string
          kind: string
          published_at: string
          school_name: string
          slug: string
          title: string
        }[]
      }
      get_private_counselor_portal: {
        Args: { p_token: string }
        Returns: {
          author_name: string
          body: string
          counselor_name: string
          cover_url: string
          created_at: string
          excerpt: string
          kind: string
          public_slug: string
          published_at: string
          school_name: string
          slug: string
          title: string
        }[]
      }
      get_public_request_status: {
        Args: { p_request_no: string; p_tracking_code: string }
        Returns: {
          created_at: string
          handled_at: string
          kind: string
          request_no: string
          status: string
          topic: string
        }[]
      }
      get_public_school: {
        Args: { p_slug: string }
        Returns: {
          education_dept: string
          logo_url: string
          school_name: string
          user_id: string
        }[]
      }
      get_student_filter_options: { Args: never; Returns: Json }
      is_active_school_member: {
        Args: { p_school_id: string }
        Returns: boolean
      }
      is_school_admin: { Args: { p_school_id: string }; Returns: boolean }
      mark_school_report_handoff_read: {
        Args: { p_handoff_id: string }
        Returns: undefined
      }
      request_join_school: { Args: { p_join_code: string }; Returns: string }
      restore_deleted_record: {
        Args: { p_deleted_id: string }
        Returns: string
      }
      review_school_report_handoff: {
        Args: {
          p_action: string
          p_forward_to_member_id?: string
          p_handoff_id: string
          p_note?: string
        }
        Returns: string
      }
      review_school_task: {
        Args: { p_action: string; p_note?: string; p_task_id: string }
        Returns: undefined
      }
      rotate_school_join_code: {
        Args: { p_school_id: string }
        Returns: string
      }
      school_role_rank: { Args: { p_role: string }; Returns: number }
      set_school_member_status: {
        Args: { p_member_id: string; p_status: string }
        Returns: undefined
      }
      submit_public_feedback: {
        Args: {
          p_category: string
          p_message: string
          p_satisfaction: number
          p_sender_contact: string
          p_sender_name: string
          p_sender_role: string
          p_token: string
        }
        Returns: string
      }
      submit_public_request: {
        Args: {
          p_classroom?: string
          p_details: string
          p_is_anonymous?: boolean
          p_kind: string
          p_preferred_time?: string
          p_requester_contact?: string
          p_requester_name?: string
          p_requester_role?: string
          p_slug?: string
          p_student_grade?: string
          p_student_name?: string
          p_topic?: string
          p_urgency?: string
        }
        Returns: string
      }
      submit_public_request_v2: {
        Args: {
          p_classroom?: string
          p_details: string
          p_is_anonymous?: boolean
          p_kind: string
          p_portal_token?: string
          p_preferred_time?: string
          p_requester_contact?: string
          p_requester_name?: string
          p_requester_role?: string
          p_slug?: string
          p_student_grade?: string
          p_student_name?: string
          p_topic?: string
          p_urgency?: string
        }
        Returns: string
      }
      submit_public_request_v3: {
        Args: {
          p_classroom?: string
          p_details: string
          p_is_anonymous?: boolean
          p_kind: string
          p_portal_token?: string
          p_preferred_time?: string
          p_requester_contact?: string
          p_requester_name?: string
          p_requester_role?: string
          p_slug?: string
          p_student_grade?: string
          p_student_name?: string
          p_topic?: string
          p_urgency?: string
        }
        Returns: Json
      }
      update_my_school_task: {
        Args: {
          p_completion_note?: string
          p_status: string
          p_task_id: string
        }
        Returns: undefined
      }
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
