class PhotographerUser {
  final String id;
  final String email;
  final String studioName;
  final String? phone;
  final String? city;
  final String? state;
  final String? instagramHandle;
  final String? portfolioUrl;
  final String? yearsOfExperience;
  final String? specializations;
  final String? gstNumber;
  final bool isVerified;
  final String verificationStatus;
  final String subscriptionPlan;
  final String? logoUrl;
  final String? signatureUrl;
  final String? watermarkText;

  PhotographerUser({
    required this.id,
    required this.email,
    required this.studioName,
    this.phone,
    this.city,
    this.state,
    this.instagramHandle,
    this.portfolioUrl,
    this.yearsOfExperience,
    this.specializations,
    this.gstNumber,
    this.isVerified = false,
    this.verificationStatus = 'PENDING_REVIEW',
    this.subscriptionPlan = 'FREE_TRIAL',
    this.logoUrl,
    this.signatureUrl,
    this.watermarkText,
  });

  factory PhotographerUser.fromJson(Map<String, dynamic> json) {
    return PhotographerUser(
      id: json['id'] ?? json['photographer_id'] ?? '',
      email: json['email'] ?? '',
      studioName: json['studio_name'] ?? 'Photography Studio',
      phone: json['phone'],
      city: json['city'],
      state: json['state'],
      instagramHandle: json['instagram_handle'],
      portfolioUrl: json['portfolio_url'],
      yearsOfExperience: json['years_of_experience'],
      specializations: json['specializations'],
      gstNumber: json['gst_number'],
      isVerified: json['is_verified'] ?? false,
      verificationStatus: json['verification_status'] ?? 'PENDING_REVIEW',
      subscriptionPlan: json['subscription_plan'] ?? 'FREE_TRIAL',
      logoUrl: json['logo_url'],
      signatureUrl: json['signature_url'],
      watermarkText: json['watermark_text'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'studio_name': studioName,
      'phone': phone,
      'city': city,
      'state': state,
      'instagram_handle': instagramHandle,
      'portfolio_url': portfolioUrl,
      'years_of_experience': yearsOfExperience,
      'specializations': specializations,
      'gst_number': gstNumber,
      'is_verified': isVerified,
      'verification_status': verificationStatus,
      'subscription_plan': subscriptionPlan,
      'logo_url': logoUrl,
      'signature_url': signatureUrl,
      'watermark_text': watermarkText,
    };
  }
}
