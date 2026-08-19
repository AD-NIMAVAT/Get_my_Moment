import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  PhotographerUser? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;

  PhotographerUser? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _currentUser != null;
  String? get errorMessage => _errorMessage;

  Future<bool> checkAuthStatus() async {
    final token = await ApiService.getToken();
    if (token == null || token.isEmpty) {
      _currentUser = null;
      notifyListeners();
      return false;
    }

    try {
      _isLoading = true;
      notifyListeners();
      _currentUser = await ApiService.getProfile();
      _errorMessage = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      await ApiService.clearToken();
      _currentUser = null;
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> login(String email, String password) async {
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      await ApiService.login(email, password);
      _currentUser = await ApiService.getProfile();
      
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

  Future<bool> signup({
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
    try {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();

      await ApiService.signup(
        email: email,
        password: password,
        studioName: studioName,
        phone: phone,
        city: city,
        state: state,
        yearsOfExperience: yearsOfExperience,
        specializations: specializations,
        gstNumber: gstNumber,
      );

      _currentUser = await ApiService.getProfile();
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

  Future<void> refreshProfile() async {
    try {
      _currentUser = await ApiService.getProfile();
      notifyListeners();
    } catch (_) {}
  }

  Future<void> logout() async {
    await ApiService.clearToken();
    _currentUser = null;
    notifyListeners();
  }
}
