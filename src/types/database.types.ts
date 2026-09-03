export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      classes: {
        Row: {
          id: number
          user_id: string
          title: string
          day_of_week: string
          start_time: string
          end_time: string
          room: string | null
          faculty: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id?: string
          title: string
          day_of_week: string
          start_time: string
          end_time: string
          room?: string | null
          faculty?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          title?: string
          day_of_week?: string
          start_time?: string
          end_time?: string
          room?: string | null
          faculty?: string | null
          created_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: number
          user_id: string
          title: string
          description: string | null
          due_date: string | null
          priority: string
          estimated_minutes: number | null
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: number
          user_id?: string
          title: string
          description?: string | null
          due_date?: string | null
          priority?: string
          estimated_minutes?: number | null
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          title?: string
          description?: string | null
          due_date?: string | null
          priority?: string
          estimated_minutes?: number | null
          completed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          id: number
          user_id: string
          title: string
          type: string
          date: string
          start_time: string
          end_time: string
          location: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id?: string
          title: string
          type: string
          date: string
          start_time: string
          end_time: string
          location?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          title?: string
          type?: string
          date?: string
          start_time?: string
          end_time?: string
          location?: string | null
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          display_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          device_id: string
          endpoint: string
          subscription: Json
          timezone: string
          briefing_time: string
          briefing_enabled: boolean
          last_briefing_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          device_id: string
          endpoint: string
          subscription: Json
          timezone?: string
          briefing_time?: string
          briefing_enabled?: boolean
          last_briefing_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          device_id?: string
          endpoint?: string
          subscription?: Json
          timezone?: string
          briefing_time?: string
          briefing_enabled?: boolean
          last_briefing_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

