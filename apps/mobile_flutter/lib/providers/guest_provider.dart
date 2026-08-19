import 'dart:io';
import 'package:flutter/material.dart';
import '../models/event_model.dart';
import '../models/photo_model.dart';
import '../services/api_service.dart';

class GuestProvider extends ChangeNotifier {
  EventModel? _publicEvent;
  String? _guestId;
  List<PhotoModel> _matchedPhotos = [];
  bool _isLoading = false;
  bool _isSearching = false;
  String? _errorMessage;

  EventModel? get publicEvent => _publicEvent;
  String? get guestId => _guestId;
  List<PhotoModel> get matchedPhotos => _matchedPhotos;
  bool get isLoading => _isLoading;
  bool get isSearching => _isSearching;
  String? get errorMessage => _errorMessage;

  Future<bool> loadEventByToken(String token) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      _publicEvent = await ApiService.getPublicEventByToken(token);
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

  Future<bool> registerGuest(String name, String mobile) async {
    if (_publicEvent == null) return false;
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      _guestId = await ApiService.registerGuest(_publicEvent!.id, name, mobile);
      await ApiService.recordGuestConsent(_guestId!, true);

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

  Future<bool> searchWithSelfie(File selfie) async {
    if (_publicEvent == null || _guestId == null) return false;
    try {
      _isSearching = true;
      _errorMessage = null;
      notifyListeners();

      _matchedPhotos = await ApiService.searchPhotosBySelfie(_publicEvent!.id, _guestId!, selfie);
      _isSearching = false;
      notifyListeners();
      return true;
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
      _isSearching = false;
      notifyListeners();
      return false;
    }
  }

  void resetGuestSession() {
    _publicEvent = null;
    _guestId = null;
    _matchedPhotos = [];
    _errorMessage = null;
    notifyListeners();
  }
}
