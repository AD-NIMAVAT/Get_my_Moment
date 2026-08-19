class PhotoModel {
  final String id;
  final String eventId;
  final String? ceremonyId;
  final String originalFileName;
  final String storagePath;
  final String? previewUrl;
  final String? originalUrl;
  final int fileSizeBytes;
  final int width;
  final int height;
  final bool isClientSelected;
  final String? clientComment;
  final bool isGuestUploaded;
  final String? uploadedByGuestName;
  final double confidenceScore;
  final DateTime? createdAt;

  PhotoModel({
    required this.id,
    required this.eventId,
    this.ceremonyId,
    required this.originalFileName,
    required this.storagePath,
    this.previewUrl,
    this.originalUrl,
    this.fileSizeBytes = 0,
    this.width = 0,
    this.height = 0,
    this.isClientSelected = false,
    this.clientComment,
    this.isGuestUploaded = false,
    this.uploadedByGuestName,
    this.confidenceScore = 0.0,
    this.createdAt,
  });

  factory PhotoModel.fromJson(Map<String, dynamic> json) {
    return PhotoModel(
      id: json['id'] ?? '',
      eventId: json['event_id'] ?? '',
      ceremonyId: json['ceremony_id'],
      originalFileName: json['original_file_name'] ?? 'photo.jpg',
      storagePath: json['storage_path'] ?? '',
      previewUrl: json['preview_url'],
      originalUrl: json['original_url'],
      fileSizeBytes: json['file_size_bytes'] ?? 0,
      width: json['width'] ?? 0,
      height: json['height'] ?? 0,
      isClientSelected: json['is_client_selected'] ?? false,
      clientComment: json['client_comment'],
      isGuestUploaded: json['is_guest_uploaded'] ?? false,
      uploadedByGuestName: json['uploaded_by_guest_name'],
      confidenceScore: (json['confidence_score'] as num?)?.toDouble() ?? 0.0,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at']) : null,
    );
  }
}
