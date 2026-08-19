class LeadModel {
  final String id;
  final String photographerId;
  final String clientName;
  final String clientPhone;
  final String? clientEmail;
  final String eventType;
  final DateTime? eventDate;
  final String? venueCity;
  final double estimatedBudgetInr;
  final String stage;
  final String? notes;
  final String? convertedEventId;
  final int quotationsCount;
  final DateTime? createdAt;

  LeadModel({
    required this.id,
    required this.photographerId,
    required this.clientName,
    required this.clientPhone,
    this.clientEmail,
    this.eventType = 'Wedding',
    this.eventDate,
    this.venueCity,
    this.estimatedBudgetInr = 0.0,
    this.stage = 'NEW_LEAD',
    this.notes,
    this.convertedEventId,
    this.quotationsCount = 0,
    this.createdAt,
  });

  factory LeadModel.fromJson(Map<String, dynamic> json) {
    return LeadModel(
      id: json['id'] ?? '',
      photographerId: json['photographer_id'] ?? '',
      clientName: json['client_name'] ?? '',
      clientPhone: json['client_phone'] ?? '',
      clientEmail: json['client_email'],
      eventType: json['event_type'] ?? 'Wedding',
      eventDate: json['event_date'] != null ? DateTime.tryParse(json['event_date']) : null,
      venueCity: json['venue_city'],
      estimatedBudgetInr: (json['estimated_budget_inr'] as num?)?.toDouble() ?? 0.0,
      stage: json['stage'] ?? 'NEW_LEAD',
      notes: json['notes'],
      convertedEventId: json['converted_event_id'],
      quotationsCount: json['quotations_count'] ?? 0,
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at']) : null,
    );
  }
}

class InvoiceModel {
  final String id;
  final String invoiceNumber;
  final String clientName;
  final String? clientPhone;
  final String? eventName;
  final DateTime? invoiceDate;
  final DateTime? dueDate;
  final String taxMode;
  final double subtotalInr;
  final double discountInr;
  final double totalTaxInr;
  final double grandTotalInr;
  final double amountPaidInr;
  final double balanceDueInr;
  final String status;
  final String? secureShareToken;
  final DateTime? createdAt;

  InvoiceModel({
    required this.id,
    required this.invoiceNumber,
    required this.clientName,
    this.clientPhone,
    this.eventName,
    this.invoiceDate,
    this.dueDate,
    this.taxMode = 'WITHOUT_GST',
    this.subtotalInr = 0.0,
    this.discountInr = 0.0,
    this.totalTaxInr = 0.0,
    this.grandTotalInr = 0.0,
    this.amountPaidInr = 0.0,
    this.balanceDueInr = 0.0,
    this.status = 'DRAFT',
    this.secureShareToken,
    this.createdAt,
  });

  factory InvoiceModel.fromJson(Map<String, dynamic> json) {
    return InvoiceModel(
      id: json['id'] ?? json['invoice_id'] ?? '',
      invoiceNumber: json['invoice_number'] ?? '',
      clientName: json['client_name'] ?? '',
      clientPhone: json['client_phone'],
      eventName: json['event_name'],
      invoiceDate: json['invoice_date'] != null ? DateTime.tryParse(json['invoice_date']) : null,
      dueDate: json['due_date'] != null ? DateTime.tryParse(json['due_date']) : null,
      taxMode: json['tax_mode'] ?? 'WITHOUT_GST',
      subtotalInr: (json['subtotal_inr'] as num?)?.toDouble() ?? 0.0,
      discountInr: (json['discount_inr'] as num?)?.toDouble() ?? 0.0,
      totalTaxInr: (json['total_tax_inr'] as num?)?.toDouble() ?? 0.0,
      grandTotalInr: (json['grand_total_inr'] as num?)?.toDouble() ?? 0.0,
      amountPaidInr: (json['amount_paid_inr'] as num?)?.toDouble() ?? 0.0,
      balanceDueInr: (json['balance_due_inr'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'DRAFT',
      secureShareToken: json['secure_share_token'],
      createdAt: json['created_at'] != null ? DateTime.tryParse(json['created_at']) : null,
    );
  }
}
