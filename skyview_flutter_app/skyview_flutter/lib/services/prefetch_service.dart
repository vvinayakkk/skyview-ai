/// PrefetchService: kicks off on app start and pre-warms all major
/// API endpoints in the background, storing results in SharedPreferences
/// so every screen shows data instantly.
library;

import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../utils/constants.dart';

final prefetchServiceProvider = Provider<PrefetchService>((ref) => PrefetchService());

class PrefetchService {
  bool _started = false;

  /// Call once from main.dart after ProviderScope is set up.
  Future<void> startPrefetch({String? userPhone}) async {
    if (_started) return;
    _started = true;

    // Run all fetches concurrently in background
    unawaited(_prefetchSensorLatest());
    unawaited(_prefetchSensorHistory());
    unawaited(_prefetchMandiRates());
    unawaited(_prefetchMandiCommodities());
    unawaited(_prefetchMarketplace(userPhone));
    unawaited(_prefetchOverviews(userPhone));
    if (userPhone != null) {
      unawaited(_prefetchProfile(userPhone));
    }
  }

  // ── Individual fetchers ───────────────────────────────────────────────────

  Future<void> _prefetchSensorLatest() async {
    try {
      final res = await http.get(
        Uri.parse('$kBaseUrl/api/sensors/latest/WS01'),
      ).timeout(const Duration(seconds: 15));
      if (res.statusCode == 200) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('trends_latest', res.body);
      }
    } catch (_) {}
  }

  Future<void> _prefetchSensorHistory() async {
    try {
      final res = await http.get(
        Uri.parse('$kBaseUrl/api/sensors/history/WS01?hours=24&limit=24'),
      ).timeout(const Duration(seconds: 20));
      if (res.statusCode == 200) {
        final data = json.decode(res.body) as Map<String, dynamic>;
        final List rawList = data['data'] ?? data['history'] ?? data['readings'] ?? [];
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('trends_history', json.encode(rawList));
      }
    } catch (_) {}
  }

  Future<void> _prefetchMandiRates() async {
    try {
      final res = await http.get(
        Uri.parse('$kBaseUrl/api/mandi/rates?limit=100'),
      ).timeout(const Duration(seconds: 15));
      if (res.statusCode == 200) {
        final data = json.decode(res.body) as Map<String, dynamic>;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('mandi_rates__', json.encode(data['rates'] ?? []));
      }
    } catch (_) {}
  }

  Future<void> _prefetchMandiCommodities() async {
    try {
      final res = await http.get(
        Uri.parse('$kBaseUrl/api/mandi/commodities'),
      ).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final data = json.decode(res.body) as Map<String, dynamic>;
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('mandi_commodities', json.encode(data['commodities'] ?? []));
      }
    } catch (_) {}
  }

  Future<void> _prefetchMarketplace(String? phone) async {
    if (phone == null || phone.isEmpty) return;
    try {
      final res = await http.get(
        Uri.parse('$kBaseUrl/api/marketplace/matches?phone=${Uri.encodeComponent(phone)}&limit=20'),
      ).timeout(const Duration(seconds: 20));
      if (res.statusCode == 200) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('marketplace_matches', res.body);
      }
    } catch (_) {}
  }

  Future<void> _prefetchProfile(String phone) async {
    try {
      final res = await http.get(
        Uri.parse('$kBaseUrl/api/profile/$phone'),
      ).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('profile_$phone', res.body);
      }
    } catch (_) {}
  }

  Future<void> _prefetchOverviews(String? phone) async {
    const pages = ['dashboard', 'mandi', 'trends', 'marketplace', 'reports', 'profile'];
    // Stagger requests to avoid hammering the server
    for (final page in pages) {
      await Future.delayed(const Duration(milliseconds: 800));
      try {
        final res = await http.post(
          Uri.parse('$kBaseUrl/api/chat/overview'),
          headers: {'Content-Type': 'application/json'},
          body: json.encode({
            'page': page,
            'user_phone': phone ?? '',
            'language': 'en',
          }),
        ).timeout(const Duration(seconds: 20));
        if (res.statusCode == 200) {
          final data = json.decode(res.body) as Map<String, dynamic>;
          final text = data['overview']?.toString() ?? '';
          if (text.isNotEmpty) {
            final prefs = await SharedPreferences.getInstance();
            await prefs.setString('ai_overview_${page}_en', text);
          }
        }
      } catch (_) {}
    }
  }
}

// Utility to fire-and-forget
void unawaited(Future<void> future) {
  future.then((_) {}).catchError((_) {});
}
