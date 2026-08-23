/**
 * Get My Moment - Central Dynamic API Client (Business OS Edition)
 * Dynamically resolves host IP so phones and computers on the local network connect seamlessly.
 */

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    return `http://${host}:8000/api/v1`;
  }
  return 'http://localhost:8000/api/v1';
}

export interface PhotographerUser {
  id: string;
  email: string;
  studio_name: string;
  phone?: string;
  city?: string;
  state?: string;
  instagram_handle?: string;
  portfolio_url?: string;
  years_of_experience?: string;
  specializations?: string;
  gst_number?: string;
  is_active: boolean;
  is_verified: boolean;
  verification_status: 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';
  subscription_plan: string;
  subscription_status?: string;
  subscription_valid_until?: string;
  max_storage_gb?: number;
  max_events_per_month?: number;
  logo_url?: string;
  signature_url?: string;
  digital_stamp_url?: string;
  watermark_text?: string;
  created_at: string;
}

export interface PhotographerProfileDetail {
  id: string;
  email: string;
  studio_name: string;
  phone?: string;
  city?: string;
  state?: string;
  instagram_handle?: string;
  portfolio_url?: string;
  years_of_experience?: string;
  specializations?: string;
  gst_number?: string;
  is_active: boolean;
  is_verified: boolean;
  verification_status: string;
  verification_notes?: string;
  verification_submitted_at?: string;
  created_at: string;
  logo_url?: string;
  signature_url?: string;
  digital_stamp_url?: string;
  watermark_text?: string;
  subscription_plan: string;
  subscription_status: string;
  subscription_valid_until?: string;
  max_storage_gb: number;
  max_events_per_month: number;
  total_events: number;
  total_photos: number;
  storage_used_mb: number;
  storage_used_gb: number;
  monthly_events_used: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  photographer_id: string;
  email: string;
  studio_name: string;
  is_verified: boolean;
  verification_status: string;
  subscription_plan: string;
}

export interface EventItem {
  id: string;
  photographer_id: string;
  name: string;
  slug: string;
  access_token: string;
  selection_token?: string;
  event_date?: string;
  cover_image_url?: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'EXPIRED';
  package_amount_inr?: number;
  client_name?: string;
  client_phone?: string;
  client_email?: string;
  venue?: string;
  city?: string;
  allow_downloads: boolean;
  allow_guest_uploads?: boolean;
  require_otp: boolean;
  settings?: Record<string, any>;
  photo_count: number;
  guest_count: number;
  created_at: string;
}

export interface PublicEventItem {
  id: string;
  name: string;
  slug: string;
  access_token: string;
  event_date?: string;
  cover_image_url?: string;
  status: string;
  allow_downloads: boolean;
  allow_guest_uploads?: boolean;
  require_otp: boolean;
  studio_name: string;
  studio_logo_url?: string;
  studio_phone?: string;
  photo_count: number;
}

export interface EventHealthData {
  event_id: string;
  event_name: string;
  status: string;
  pipeline_health: 'HEALTHY' | 'PROCESSING' | 'BACKLOG' | 'ATTENTION_REQUIRED';
  photos_total: number;
  photos_uploaded: number;
  photos_processing: number;
  photos_ready: number;
  photos_failed: number;
  queue_depth: number;
  avg_processing_duration_ms?: number;
  p95_processing_duration_ms?: number;
  avg_ai_inference_ms?: number;
  last_photo_received_at?: string;
  last_guest_ready_at?: string;
}

export interface FolderItem {
  id: string;
  studio_id: string;
  event_id: string;
  parent_id?: string | null;
  name: string;
  slug: string;
  folder_type: string;
  icon?: string | null;
  color?: string | null;
  order_index: number;
  is_locked: boolean;
  allow_guest_view: boolean;
  is_system: boolean;
  photo_count: number;
  total_size_bytes: number;
  created_at: string;
  updated_at: string;
  subfolders?: FolderItem[];
}

export interface PhotoItem {
  id: string;
  event_id: string;
  original_file_name: string;
  sha256_hash: string;
  file_size: number;
  width?: number;
  height?: number;
  mime_type: string;
  status: string;
  ceremony_id?: string;
  folder_id?: string;
  folder_name?: string;
  is_client_selected?: boolean;
  client_comment?: string;
  is_guest_uploaded?: boolean;
  uploaded_by_guest_name?: string;
  uploaded_by_guest_phone?: string;
  faces_detected_count: number;
  thumbnail_url?: string;
  download_url?: string;
  created_at: string;
}

export interface GuestContributor {
  guest_name: string;
  guest_phone: string;
  photo_count: number;
  latest_upload: string;
  photos: Array<{
    id: string;
    original_file_name: string;
    file_size: number;
    status: string;
    created_at: string;
    thumbnail_url: string;
    download_url: string;
  }>;
}

export interface GuestUploadsReportResponse {
  event_id: string;
  allow_guest_uploads: boolean;
  total_guest_photos: number;
  contributors_count: number;
  contributors: GuestContributor[];
}

export interface GuestLead {
  guest_id: string;
  name: string;
  mobile: string;
  otp_verified: boolean;
  face_search_consent: boolean;
  marketing_consent: boolean;
  searches_count: number;
  created_at?: string;
  registered_at?: string;
}

export interface MatchSearchResult {
  search_id: string;
  event_id: string;
  guest_id: string;
  matched_count: number;
  matched_photos: PhotoItem[];
  similarity_scores: Record<string, number>;
  search_latency_ms: number;
  message: string;
}

export interface GuestSessionData {
  sessionToken: string;
  guestId: string;
  eventId: string;
  name: string;
  mobileMasked: string;
  otpVerified: boolean;
  hasConsent: boolean;
  hasMatchedPhotos: boolean;
  matchCount: number;
  expiresAt: string;
}

export function saveGuestSession(eventToken: string, session: GuestSessionData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`gmm_guest_session_${eventToken}`, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to save guest session', e);
  }
}

export function getGuestSession(eventToken: string): GuestSessionData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`gmm_guest_session_${eventToken}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now()) {
      clearGuestSession(eventToken);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function clearGuestSession(eventToken: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`gmm_guest_session_${eventToken}`);
  } catch (e) {
    console.error('Failed to clear guest session', e);
  }
}

export interface LeadItem {
  id: string;
  photographer_id: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  event_type: string;
  event_date?: string;
  venue_city?: string;
  estimated_budget_inr: number;
  stage: 'NEW_LEAD' | 'QUOTE_SENT' | 'NEGOTIATION' | 'BOOKED' | 'LOST';
  notes?: string;
  converted_event_id?: string;
  quotations_count: number;
  created_at: string;
  updated_at: string;
}

export interface QuotationItem {
  id: string;
  lead_id: string;
  package_name: string;
  deliverables: string[];
  price_inr: number;
  tax_pct: number;
  total_amount_inr: number;
  status: string;
  valid_until?: string;
  created_at: string;
}

export interface FinanceSummary {
  event_id: string;
  event_name: string;
  client_name?: string;
  package_amount_inr: number;
  total_received_inr: number;
  total_pending_inr: number;
  crew_cost_inr: number;
  editor_cost_inr: number;
  album_printing_cost_inr: number;
  travel_hotel_cost_inr: number;
  equipment_rental_cost_inr: number;
  misc_expenses_inr: number;
  total_expenses_inr: number;
  net_profit_inr: number;
  profit_margin_pct: number;
  payment_milestones: Array<{
    id: string;
    title: string;
    amount_inr: number;
    due_date?: string;
    status: string;
    received_at?: string;
    payment_mode?: string;
    upi_ref?: string;
    notes?: string;
  }>;
  expenses: Array<{
    id: string;
    category: string;
    description: string;
    amount_inr: number;
    paid_to?: string;
    created_at: string;
  }>;
}

export interface OperationsData {
  event_id: string;
  event_name: string;
  ceremonies: Array<{
    id: string;
    name: string;
    ceremony_date?: string;
    venue?: string;
    order_index: number;
    photo_count: number;
  }>;
  crew_members: Array<{
    id: string;
    name: string;
    role: string;
    phone?: string;
    payout_inr: number;
    payout_status: string;
    notes?: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    assigned_to?: string;
    due_date?: string;
    is_completed: boolean;
  }>;
}

export interface ClientSelectionData {
  event_id: string;
  event_name: string;
  client_name?: string;
  studio_name: string;
  total_photos: number;
  selected_count: number;
  is_submitted: boolean;
  ceremonies: Array<{
    id: string;
    name: string;
    venue?: string;
  }>;
  photos: Array<{
    id: string;
    original_file_name: string;
    ceremony_id?: string;
    is_client_selected: boolean;
    client_comment?: string;
    is_guest_uploaded: boolean;
  }>;
}

export interface CalendarNoteItem {
  id: string;
  date_str: string;
  title: string;
  description?: string;
  category: 'NOTE' | 'REMINDER' | 'BLOCKED' | 'LEAVE';
  created_at: string;
}

export interface CalendarEventSummary {
  id: string;
  name: string;
  client_name?: string;
  venue?: string;
  city?: string;
  package_amount_inr: number;
  status: string;
  event_date?: string;
}

export interface CalendarLeadSummary {
  id: string;
  client_name: string;
  event_type: string;
  stage: string;
  estimated_budget_inr: number;
  event_date?: string;
}

export interface DayAvailabilityItem {
  date_str: string;
  day_of_month: number;
  day_name: string;
  availability_status: 'AVAILABLE' | 'BUSY' | 'BOOKED' | 'BLOCKED';
  events: CalendarEventSummary[];
  leads: CalendarLeadSummary[];
  notes: CalendarNoteItem[];
}

export interface MonthCalendarResponse {
  year: number;
  month: number;
  month_name: string;
  days: DayAvailabilityItem[];
  total_events_in_month: number;
  total_revenue_in_month: number;
  booked_days_count: number;
  available_days_count: number;
}

export interface AdminUserItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AdminPlatformStats {
  total_photographers: number;
  total_events: number;
  total_photos: number;
  total_faces_indexed: number;
  total_guest_searches: number;
  total_platform_gmv_inr: number;
}

export interface AdminPhotographerItem {
  id: string;
  email: string;
  studio_name: string;
  phone?: string;
  is_active: boolean;
  is_verified: boolean;
  subscription_plan: string;
  subscription_status: string;
  subscription_valid_until?: string;
  max_storage_gb: number;
  max_events_per_month: number;
  total_events: number;
  total_photos: number;
  created_at: string;
}

export interface PhotographerEventSummary {
  id: string;
  name: string;
  event_date?: string;
  package_amount_inr: number;
  status: string;
  photo_count: number;
  guest_count: number;
  access_token: string;
  created_at: string;
}

export interface PhotographerLeadSummary {
  id: string;
  client_name: string;
  client_phone: string;
  event_type: string;
  budget_inr: number;
  status: string;
  created_at: string;
}

export interface AdminPhotographerProfileResponse {
  id: string;
  email: string;
  studio_name: string;
  phone?: string;
  city?: string;
  state?: string;
  instagram_handle?: string;
  portfolio_url?: string;
  years_of_experience?: string;
  specializations?: string;
  gst_number?: string;
  is_active: boolean;
  is_verified: boolean;
  verification_status: string;
  verification_notes?: string;
  verification_submitted_at?: string;
  created_at: string;
  updated_at: string;
  subscription_plan: string;
  subscription_status: string;
  subscription_valid_until?: string;
  max_storage_gb: number;
  max_events_per_month: number;
  total_events: number;
  total_photos: number;
  total_guests_matched: number;
  total_crm_leads: number;
  total_contracted_gmv_inr: number;
  total_collected_revenue_inr: number;
  events: PhotographerEventSummary[];
  leads: PhotographerLeadSummary[];
}

export interface AdminEventItem {
  id: string;
  photographer_id: string;
  photographer_email: string;
  studio_name: string;
  name: string;
  slug: string;
  access_token: string;
  event_date?: string;
  package_amount_inr: number;
  status: string;
  photo_count: number;
  guest_count: number;
  created_at: string;
}

class ApiClient {
  public getApiBaseUrl(): string {
    return getApiBaseUrl();
  }

  private get baseUrl(): string {
    return getApiBaseUrl();
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gmm_token');
    }
    return null;
  }

  getAdminToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gmm_admin_token');
    }
    return null;
  }

  private getHeaders(contentType = 'application/json'): HeadersInit {
    const headers: Record<string, string> = {};
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private getAdminHeaders(contentType = 'application/json'): HeadersInit {
    const headers: Record<string, string> = {};
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    const token = this.getAdminToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Auth
  async signup(data: {
    email: string;
    password: string;
    studio_name: string;
    phone?: string;
    city?: string;
    state?: string;
    instagram_handle?: string;
    portfolio_url?: string;
    years_of_experience?: string;
    specializations?: string;
    gst_number?: string;
  }): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/auth/signup`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Signup failed');
    }
    return res.json();
  }

  async photographerRegister(data: {
    email: string;
    password: string;
    studio_name: string;
    phone?: string;
    city?: string;
    state?: string;
    instagram_handle?: string;
    portfolio_url?: string;
    years_of_experience?: string;
    specializations?: string;
    gst_number?: string;
  }): Promise<AuthResponse> {
    return this.signup(data);
  }

  async submitVerification(data: {
    city: string;
    state?: string;
    instagram_handle?: string;
    portfolio_url?: string;
    years_of_experience: string;
    specializations: string;
    gst_number?: string;
  }): Promise<PhotographerUser> {
    const res = await fetch(`${this.baseUrl}/auth/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to submit verification');
    }
    return res.json();
  }

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Login failed');
    }
    return res.json();
  }

  async photographerLogin(email: string, password: string): Promise<AuthResponse> {
    return this.login({ email, password });
  }

  async getMe(): Promise<PhotographerUser> {
    const res = await fetch(`${this.baseUrl}/auth/me`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Session expired');
    return res.json();
  }

  async getDetailedProfile(): Promise<PhotographerProfileDetail> {
    const res = await fetch(`${this.baseUrl}/auth/profile`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load studio profile');
    return res.json();
  }

  async updateStudioProfile(data: Partial<PhotographerProfileDetail>): Promise<PhotographerProfileDetail> {
    const res = await fetch(`${this.baseUrl}/auth/profile`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to update studio profile');
    }
    return res.json();
  }

  async updateDetailedProfile(data: Partial<PhotographerProfileDetail>): Promise<PhotographerProfileDetail> {
    return this.updateStudioProfile(data);
  }

  async upgradeMyPlan(plan_tier: string): Promise<PhotographerProfileDetail> {
    const res = await fetch(`${this.baseUrl}/auth/upgrade-plan`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ plan_tier }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to upgrade plan');
    }
    return res.json();
  }

  // Studio Branding: Logo, Signature & Watermarks
  async uploadStudioLogo(file: File): Promise<{ success: boolean; logo_url: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${this.baseUrl}/auth/branding/logo`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to upload studio logo');
    }
    return res.json();
  }

  async uploadStudioSignature(file: File): Promise<{ success: boolean; signature_url: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${this.baseUrl}/auth/branding/signature`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to upload digital signature');
    }
    return res.json();
  }

  async deleteStudioLogo(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/auth/branding/logo`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete studio logo');
    return res.json();
  }

  async deleteStudioSignature(): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/auth/branding/signature`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete digital signature');
    return res.json();
  }

  async updateStudioBranding(data: { watermark_text?: string }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/auth/branding/settings`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to update branding settings');
    }
    return res.json();
  }

  // Events
  async getEvents(): Promise<EventItem[]> {
    const res = await fetch(`${this.baseUrl}/events`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load events');
    return res.json();
  }

  async createEvent(data: {
    name: string;
    slug?: string;
    event_date?: string;
    package_amount_inr?: number;
    client_name?: string;
    client_phone?: string;
    allow_downloads?: boolean;
    allow_guest_uploads?: boolean;
    require_otp?: boolean;
  }): Promise<EventItem> {
    const res = await fetch(`${this.baseUrl}/events`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create event');
    }
    return res.json();
  }

  async getEvent(id: string): Promise<EventItem> {
    const res = await fetch(`${this.baseUrl}/events/${id}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Event not found');
    return res.json();
  }

  async getEventHealth(id: string): Promise<EventHealthData> {
    const res = await fetch(`${this.baseUrl}/events/${id}/health`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Event health not available');
    return res.json();
  }

  async deleteEvent(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/events/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete event');
    }
  }

  async getPublicEvent(token: string): Promise<PublicEventItem> {
    return this.getPublicEventByToken(token);
  }

  async getPublicEventByToken(token: string): Promise<PublicEventItem> {
    const res = await fetch(`${this.baseUrl}/events/public/by-token/${token}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Event not found or inactive');
    }
    return res.json();
  }

  // Photos
  async uploadPhotos(eventId: string, files: File[], folderId?: string): Promise<{ uploaded_count: number; duplicates_count: number }> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    if (folderId) {
      formData.append('folder_id', folderId);
    }
    const res = await fetch(`${this.baseUrl}/events/${eventId}/photos`, {
      method: 'POST',
      headers: this.getHeaders(''),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  }

  async getEventPhotos(eventId: string, folderId?: string): Promise<PhotoItem[]> {
    const url = folderId ? `${this.baseUrl}/events/${eventId}/photos?folder_id=${folderId}` : `${this.baseUrl}/events/${eventId}/photos`;
    const res = await fetch(url, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load event photos');
    return res.json();
  }

  // Master Folder Management
  async getFolders(eventId: string): Promise<FolderItem[]> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/folders`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load folders');
    return res.json();
  }

  async createFolder(eventId: string, data: { name: string; parent_id?: string | null; icon?: string; color?: string; order_index?: number; allow_guest_view?: boolean }): Promise<FolderItem> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/folders`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create folder');
    }
    return res.json();
  }

  async updateFolder(eventId: string, folderId: string, data: { name?: string; icon?: string; color?: string; order_index?: number; is_locked?: boolean; allow_guest_view?: boolean }): Promise<FolderItem> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/folders/${folderId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to update folder');
    }
    return res.json();
  }

  async deleteFolder(eventId: string, folderId: string, mode: 'MOVE_TO_UNCATEGORIZED' | 'DELETE_PHOTOS' = 'MOVE_TO_UNCATEGORIZED'): Promise<{ message: string }> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/folders/${folderId}?mode=${mode}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to delete folder');
    }
    return res.json();
  }

  async generateWeddingFolders(eventId: string): Promise<FolderItem[]> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/folders/generate-wedding-preset`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to generate wedding preset');
    }
    return res.json();
  }

  async movePhotosToFolder(eventId: string, photoIds: string[], destinationFolderId: string): Promise<{ moved_count: number }> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/folders/move-photos`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        photo_ids: photoIds,
        destination_folder_id: destinationFolderId,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to move photos');
    }
    return res.json();
  }

  getFolderZipDownloadUrl(eventId: string, folderId: string): string {
    return `${this.baseUrl}/events/${eventId}/folders/${folderId}/download-zip`;
  }

  // CRM & Leads
  async getLeads(stage?: string): Promise<LeadItem[]> {
    const url = stage ? `${this.baseUrl}/crm/leads?stage=${stage}` : `${this.baseUrl}/crm/leads`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to load leads');
    return res.json();
  }

  async createLead(data: {
    client_name: string;
    client_phone: string;
    client_email?: string;
    event_type: string;
    event_date?: string;
    venue_city?: string;
    estimated_budget_inr: number;
    notes?: string;
  }): Promise<LeadItem> {
    const res = await fetch(`${this.baseUrl}/crm/leads`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create lead');
    }
    return res.json();
  }

  async updateLead(leadId: string, data: Partial<LeadItem>): Promise<LeadItem> {
    const res = await fetch(`${this.baseUrl}/crm/leads/${leadId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update lead');
    return res.json();
  }

  async convertLeadToEvent(leadId: string): Promise<{ event_id: string; message: string }> {
    const res = await fetch(`${this.baseUrl}/crm/leads/${leadId}/convert-to-event`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to convert lead to event');
    return res.json();
  }

  async getLeadQuotations(leadId: string): Promise<QuotationItem[]> {
    const res = await fetch(`${this.baseUrl}/crm/leads/${leadId}/quotations`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load quotations');
    return res.json();
  }

  async createLeadQuotation(leadId: string, data: {
    package_name: string;
    deliverables: string[];
    price_inr: number;
    tax_pct: number;
  }): Promise<QuotationItem> {
    const res = await fetch(`${this.baseUrl}/crm/leads/${leadId}/quotations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create quotation');
    return res.json();
  }

  // Finance & Profitability
  async getEventFinance(eventId: string): Promise<FinanceSummary> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/finance`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load event finance');
    return res.json();
  }

  async addPaymentMilestone(eventId: string, data: {
    title: string;
    amount_inr: number;
    due_date?: string;
    status?: string;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/finance/payments`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add payment milestone');
    return res.json();
  }

  async updatePaymentMilestone(eventId: string, milestoneId: string, data: {
    status: string;
    payment_mode?: string;
    upi_ref?: string;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/finance/payments/${milestoneId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update payment');
    return res.json();
  }

  async logEventExpense(eventId: string, data: {
    category: string;
    description: string;
    amount_inr: number;
    paid_to?: string;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/finance/expenses`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to log expense');
    return res.json();
  }

  // Operations & Command Center
  async getEventOperations(eventId: string): Promise<OperationsData> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/operations`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load operations');
    return res.json();
  }

  async addCeremony(eventId: string, data: { name: string; venue?: string; ceremony_date?: string }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/operations/ceremonies`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add ceremony');
    return res.json();
  }

  async addCrewMember(eventId: string, data: {
    name: string;
    role: string;
    phone?: string;
    payout_inr: number;
    payout_status?: string;
  }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/operations/crew`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to assign crew member');
    return res.json();
  }

  async updateCrewPayout(eventId: string, crewId: string, statusVal: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/operations/crew/${crewId}/payout?status_val=${statusVal}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to update payout');
    return res.json();
  }

  async addEventTask(eventId: string, data: { title: string; assigned_to?: string; due_date?: string }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/operations/tasks`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add task');
    return res.json();
  }

  async toggleEventTask(eventId: string, taskId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/operations/tasks/${taskId}/toggle`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to toggle task');
    return res.json();
  }

  // Client Selection & Album Proofing
  async getClientSelection(selectionToken: string): Promise<ClientSelectionData> {
    const res = await fetch(`${this.baseUrl}/selection/${selectionToken}`);
    if (!res.ok) throw new Error('Invalid selection link');
    return res.json();
  }

  async togglePhotoSelection(selectionToken: string, photoId: string, isSelected: boolean, comment?: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/selection/${selectionToken}/photos/${photoId}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_selected: isSelected, comment }),
    });
    if (!res.ok) throw new Error('Failed to toggle photo selection');
    return res.json();
  }

  async submitAlbumSelection(selectionToken: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/selection/${selectionToken}/submit`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to submit album selection');
    return res.json();
  }

  // Guest Uploads
  async guestUploadPhotos(token: string, files: File[], guestName?: string, guestPhone?: string): Promise<{ uploaded_count: number; guest_name: string; message: string }> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    if (guestName) formData.append('guest_name', guestName);
    if (guestPhone) formData.append('guest_phone', guestPhone);

    const res = await fetch(`${this.baseUrl}/events/public/${token}/guest-upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Guest upload failed');
    }
    return res.json();
  }

  async getGuestUploadsReport(eventId: string): Promise<GuestUploadsReportResponse> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/guest-uploads`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load guest uploads report');
    return res.json();
  }

  async toggleGuestUploads(eventId: string): Promise<{ event_id: string; allow_guest_uploads: boolean; message: string }> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/toggle-guest-uploads`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to toggle guest uploads');
    return res.json();
  }

  // Guest Flow
  async registerGuest(eventId: string, data: { name: string; mobile: string }): Promise<{ guest_id: string; requires_otp: boolean }> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/guests/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Registration failed');
    }
    return res.json();
  }

  async guestLogin(eventId: string, mobile: string): Promise<GuestSessionData & { requires_otp: boolean }> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/guests/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.detail && err.detail !== 'Not Found' 
        ? err.detail 
        : 'No registered guest found with this mobile number for this event. Please Sign Up.';
      throw new Error(msg);
    }
    const data = await res.json();
    return {
      sessionToken: data.session_token,
      guestId: data.guest_id,
      eventId: data.event_id,
      name: data.name,
      mobileMasked: data.mobile_masked,
      otpVerified: data.otp_verified,
      requires_otp: data.requires_otp,
      hasConsent: data.has_consent,
      hasMatchedPhotos: data.has_matched_photos,
      matchCount: data.match_count,
      expiresAt: data.expires_at,
    };
  }

  async validateGuestSession(eventId: string, guestId: string): Promise<GuestSessionData | null> {
    try {
      const res = await fetch(`${this.baseUrl}/events/${eventId}/guests/${guestId}/session/validate`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.is_valid) return null;
      return {
        sessionToken: '',
        guestId: data.guest_id,
        eventId: data.event_id,
        name: data.name,
        mobileMasked: data.mobile_masked,
        otpVerified: true,
        hasConsent: data.has_consent,
        hasMatchedPhotos: data.has_matched_photos,
        matchCount: data.match_count,
        expiresAt: data.expires_at,
      };
    } catch {
      return null;
    }
  }

  async getCachedGuestMatch(eventId: string, guestId: string): Promise<MatchSearchResult | null> {
    try {
      const res = await fetch(`${this.baseUrl}/events/${eventId}/guests/${guestId}/cached-match`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.status !== 'READY') return null;
      return {
        search_id: data.search_id,
        event_id: data.event_id,
        guest_id: data.guest_id,
        matched_count: data.matched_count,
        matched_photos: data.matched_photos,
        similarity_scores: data.similarity_scores,
        search_latency_ms: 0,
        message: data.message,
      };
    } catch {
      return null;
    }
  }

  async verifyGuestOTP(guestId: string, otpCode: string): Promise<{ verified: boolean }> {
    return this.verifyOtp(guestId, otpCode);
  }

  async verifyOtp(guestId: string, otpCode: string): Promise<{ verified: boolean }> {
    const res = await fetch(`${this.baseUrl}/guests/${guestId}/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guest_id: guestId, otp_code: otpCode }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Invalid verification code');
    }
    return res.json();
  }

  async recordConsent(guestId: string, face_search_consent: boolean, marketing_consent: boolean): Promise<any> {
    return this.submitConsent(guestId, { face_search_consent, marketing_consent });
  }

  async submitConsent(guestId: string, data: { face_search_consent: boolean; marketing_consent: boolean }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/guests/${guestId}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guest_id: guestId, ...data }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Consent submission failed');
    }
    return res.json();
  }

  async searchSelfie(eventId: string, guestId: string, selfieBlob: Blob): Promise<MatchSearchResult> {
    return this.searchBySelfie(eventId, guestId, selfieBlob);
  }

  async searchBySelfie(eventId: string, guestId: string, selfieBlob: Blob): Promise<MatchSearchResult> {
    const formData = new FormData();
    formData.append('selfie', selfieBlob, 'selfie.jpg');

    const res = await fetch(`${this.baseUrl}/events/${eventId}/guests/${guestId}/search`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Facial search failed');
    }
    return res.json();
  }

  async getEventLeads(eventId: string): Promise<GuestLead[]> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/leads`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load leads');
    return res.json();
  }

  getThumbnailUrl(photoId: string): string {
    return `${this.baseUrl}/photos/${photoId}/thumbnail`;
  }

  getQRUrl(eventId: string): string {
    return `${this.baseUrl}/events/${eventId}/qr`;
  }

  getQrCodeUrl(eventId: string): string {
    return `${this.baseUrl}/events/${eventId}/qr`;
  }

  getDownloadUrl(photoId: string): string {
    return `${this.baseUrl}/photos/${photoId}/download`;
  }

  getDownloadAllZipUrl(eventId: string, filterType: 'all' | 'studio' | 'guest' = 'all'): string {
    return `${this.baseUrl}/events/${eventId}/photos/download-all-zip?filter_type=${filterType}`;
  }

  // Studio Calendar & Availability
  async getMonthCalendar(year?: number, month?: number): Promise<MonthCalendarResponse> {
    let url = `${this.baseUrl}/calendar/month`;
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    if (params.toString()) url += `?${params.toString()}`;

    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to load studio calendar');
    return res.json();
  }

  async createCalendarNote(data: {
    date_str: string;
    title: string;
    description?: string;
    category?: string;
  }): Promise<CalendarNoteItem> {
    const res = await fetch(`${this.baseUrl}/calendar/notes`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Failed to create calendar note');
    }
    return res.json();
  }

  async deleteCalendarNote(noteId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/calendar/notes/${noteId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to delete note');
    }
  }

  async checkDayAvailability(date_str: string): Promise<DayAvailabilityItem> {
    const res = await fetch(`${this.baseUrl}/calendar/check-date?date_str=${date_str}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to check date availability');
    }
    return res.json();
  }

  // Super Admin & Platform Owner Portal
  async adminLogin(data: { email: string; password: string }): Promise<{ access_token: string; admin: AdminUserItem }> {
    const res = await fetch(`${this.baseUrl}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Superadmin login failed');
    }
    return res.json();
  }

  async adminGetMe(): Promise<AdminUserItem> {
    const res = await fetch(`${this.baseUrl}/admin/auth/me`, {
      headers: this.getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Admin session expired');
    return res.json();
  }

  async adminGetStats(): Promise<AdminPlatformStats> {
    const res = await fetch(`${this.baseUrl}/admin/stats`, {
      headers: this.getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load platform stats');
    return res.json();
  }

  async adminGetPhotographers(): Promise<AdminPhotographerItem[]> {
    const res = await fetch(`${this.baseUrl}/admin/photographers`, {
      headers: this.getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load photographers');
    return res.json();
  }

  async adminUpdatePhotographerStatus(photographerId: string, data: { is_active?: boolean; is_verified?: boolean }): Promise<{ message: string; is_active: boolean; is_verified: boolean }> {
    const res = await fetch(`${this.baseUrl}/admin/photographers/${photographerId}/status`, {
      method: 'PATCH',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update photographer status');
    return res.json();
  }

  async adminGetPhotographerProfile(photographerId: string): Promise<AdminPhotographerProfileResponse> {
    const res = await fetch(`${this.baseUrl}/admin/photographers/${photographerId}/profile`, {
      headers: this.getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load photographer profile');
    return res.json();
  }

  async adminUpdatePhotographerSubscription(
    photographerId: string,
    data: {
      subscription_plan: string;
      subscription_status?: string;
      subscription_valid_until?: string;
      max_storage_gb?: number;
      max_events_per_month?: number;
    }
  ): Promise<{
    message: string;
    subscription_plan: string;
    subscription_status: string;
    subscription_valid_until?: string;
    max_storage_gb: number;
    max_events_per_month: number;
  }> {
    const res = await fetch(`${this.baseUrl}/admin/photographers/${photographerId}/subscription`, {
      method: 'PATCH',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update subscription');
    return res.json();
  }

  async adminUpdatePhotographerProfile(
    photographerId: string,
    data: {
      studio_name?: string;
      email?: string;
      phone?: string;
      is_active?: boolean;
      is_verified?: boolean;
    }
  ): Promise<{ message: string }> {
    const res = await fetch(`${this.baseUrl}/admin/photographers/${photographerId}/profile`, {
      method: 'PATCH',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  }

  async adminDeletePhotographer(photographerId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/admin/photographers/${photographerId}`, {
      method: 'DELETE',
      headers: this.getAdminHeaders(),
    });
    if (!res.ok && res.status !== 204) throw new Error('Failed to delete photographer');
  }

  async adminGetEvents(): Promise<AdminEventItem[]> {
    const res = await fetch(`${this.baseUrl}/admin/events`, {
      headers: this.getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load events');
    return res.json();
  }

  async adminDeleteEvent(eventId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/admin/events/${eventId}`, {
      method: 'DELETE',
      headers: this.getAdminHeaders(),
    });
    if (!res.ok && res.status !== 204) throw new Error('Failed to delete event');
  }

  async adminGetTelemetry(): Promise<{
    status: string;
    detector_model: string;
    recognizer_model: string;
    vector_search_engine: string;
    total_embeddings_stored: number;
    total_guest_searches_served: number;
    system_time: string;
  }> {
    const res = await fetch(`${this.baseUrl}/admin/telemetry`, {
      headers: this.getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load AI telemetry');
    return res.json();
  }

  // --- SUBSCRIPTION, PAYMENT & GST BILLING ---
  async getSubscriptionPlans(): Promise<Array<{
    plan_key: string;
    name: string;
    description: string;
    monthly_price_inr: number;
    annual_price_inr: number;
    currency: string;
    storage_limit_gb: number;
    event_limit_monthly: number;
    ai_face_limit_monthly: number;
    whatsapp_limit_monthly: number;
    watermark_removal_allowed: boolean;
    client_selection_portal_allowed: boolean;
    crm_pipeline_allowed: boolean;
    custom_branding_allowed: boolean;
    is_popular: boolean;
  }>> {
    const res = await fetch(`${this.baseUrl}/subscription/plans`);
    if (!res.ok) throw new Error('Failed to load subscription plans');
    return res.json();
  }

  async createSubscriptionOrder(data: {
    plan_key: string;
    billing_cycle?: 'MONTHLY' | 'ANNUAL';
    buyer_state?: string;
  }): Promise<{
    order_id: string;
    gateway_order_id: string;
    gateway_name: string;
    key_id: string;
    amount_inr: number;
    taxable_amount_inr: number;
    cgst_inr: number;
    sgst_inr: number;
    igst_inr: number;
    total_tax_inr: number;
    currency: string;
    plan_key: string;
    plan_name: string;
    billing_cycle: string;
  }> {
    const res = await fetch(`${this.baseUrl}/subscription/create-order`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create subscription order');
    }
    return res.json();
  }

  async verifySubscriptionPayment(data: {
    gateway_order_id: string;
    gateway_payment_id: string;
    gateway_signature: string;
    payment_method?: string;
    payment_method_details?: string;
  }): Promise<{
    success: boolean;
    already_processed: boolean;
    message: string;
    plan_key: string;
    plan_name: string;
    storage_gb: number;
    valid_until: string;
    invoice_number: string;
    amount_paid_inr: number;
  }> {
    const res = await fetch(`${this.baseUrl}/subscription/verify-payment`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Payment verification failed');
    }
    return res.json();
  }

  async getSubscriptionInvoices(): Promise<Array<{
    id: string;
    invoice_number: string;
    plan_name: string;
    invoice_date: string;
    billing_period_start: string;
    billing_period_end: string;
    taxable_amount_inr: number;
    total_tax_inr: number;
    total_amount_inr: number;
    status: string;
    buyer_studio_name: string;
    seller_legal_name: string;
  }>> {
    const res = await fetch(`${this.baseUrl}/subscription/invoices`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load invoices');
    return res.json();
  }

  getInvoiceHtmlUrl(invoiceId: string, autoprint: boolean = true): string {
    const token = this.getToken() || this.getAdminToken() || '';
    const params = new URLSearchParams();
    if (token) params.append('token', token);
    if (autoprint) params.append('autoprint', 'true');
    const qs = params.toString();
    return `${this.baseUrl}/subscription/invoices/${invoiceId}/html${qs ? '?' + qs : ''}`;
  }

  async adminGetRevenueAnalytics(): Promise<{
    mrr_inr: number;
    arr_inr: number;
    total_gross_gmv_inr: number;
    total_gateway_fees_inr: number;
    total_net_bank_settled_inr: number;
    active_paid_studios_count: number;
    total_transactions_count: number;
    recent_transactions: Array<any>;
    payment_gateway: string;
    payment_mode: string;
  }> {
    const res = await fetch(`${this.baseUrl}/subscription/admin/revenue`, {
      headers: this.getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load revenue analytics');
    return res.json();
  }

  // --- PASSWORD-PROTECTED GATEWAY & BANK VAULT ---
  async adminUnlockGatewayVault(password: string): Promise<{
    unlocked: boolean;
    message: string;
    admin_name: string;
    unlocked_at: string;
  }> {
    const res = await fetch(`${this.baseUrl}/admin/gateway-settings/unlock`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Incorrect SuperAdmin password');
    }
    return res.json();
  }

  async adminGetGatewaySettings(): Promise<{
    id: string;
    beneficiary_name: string;
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    account_type: string;
    business_upi_id: string;
    bank_branch?: string;
    gateway_provider: string;
    gateway_mode: string;
    key_id: string;
    key_secret: string;
    webhook_secret: string;
    seller_legal_name: string;
    seller_address: string;
    seller_gstin: string;
    seller_pan: string;
    seller_state: string;
    seller_state_code: string;
    seller_support_email: string;
    gst_rate_pct: number;
    gst_pricing_mode: string;
    authorized_signatory_name?: string;
    authorized_signatory_designation?: string;
    digital_stamp_url?: string;
    digital_signature_url?: string;
    last_updated_by?: string;
    updated_at: string;
  }> {
    const res = await fetch(`${this.baseUrl}/admin/gateway-settings`, {
      headers: this.getAdminHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to load gateway settings');
    }
    return res.json();
  }

  async adminGetSubscriptionInvoices(): Promise<Array<{
    id: string;
    invoice_number: string;
    invoice_date: string;
    photographer_id: string;
    buyer_studio_name: string;
    buyer_email: string;
    buyer_phone?: string;
    buyer_city?: string;
    buyer_state: string;
    buyer_gstin?: string;
    plan_name: string;
    billing_period_start: string;
    billing_period_end: string;
    taxable_amount_inr: number;
    cgst_amount_inr: number;
    sgst_amount_inr: number;
    igst_amount_inr: number;
    total_tax_inr: number;
    total_amount_inr: number;
    status: string;
  }>> {
    const res = await fetch(`${this.baseUrl}/subscription/admin/invoices`, {
      headers: this.getAdminHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load admin subscription invoices');
    return res.json();
  }

  async adminUpdateGatewaySettings(data: any): Promise<{
    success: boolean;
    message: string;
    updated_at: string;
  }> {
    const res = await fetch(`${this.baseUrl}/admin/gateway-settings`, {
      method: 'PUT',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update gateway and bank settings');
    }
    return res.json();
  }

  // -------------------------------------------------------------
  // CLIENT BILLING, GST & INVOICING (Flow A: Studio -> Client)
  // -------------------------------------------------------------
  async getTaxProfile() {
    const res = await fetch(`${this.baseUrl}/billing/tax-profile`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load tax & settlement profile');
    return res.json();
  }

  async updateTaxProfile(data: any) {
    const res = await fetch(`${this.baseUrl}/billing/tax-profile`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update tax profile');
    }
    return res.json();
  }

  async getClientInvoices(status?: string) {
    const url = status ? `${this.baseUrl}/billing/invoices?status=${status}` : `${this.baseUrl}/billing/invoices`;
    const res = await fetch(url, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to load client invoices');
    return res.json();
  }

  async createClientInvoice(data: any) {
    const res = await fetch(`${this.baseUrl}/billing/invoices`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create client invoice');
    }
    return res.json();
  }

  async getClientInvoiceDetails(id: string) {
    const res = await fetch(`${this.baseUrl}/billing/invoices/${id}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load invoice details');
    return res.json();
  }

  async recordClientPayment(id: string, data: any) {
    const res = await fetch(`${this.baseUrl}/billing/invoices/${id}/record-payment`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to record payment');
    }
    return res.json();
  }

  async cancelClientInvoice(id: string) {
    const res = await fetch(`${this.baseUrl}/billing/invoices/${id}/cancel`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to cancel invoice');
    return res.json();
  }

  getClientInvoiceHtmlUrl(id: string, autoprint: boolean = true): string {
    const token = this.getToken();
    return `${this.baseUrl}/billing/invoices/${id}/html?token=${encodeURIComponent(token || '')}${autoprint ? '&autoprint=true' : ''}`;
  }

  async getPublicSharedInvoice(token: string) {
    const res = await fetch(`${this.baseUrl}/billing/share/${token}`);
    if (!res.ok) throw new Error('Failed to load shared invoice');
    return res.json();
  }

  getPublicSharedInvoiceHtmlUrl(token: string): string {
    return `${this.baseUrl}/billing/share/${token}/html?autoprint=true`;
  }

  async getQuotations() {
    const res = await fetch(`${this.baseUrl}/billing/quotations`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load quotations');
    return res.json();
  }

  async createQuotation(data: any) {
    const res = await fetch(`${this.baseUrl}/billing/quotations`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create quotation');
    }
    return res.json();
  }

  async convertQuotationToInvoice(id: string) {
    const res = await fetch(`${this.baseUrl}/billing/quotations/${id}/convert-to-invoice`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to convert quotation');
    }
    return res.json();
  }

  async getFinanceStats() {
    const res = await fetch(`${this.baseUrl}/billing/stats`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load finance stats');
    return res.json();
  }

  getGstr1ExportUrl(startDate?: string, endDate?: string): string {
    const token = this.getToken();
    let url = `${this.baseUrl}/billing/exports/gstr1?token=${encodeURIComponent(token || '')}`;
    if (startDate) url += `&start_date=${encodeURIComponent(startDate)}`;
    if (endDate) url += `&end_date=${encodeURIComponent(endDate)}`;
    return url;
  }

  // Contact & Support Tickets
  async submitContact(data: {
    name: string;
    email: string;
    phone?: string;
    studio_name?: string;
    category?: string;
    subject: string;
    message: string;
  }): Promise<{ success: boolean; ticket_id: string; message: string }> {
    const res = await fetch(`${this.baseUrl}/contact/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit inquiry');
    }
    return res.json();
  }

  async submitPhotographerTicket(data: {
    category: string;
    urgency: string;
    subject: string;
    description: string;
    event_reference_id?: string;
  }): Promise<{ success: boolean; ticket_id: string; message: string }> {
    const res = await fetch(`${this.baseUrl}/contact/photographer-ticket`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit support ticket');
    }
    return res.json();
  }

  // Wireless Camera Ingestion
  async getWirelessCredentials(eventId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/wireless/events/${eventId}/credentials`);
    if (!res.ok) throw new Error('Failed to load wireless credentials');
    return res.json();
  }

  async wirelessHttpIngest(eventId: string, formData: FormData): Promise<any> {
    const res = await fetch(`${this.baseUrl}/wireless/events/${eventId}/http-ingest`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to ingest wireless photo');
    return res.json();
  }

  // Crew Operations & Field Portal
  async crewLogin(phone: string, pin?: string): Promise<{ access_token: string; crew_id: string; name: string; phone: string; total_assigned_events: number }> {
    const res = await fetch(`${this.baseUrl}/crew/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, pin }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed. No crew assignments found for this number.');
    }
    const data = await res.json();
    if (typeof window !== 'undefined' && data.access_token) {
      localStorage.setItem('gmm_crew_token', data.access_token);
      localStorage.setItem('gmm_crew_phone', data.phone);
    }
    return data;
  }

  async getCrewDashboard(phone?: string): Promise<any> {
    const crewToken = typeof window !== 'undefined' ? localStorage.getItem('gmm_crew_token') : null;
    const crewPhone = phone || (typeof window !== 'undefined' ? localStorage.getItem('gmm_crew_phone') : null);
    const headers: Record<string, string> = {};
    if (crewToken) headers['Authorization'] = `Bearer ${crewToken}`;
    
    const url = crewPhone ? `${this.baseUrl}/crew/dashboard?phone=${encodeURIComponent(crewPhone)}` : `${this.baseUrl}/crew/dashboard`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to load crew dashboard');
    }
    return res.json();
  }

  async setActiveCeremony(eventId: string, folderId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/crew/events/${eventId}/set-active-ceremony`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: folderId }),
    });
    if (!res.ok) throw new Error('Failed to set active ceremony');
    return res.json();
  }

  async crewUploadPhotos(eventId: string, formData: FormData): Promise<any> {
    const res = await fetch(`${this.baseUrl}/crew/events/${eventId}/upload-photos`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload crew photos');
    return res.json();
  }
}


export const api = new ApiClient();
