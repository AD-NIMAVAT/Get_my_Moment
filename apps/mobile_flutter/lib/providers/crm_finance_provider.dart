import 'package:flutter/material.dart';
import '../models/crm_finance_model.dart';
import '../services/api_service.dart';

class CrmFinanceProvider extends ChangeNotifier {
  List<LeadModel> _leads = [];
  List<InvoiceModel> _invoices = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<LeadModel> get leads => _leads;
  List<InvoiceModel> get invoices => _invoices;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchLeads() async {
    try {
      _isLoading = true;
      notifyListeners();

      _leads = await ApiService.getLeads();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createLead({
    required String clientName,
    required String clientPhone,
    String? clientEmail,
    String eventType = 'Wedding',
    DateTime? eventDate,
    String? venueCity,
    double estimatedBudgetInr = 0.0,
    String? notes,
  }) async {
    try {
      _isLoading = true;
      notifyListeners();

      final newLead = await ApiService.createLead(
        clientName: clientName,
        clientPhone: clientPhone,
        clientEmail: clientEmail,
        eventType: eventType,
        eventDate: eventDate,
        venueCity: venueCity,
        estimatedBudgetInr: estimatedBudgetInr,
        notes: notes,
      );

      _leads.insert(0, newLead);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> fetchInvoices() async {
    try {
      _isLoading = true;
      notifyListeners();

      _invoices = await ApiService.getInvoices();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
    }
  }
}
