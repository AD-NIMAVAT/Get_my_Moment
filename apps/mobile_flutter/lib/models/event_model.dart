class EventModel {
  final String id;
  final String photographerId;
  final String name;
  final String slug;
  final String accessToken;
  final String? selectionToken;
  final DateTime? eventDate;
  final String? venue;
  final String? city;
  final String? clientName;
  final String? clientPhone;
  final double packageAmountInr;
  final String status;
  final bool allowGuestUploads;
  final int photoCount;
  final int guestCount;
  final String? coverImageUrl;
  final String? studioLogoUrl;
  final String? studioName;
  final DateTime? createdAt;

  EventModel({
    required this.id,
    required this.photographerId,
    required this.name,
    required this.slug,
    required this.accessToken,
    this.selectionToken,
    this.eventDate,
    this.venue,
    this.city,
    this.clientName,
    this.clientPhone,
    this.packageAmountInr = 0.0,
    this.status = 'ACTIVE',
    this.allowGuestUploads = true,
    this.photoCount = 0,
    this.guestCount = 0,
    this.coverImageUrl,
    this.studioLogoUrl,
    this.studioName,
    this.createdAt,
  });

  factory EventModel.fromJson(Map<String, dynamic> json) {
    return EventModel(
      id: json['id'] ?? '',
      photographerId: json['photographer_id'] ?? '',
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      accessToken: json['access_token'] ?? '',
      selectionToken: json['selection_token'],
      eventDate: json['event_date'] != null ? DateTime.tryParse(json['event_date']) : null,
      venue: json['venue'],
      city: json['city'],
      clientName: json['client_name'],
      clientPhone: json['client_phone'],
      packageAmountInr: (json['package_amount_inr'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'ACTIVE',
      allowGuestUploads: json['allow_guest_uploads'] ?? true,
      photoCount: json['photo_count'] ?? 0,
      guestCount: json['guest_count'] ?? 0,
      coverImageUrl: json['cover_image_url'],
      studioLogoUrl: json['studio_logo_url'],
      studioName: json['studio_name'],
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at']) : null,
    );
  }
}

class CeremonyModel {
  final String id;
  final String eventId;
  final String name;
  final DateTime? ceremonyDate;
  final String? venue;
  final int orderIndex;

  CeremonyModel({
    required this.id,
    required this.eventId,
    required this.name,
    this.ceremonyDate,
    this.venue,
    this.orderIndex = 0,
  });

  factory CeremonyModel.fromJson(Map<String, dynamic> json) {
    return CeremonyModel(
      id: json['id'] ?? '',
      eventId: json['event_id'] ?? '',
      name: json['name'] ?? '',
      ceremonyDate: json['ceremony_date'] != null ? DateTime.tryParse(json['ceremony_date']) : null,
      venue: json['venue'],
      orderIndex: json['order_index'] ?? 0,
    );
  }
}
