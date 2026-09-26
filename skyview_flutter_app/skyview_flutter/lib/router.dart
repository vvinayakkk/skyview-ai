import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'screens/splash_screen.dart';
import 'screens/language_select_screen.dart';
import 'screens/login_screen.dart';
import 'screens/chat_screen.dart';
import 'screens/voice_screen.dart';
import 'screens/signup_screen.dart';
import 'screens/choice_screen.dart';
import 'screens/overview_screen.dart';
import 'screens/chat_history_screen.dart';
import 'screens/trends_screen.dart';
import 'screens/mandi_rates_screen.dart';
import 'screens/marketplace_screen.dart';
import 'screens/reports_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/accelerator_screen.dart';
import 'services/auth_service.dart';

final routerProvider = Provider<GoRouter>((ref) {
  ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final isAuth = ref.read(authProvider).isAuthenticated;
      final onSplash = state.matchedLocation == '/splash';
      final onLang = state.matchedLocation == '/language_select';
      final onLogin = state.matchedLocation == '/login';
      final onSignup = state.matchedLocation == '/signup';
      
      // If not authenticated and trying to access a protected route, go to splash
      if (!isAuth && !onSplash && !onLang && !onLogin && !onSignup) {
        return '/splash';
      }
      
      // If authenticated and trying to go to entry routes, go to choice
      if (isAuth && (onSplash || onLang || onLogin || onSignup)) {
        return '/choice';
      }
      
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        pageBuilder: (_, state) => _fade(state, const SplashScreen()),
      ),
      GoRoute(
        path: '/language_select',
        pageBuilder: (_, state) => _fade(state, const LanguageSelectScreen()),
      ),
      GoRoute(
        path: '/login',
        pageBuilder: (_, state) => _fade(state, const LoginScreen()),
      ),
      GoRoute(
        path: '/signup',
        pageBuilder: (_, state) => _fade(state, const SignupScreen()),
      ),
      GoRoute(
        path: '/choice',
        pageBuilder: (_, state) => _fade(state, const ChoiceScreen()),
      ),
      GoRoute(
        path: '/overview',
        pageBuilder: (_, state) => _fade(state, const OverviewScreen()),
      ),
      GoRoute(
        path: '/chat_history',
        pageBuilder: (_, state) => _fade(state, const ChatHistoryScreen()),
      ),
      GoRoute(
        path: '/chat',
        pageBuilder: (_, state) => _fade(state, const ChatScreen()),
      ),
      GoRoute(
        path: '/voice',
        pageBuilder: (_, state) => _slide(state, const VoiceScreen()),
      ),
      GoRoute(
        path: '/trends',
        pageBuilder: (_, state) => _fade(state, const TrendsScreen()),
      ),
      GoRoute(
        path: '/mandi_rates',
        pageBuilder: (_, state) => _fade(state, const MandiRatesScreen()),
      ),
      GoRoute(
        path: '/marketplace',
        pageBuilder: (_, state) => _fade(state, const MarketplaceScreen()),
      ),
      GoRoute(
        path: '/reports',
        pageBuilder: (_, state) => _fade(state, const ReportsScreen()),
      ),
      GoRoute(
        path: '/profile',
        pageBuilder: (_, state) => _fade(state, const ProfileScreen()),
      ),
      GoRoute(
        path: '/accelerator',
        pageBuilder: (_, state) => _fade(state, const AcceleratorScreen()),
      ),
    ],
  );
});

CustomTransitionPage<void> _fade(GoRouterState state, Widget child) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionsBuilder: (_, anim, __, c) =>
        FadeTransition(opacity: anim, child: c),
    transitionDuration: const Duration(milliseconds: 280),
  );
}

CustomTransitionPage<void> _slide(GoRouterState state, Widget child) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionsBuilder: (_, anim, __, c) => SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(0, 1),
        end: Offset.zero,
      ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
      child: c,
    ),
    transitionDuration: const Duration(milliseconds: 320),
  );
}
