export type UserStatus = "ACTIVE" | "WARNED" | "SUSPENDED" | "BANNED";

export type RequestStatus =
  | "DRAFT"
  | "OPEN"
  | "MATCH_PENDING"
  | "MATCHED"
  | "CANCELLED"
  | "EXPIRED"
  | "COMPLETED";

export type ApplicationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN"
  | "EXPIRED"
  | "EXPIRED_PAYMENT"
  | "CLOSED";

export type MatchStatus =
  | "PENDING_PAYMENT"
  | "MATCHED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED_PAYMENT";

export type PaymentStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export type ReportStatus =
  | "OPEN"
  | "REVIEWING"
  | "RESOLVED"
  | "DISMISSED"
  | "WARNING"
  | "SUSPENDED"
  | "BANNED";

export type BookingStatus = "PENDING" | "MARKED_DONE";

export interface Profile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  real_name_private: string | null;
  birth_year_private: number | null;
  age_verified: number;
  account_verified: number;
  terms_agreed: number;
  profile_completed: number;
  successful_match_count: number;
  free_match_used: number;
  rating_avg: number | null;
  rating_count: number;
  status: UserStatus;
  is_admin: number;
  created_at: string;
  updated_at: string;
}

export interface PublicProfile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  successful_match_count: number;
  rating_avg: number | null;
  rating_count: number;
  created_at: string;
  account_verified: number;
  status: UserStatus;
}

export interface PrivateContacts {
  user_id: string;
  line_id: string | null;
  instagram_handle: string | null;
  threads_handle: string | null;
  phone_private: string | null;
}

export interface KtvBrand {
  id: string;
  name: string;
  booking_url: string;
  logo_url: string | null;
  enabled: number;
}

export interface KtvVenue {
  id: string;
  brand_id: string;
  name: string;
  city: string;
  district: string;
  address: string;
  enabled: number;
  created_at: string;
}

export interface SingRequest {
  id: string;
  initiator_id: string;
  venue_id: string;
  sing_at: string;
  duration_hours: number;
  music_genres: string;
  preferences: string;
  note: string | null;
  estimated_total_cost_2p: number | null;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export interface RequestCardData {
  id: string;
  sing_at: string;
  duration_hours: number;
  music_genres: string[];
  preferences: string[];
  note: string | null;
  estimated_total_cost_2p: number | null;
  status: RequestStatus;
  created_at: string;
  brand_id: string;
  brand_name: string;
  venue_name: string;
  city: string;
  district: string;
  age_band: number | null;
  initiator: PublicProfile;
}

export interface MatchApplication {
  id: string;
  request_id: string;
  applicant_id: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

export interface MatchRecord {
  id: string;
  request_id: string;
  initiator_id: string;
  participant_id: string;
  status: MatchStatus;
  payment_deadline: string | null;
  booking_status: BookingStatus;
  created_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
}

export interface PaymentRecord {
  id: string;
  match_id: string;
  user_id: string;
  fee_due: number;
  payment_required: number;
  provider: string;
  transaction_id: string | null;
  status: PaymentStatus;
  paid_at: string | null;
  created_at: string;
}

export interface ReviewRecord {
  id: string;
  match_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  tags: string;
  comment: string | null;
  created_at: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  payload: string;
  is_read: number;
  created_at: string;
}

export interface SessionUser {
  id: string;
  email: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  id?: string;
}
