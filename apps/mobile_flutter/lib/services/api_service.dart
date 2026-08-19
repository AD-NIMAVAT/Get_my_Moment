import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';
import '../models/event_model.dart';
import '../models/photo_model.dart';
import '../models/crm_finance_model.dart';

class ApiService {
  static const String _defaultHost = '10.0.2.2'; // Android Emulator default; change to local IP for device
  static const int _defaultPort = 8000;
  
  static String baseUrl = 'http://$_defaultHost:$_defaultPort/api/v1';

  static void setCustomServerUrl(String url) {
    if (url.endsWith('/')) {
      baseUrl = '${url}api/v1';
    } else {
      baseUrl = '$url/api/v1';
    }
  }

  // Token Management
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('gmm_auth_token');
  }

  static Future<void> saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('gmm_auth_token', token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('gmm_auth_token');
  }

  static Future<Map<String, String>> _getHeaders({bool isJson = true}) async {
    final token = await getToken();
    final Map<String, String> headers = {};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  // -------------------------------------------------------------
  // 1. AUTHENTICATION & KYC
  // -------------------------------------------------------------
  static Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email.trim(), 'password': password}),
    );

    final data = jsonDecode(res.body);
    if (res.statusCode == 200) {
      await saveToken(data['access_token']);
      return data;
    } else {
      throw Exception(data['detail'] ?? 'Login failed');
    }
  }

  static Future<Map<String, dynamic>> signup({
    required String email,
    required String password,
    required String studioName,
    String? phone,
    String? city,
    String? state,
    String? yearsOfExperience,
    String? specializations,
    String? gstNumber,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/signup'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email.trim(),
        'password': password,
        'studio_name': studioName.trim(),
        'phone': phone,
        'city': city,
        'state': state,
        'years_of_experience': yearsOfExperience,
        'specializations': specializations,
        'gst_number': gstNumber,
      }),
    );

    final data = jsonDecode(res.body);
    if (res.statusCode == 201) {
      await saveToken(data['access_token']);
      return data;
    } else {
      throw Exception(data['detail'] ?? 'Registration failed');
    }
  }

  static Future<PhotographerUser> getProfile() async {
    final headers = await _getHeaders();
    final res = await http.get(Uri.parse('$baseUrl/auth/profile'), headers: headers);
    if (res.statusCode == 200) {
      return PhotographerUser.fromJson(jsonDecode(res.body));
    } else {
      throw Exception('Failed to load studio profile');
    }
  }

  static Future<void> uploadLogo(File file) async {
    final token = await getToken();
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/auth/branding/logo'));
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    request.files.add(await http.MultipartFile.fromPath('file', file.path));
    final response = await request.send();
    if (response.statusCode != 200) {
      throw Exception('Failed to upload studio logo');
    }
  }

  // -------------------------------------------------------------
  // 2. EVENT MANAGEMENT
  // -------------------------------------------------------------
  static Future<List<EventModel>> getEvents() async {
    final headers = await _getHeaders();
    final res = await http.get(Uri.parse('$baseUrl/events'), headers: headers);
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((e) => EventModel.fromJson(e)).toList();
    } else {
      throw Exception('Failed to load events');
    }
  }

  static Future<EventModel> getEventDetails(String eventId) async {
    final headers = await _getHeaders();
    final res = await http.get(Uri.parse('$baseUrl/events/$eventId'), headers: headers);
    if (res.statusCode == 200) {
      return EventModel.fromJson(jsonDecode(res.body));
    } else {
      throw Exception('Failed to load event details');
    }
  }

  static Future<EventModel> createEvent({
    required String name,
    DateTime? eventDate,
    String? clientName,
    String? clientPhone,
    String? venue,
    String? city,
    double packageAmountInr = 0.0,
    bool allowGuestUploads = true,
  }) async {
    final headers = await _getHeaders();
    final res = await http.post(
      Uri.parse('$baseUrl/events'),
      headers: headers,
      body: jsonEncode({
        'name': name.trim(),
        'event_date': eventDate?.toIso8601String(),
        'client_name': clientName,
        'client_phone': clientPhone,
        'venue': venue,
        'city': city,
        'package_amount_inr': packageAmountInr,
        'allow_guest_uploads': allowGuestUploads,
      }),
    );

    if (res.statusCode == 201 || res.statusCode == 200) {
      return EventModel.fromJson(jsonDecode(res.body));
    } else {
      final data = jsonDecode(res.body);
      throw Exception(data['detail'] ?? 'Failed to create event');
    }
  }

  static Future<List<PhotoModel>> getEventPhotos(String eventId) async {
    final headers = await _getHeaders();
    final res = await http.get(Uri.parse('$baseUrl/events/$eventId/photos'), headers: headers);
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((p) => PhotoModel.fromJson(p)).toList();
    } else {
      throw Exception('Failed to load event photos');
    }
  }

  static Future<void> uploadPhotosBatch(String eventId, List<File> files) async {
    final token = await getToken();
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/events/$eventId/photos'));
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }

    for (var file in files) {
      request.files.add(await http.MultipartFile.fromPath('files', file.path));
    }

    final response = await request.send();
    if (response.statusCode != 201 && response.statusCode != 200) {
      throw Exception('Failed to upload photos');
    }
  }

  // -------------------------------------------------------------
  // 3. GUEST EXPERIENCE & AI FACE SEARCH
  // -------------------------------------------------------------
  static Future<EventModel> getPublicEventByToken(String accessToken) async {
    final res = await http.get(Uri.parse('$baseUrl/events/public/by-token/$accessToken'));
    if (res.statusCode == 200) {
      return EventModel.fromJson(jsonDecode(res.body));
    } else {
      throw Exception('Event not found or inactive');
    }
  }

  static Future<String> registerGuest(String eventId, String name, String mobile) async {
    final res = await http.post(
      Uri.parse('$baseUrl/events/$eventId/guests/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'name': name.trim(), 'mobile': mobile.trim()}),
    );

    final data = jsonDecode(res.body);
    if (res.statusCode == 200 || res.statusCode == 201) {
      return data['guest_id'];
    } else {
      throw Exception(data['detail'] ?? 'Guest registration failed');
    }
  }

  static Future<void> recordGuestConsent(String guestId, bool faceConsent) async {
    final res = await http.post(
      Uri.parse('$baseUrl/guests/$guestId/consent'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'guest_id': guestId,
        'face_search_consent': faceConsent,
        'marketing_consent': false,
      }),
    );

    if (res.statusCode != 200 && res.statusCode != 201) {
      throw Exception('Failed to record consent');
    }
  }

  static Future<List<PhotoModel>> searchPhotosBySelfie(String eventId, String guestId, File selfie) async {
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/matching/events/$eventId/search'));
    request.fields['guest_id'] = guestId;
    request.files.add(await http.MultipartFile.fromPath('selfie', selfie.path));

    final streamedRes = await request.send();
    final res = await http.Response.fromStream(streamedRes);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final List matches = data['matched_photos'] ?? [];
      return matches.map((m) => PhotoModel.fromJson(m)).toList();
    } else {
      final data = jsonDecode(res.body);
      throw Exception(data['detail'] ?? 'Face search failed');
    }
  }

  // -------------------------------------------------------------
  // 4. CRM LEADS & GST INVOICES
  // -------------------------------------------------------------
  static Future<List<LeadModel>> getLeads() async {
    final headers = await _getHeaders();
    final res = await http.get(Uri.parse('$baseUrl/crm/leads'), headers: headers);
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((l) => LeadModel.fromJson(l)).toList();
    } else {
      throw Exception('Failed to load CRM leads');
    }
  }

  static Future<LeadModel> createLead({
    required String clientName,
    required String clientPhone,
    String? clientEmail,
    String eventType = 'Wedding',
    DateTime? eventDate,
    String? venueCity,
    double estimatedBudgetInr = 0.0,
    String? notes,
  }) async {
    final headers = await _getHeaders();
    final res = await http.post(
      Uri.parse('$baseUrl/crm/leads'),
      headers: headers,
      body: jsonEncode({
        'client_name': clientName.trim(),
        'client_phone': clientPhone.trim(),
        'client_email': clientEmail,
        'event_type': eventType,
        'event_date': eventDate?.toIso8601String(),
        'venue_city': venueCity,
        'estimated_budget_inr': estimatedBudgetInr,
        'stage': 'NEW_LEAD',
        'notes': notes,
      }),
    );

    if (res.statusCode == 201 || res.statusCode == 200) {
      return LeadModel.fromJson(jsonDecode(res.body));
    } else {
      throw Exception('Failed to create lead');
    }
  }

  static Future<List<InvoiceModel>> getInvoices() async {
    final headers = await _getHeaders();
    final res = await http.get(Uri.parse('$baseUrl/billing/invoices'), headers: headers);
    if (res.statusCode == 200) {
      final List list = jsonDecode(res.body);
      return list.map((i) => InvoiceModel.fromJson(i)).toList();
    } else {
      throw Exception('Failed to load invoices');
    }
  }

  // -------------------------------------------------------------
  // 5. IN-APP STUDIO SUPPORT DESK
  // -------------------------------------------------------------
  static Future<Map<String, dynamic>> submitSupportTicket({
    required String category,
    required String urgency,
    required String subject,
    required String description,
    String? eventReferenceId,
  }) async {
    final headers = await _getHeaders();
    final res = await http.post(
      Uri.parse('$baseUrl/contact/photographer-ticket'),
      headers: headers,
      body: jsonEncode({
        'category': category,
        'urgency': urgency,
        'subject': subject.trim(),
        'description': description.trim(),
        'event_reference_id': eventReferenceId,
      }),
    );

    if (res.statusCode == 201) {
      return jsonDecode(res.body);
    } else {
      final data = jsonDecode(res.body);
      throw Exception(data['detail'] ?? 'Failed to submit support ticket');
    }
  }
}
