import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppColors {
  // Warm Neomorphic Palette
  static const Color background = Color(0xFFF3F1EC);
  static const Color surface = Color(0xFFFAF9F7);
  static const Color card = Color(0xFFEBE8E1);
  static const Color inset = Color(0xFFE4E0D7);
  
  // Brand Coral Colors
  static const Color primary = Color(0xFFE86A5B);
  static const Color primaryDark = Color(0xFFC94F43);
  static const Color primaryLight = Color(0xFFEE7E6F);
  
  // Text Colors
  static const Color textDark = Color(0xFF1F1F1F);
  static const Color textMuted = Color(0xFF6B6B6B);
  static const Color textSubtle = Color(0xFF8E8E8E);
  
  // Accents
  static const Color success = Color(0xFF3FA66B);
  static const Color warning = Color(0xFFD9A441);
  static const Color danger = Color(0xFFE05252);
  static const Color border = Color(0xFFE2DDD5);
  
  // Shadows
  static const Color shadowDark = Color(0xFFD4D0C7);
  static const Color shadowLight = Color(0xFFFFFFFF);
}

class AppShadows {
  static List<BoxShadow> get neuElevated => [
    const BoxShadow(
      color: AppColors.shadowDark,
      offset: Offset(4, 4),
      blurRadius: 8,
    ),
    const BoxShadow(
      color: AppColors.shadowLight,
      offset: Offset(-4, -4),
      blurRadius: 8,
    ),
  ];

  static List<BoxShadow> get neuElevatedSm => [
    const BoxShadow(
      color: AppColors.shadowDark,
      offset: Offset(2, 2),
      blurRadius: 5,
    ),
    const BoxShadow(
      color: AppColors.shadowLight,
      offset: Offset(-2, -2),
      blurRadius: 5,
    ),
  ];

  static List<BoxShadow> get neuPrimaryButton => [
    BoxShadow(
      color: AppColors.primary.withOpacity(0.35),
      offset: const Offset(0, 4),
      blurRadius: 12,
    ),
  ];
}

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: AppColors.background,
      primaryColor: AppColors.primary,
      fontFamily: GoogleFonts.plusJakartaSans().fontFamily,
      textTheme: GoogleFonts.plusJakartaSansTextTheme().apply(
        bodyColor: AppColors.textDark,
        displayColor: AppColors.textDark,
      ),
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        surface: AppColors.surface,
        background: AppColors.background,
        error: AppColors.danger,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: AppColors.background,
        elevation: 0,
        centerTitle: false,
        iconTheme: const IconThemeData(color: AppColors.textDark),
        titleTextStyle: GoogleFonts.outfit(
          color: AppColors.textDark,
          fontSize: 20,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}
