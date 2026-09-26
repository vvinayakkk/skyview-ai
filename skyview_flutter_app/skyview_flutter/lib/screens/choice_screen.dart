import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geocoding/geocoding.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/auth_service.dart';
import '../services/theme_service.dart';
import '../utils/constants.dart';

class ChoiceScreen extends ConsumerStatefulWidget {
  const ChoiceScreen({super.key});

  @override
  ConsumerState<ChoiceScreen> createState() => _ChoiceScreenState();
}

class _ChoiceScreenState extends ConsumerState<ChoiceScreen> {
  String _locationName = 'Delhi, India';
  String _selectedUiCode = 'en';
  bool _initializedLocale = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initializedLocale) {
      _selectedUiCode = context.locale.languageCode;
      _initializedLocale = true;
    }
  }
  bool _themeToggleBusy = false;

  @override
  void initState() {
    super.initState();
    _loadLocationName();
    _refreshLiveLocation(showError: false);
  }

  Future<void> _loadLocationName() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('last_location_name') ?? 'Delhi, India';
    if (!mounted) return;
    setState(() {
      _locationName = saved;
    });
  }

  Future<void> _saveLocationName(String name) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('last_location_name', name);
    if (!mounted) return;
    setState(() {
      _locationName = name;
    });
  }

  Future<void> _refreshLiveLocation({bool showError = true}) async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted && showError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('choice.disabled_msg'.tr())),
          );
        }
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          if (mounted && showError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('choice.denied_msg'.tr())),
            );
          }
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        if (mounted && showError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('choice.perm_denied_msg'.tr())),
          );
        }
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 6),
        ),
      );

      final marks = await placemarkFromCoordinates(
        position.latitude,
        position.longitude,
      );

      String name = 'Delhi, India';
      if (marks.isNotEmpty) {
        final p = marks.first;
        final parts = <String>[
          if ((p.locality ?? '').trim().isNotEmpty) p.locality!.trim(),
          if ((p.administrativeArea ?? '').trim().isNotEmpty)
            p.administrativeArea!.trim(),
        ];
        if (parts.isNotEmpty) name = parts.join(', ');
      }

      await _saveLocationName(name);
    } catch (_) {
      if (mounted && showError) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('choice.fail_msg'.tr())),
        );
      }
    }
  }

  Future<void> _setManualLocation() async {
    final controller = TextEditingController(text: _locationName);
    final manual = await showDialog<String>(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: Text('choice.set_location'.tr()),
          content: TextField(
            controller: controller,
            autofocus: true,
            decoration: InputDecoration(
              hintText: 'choice.location_hint'.tr(),
              border: const OutlineInputBorder(),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: Text('choice.cancel'.tr()),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(controller.text.trim()),
              child: Text('choice.save'.tr()),
            ),
          ],
        );
      },
    );

    if (manual == null || manual.isEmpty) return;
    await _saveLocationName(manual);
  }

  Future<void> _toggleThemeSafely() async {
    if (_themeToggleBusy || !mounted) return;
    _themeToggleBusy = true;
    FocusManager.instance.primaryFocus?.unfocus();
    ref.read(themeProvider.notifier).toggle();
    _themeToggleBusy = false;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardColor = isDark
        ? AppColors.darkCard.withValues(alpha: 0.96)
        : Colors.white.withValues(alpha: 0.56);
    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.12)
        : Colors.white.withValues(alpha: 0.8);
    final textColor = isDark ? Colors.white : AppColors.textDark;
    final subColor = isDark ? Colors.white70 : AppColors.textMuted;
    final iconBg = isDark
        ? AppColors.darkCard.withValues(alpha: 0.96)
        : Colors.white.withValues(alpha: 0.56);

    // Green color for icons inside cards
    const cardIconColor = Color(0xFF2E7D32); // deep green

    return Scaffold(
      backgroundColor: Colors.transparent,
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
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              children: [
                const SizedBox(height: 12),

                // ── Top Row ──────────────────────────────────────────────
                Row(
                  children: [
                    SizedBox(
                      width: 170,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: iconBg,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: borderColor),
                        ),
                        child: InkWell(
                          onTap: _setManualLocation,
                          child: Row(
                            children: [
                              Icon(Icons.location_on_outlined,
                                  color: isDark ? Colors.white70 : Colors.black87, size: 18),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  _locationName,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontFamily: 'Poppins',
                                    fontSize: 12,
                                    color: textColor,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              Icon(
                                Icons.edit_location_alt_rounded,
                                color: isDark ? Colors.white70 : Colors.black87,
                                size: 16,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const Spacer(),

                    // Refresh location
                    _topIcon(
                      Icons.my_location_rounded,
                      isDark ? Colors.white70 : Colors.black87,
                      iconBg,
                      onTap: () => _refreshLiveLocation(showError: true),
                    ),
                    const SizedBox(width: 8),

                    // Theme toggle
                    _topIcon(
                      isDark
                          ? Icons.dark_mode_rounded
                          : Icons.light_mode_rounded,
                      isDark ? Colors.white70 : Colors.black87,
                      iconBg,
                      onTap: _toggleThemeSafely,
                    ),

                    // Logout
                    _topIcon(
                      Icons.logout_rounded,
                      AppColors.error,
                      iconBg,
                      onTap: () {
                        ref.read(authProvider.notifier).logout();
                        context.go('/login');
                      },
                    ),
                  ],
                ),

                const SizedBox(height: 30),

                // ── Logo (increased size: 140 → 180) ─────────────────────
                SizedBox(
                  height: 210,
                  width: 210,
                  child: ClipOval(
                    child: Image.asset(
                      isDark ? 'assets/logo_light.png' : 'assets/logo.png',
                      fit: BoxFit.contain,
                      errorBuilder: (_, __, ___) => Container(
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primary,
                        ),
                        child: const Icon(Icons.agriculture_rounded,
                            color: Colors.white, size: 72),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                Text(
                  'choice.title'.tr(),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    fontWeight: FontWeight.w700,
                    fontSize: 22,
                    color: textColor,
                  ),
                ),

                const SizedBox(height: 24),

                // ── Voice card ───────────────────────────────────────────
                _interactionCard(
                  icon: Icons.mic_rounded,
                  iconColor: cardIconColor, // ← green icon
                  title: 'choice.voice_title'.tr(),
                  subtitle:
                      'choice.voice_subtitle'.tr(),
                  onTap: () => context.push('/voice'),
                  cardColor: cardColor,
                  borderColor: borderColor,
                  textColor: textColor,
                  subColor: subColor,
                ),

                // ── OR divider (extra vertical padding for more spacing) ──
                const SizedBox(height: 20),
                Row(
                  children: [
                    const Expanded(child: Divider()),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text(
                        'choice.or'.tr(),
                        style: TextStyle(
                          fontFamily: 'Poppins',
                          fontWeight: FontWeight.w600,
                          color: subColor,
                        ),
                      ),
                    ),
                    const Expanded(child: Divider()),
                  ],
                ),
                const SizedBox(height: 20),

                // ── Chat card ────────────────────────────────────────────
                _interactionCard(
                  icon: Icons.edit_note_rounded,
                  iconColor: cardIconColor, // ← green icon
                  title: 'choice.chat_title'.tr(),
                  subtitle:
                      'choice.chat_subtitle'.tr(),
                  onTap: () => context.push('/chat'),
                  cardColor: cardColor,
                  borderColor: borderColor,
                  textColor: textColor,
                  subColor: subColor,
                ),

                const SizedBox(height: 24),

                // ── Quick Services (centered) ─────────────────────────────
                Align(
                  alignment: Alignment.center, // ← was centerLeft
                  child: Text(
                    'choice.quick_services'.tr(),
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                      color: textColor,
                    ),
                  ),
                ),

                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: _quickCard(
                        icon: Icons.shopping_bag_outlined,
                        iconColor: cardIconColor, // ← green icon
                        title: 'choice.marketplace_title'.tr(),
                        subtitle: 'choice.marketplace_subtitle'.tr(),
                        onTap: () => context.push('/marketplace'),
                        cardColor: cardColor,
                        borderColor: borderColor,
                        textColor: textColor,
                        subColor: subColor,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _quickCard(
                        icon: Icons.trending_up_rounded,
                        iconColor: cardIconColor, // ← green icon
                        title: 'choice.mandi_title'.tr(),
                        subtitle: 'choice.mandi_subtitle'.tr(),
                        onTap: () => context.push('/mandi_rates'),
                        cardColor: cardColor,
                        borderColor: borderColor,
                        textColor: textColor,
                        subColor: subColor,
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }



  Widget _topIcon(
    IconData icon,
    Color color,
    Color bg, {
    required VoidCallback onTap,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
      ),
      child: IconButton(
        icon: Icon(icon, color: color, size: 20),
        onPressed: onTap,
      ),
    );
  }

  Widget _interactionCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    required Color cardColor,
    required Color borderColor,
    required Color textColor,
    required Color subColor,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borderColor, width: 1.2),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: iconColor, size: 28), // ← green icon
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontFamily: 'Poppins',
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: textColor,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontFamily: 'Poppins',
                        fontSize: 12,
                        color: subColor,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: subColor),
            ],
          ),
        ),
      ),
    );
  }

  Widget _quickCard({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    required Color cardColor,
    required Color borderColor,
    required Color textColor,
    required Color subColor,
  }) {
    return Container(
      height: 120,
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borderColor, width: 1.2),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.06),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: iconColor, size: 20), // ← green icon
              ),
              const SizedBox(height: 8),
              Text(
                title,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'Poppins',
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  color: textColor,
                ),
              ),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 10,
                  color: subColor,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}