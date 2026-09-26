import 'package:flutter/material.dart';

/// Base URL of your SkyView FastAPI backend.
const String kBaseUrl = 'https://skyview-backend-rdpx.onrender.com';

/// Auth token storage keys
const String kTokenKey = 'skyview_token';
const String kPhoneKey = 'skyview_phone';

// ─── Glass Brand Palette ───────────────────────────────────────────────────
class AppColors {
  AppColors._();

  static const Color primaryGreen = Color(0xFF10B981);
  static const Color primary        = Color(0xFF10B981); // Emerald Green (primaryGreen)
  static const Color primaryDark    = Color(0xFF047857);
  static const Color primaryLight   = Color(0xFF34D399);
  static const Color primarySurface = Color(0xFFD1FAE5);

  static const Color accent         = Color(0xFF10B981);
  static const Color accentDim      = Color(0xFFA7F3D0);

  // Background / surface
  static const Color darkBg         = Color(0xFF0A0A0C); // Crystal Black
  static const Color darkSurface    = Color(0xFF141417);
  static const Color darkCard       = Color(0xFF1A1A1E);
  static const Color lightBg        = Color(0xFFC8E6C9); // Brand light green background
  static const Color lightSurface   = Color(0xFFF6F7F9);
  static const Color lightCard      = Color(0xFFFFFFFF);

  // Status
  static const Color success        = Color(0xFF10B981);
  static const Color warning        = Color(0xFFF59E0B);
  static const Color error          = Color(0xFFEF4444);
  static const Color info           = Color(0xFF3B82F6);

  // Text
  static const Color textDark       = Color(0xFF064E3B);
  static const Color textMuted      = Color(0xFF6B7280);

  // New ones from app_colours.dart
  static const Color brandPrimary = Color(0xFF10B981);
  static const Color brandPrimaryLight = Color(0xFF34D399);
  static const Color brandPrimaryDark = Color(0xFF059669);
  static const Color darkPrimary = Color(0xFFFFFFFF);
  static const Color darkPrimaryLight = Color(0xFFFFFFFF);
  static const Color darkPrimaryDark = Color(0xFFFFFFFF);

  static const Color brandSuccess = Color(0xFF22C55E);
  static const Color danger = Color(0xFFFF5722);
  static const Color brandInfo = Color(0xFF16A34A);
  static const Color brandAccent = Color(0xFF34D399);
  static const Color darkSuccess = Color(0xFFFFFFFF);
  static const Color darkWarning = Color(0xFFFFFFFF);
  static const Color darkInfo = Color(0xFFFFFFFF);
  static const Color darkAccent = Color(0xFFFFFFFF);

  static const Color lightBackground = Color(0xFFC8E6C9);
  static const Color lightText = Color(0xFF111827);
  static const Color lightTextSecondary = Color(0xFF6B7280);
  static const Color lightBorder = Color(0xFFE2E8F0);

  static const Color darkBackground = Color(0xFF0A0A0C);
  static const Color darkText = Color(0xFFFFFFFF);
  static const Color darkTextSecondary = Color(0xFFFFFFFF);
  static const Color darkBorder = Color(0xFFFFFFFF);
}

/// Consistent spacing tokens used across the entire app.
abstract final class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;
  static const double xxxl = 48;

  // Padding helpers
  static const allXs = EdgeInsets.all(xs);
  static const allSm = EdgeInsets.all(sm);
  static const allMd = EdgeInsets.all(md);
  static const allLg = EdgeInsets.all(lg);
  static const allXl = EdgeInsets.all(xl);
  static const allXxl = EdgeInsets.all(xxl);

  static const hSm = EdgeInsets.symmetric(horizontal: sm);
  static const hMd = EdgeInsets.symmetric(horizontal: md);
  static const hLg = EdgeInsets.symmetric(horizontal: lg);
  static const hXl = EdgeInsets.symmetric(horizontal: xl);

  static const vSm = EdgeInsets.symmetric(vertical: sm);
  static const vMd = EdgeInsets.symmetric(vertical: md);
  static const vLg = EdgeInsets.symmetric(vertical: lg);
  static const vXl = EdgeInsets.symmetric(vertical: xl);
}

/// Consistent border radius tokens.
abstract final class AppRadius {
  static const double sm = 6;
  static const double md = 12;
  static const double lg = 20;
  static const double xl = 28;
  static const double full = 999;

  static final smAll = BorderRadius.circular(sm);
  static final mdAll = BorderRadius.circular(md);
  static final lgAll = BorderRadius.circular(lg);
  static final xlAll = BorderRadius.circular(xl);
  static final fullAll = BorderRadius.circular(full);
}

/// Convenience extension on [BuildContext] for quick theme access.
extension ThemeX on BuildContext {
  ThemeData get theme => Theme.of(this);
  ColorScheme get colors => theme.colorScheme;
  TextTheme get textTheme => theme.textTheme;
  bool get isDark => theme.brightness == Brightness.dark;
}


// ─── Theme ────────────────────────────────────────────────────────────────
ThemeData buildAppTheme({bool dark = false}) {
  final primary = AppColors.primary;
  final cs = ColorScheme.fromSeed(
    seedColor: primary,
    brightness: dark ? Brightness.dark : Brightness.light,
    primary: primary,
    secondary: AppColors.accent,
    surface: dark ? AppColors.darkSurface : AppColors.lightBg,
    surfaceContainerHighest: dark ? AppColors.darkCard : AppColors.lightSurface,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: cs,
    fontFamily: 'Poppins',
    scaffoldBackgroundColor: dark ? AppColors.darkBg : AppColors.lightBg,

    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      elevation: 0,
      surfaceTintColor: Colors.transparent,
      foregroundColor: Colors.white,
      titleTextStyle: const TextStyle(
        fontFamily: 'Poppins',
        fontWeight: FontWeight.w600,
        fontSize: 18,
        color: Colors.white,
      ),
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.white,
        foregroundColor: AppColors.primaryGreen,
        minimumSize: const Size(double.infinity, 52),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
        textStyle: const TextStyle(
          fontFamily: 'Poppins',
          fontWeight: FontWeight.w600,
          fontSize: 16,
        ),
      ),
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: dark ? Colors.white.withValues(alpha: 0.15) : Colors.black.withValues(alpha: 0.05),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: dark ? Colors.white.withValues(alpha: 0.3) : Colors.black.withValues(alpha: 0.15)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(
          color: dark ? Colors.white.withValues(alpha: 0.2) : Colors.black.withValues(alpha: 0.1),
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: dark ? Colors.white : AppColors.primaryGreen, width: 2),
      ),
      labelStyle: TextStyle(
        color: dark ? Colors.white : AppColors.textDark,
        fontFamily: 'Poppins',
      ),
      hintStyle: TextStyle(
        color: dark ? Colors.white60 : Colors.black45,
        fontFamily: 'Poppins',
      ),
    ),

    chipTheme: ChipThemeData(
      backgroundColor: Colors.white.withValues(alpha: 0.15),
      selectedColor: Colors.white.withValues(alpha: 0.3),
      labelStyle: const TextStyle(fontFamily: 'Poppins', fontSize: 13, color: Colors.white),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),

    cardTheme: CardThemeData(
      color: Colors.white.withValues(alpha: 0.15),
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
  );
}



// ─── 100 Country Codes ──────────────────────────────────────────────────────
const List<Map<String, String>> kCountryCodes = [
  {'name': 'India', 'code': 'IN', 'dial_code': '+91'},
  {'name': 'United States', 'code': 'US', 'dial_code': '+1'},
  {'name': 'United Kingdom', 'code': 'GB', 'dial_code': '+44'},
  {'name': 'Canada', 'code': 'CA', 'dial_code': '+1'},
  {'name': 'Australia', 'code': 'AU', 'dial_code': '+61'},
  {'name': 'Afghanistan', 'code': 'AF', 'dial_code': '+93'},
  {'name': 'Albania', 'code': 'AL', 'dial_code': '+355'},
  {'name': 'Algeria', 'code': 'DZ', 'dial_code': '+213'},
  {'name': 'Andorra', 'code': 'AD', 'dial_code': '+376'},
  {'name': 'Angola', 'code': 'AO', 'dial_code': '+244'},
  {'name': 'Argentina', 'code': 'AR', 'dial_code': '+54'},
  {'name': 'Armenia', 'code': 'AM', 'dial_code': '+374'},
  {'name': 'Austria', 'code': 'AT', 'dial_code': '+43'},
  {'name': 'Azerbaijan', 'code': 'AZ', 'dial_code': '+994'},
  {'name': 'Bahrain', 'code': 'BH', 'dial_code': '+973'},
  {'name': 'Bangladesh', 'code': 'BD', 'dial_code': '+880'},
  {'name': 'Belarus', 'code': 'BY', 'dial_code': '+375'},
  {'name': 'Belgium', 'code': 'BE', 'dial_code': '+32'},
  {'name': 'Bhutan', 'code': 'BT', 'dial_code': '+975'},
  {'name': 'Bolivia', 'code': 'BO', 'dial_code': '+591'},
  {'name': 'Bosnia and Herzegovina', 'code': 'BA', 'dial_code': '+387'},
  {'name': 'Brazil', 'code': 'BR', 'dial_code': '+55'},
  {'name': 'Bulgaria', 'code': 'BG', 'dial_code': '+359'},
  {'name': 'Cambodia', 'code': 'KH', 'dial_code': '+855'},
  {'name': 'Cameroon', 'code': 'CM', 'dial_code': '+237'},
  {'name': 'Chile', 'code': 'CL', 'dial_code': '+56'},
  {'name': 'China', 'code': 'CN', 'dial_code': '+86'},
  {'name': 'Colombia', 'code': 'CO', 'dial_code': '+57'},
  {'name': 'Costa Rica', 'code': 'CR', 'dial_code': '+506'},
  {'name': 'Croatia', 'code': 'HR', 'dial_code': '+385'},
  {'name': 'Cuba', 'code': 'CU', 'dial_code': '+53'},
  {'name': 'Cyprus', 'code': 'CY', 'dial_code': '+357'},
  {'name': 'Czech Republic', 'code': 'CZ', 'dial_code': '+420'},
  {'name': 'Denmark', 'code': 'DK', 'dial_code': '+45'},
  {'name': 'Ecuador', 'code': 'EC', 'dial_code': '+593'},
  {'name': 'Egypt', 'code': 'EG', 'dial_code': '+20'},
  {'name': 'Estonia', 'code': 'EE', 'dial_code': '+372'},
  {'name': 'Ethiopia', 'code': 'ET', 'dial_code': '+251'},
  {'name': 'Finland', 'code': 'FI', 'dial_code': '+358'},
  {'name': 'France', 'code': 'FR', 'dial_code': '+33'},
  {'name': 'Georgia', 'code': 'GE', 'dial_code': '+995'},
  {'name': 'Germany', 'code': 'DE', 'dial_code': '+49'},
  {'name': 'Ghana', 'code': 'GH', 'dial_code': '+233'},
  {'name': 'Greece', 'code': 'GR', 'dial_code': '+30'},
  {'name': 'Guatemala', 'code': 'GT', 'dial_code': '+502'},
  {'name': 'Honduras', 'code': 'HN', 'dial_code': '+504'},
  {'name': 'Hong Kong', 'code': 'HK', 'dial_code': '+852'},
  {'name': 'Hungary', 'code': 'HU', 'dial_code': '+36'},
  {'name': 'Iceland', 'code': 'IS', 'dial_code': '+354'},
  {'name': 'Indonesia', 'code': 'ID', 'dial_code': '+62'},
  {'name': 'Iran', 'code': 'IR', 'dial_code': '+98'},
  {'name': 'Iraq', 'code': 'IQ', 'dial_code': '+964'},
  {'name': 'Ireland', 'code': 'IE', 'dial_code': '+353'},
  {'name': 'Israel', 'code': 'IL', 'dial_code': '+972'},
  {'name': 'Italy', 'code': 'IT', 'dial_code': '+39'},
  {'name': 'Jamaica', 'code': 'JM', 'dial_code': '+1'},
  {'name': 'Japan', 'code': 'JP', 'dial_code': '+81'},
  {'name': 'Jordan', 'code': 'JO', 'dial_code': '+962'},
  {'name': 'Kazakhstan', 'code': 'KZ', 'dial_code': '+7'},
  {'name': 'Kenya', 'code': 'KE', 'dial_code': '+254'},
  {'name': 'Kuwait', 'code': 'KW', 'dial_code': '+965'},
  {'name': 'Kyrgyzstan', 'code': 'KG', 'dial_code': '+996'},
  {'name': 'Laos', 'code': 'LA', 'dial_code': '+856'},
  {'name': 'Latvia', 'code': 'LV', 'dial_code': '+371'},
  {'name': 'Lebanon', 'code': 'LB', 'dial_code': '+961'},
  {'name': 'Libya', 'code': 'LY', 'dial_code': '+218'},
  {'name': 'Lithuania', 'code': 'LT', 'dial_code': '+370'},
  {'name': 'Luxembourg', 'code': 'LU', 'dial_code': '+352'},
  {'name': 'Malaysia', 'code': 'MY', 'dial_code': '+60'},
  {'name': 'Maldives', 'code': 'MV', 'dial_code': '+960'},
  {'name': 'Mexico', 'code': 'MX', 'dial_code': '+52'},
  {'name': 'Mongolia', 'code': 'MN', 'dial_code': '+976'},
  {'name': 'Morocco', 'code': 'MA', 'dial_code': '+212'},
  {'name': 'Myanmar', 'code': 'MM', 'dial_code': '+95'},
  {'name': 'Nepal', 'code': 'NP', 'dial_code': '+977'},
  {'name': 'Netherlands', 'code': 'NL', 'dial_code': '+31'},
  {'name': 'New Zealand', 'code': 'NZ', 'dial_code': '+64'},
  {'name': 'Nicaragua', 'code': 'NI', 'dial_code': '+505'},
  {'name': 'Nigeria', 'code': 'NG', 'dial_code': '+234'},
  {'name': 'Norway', 'code': 'NO', 'dial_code': '+47'},
  {'name': 'Oman', 'code': 'OM', 'dial_code': '+968'},
  {'name': 'Pakistan', 'code': 'PK', 'dial_code': '+92'},
  {'name': 'Panama', 'code': 'PA', 'dial_code': '+507'},
  {'name': 'Paraguay', 'code': 'PY', 'dial_code': '+595'},
  {'name': 'Peru', 'code': 'PE', 'dial_code': '+51'},
  {'name': 'Philippines', 'code': 'PH', 'dial_code': '+63'},
  {'name': 'Poland', 'code': 'PL', 'dial_code': '+48'},
  {'name': 'Portugal', 'code': 'PT', 'dial_code': '+351'},
  {'name': 'Qatar', 'code': 'QA', 'dial_code': '+974'},
  {'name': 'Romania', 'code': 'RO', 'dial_code': '+40'},
  {'name': 'Russia', 'code': 'RU', 'dial_code': '+7'},
  {'name': 'Saudi Arabia', 'code': 'SA', 'dial_code': '+966'},
  {'name': 'Singapore', 'code': 'SG', 'dial_code': '+65'},
  {'name': 'South Africa', 'code': 'ZA', 'dial_code': '+27'},
  {'name': 'South Korea', 'code': 'KR', 'dial_code': '+82'},
  {'name': 'Spain', 'code': 'ES', 'dial_code': '+34'},
  {'name': 'Sri Lanka', 'code': 'LK', 'dial_code': '+94'},
  {'name': 'Sweden', 'code': 'SE', 'dial_code': '+46'},
  {'name': 'Switzerland', 'code': 'CH', 'dial_code': '+41'},
  {'name': 'Taiwan', 'code': 'TW', 'dial_code': '+886'},
  {'name': 'Thailand', 'code': 'TH', 'dial_code': '+66'},
  {'name': 'Turkey', 'code': 'TR', 'dial_code': '+90'},
  {'name': 'Uganda', 'code': 'UG', 'dial_code': '+256'},
  {'name': 'Ukraine', 'code': 'UA', 'dial_code': '+380'},
  {'name': 'United Arab Emirates', 'code': 'AE', 'dial_code': '+971'},
  {'name': 'Uruguay', 'code': 'UY', 'dial_code': '+598'},
  {'name': 'Uzbekistan', 'code': 'UZ', 'dial_code': '+998'},
  {'name': 'Venezuela', 'code': 'VE', 'dial_code': '+58'},
  {'name': 'Vietnam', 'code': 'VN', 'dial_code': '+84'},
  {'name': 'Yemen', 'code': 'YE', 'dial_code': '+967'},
  {'name': 'Zimbabwe', 'code': 'ZW', 'dial_code': '+263'},
];
