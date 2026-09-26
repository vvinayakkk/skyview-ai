import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:pinput/pinput.dart';
import 'package:record/record.dart';

import '../services/auth_service.dart';
import '../services/theme_service.dart';
import '../utils/constants.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _landController = TextEditingController();
  final _locationController = TextEditingController();
  final _cropsController = TextEditingController();
  final _otpController = TextEditingController();
  final _otpFocus = FocusNode();

  // Voice recording fields
  final AudioRecorder _audioRecorder = AudioRecorder();
  bool _isRecording = false;
  String? _recordPath;

  // Selected Country Code
  Map<String, String> _selectedCountry = kCountryCodes.first; // India +91

  bool _otpSent = false;
  bool _loading = false;
  String? _error;
  String? _autoOtp;

  int _resendCountdown = 0;
  Timer? _resendTimer;

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _landController.dispose();
    _locationController.dispose();
    _cropsController.dispose();
    _otpController.dispose();
    _otpFocus.dispose();
    _audioRecorder.dispose();
    _resendTimer?.cancel();
    super.dispose();
  }

  void _startResendCountdown() {
    setState(() => _resendCountdown = 30);
    _resendTimer?.cancel();
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        _resendCountdown--;
        if (_resendCountdown <= 0) t.cancel();
      });
    });
  }

  Future<void> _startRecording() async {
    try {
      if (await Permission.microphone.request().isGranted) {
        final dir = await getTemporaryDirectory();
        _recordPath = '${dir.path}/voice_signup.wav';
        await _audioRecorder.start(
          const RecordConfig(
            encoder: AudioEncoder.wav,
            sampleRate: 16000,
            numChannels: 1,
          ),
          path: _recordPath!,
        );
        setState(() {
          _isRecording = true;
          _error = null;
        });
      } else {
        setState(() => _error = 'Microphone permission denied.');
      }
    } catch (e) {
      setState(() => _error = 'Could not start recording: $e');
    }
  }

  Future<void> _stopAndProcessRecording() async {
    try {
      final path = await _audioRecorder.stop();
      setState(() => _isRecording = false);

      if (path != null && File(path).existsSync()) {
        setState(() => _loading = true);
        final fileBytes = await File(path).readAsBytes();
        final request = http.MultipartRequest(
          'POST',
          Uri.parse('$kBaseUrl/api/voice/process'),
        );
        request.files.add(
          http.MultipartFile.fromBytes(
            'audio',
            fileBytes,
            filename: 'signup_voice.wav',
            contentType: MediaType('audio', 'wav'),
          ),
        );
        final lang = Localizations.localeOf(context).languageCode;
        request.fields['language_code'] = lang == 'hi' ? 'hi-IN' : 'en-IN';

        final streamedResponse = await request.send();
        final response = await http.Response.fromStream(streamedResponse);

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body) as Map<String, dynamic>;
          if (data['status'] == 'success' && data['identified_fields'] != null) {
            final fields = data['identified_fields'] as Map<String, dynamic>;
            setState(() {
              if (fields['name'] != null) {
                _nameController.text = fields['name'].toString();
              }
              if (fields['phone'] != null) {
                String cleanPhone = fields['phone']
                    .toString()
                    .replaceAll(RegExp(r'[- \(\)]'), '');
                if (cleanPhone.startsWith('+91')) {
                  cleanPhone = cleanPhone.substring(3);
                } else if (cleanPhone.startsWith('91') &&
                    cleanPhone.length > 10) {
                  cleanPhone = cleanPhone.substring(2);
                }
                _phoneController.text = cleanPhone;
              }
              if (fields['land_size_acres'] != null) {
                _landController.text = fields['land_size_acres'].toString();
              }
              if (fields['location'] != null) {
                _locationController.text = fields['location'].toString();
              }
              if (fields['crops'] != null) {
                final cropsData = fields['crops'];
                if (cropsData is List) {
                  _cropsController.text = cropsData.join(', ');
                } else {
                  _cropsController.text = cropsData.toString();
                }
              }
            });
          }
        } else {
          setState(() => _error = 'Failed to extract voice data.');
        }
      }
    } catch (e) {
      setState(() => _error = 'Error processing voice: $e');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _sendOtp() async {
    final name = _nameController.text.trim();
    final phoneNum = _phoneController.text.trim();

    if (name.isEmpty || phoneNum.isEmpty) {
      setState(() => _error = 'signup.name_phone_required'.tr());
      return;
    }

    if (_selectedCountry['dial_code'] == '+91' && phoneNum.length != 10) {
      setState(() => _error = 'login.invalid_phone'.tr());
      return;
    }

    final formattedPhone = '${_selectedCountry['dial_code']}$phoneNum';

    setState(() {
      _loading = true;
      _error = null;
    });

    final auth = ref.read(authProvider.notifier);
    final result = await auth.sendOtp(formattedPhone, isSignup: true);

    if (!mounted) return;
    if (result['success'] == true) {
      setState(() {
        _otpSent = true;
        _loading = false;
        _autoOtp = result['otp']?.toString();
      });
      _startResendCountdown();
      if (_autoOtp != null) {
        Future.delayed(const Duration(milliseconds: 200), () {
          if (mounted) {
            setState(() => _otpController.text = _autoOtp!);
            _otpFocus.requestFocus();
          }
        });
      }
    } else {
      setState(() {
        _error = result['message'] ?? 'Failed to send OTP';
        _loading = false;
      });
    }
  }

  Future<void> _verifyAndRegister() async {
    final phoneNum = _phoneController.text.trim();
    final formattedPhone = '${_selectedCountry['dial_code']}$phoneNum';
    final otp = _otpController.text.trim();
    final name = _nameController.text.trim();
    final landSize = double.tryParse(_landController.text.trim()) ?? 0.0;
    final location = _locationController.text.trim();
    final crops = _cropsController.text
        .split(',')
        .map((c) => c.trim())
        .where((c) => c.isNotEmpty)
        .toList();

    if (otp.length < 6) {
      setState(() => _error = 'login.error_otp'.tr());
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    final auth = ref.read(authProvider.notifier);
    final profileSaved = await auth.saveProfile(
      phone: formattedPhone,
      name: name,
      landSize: landSize,
      location: location,
      crops: crops,
    );

    if (!profileSaved) {
      setState(() {
        _error = 'Failed to save profile. Please check parameters.';
        _loading = false;
      });
      return;
    }

    final loginSuccess = await auth.verifyOtp(formattedPhone, otp);

    if (!mounted) return;
    if (loginSuccess) {
      context.go('/chat');
    } else {
      setState(() {
        _error = 'Invalid OTP. Please check and try again.';
        _loading = false;
      });
    }
  }

  void _showCountryPicker() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Text(
                'Select Country Code',
                style: TextStyle(
                  color: isDark ? Colors.white : AppColors.lightText,
                  fontFamily: 'Poppins',
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 12),
              Expanded(
                child: ListView.builder(
                  itemCount: kCountryCodes.length,
                  itemBuilder: (context, index) {
                    final c = kCountryCodes[index];
                    return ListTile(
                      title: Text(
                        '${c['name']} (${c['dial_code']})',
                        style: TextStyle(
                          color: isDark ? Colors.white : AppColors.lightText,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      trailing: Text(
                        c['code'] ?? '',
                        style: TextStyle(
                          color: isDark
                              ? Colors.white54
                              : AppColors.lightTextSecondary,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      onTap: () {
                        setState(() => _selectedCountry = c);
                        Navigator.pop(context);
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final themeMode = ref.watch(themeProvider);
    final textColor = isDark ? AppColors.darkText : AppColors.lightText;
    final subColor =
        isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;
    final surface = isDark
        ? AppColors.darkCard.withValues(alpha: 0.96)
        : Colors.white.withValues(alpha: 0.62);
    final borderColor =
        isDark ? AppColors.darkBorder : Colors.white.withValues(alpha: 0.75);

    return Scaffold(
      body: Stack(
        children: [
          // Background — same gradient as LoginScreen
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: isDark
                    ? const [AppColors.darkBackground, AppColors.darkSurface]
                    : const [AppColors.lightBackground, AppColors.lightSurface],
              ),
            ),
          ),
          SafeArea(
            child: Stack(
              children: [
                // Back button — top-left
                Positioned(
                  top: 8,
                  left: 8,
                  child: IconButton(
                    onPressed: () {
                      if (_otpSent) {
                        setState(() {
                          _otpSent = false;
                          _otpController.clear();
                          _autoOtp = null;
                          _error = null;
                        });
                      } else {
                        context.go('/login');
                      }
                    },
                    icon: const Icon(Icons.arrow_back_rounded),
                    color: textColor,
                    style: IconButton.styleFrom(
                      backgroundColor: surface,
                      side: BorderSide(color: borderColor),
                    ),
                  ),
                ),
                // Theme toggle — top-right
                Positioned(
                  top: 8,
                  right: 8,
                  child: IconButton(
                    onPressed: () =>
                        ref.read(themeProvider.notifier).toggle(),
                    icon: Icon(
                      themeMode == ThemeMode.dark
                          ? Icons.dark_mode
                          : Icons.light_mode,
                    ),
                    color: textColor,
                    style: IconButton.styleFrom(
                      backgroundColor: surface,
                      side: BorderSide(color: borderColor),
                    ),
                  ),
                ),
                // Main scrollable content
                Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.xl,
                      vertical: AppSpacing.xl,
                    ),
                    child: Container(
                      width: 360,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 24,
                        vertical: 26,
                      ),
                      decoration: BoxDecoration(
                        color: surface,
                        borderRadius: BorderRadius.circular(26),
                        border: Border.all(color: borderColor),
                        boxShadow: [
                          BoxShadow(
                            color:
                                AppColors.primaryDark.withValues(alpha: 0.12),
                            blurRadius: 30,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Logo
                          Center(
                            child: Image.asset(
                              isDark
                                  ? 'assets/logo_light.png'
                                  : 'assets/logo.png',
                              width: 120,
                              height: 120,
                              fit: BoxFit.contain,
                            ),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          // Title
                          Text(
                            _otpSent
                                ? 'login.otp_title'.tr()
                                : 'signup.register_title'.tr(),
                            textAlign: TextAlign.center,
                            style: Theme.of(context)
                                .textTheme
                                .headlineMedium
                                ?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: textColor,
                                ),
                          ),
                          const SizedBox(height: AppSpacing.sm),
                          // Subtitle
                          Text(
                            _otpSent
                                ? 'login.otp_subtitle'.tr(namedArgs: {
                                    'phone':
                                        '${_selectedCountry['dial_code']}${_phoneController.text}'
                                  })
                                : 'signup.subtitle'.tr(),
                            textAlign: TextAlign.center,
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(color: subColor),
                          ),
                          const SizedBox(height: AppSpacing.xl),

                          // ── Registration form ──
                          if (!_otpSent) ...[
                            _buildVoiceWidget(isDark, borderColor, textColor),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              controller: _nameController,
                              label: 'signup.full_name'.tr(),
                              icon: Icons.person_rounded,
                              isDark: isDark,
                              borderColor: borderColor,
                              textColor: textColor,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildPhoneRow(isDark, borderColor, textColor),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              controller: _landController,
                              label: 'signup.land_size'.tr(),
                              icon: Icons.grid_on_rounded,
                              isDark: isDark,
                              borderColor: borderColor,
                              textColor: textColor,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              controller: _locationController,
                              label: 'signup.location'.tr(),
                              icon: Icons.map_rounded,
                              isDark: isDark,
                              borderColor: borderColor,
                              textColor: textColor,
                            ),
                            const SizedBox(height: AppSpacing.md),
                            _buildTextField(
                              controller: _cropsController,
                              label: 'signup.crops'.tr(),
                              icon: Icons.grass_rounded,
                              isDark: isDark,
                              borderColor: borderColor,
                              textColor: textColor,
                            ),
                            const SizedBox(height: AppSpacing.xl),
                            ElevatedButton(
                              onPressed: _loading ? null : _sendOtp,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: Colors.white,
                                minimumSize: const Size(double.infinity, 54),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: _loading
                                  ? const SizedBox(
                                      height: 22,
                                      width: 22,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2.5,
                                        color: Colors.white,
                                      ),
                                    )
                                  : Text('signup.send_otp'.tr()),
                            ),
                            const SizedBox(height: 16),
                            Center(
                              child: TextButton(
                                onPressed: () => context.go('/login'),
                                child: Text(
                                  'signup.have_account'.tr(),
                                  style: const TextStyle(
                                    color: AppColors.primary,
                                    fontFamily: 'Poppins',
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            ),
                          ],

                          // ── OTP step ──
                          if (_otpSent) ...[
                            _buildOtpField(isDark, borderColor),
                            const SizedBox(height: AppSpacing.md),
                            if (_autoOtp != null)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: AppColors.primaryLight
                                      .withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(
                                    color: AppColors.primaryLight
                                        .withValues(alpha: 0.4),
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.auto_fix_high_rounded,
                                        size: 14, color: textColor),
                                    const SizedBox(width: 6),
                                    Text(
                                      'login.auto_filled'.tr(),
                                      style: TextStyle(
                                        color: textColor,
                                        fontSize: 12,
                                        fontFamily: 'Poppins',
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            const SizedBox(height: AppSpacing.xl),
                            Row(
                              children: [
                                Expanded(
                                  child: OutlinedButton(
                                    onPressed: _loading
                                        ? null
                                        : () => setState(() {
                                              _otpSent = false;
                                              _otpController.clear();
                                              _autoOtp = null;
                                              _error = null;
                                            }),
                                    style: OutlinedButton.styleFrom(
                                      side: BorderSide(color: borderColor),
                                      foregroundColor: textColor,
                                      minimumSize:
                                          const Size(double.infinity, 54),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                    ),
                                    child: Text('signup.back'.tr(),
                                        style: const TextStyle(
                                            fontFamily: 'Poppins')),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: ElevatedButton(
                                    onPressed:
                                        _loading ? null : _verifyAndRegister,
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.primary,
                                      foregroundColor: Colors.white,
                                      minimumSize:
                                          const Size(double.infinity, 54),
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                    ),
                                    child: _loading
                                        ? const SizedBox(
                                            height: 22,
                                            width: 22,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2.5,
                                              color: Colors.white,
                                            ),
                                          )
                                        : Text('signup.verify_signup'.tr()),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Center(
                              child: _resendCountdown > 0
                                  ? Text(
                                      'Resend in $_resendCountdown s',
                                      style: TextStyle(
                                        color: subColor,
                                        fontFamily: 'Poppins',
                                        fontSize: 13,
                                      ),
                                    )
                                  : TextButton(
                                      onPressed: _loading ? null : _sendOtp,
                                      child: Text(
                                        'login.resend'.tr(),
                                        style: const TextStyle(
                                          color: AppColors.primary,
                                          fontFamily: 'Poppins',
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ),
                            ),
                            Center(
                              child: TextButton(
                                onPressed: () => setState(() {
                                  _otpSent = false;
                                  _otpController.clear();
                                  _autoOtp = null;
                                  _error = null;
                                }),
                                child: Text(
                                  'login.change_number'.tr(),
                                  style: TextStyle(
                                    color: subColor,
                                    fontFamily: 'Poppins',
                                    fontSize: 13,
                                  ),
                                ),
                              ),
                            ),
                          ],

                          // ── Error banner ──
                          if (_error != null) ...[
                            const SizedBox(height: 14),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: AppColors.error.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color:
                                      AppColors.error.withValues(alpha: 0.3),
                                ),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.error_outline,
                                      color: AppColors.error, size: 18),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      _error!,
                                      style: const TextStyle(
                                        color: AppColors.error,
                                        fontFamily: 'Poppins',
                                        fontSize: 13,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Voice widget — compact, card-native ──────────────────────────────────
  Widget _buildVoiceWidget(
      bool isDark, Color borderColor, Color textColor) {
    final subColor =
        isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;
    final fillColor = isDark
        ? AppColors.darkCard.withValues(alpha: 0.96)
        : Colors.white.withValues(alpha: 0.55);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: fillColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: _isRecording
                ? _stopAndProcessRecording
                : _startRecording,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _isRecording
                    ? AppColors.error.withValues(alpha: 0.15)
                    : AppColors.primary.withValues(alpha: 0.12),
                border: Border.all(
                  color: _isRecording ? AppColors.error : AppColors.primary,
                  width: 1.5,
                ),
              ),
              child: Icon(
                _isRecording ? Icons.stop_rounded : Icons.mic_rounded,
                color: _isRecording ? AppColors.error : AppColors.primary,
                size: 22,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _isRecording
                      ? 'signup.voice_listening'.tr()
                      : 'signup.voice_title'.tr(),
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    color: textColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                Text(
                  _isRecording
                      ? 'signup.voice_stop_hint'.tr()
                      : 'signup.voice_tap_hint'.tr(),
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    color: subColor,
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Reusable text field ──────────────────────────────────────────────────
  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required bool isDark,
    required Color borderColor,
    required Color textColor,
    TextInputType? keyboardType,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      enabled: !_loading,
      style: TextStyle(color: textColor, fontFamily: 'Poppins'),
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon,
            color: isDark ? Colors.white54 : AppColors.lightTextSecondary,
            size: 20),
        filled: true,
        fillColor: isDark
            ? AppColors.darkCard.withValues(alpha: 0.96)
            : Colors.white.withValues(alpha: 0.55),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(
            color: isDark ? Colors.white : AppColors.primary,
            width: 2,
          ),
        ),
      ),
    );
  }

  // ── Phone row (country picker + number field) ────────────────────────────
  Widget _buildPhoneRow(bool isDark, Color borderColor, Color textColor) {
    return Row(
      children: [
        GestureDetector(
          onTap: _loading ? null : _showCountryPicker,
          child: Container(
            height: 56,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: isDark
                  ? AppColors.darkCard.withValues(alpha: 0.96)
                  : Colors.white.withValues(alpha: 0.55),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: borderColor),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _selectedCountry['dial_code']!,
                  style: TextStyle(
                    color: textColor,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Poppins',
                  ),
                ),
                Icon(Icons.arrow_drop_down_rounded, color: textColor),
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            enabled: !_loading,
            style: TextStyle(color: textColor, fontFamily: 'Poppins'),
            decoration: InputDecoration(
              labelText: 'signup.phone'.tr(),
              hintText: 'login.phone_hint'.tr(),
              filled: true,
              fillColor: isDark
                  ? AppColors.darkCard.withValues(alpha: 0.96)
                  : Colors.white.withValues(alpha: 0.55),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: borderColor),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: borderColor),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: isDark ? Colors.white : AppColors.primary,
                  width: 2,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  // ── OTP Pinput ───────────────────────────────────────────────────────────
  Widget _buildOtpField(bool isDark, Color borderColor) {
    final defaultTheme = PinTheme(
      width: 48,
      height: 56,
      textStyle: TextStyle(
        fontSize: 20,
        fontFamily: 'Poppins',
        fontWeight: FontWeight.w700,
        color: isDark ? Colors.white : AppColors.lightText,
      ),
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.darkCard.withValues(alpha: 0.96)
            : Colors.white.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
    );

    final focusedTheme = defaultTheme.copyWith(
      decoration: defaultTheme.decoration!.copyWith(
        border: Border.all(
          color: isDark ? Colors.white : AppColors.primary,
          width: 2,
        ),
      ),
    );

    return Pinput(
      length: 6,
      controller: _otpController,
      focusNode: _otpFocus,
      defaultPinTheme: defaultTheme,
      focusedPinTheme: focusedTheme,
      keyboardType: TextInputType.number,
      onCompleted: (_) => _verifyAndRegister(),
    );
  }
}