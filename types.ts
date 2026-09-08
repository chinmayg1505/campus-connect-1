// Hand-written types matching campusconnect_v1_migration_v2.sql exactly.
// If the live schema ever diverges from this file, update PROJECT_STATE.md
// "Known Issues" rather than silently guessing.

export type RoleMode = "need_help" | "can_help" | "both";

export type RequestCategory =
  | "academics"
  | "tech"
  | "design"
  | "projects"
  | "events"
  | "other";

export type RequestStatus =
  | "posted"
  | "offer_received"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled";

export type OfferStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface College {
  id: number;
  name: string;
  city: string;
  state: string;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Skill {
  id: number;
  name: string;
  category: string;
  is_active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  college_id: number;
  department: string;
  year_of_study: number;
  role_mode: RoleMode;
  bio: string | null;
  skills: string[] | null;
  rating_average: number;
  rating_count: number;
  completed_count: number;
  created_at: string;
  updated_at: string;
}

export interface RequestRow {
  id: string;
  requester_id: string;
  title: string;
  description: string;
  category: RequestCategory;
  budget: number | null;
  is_paid: boolean;
  deadline: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  request_id: string;
  helper_id: string;
  message: string;
  proposed_price: number | null;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export interface Rating {
  id: string;
  request_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  review: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      colleges: { Row: College; Insert: Partial<College>; Update: Partial<College> };
      skills: { Row: Skill; Insert: Partial<Skill>; Update: Partial<Skill> };
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      requests: { Row: RequestRow; Insert: Partial<RequestRow>; Update: Partial<RequestRow> };
      offers: { Row: Offer; Insert: Partial<Offer>; Update: Partial<Offer> };
      messages: { Row: Message; Insert: Partial<Message>; Update: Partial<Message> };
      ratings: { Row: Rating; Insert: Partial<Rating>; Update: Partial<Rating> };
    };
    Functions: {
      accept_offer: { Args: { p_offer_id: string }; Returns: void };
      start_request: { Args: { p_request_id: string }; Returns: void };
      complete_request: { Args: { p_request_id: string }; Returns: void };
      cancel_request: { Args: { p_request_id: string }; Returns: void };
    };
  };
}
