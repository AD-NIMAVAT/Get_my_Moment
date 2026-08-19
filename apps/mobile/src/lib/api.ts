import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Default base URL: Points to local LAN Ethernet backend server or live tunnel
export const DEFAULT_API_BASE = 'http://192.168.31.37:8000/api/v1';
const CONFIG_FILE = `${FileSystem.documentDirectory || ''}gmm_api_config.json`;

export interface AuthResponse {
  access_token: string;
  token_type: string;
  photographer_id: string;
  studio_name: string;
  email: string;
  is_verified?: boolean;
  subscription_plan?: string;
}

export interface CrewLoginResponse {
  access_token: string;
  token_type: string;
  crew_id: string;
  name: string;
  phone: string;
  total_assigned_events: number;
}

export interface CrewAssignedEvent {
  crew_id: string;
  event_id: string;
  event_name: string;
  access_token: string;
  event_date?: string;
  role: string;
  payout_inr: number;
  payout_status: string;
  notes?: string;
  studio_name: string;
  ceremonies: Array<{
    id: string;
    name: string;
    venue?: string;
    ceremony_date?: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    is_completed: boolean;
    assigned_to?: string;
  }>;
  photo_count: number;
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
  photo_count: number;
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
  is_guest_uploaded?: boolean;
  uploaded_by_guest_name?: string;
  uploaded_by_guest_phone?: string;
  faces_detected_count: number;
  created_at: string;
}

export interface MatchSearchResult {
  search_id: string;
  event_id: string;
  guest_id: string;
  total_matches: number;
  matched_photos: Array<{
    photo_id: string;
    similarity_score: number;
    thumbnail_url: string;
    download_url: string;
    original_file_name: string;
    file_size: number;
    created_at: string;
  }>;
  search_latency_ms: number;
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

export interface EventItem {
  id: string;
  photographer_id: string;
  name: string;
  slug: string;
  access_token: string;
  selection_token?: string;
  event_date?: string;
  cover_image_url?: string;
  status: string;
  package_amount_inr?: number;
  client_name?: string;
  client_phone?: string;
  allow_downloads: boolean;
  allow_guest_uploads?: boolean;
  require_otp: boolean;
  photo_count: number;
  guest_count: number;
  created_at: string;
}

export interface CrmLeadItem {
  id: string;
  event_id: string;
  name: string;
  phone: string;
  selfie_url?: string;
  matches_found_count: number;
  created_at: string;
}

export interface MilestoneItem {
  id: string;
  title: string;
  amount_inr: number;
  due_date?: string;
  is_paid: boolean;
  paid_date?: string;
}

export interface FinanceSummary {
  package_amount_inr: number;
  total_received_inr: number;
  balance_remaining_inr: number;
  milestones: MilestoneItem[];
}

export interface CeremonyItem {
  id: string;
  name: string;
  venue?: string;
  ceremony_date?: string;
}

export interface CrewMemberItem {
  id: string;
  name: string;
  role: string;
  phone?: string;
  payout_inr: number;
  payout_status: string;
  notes?: string;
}

export interface EventTaskItem {
  id: string;
  title: string;
  assigned_to?: string;
  is_completed: boolean;
}

export interface OperationsSummary {
  ceremonies: CeremonyItem[];
  crew_members: CrewMemberItem[];
  tasks: EventTaskItem[];
}

class MobileApiClient {
  private baseUrl: string = DEFAULT_API_BASE;
  private token: string | null = null;
  private crewPhone: string | null = null;

  constructor() {
    this.initFromStorage();
  }

  async initFromStorage(): Promise<string> {
    try {
      if (FileSystem.documentDirectory) {
        const info = await FileSystem.getInfoAsync(CONFIG_FILE);
        if (info.exists) {
          const raw = await FileSystem.readAsStringAsync(CONFIG_FILE);
          const parsed = JSON.parse(raw);
          if (parsed && parsed.baseUrl) {
            this.baseUrl = parsed.baseUrl.replace(/\/$/, '');
          }
          if (parsed && parsed.token) {
            this.token = parsed.token;
          }
        }
      }
    } catch (e) {
      // silent fallback
    }
    return this.baseUrl;
  }

  async setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
    try {
      if (FileSystem.documentDirectory) {
        await FileSystem.writeAsStringAsync(CONFIG_FILE, JSON.stringify({
          baseUrl: this.baseUrl,
          token: this.token,
        }));
      }
    } catch (e) {
      // silent fallback
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  setCrewPhone(phone: string | null) {
    this.crewPhone = phone;
  }

  getCrewPhone(): string | null {
    return this.crewPhone;
  }

  private getHeaders(contentType: string = 'application/json') {
    const headers: Record<string, string> = {
      'Bypass-Tunnel-Reminder': 'true',
    };
    if (contentType) headers['Content-Type'] = contentType;
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return headers;
  }

  getThumbnailUrl(photoId: string): string {
    return `${this.baseUrl}/photos/${photoId}/thumbnail`;
  }

  getDownloadUrl(photoId: string): string {
    return `${this.baseUrl}/photos/${photoId}/download`;
  }

  getDownloadAllZipUrl(eventId: string, filterType: 'all' | 'studio' | 'guest' = 'all'): string {
    return `${this.baseUrl}/events/${eventId}/photos/download-all-zip?filter_type=${filterType}`;
  }

  // --- STUDIO AUTHENTICATION ---
  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Login failed');
    }
    const result = await res.json();
    this.setToken(result.access_token);
    return result;
  }

  async signup(data: any): Promise<AuthResponse> {
    const res = await fetch(`${this.baseUrl}/auth/signup`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Signup failed');
    }
    const result = await res.json();
    this.setToken(result.access_token);
    return result;
  }

  // --- CREW / STAFF AUTH & DUTIES ---
  async crewLogin(phone: string, pin?: string): Promise<CrewLoginResponse> {
    const res = await fetch(`${this.baseUrl}/crew/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ phone, pin }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Crew login failed');
    }
    const result = await res.json();
    this.setToken(result.access_token);
    this.setCrewPhone(result.phone);
    return result;
  }

  async getCrewAssignments(phone?: string): Promise<CrewAssignedEvent[]> {
    const activePhone = phone || this.crewPhone || '';
    const res = await fetch(`${this.baseUrl}/crew/my-assignments?phone=${encodeURIComponent(activePhone)}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load crew assignments');
    return res.json();
  }

  async crewUploadPhotos(eventId: string, imageUris: string[], crewName: string): Promise<{ uploaded_count: number; message: string }> {
    const formData = new FormData();
    formData.append('crew_name', crewName);
    imageUris.forEach((uri, idx) => {
      formData.append('files', {
        uri: uri,
        type: 'image/jpeg',
        name: `crew_${idx}_${Date.now()}.jpg`,
      } as any);
    });

    const res = await fetch(`${this.baseUrl}/crew/events/${eventId}/upload-photos`, {
      method: 'POST',
      headers: {
        'Bypass-Tunnel-Reminder': 'true',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Crew photo upload failed');
    }
    return res.json();
  }

  // --- STUDIO EVENT MANAGEMENT ---
  async getEvents(): Promise<EventItem[]> {
    const res = await fetch(`${this.baseUrl}/events`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load events');
    return res.json();
  }

  async createEvent(data: {
    name: string;
    event_date?: string;
    client_name?: string;
    client_phone?: string;
    package_amount_inr?: number;
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
      const err = await res.json().catch(() => ({}));
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

  async getEventPhotos(eventId: string): Promise<PhotoItem[]> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/photos`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load photos');
    return res.json();
  }

  async uploadEventPhotos(eventId: string, imageUris: string[]): Promise<{ uploaded_count: number; message: string }> {
    const formData = new FormData();
    imageUris.forEach((uri, idx) => {
      formData.append('files', {
        uri: uri,
        type: 'image/jpeg',
        name: `photo_${idx}_${Date.now()}.jpg`,
      } as any);
    });

    const res = await fetch(`${this.baseUrl}/events/${eventId}/photos`, {
      method: 'POST',
      headers: {
        'Bypass-Tunnel-Reminder': 'true',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload photos');
    }
    return res.json();
  }

  async getGuestUploadsReport(eventId: string): Promise<GuestUploadsReportResponse> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/guest-uploads`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load guest uploads');
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

  async getEventLeads(eventId: string): Promise<CrmLeadItem[]> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/leads`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) return [];
    return res.json();
  }

  async getEventFinance(eventId: string): Promise<FinanceSummary> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/finance`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      return { package_amount_inr: 0, total_received_inr: 0, balance_remaining_inr: 0, milestones: [] };
    }
    return res.json();
  }

  async getEventOperations(eventId: string): Promise<OperationsSummary> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/operations`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      return { ceremonies: [], crew_members: [], tasks: [] };
    }
    return res.json();
  }

  async addCrewMember(eventId: string, data: { name: string; role: string; phone?: string; payout_inr?: number }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/crew`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add crew member');
    return res.json();
  }

  async addCeremony(eventId: string, data: { name: string; venue?: string; ceremony_date?: string }): Promise<any> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/ceremonies`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add ceremony');
    return res.json();
  }

  // --- PUBLIC GUEST FLOW ---
  async getPublicEvent(token: string): Promise<PublicEventItem> {
    const res = await fetch(`${this.baseUrl}/events/public/by-token/${token}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Event not found');
    }
    return res.json();
  }

  async registerGuest(eventId: string, data: { name: string; mobile: string }): Promise<{ guest_id: string; requires_otp: boolean }> {
    const res = await fetch(`${this.baseUrl}/events/${eventId}/guests/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Guest registration failed');
    }
    return res.json();
  }

  async searchSelfie(eventId: string, guestId: string, selfieUri: string): Promise<MatchSearchResult> {
    const formData = new FormData();
    formData.append('selfie', {
      uri: selfieUri,
      type: 'image/jpeg',
      name: 'selfie.jpg',
    } as any);

    const res = await fetch(`${this.baseUrl}/events/${eventId}/guests/${guestId}/search`, {
      method: 'POST',
      headers: {
        'Bypass-Tunnel-Reminder': 'true',
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Facial matching failed');
    }
    return res.json();
  }

  async guestUploadPhotos(token: string, imageUris: string[], guestName?: string, guestPhone?: string): Promise<{ uploaded_count: number; guest_name: string; message: string }> {
    const formData = new FormData();
    imageUris.forEach((uri, idx) => {
      formData.append('files', {
        uri: uri,
        type: 'image/jpeg',
        name: `guest_photo_${idx}_${Date.now()}.jpg`,
      } as any);
    });

    if (guestName) formData.append('guest_name', guestName);
    if (guestPhone) formData.append('guest_phone', guestPhone);

    const res = await fetch(`${this.baseUrl}/events/public/${token}/guest-upload`, {
      method: 'POST',
      headers: {
        'Bypass-Tunnel-Reminder': 'true',
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Guest photo upload failed');
    }
    return res.json();
  }

  // --- WIRELESS CAMERA INGEST & WI-FI RELAY ---
  async getWirelessStatus(): Promise<{ is_running: boolean; ftp_port: number; server_ip: string; supported_brands: string[] }> {
    const res = await fetch(`${this.baseUrl}/wireless/status`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch wireless status');
    return res.json();
  }

  async getWirelessCredentials(eventId: string): Promise<any> {
    const res = await fetch(`${this.baseUrl}/wireless/events/${eventId}/credentials`, { headers: this.getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch wireless credentials');
    return res.json();
  }

  async wirelessHttpIngest(eventId: string, imageUris: string[], cameraModel: string = 'Pocket Mobile 5G Relay'): Promise<any> {
    const formData = new FormData();
    imageUris.forEach((uri, idx) => {
      formData.append('files', {
        uri: uri,
        type: 'image/jpeg',
        name: `relay_${idx}_${Date.now()}.jpg`,
      } as any);
    });
    formData.append('camera_model', cameraModel);
    const res = await fetch(`${this.baseUrl}/wireless/events/${eventId}/http-ingest`, {
      method: 'POST',
      headers: { 'Bypass-Tunnel-Reminder': 'true' },
      body: formData,
    });
    if (!res.ok) throw new Error('Wireless ingest failed');
    return res.json();
  }
}

export const mobileApi = new MobileApiClient();
