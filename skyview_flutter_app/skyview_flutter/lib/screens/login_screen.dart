import 'dart:async';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:pinput/pinput.dart';

import '../services/auth_service.dart';
import '../services/theme_service.dart';
import '../utils/constants.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  final _otpFocus = FocusNode();

  // Selected Country Code from constants.dart
  Map<String, String> _selectedCountry = kCountryCodes.first; // India +91

  bool _otpSent = false;
  bool _loading = false;
  String? _error;
  String? _autoOtp; // dev mode autofill OTP
  bool _isAutoFetchingOtp = false;
  int _resendCountdown = 0;
  Timer? _resendTimer;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    _otpFocus.dispose();
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

  Future<void> _sendOtp() async {
    final phoneNum = _phoneController.text.trim();
    if (phoneNum.isEmpty) {
      setState(() => _error = 'login.phone_required'.tr());
      return;
    }

    // Basic length check for India (10 digits)
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
    final result = await auth.sendOtp(formattedPhone);

    if (!mounted) return;
    if (result['success'] == true) {
      setState(() {
        _otpSent = true;
        _loading = false;
        _autoOtp = result['otp']?.toString(); // dev autofill
      });
      _startResendCountdown();
      if (_autoOtp != null) {
        setState(() => _isAutoFetchingOtp = true);
        Future.delayed(const Duration(milliseconds: 1500), () {
          if (mounted) {
            setState(() {
              _otpController.text = _autoOtp!;
              _isAutoFetchingOtp = false;
            });
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

  Future<void> _verifyOtp() async {
    final phoneNum = _phoneController.text.trim();
    final formattedPhone = '${_selectedCountry['dial_code']}$phoneNum';
    final otp = _otpController.text.trim();
    if (otp.length < 6) {
      setState(() => _error = 'login.error_otp'.tr());
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });

    final auth = ref.read(authProvider.notifier);
    final success = await auth.verifyOtp(formattedPhone, otp);

    if (!mounted) return;
    if (success) {
      context.go('/chat');
    } else {
      setState(() {
        _error = 'login.error_invalid'.tr();
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
                          color: isDark ? Colors.white54 : AppColors.lightTextSecondary,
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
    final subColor = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;
    final surface = isDark
        ? AppColors.darkCard.withValues(alpha: 0.96)
        : Colors.white.withValues(alpha: 0.62);
    final borderColor = isDark ? AppColors.darkBorder : Colors.white.withValues(alpha: 0.75);

    return Scaffold(
      body: Stack(
        children: [
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
                        context.go('/language_select');
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
                    color: textColor,
                    style: IconButton.styleFrom(
                      backgroundColor: surface,
                      side: BorderSide(color: borderColor),
                    ),
                  ),
                ),
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
                            color: AppColors.primaryDark.withValues(alpha: 0.12),
                            blurRadius: 30,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Center(
                              child: Image.asset(
                                isDark
                                    ? 'assets/logo_light.png'
                                    : 'assets/logo.png',
                                width: 180,
                                height: 180,
                                fit: BoxFit.contain,
                              ),
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            Text(
                              _otpSent ? 'login.otp_title'.tr() : 'login.title'.tr(),
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                    color: textColor,
                                  ),
                            ),
                            const SizedBox(height: AppSpacing.sm),
                            Text(
                              _otpSent
                                  ? 'login.otp_subtitle'.tr(namedArgs: {
                                      'phone': '${_selectedCountry['dial_code']}${_phoneController.text}'
                                    })
                                  : 'login.subtitle'.tr(),
                              textAlign: TextAlign.center,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: subColor,
                                  ),
                            ),
                            const SizedBox(height: AppSpacing.xxl),

                            if (!_otpSent) ...[
                              Row(
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
                                      inputFormatters: [
                                        FilteringTextInputFormatter.allow(RegExp(r'[0-9]')),
                                      ],
                                      style: TextStyle(
                                        color: textColor,
                                        fontFamily: 'Poppins',
                                      ),
                                      decoration: InputDecoration(
                                        labelText: 'login.phone_label'.tr(),
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
                                      ),
                                    ),
                                  ),
                                ],
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
                                    : Text('login.send_otp'.tr()),
                              ),
                              const SizedBox(height: 16),
                              Center(
                                child: TextButton(
                                  onPressed: () => context.go('/signup'),
                                  child: Text(
                                    'login.no_account_signup'.tr(),
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

                            if (_otpSent) ...[
                              _buildOtpField(isDark, borderColor),
                              const SizedBox(height: AppSpacing.md),
                              if (_isAutoFetchingOtp)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: AppColors.warning.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: AppColors.warning.withValues(alpha: 0.4),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const SizedBox(
                                        width: 12, height: 12,
                                        child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.warning),
                                      ),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Auto-detecting OTP SMS...',
                                        style: TextStyle(
                                          color: isDark ? Colors.white70 : AppColors.textDark,
                                          fontSize: 12,
                                          fontFamily: 'Poppins',
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                )
                              else if (_autoOtp != null)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryLight.withValues(alpha: 0.2),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: AppColors.primaryLight.withValues(alpha: 0.4),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.auto_fix_high_rounded, size: 14, color: textColor),
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
                              ElevatedButton(
                                onPressed: _loading ? null : _verifyOtp,
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
                                    : Text('login.verify'.tr()),
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

                            if (_error != null) ...[
                              const SizedBox(height: 14),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                decoration: BoxDecoration(
                                  color: AppColors.error.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: AppColors.error.withValues(alpha: 0.3),
                                  ),
                                ),
                                child: Row(
                                  children: [
                                    const Icon(Icons.error_outline, color: AppColors.error, size: 18),
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
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOtpField(bool isDark, Color borderColor) {
    final defaultPinTheme = PinTheme(
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

    final focusedTheme = defaultPinTheme.copyWith(
      decoration: defaultPinTheme.decoration!.copyWith(
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
      defaultPinTheme: defaultPinTheme,
      focusedPinTheme: focusedTheme,
      keyboardType: TextInputType.number,
      onCompleted: (_) => _verifyOtp(),
    );
  }
}
