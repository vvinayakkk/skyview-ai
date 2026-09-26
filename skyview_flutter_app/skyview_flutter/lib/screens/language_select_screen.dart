import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../services/theme_service.dart';
import '../utils/constants.dart';

class LanguageSelectScreen extends ConsumerStatefulWidget {
  const LanguageSelectScreen({super.key});

  @override
  ConsumerState<LanguageSelectScreen> createState() => _LanguageSelectScreenState();
}

class _LanguageSelectScreenState extends ConsumerState<LanguageSelectScreen> {
  String _selectedUiCode = 'en';

  static const _englishNames = {
    'en': 'English',
    'hi': 'Hindi',
    'pa': 'Punjabi',
    'mr': 'Marathi',
    'te': 'Telugu',
    'ta': 'Tamil',
    'bn': 'Bengali',
  };

  static const _nativeNames = {
    'en': 'English',
    'hi': 'हिन्दी',
    'pa': 'ਪੰਜਾਬी',
    'mr': 'मराठी',
    'te': 'తెలుగు',
    'ta': 'தமிழ்',
    'bn': 'বাংলা',
  };

  @override
  void initState() {
    super.initState();
    // Initialize selected UI language based on current locale
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        setState(() {
          _selectedUiCode = context.locale.languageCode;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(themeProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final languageCodes = const ['en', 'hi', 'pa', 'mr', 'te', 'ta', 'bn'];

    final textColor = isDark ? AppColors.darkText : AppColors.lightText;
    final subColor =
        isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;
    final surface = isDark
        ? AppColors.darkCard.withValues(alpha: 0.96)
        : Colors.white.withValues(alpha: 0.55);

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? const [AppColors.darkBackground, AppColors.darkSurface]
                : const [AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              Positioned(
                top: 8,
                left: 8,
                child: IconButton(
                  onPressed: () => context.go('/splash'),
                  icon: const Icon(Icons.arrow_back_rounded),
                  color: isDark ? AppColors.primary : textColor,
                  style: IconButton.styleFrom(
                    backgroundColor: isDark ? Colors.transparent : surface,
                    side: isDark
                        ? null
                        : const BorderSide(color: Colors.white),
                  ),
                ),
              ),
              Positioned(
                top: 8,
                right: 8,
                child: IconButton(
                  onPressed: () => ref.read(themeProvider.notifier).toggle(),
                  icon: Icon(
                    themeMode == ThemeMode.dark
                        ? Icons.dark_mode
                        : Icons.light_mode,
                  ),
                  color: isDark ? AppColors.primary : textColor,
                  style: IconButton.styleFrom(
                    backgroundColor: isDark ? Colors.transparent : surface,
                    side: isDark
                        ? null
                        : const BorderSide(color: Colors.white),
                  ),
                ),
              ),
              Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 60),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.translate_rounded,
                        size: 64,
                        color: AppColors.primary,
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'language_select.title'.tr(),
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: textColor,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'language_select.subtitle'.tr(),
                        style: TextStyle(
                          fontSize: 16,
                          color: subColor,
                        ),
                      ),
                      const SizedBox(height: 28),
                      ...languageCodes.map((code) {
                        final native = _nativeNames[code] ?? code;
                        final englishName = _englishNames[code] ?? code;
                        final selected = _selectedUiCode == code;
                        final label = code == 'en'
                            ? englishName
                            : '$native ($englishName)';

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: GestureDetector(
                            onTap: () async {
                              setState(() {
                                _selectedUiCode = code;
                              });
                              // All other Indian languages convert to Hindi internally for translations sake
                              if (code == 'en') {
                                await context.setLocale(const Locale('en'));
                              } else {
                                await context.setLocale(const Locale('hi'));
                              }
                            },
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(
                                vertical: 14,
                                horizontal: 16,
                              ),
                              decoration: BoxDecoration(
                                color: selected
                                    ? AppColors.primary.withValues(alpha: 0.22)
                                    : (isDark
                                          ? Colors.white.withValues(alpha: 0.05)
                                          : Colors.white.withValues(alpha: 0.6)),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: selected
                                      ? AppColors.primary
                                      : (isDark
                                          ? Colors.white.withValues(alpha: 0.1)
                                          : Colors.white.withValues(alpha: 0.8)),
                                  width: selected ? 1.8 : 1.0,
                                ),
                              ),
                              child: Center(
                                child: Text(
                                  label,
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: selected
                                        ? FontWeight.bold
                                        : FontWeight.w600,
                                    color: selected ? AppColors.primary : textColor,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: 160,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: () => context.go('/login'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primary,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(40),
                            ),
                          ),
                          child: Text(
                            'common.next'.tr(),
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
