import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../services/auth_service.dart';
import '../services/theme_service.dart';
import '../utils/constants.dart';

class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeMode = ref.watch(themeProvider);
    final auth = ref.watch(authProvider);
    final isLoggedIn = auth.isAuthenticated;

    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? [AppColors.darkBackground, AppColors.darkBackground]
                : [AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
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
                  color: isDark ? AppColors.primary : AppColors.lightText,
                  style: IconButton.styleFrom(
                    backgroundColor: isDark
                        ? Colors.transparent
                        : Colors.white.withValues(alpha: 0.6),
                    side: isDark
                        ? null
                        : const BorderSide(color: Colors.white),
                  ),
                ),
              ),
              Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 360),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Image.asset(
                          isDark
                              ? 'assets/logo_light.png'
                              : 'assets/logo.png',
                          width: 320,
                          height: 320,
                          fit: BoxFit.contain,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          'welcome'.tr(),
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                                color: isDark ? Colors.white : AppColors.lightText,
                              ),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        Text(
                          'splash.subtitle'.tr(),
                          textAlign: TextAlign.center,
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                color: isDark ? Colors.white70 : AppColors.lightTextSecondary,
                              ),
                        ),
                        const SizedBox(height: AppSpacing.xl),
                        SizedBox(
                          width: 220,
                          height: 48,
                          child: ElevatedButton(
                            onPressed: () {
                              HapticFeedback.mediumImpact();
                              context.go(
                                isLoggedIn ? '/chat' : '/language_select',
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              textStyle: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            child: Text('splash.get_started'.tr()),
                          ),
                        ),
                      ],
                    ),
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
