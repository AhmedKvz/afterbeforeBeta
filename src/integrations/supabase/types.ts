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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      active_users: {
        Row: {
          event_id: string
          id: string
          is_visible: boolean | null
          last_seen: string | null
          latitude: number | null
          longitude: number | null
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          is_visible?: boolean | null
          last_seen?: string | null
          latitude?: number | null
          longitude?: number | null
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          is_visible?: boolean | null
          last_seen?: string | null
          latitude?: number | null
          longitude?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_users_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checkins: {
        Row: {
          checked_in_at: string | null
          event_id: string
          id: string
          latitude: number | null
          longitude: number | null
          user_id: string
        }
        Insert: {
          checked_in_at?: string | null
          event_id: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          user_id: string
        }
        Update: {
          checked_in_at?: string | null
          event_id?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_checkins_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reviews: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          rating: number
          review_text: string | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          rating: number
          review_text?: string | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          rating?: number
          review_text?: string | null
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "event_reviews_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_wishlists: {
        Row: {
          created_at: string | null
          event_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_wishlists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address: string | null
          capacity: number | null
          created_at: string | null
          date: string
          description: string | null
          end_time: string | null
          host_id: string | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          music_genres: string[] | null
          price: number | null
          start_time: string
          title: string
          venue_name: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          created_at?: string | null
          date: string
          description?: string | null
          end_time?: string | null
          host_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          music_genres?: string[] | null
          price?: number | null
          start_time: string
          title: string
          venue_name?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          created_at?: string | null
          date?: string
          description?: string | null
          end_time?: string | null
          host_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          music_genres?: string[] | null
          price?: number | null
          start_time?: string
          title?: string
          venue_name?: string | null
        }
        Relationships: []
      }
      lucky_100_claims: {
        Row: {
          claimed_at: string | null
          entry_id: string
          event_choice: string
          guestlist_name: string
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string | null
          entry_id: string
          event_choice: string
          guestlist_name: string
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string | null
          entry_id?: string
          event_choice?: string
          guestlist_name?: string
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lucky_100_claims_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "lucky_100_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      lucky_100_entries: {
        Row: {
          created_at: string | null
          eligible: boolean | null
          entry_date: string | null
          id: string
          prize_event_id: string | null
          user_id: string
          week_number: number
          won: boolean | null
          year: number
        }
        Insert: {
          created_at?: string | null
          eligible?: boolean | null
          entry_date?: string | null
          id?: string
          prize_event_id?: string | null
          user_id: string
          week_number: number
          won?: boolean | null
          year: number
        }
        Update: {
          created_at?: string | null
          eligible?: boolean | null
          entry_date?: string | null
          id?: string
          prize_event_id?: string | null
          user_id?: string
          week_number?: number
          won?: boolean | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "lucky_100_entries_prize_event_id_fkey"
            columns: ["prize_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          event_id: string
          id: string
          matched_at: string | null
          status: string | null
          user1_id: string
          user2_id: string
        }
        Insert: {
          event_id: string
          id?: string
          matched_at?: string | null
          status?: string | null
          user1_id: string
          user2_id: string
        }
        Update: {
          event_id?: string
          id?: string
          matched_at?: string | null
          status?: string | null
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string | null
          display_name: string
          events_attended: number | null
          id: string
          level: number | null
          music_preferences: string[] | null
          onboarding_completed: boolean | null
          total_matches: number | null
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          display_name: string
          events_attended?: number | null
          id?: string
          level?: number | null
          music_preferences?: string[] | null
          onboarding_completed?: boolean | null
          total_matches?: number | null
          updated_at?: string | null
          user_id: string
          xp?: number | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string | null
          display_name?: string
          events_attended?: number | null
          id?: string
          level?: number | null
          music_preferences?: string[] | null
          onboarding_completed?: boolean | null
          total_matches?: number | null
          updated_at?: string | null
          user_id?: string
          xp?: number | null
        }
        Relationships: []
      }
      swipes: {
        Row: {
          action: string
          created_at: string | null
          event_id: string
          id: string
          swiped_id: string
          swiper_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          event_id: string
          id?: string
          swiped_id: string
          swiper_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          event_id?: string
          id?: string
          swiped_id?: string
          swiper_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swipes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waves: {
        Row: {
          created_at: string | null
          id: string
          match_id: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          match_id: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          match_id?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waves_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_leaderboard: {
        Row: {
          id: string
          rank: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string
          week_number: number
          year: number
        }
        Insert: {
          id?: string
          rank?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id: string
          week_number: number
          year: number
        }
        Update: {
          id?: string
          rank?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string
          week_number?: number
          year?: number
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      draw_lucky_100_winners: {
        Args: { num_winners?: number }
        Returns: {
          winner_id: string
          winner_name: string
        }[]
      }
      get_event_stats: {
        Args: { event_uuid: string }
        Returns: {
          avg_rating: number
          latest_review: string
          review_count: number
        }[]
      }
      get_weekly_leaderboard: {
        Args: { limit_count?: number; week_num: number; year_num: number }
        Returns: {
          avatar_url: string
          display_name: string
          rank: number
          total_xp: number
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
