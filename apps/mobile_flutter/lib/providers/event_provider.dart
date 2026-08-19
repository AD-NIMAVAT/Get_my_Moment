import 'dart:io';
import 'package:flutter/material.dart';
import '../models/event_model.dart';
import '../models/photo_model.dart';
import '../services/api_service.dart';

class EventProvider extends ChangeNotifier {
  List<EventModel> _events = [];
  EventModel? _selectedEvent;
  List<PhotoModel> _eventPhotos = [];
  bool _isLoading = false;
  bool _isUploading = false;
  String? _errorMessage;

  List<EventModel> get events => _events;
  EventModel? get selectedEvent => _selectedEvent;
  List<PhotoModel> get eventPhotos => _eventPhotos;
  bool get isLoading => _isLoading;
  bool get isUploading => _isUploading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchEvents() async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      _events = await ApiService.getEvents();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> selectEvent(String eventId) async {
    try {
      _isLoading = true;
      notifyListeners();

      _selectedEvent = await ApiService.getEventDetails(eventId);
      _eventPhotos = await ApiService.getEventPhotos(eventId);

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createEvent({
    required String name,
    DateTime? eventDate,
    String? clientName,
    String? clientPhone,
    String? venue,
    String? city,
    double packageAmountInr = 0.0,
    bool allowGuestUploads = true,
  }) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      final newEvent = await ApiService.createEvent(
        name: name,
        eventDate: eventDate,
        clientName: clientName,
        clientPhone: clientPhone,
        venue: venue,
        city: city,
        packageAmountInr: packageAmountInr,
        allowGuestUploads: allowGuestUploads,
      );

      _events.insert(0, newEvent);
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

  Future<bool> uploadPhotos(String eventId, List<File> files) async {
    try {
      _isUploading = true;
      notifyListeners();

      await ApiService.uploadPhotosBatch(eventId, files);
      _eventPhotos = await ApiService.getEventPhotos(eventId);

      _isUploading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isUploading = false;
      notifyListeners();
      return false;
    }
  }
}
