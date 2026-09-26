import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:url_launcher/url_launcher.dart';

import '../services/auth_service.dart';
import '../utils/constants.dart';
import '../widgets/ai_overview_widget.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _isLoading = true;
  Map<String, dynamic>? _profile;
  List<dynamic> _schemes = [];
  bool _isLoadingSchemes = false;
  static Map<String, dynamic>? _cachedProfileData;
  static List<dynamic>? _cachedSchemesData;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  static const List<Map<String, String>> _localSchemes = [
    {
      'scheme_name': 'PM-Kisan Samman Nidhi',
      'benefit': 'Direct income support of Rs. 6,000 per year in three equal instalments to all landholding farmer families.',
      'official_url': 'https://pmkisan.gov.in/',
    },
    {
      'scheme_name': 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
      'benefit': 'Financial support to farmers suffering crop loss or damage due to natural calamities, pests and diseases.',
      'official_url': 'https://pmfby.gov.in/',
    },
    {
      'scheme_name': 'Soil Health Card Scheme',
      'benefit': 'Helps farmers understand the nutrient status of their soil and use fertilizers judiciously to reduce costs.',
      'official_url': 'https://soilhealth.dac.gov.in/',
    },
    {
      'scheme_name': 'Kisan Credit Card (KCC)',
      'benefit': 'Provides farmers with timely and adequate credit for cultivation needs and short-term credit requirements.',
      'official_url': 'https://www.myscheme.gov.in/schemes/kcc',
    },
    {
      'scheme_name': 'Paramparagat Krishi Vikas Yojana (PKVY)',
      'benefit': 'Promotes organic farming through a cluster approach and PGS certification to improve soil health.',
      'official_url': 'https://pgsindia-ncof.dac.gov.in/pkvy/',
    },
  ];

  Future<void> _loadProfile() async {
    if (!mounted) return;
    if (_cachedProfileData != null) {
      setState(() {
        _profile = _cachedProfileData;
        _schemes = _cachedSchemesData ?? [];
        _isLoading = false;
      });
      _fetchBackgroundData();
    } else {
      setState(() => _isLoading = true);
      final phone = ref.read(authProvider).phone;

      try {
        final res = await http.get(
          Uri.parse('$kBaseUrl/api/profile?phone=${Uri.encodeComponent(phone ?? '')}'),
        );

        if (res.statusCode == 200) {
          final d = jsonDecode(res.body);
          if (d['status'] == 'success' && mounted) {
            setState(() {
              _profile = d['profile'];
              _cachedProfileData = d['profile'];
            });
            await _fetchSchemesRecommendations(d['profile']);
          }
        }
      } catch (_) {}

      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _fetchBackgroundData() async {
    final phone = ref.read(authProvider).phone;
    try {
      final res = await http.get(
        Uri.parse('$kBaseUrl/api/profile?phone=${Uri.encodeComponent(phone ?? '')}'),
      );
      if (res.statusCode == 200) {
        final d = jsonDecode(res.body);
        if (d['status'] == 'success' && mounted) {
          setState(() {
            _profile = d['profile'];
            _cachedProfileData = d['profile'];
          });
          await _fetchSchemesRecommendations(d['profile']);
        }
      }
    } catch (_) {}
  }

  Future<void> _fetchSchemesRecommendations(Map<String, dynamic> profile) async {
    final landSize = profile['land_size_acres'] ?? 0;
    final loc = profile['location'] ?? '';
    final cropsList = profile['crops'];
    String cropsStr = '';
    if (cropsList is List) {
      cropsStr = cropsList.join(',');
    } else if (cropsList != null) {
      cropsStr = cropsList.toString();
    }

    if (!mounted) return;
    setState(() => _isLoadingSchemes = true);

    try {
      final url = '$kBaseUrl/api/schemes/recommendations?land_size_acres=$landSize&location=${Uri.encodeComponent(loc)}&crops=${Uri.encodeComponent(cropsStr)}';
      final res = await http.get(Uri.parse(url));
      if (res.statusCode == 200) {
        final d = jsonDecode(res.body);
        if (d['status'] == 'success' && d['schemes'] != null && (d['schemes'] as List).isNotEmpty && mounted) {
          setState(() {
            _schemes = d['schemes'];
            _cachedSchemesData = _schemes;
            _isLoadingSchemes = false;
          });
          return;
        }
      }
    } catch (_) {}

    if (mounted) {
      setState(() {
        _schemes = _localSchemes;
        _cachedSchemesData = _schemes;
        _isLoadingSchemes = false;
      });
    }
  }

  bool get _isProfileIncomplete {
    if (_profile == null) return true;
    final name = _profile!['name']?.toString() ?? '';
    final land = _profile!['land_size_acres'];
    final loc = _profile!['location']?.toString() ?? '';
    final crops = _profile!['crops'];

    final isCropsEmpty = crops is List ? crops.isEmpty : (crops == null || crops.toString().isEmpty);
    final isLandEmpty = land == null || double.tryParse(land.toString()) == 0.0;

    return name.isEmpty || isLandEmpty || loc.isEmpty || isCropsEmpty;
  }

  void _showEditProfileDialog() {
    final profileMap = _profile ?? {};
    final nameCtrl = TextEditingController(text: profileMap['name']?.toString() ?? '');
    final locCtrl = TextEditingController(text: profileMap['location']?.toString() ?? '');
    final landCtrl = TextEditingController(text: profileMap['land_size_acres']?.toString() ?? '');
    
    final cropsList = profileMap['crops'];
    String cropsInit = '';
    if (cropsList is List) {
      cropsInit = cropsList.join(', ');
    } else if (cropsList != null) {
      cropsInit = cropsList.toString();
    }
    final cropsCtrl = TextEditingController(text: cropsInit);

    final excessList = profileMap['excess_resources'];
    String excessInit = '';
    if (excessList is List) {
      excessInit = excessList.join(', ');
    } else if (excessList != null) {
      excessInit = excessList.toString();
    }
    final excessCtrl = TextEditingController(text: excessInit);

    final reqList = profileMap['required_resources'] ?? profileMap['needed_resources'];
    String reqInit = '';
    if (reqList is List) {
      reqInit = reqList.join(', ');
    } else if (reqList != null) {
      reqInit = reqList.toString();
    }
    final reqCtrl = TextEditingController(text: reqInit);

    showDialog(
      context: context,
      builder: (context) {
        final isDark = Theme.of(context).brightness == Brightness.dark;
        final textColor = isDark ? Colors.white : AppColors.textDark;

        return AlertDialog(
          backgroundColor: isDark ? AppColors.darkCard : Colors.white,
          title: Text(
            'Edit Farmer Profile',
            style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, color: textColor),
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameCtrl,
                  decoration: const InputDecoration(labelText: 'Name', labelStyle: TextStyle(fontFamily: 'Poppins')),
                  style: TextStyle(color: textColor, fontFamily: 'Poppins'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: locCtrl,
                  decoration: const InputDecoration(labelText: 'Location', labelStyle: TextStyle(fontFamily: 'Poppins')),
                  style: TextStyle(color: textColor, fontFamily: 'Poppins'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: landCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Land Size (Acres)', labelStyle: TextStyle(fontFamily: 'Poppins')),
                  style: TextStyle(color: textColor, fontFamily: 'Poppins'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: cropsCtrl,
                  decoration: const InputDecoration(labelText: 'Crops (comma separated)', labelStyle: TextStyle(fontFamily: 'Poppins')),
                  style: TextStyle(color: textColor, fontFamily: 'Poppins'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: excessCtrl,
                  decoration: const InputDecoration(labelText: 'Excess Resources (comma separated)', labelStyle: TextStyle(fontFamily: 'Poppins')),
                  style: TextStyle(color: textColor, fontFamily: 'Poppins'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: reqCtrl,
                  decoration: const InputDecoration(labelText: 'Required Resources (comma separated)', labelStyle: TextStyle(fontFamily: 'Poppins')),
                  style: TextStyle(color: textColor, fontFamily: 'Poppins'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(fontFamily: 'Poppins', color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              onPressed: () async {
                Navigator.pop(context);
                setState(() => _isLoading = true);

                final phone = ref.read(authProvider).phone;

                final List<String> cropsArray = cropsCtrl.text.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
                final List<String> excessArray = excessCtrl.text.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
                final List<String> reqArray = reqCtrl.text.split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();
                final double? landVal = double.tryParse(landCtrl.text);

                try {
                  final response = await http.post(
                    Uri.parse('$kBaseUrl/api/profile/save'),
                    headers: {'Content-Type': 'application/json'},
                    body: jsonEncode({
                      'phone': phone,
                      'name': nameCtrl.text.trim(),
                      'location': locCtrl.text.trim(),
                      'land_size_acres': landVal,
                      'crops': cropsArray,
                      'excess_resources': excessArray,
                      'required_resources': reqArray,
                    }),
                  );

                  if (response.statusCode == 200) {
                    _cachedProfileData = null;
                    _cachedSchemesData = null;
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Profile updated successfully!')),
                    );
                    _loadProfile();
                  } else {
                    setState(() => _isLoading = false);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Failed to save profile details')),
                    );
                  }
                } catch (_) {
                  setState(() => _isLoading = false);
                }
              },
              child: const Text('Save', style: TextStyle(fontFamily: 'Poppins', color: Colors.white)),
            ),
          ],
        );
      },
    );
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

    final profileMap = _profile ?? {};
    final name = profileMap['name']?.toString() ?? 'Farmer Friend';
    final userPhone = profileMap['phone']?.toString() ?? ref.read(authProvider).phone ?? 'N/A';
    final location = profileMap['location']?.toString() ?? 'India';
    final landSize = profileMap['land_size_acres']?.toString() ?? 'N/A';

    final cropsList = profileMap['crops'];
    String crops = 'Wheat, Potato';
    if (cropsList is List) {
      crops = cropsList.join(', ');
    } else if (cropsList != null) {
      crops = cropsList.toString();
    }

    final excessList = profileMap['excess_resources'];
    String excess = 'Tractor';
    if (excessList is List) {
      excess = excessList.join(', ');
    } else if (excessList != null) {
      excess = excessList.toString();
    }

    final reqList = profileMap['required_resources'] ?? profileMap['needed_resources'];
    String requiredRes = 'Seeder';
    if (reqList is List) {
      requiredRes = reqList.join(', ');
    } else if (reqList != null) {
      requiredRes = reqList.toString();
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_rounded,
              color: isDark ? Colors.white : AppColors.textDark),
          onPressed: () => context.pop(),
        ),
        title: Text(
          'profile.title'.tr(),
          style: TextStyle(
            fontFamily: 'Poppins',
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : AppColors.textDark,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.edit_rounded, color: isDark ? Colors.white : AppColors.textDark),
            tooltip: 'Edit Profile',
            onPressed: _showEditProfileDialog,
          ),
        ],
      ),
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
          child: _isLoading
              ? const Center(
                  child: CircularProgressIndicator(color: AppColors.primary))
              : SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    children: [
                      const SizedBox(height: 10),

                      // Collapsible AI Overview widget replacing static overview box
                      AiOverviewWidget(
                        page: 'profile',
                        isDark: isDark,
                      ),

                      if (!_isLoading && _isProfileIncomplete)
                        Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(bottom: 16, top: 8),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: BoxDecoration(
                            color: AppColors.warning.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppColors.warning.withValues(alpha: 0.4)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.warning_amber_rounded, color: AppColors.warning, size: 20),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'profile.complete_onboarding_warning'.tr(),
                                  style: TextStyle(
                                    fontFamily: 'Poppins',
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: isDark ? Colors.white.withValues(alpha: 0.87) : AppColors.textDark,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                      const SizedBox(height: 20),

                      // Profile Details Card
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: cardColor,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: borderColor),
                        ),
                        child: Column(
                          children: [
                            CircleAvatar(
                              radius: 40,
                              backgroundColor: AppColors.primary.withValues(alpha: 0.12),
                              child: const Icon(Icons.person_rounded, color: AppColors.primary, size: 40),
                            ),
                            const SizedBox(height: 16),
                            Text(
                              name,
                              style: TextStyle(
                                fontFamily: 'Poppins',
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                                color: textColor,
                              ),
                            ),
                            const SizedBox(height: 24),
                            _buildInfoRow(Icons.phone_rounded, 'Phone', userPhone, textColor),
                            const Divider(height: 24),
                            _buildInfoRow(Icons.location_on_rounded, 'Location', location, textColor),
                            const Divider(height: 24),
                            _buildInfoRow(Icons.landscape_rounded, 'Land Size (Acres)', landSize, textColor),
                            const Divider(height: 24),
                            _buildInfoRow(Icons.agriculture_rounded, 'Crops Cultivated', crops, textColor),
                            const Divider(height: 24),
                            _buildInfoRow(Icons.construction_rounded, 'Excess Resources Available', excess, textColor),
                            const Divider(height: 24),
                            _buildInfoRow(Icons.handyman_rounded, 'Required Resources', requiredRes, textColor),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Eligible Government Schemes Card
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: cardColor,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: borderColor),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.gavel_rounded, color: AppColors.primary, size: 20),
                                const SizedBox(width: 8),
                                Text(
                                  'Eligible Government Schemes',
                                  style: TextStyle(
                                    fontFamily: 'Poppins',
                                    fontWeight: FontWeight.bold,
                                    fontSize: 15,
                                    color: textColor,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            if (_isLoadingSchemes)
                              const Center(child: Padding(
                                padding: EdgeInsets.all(16.0),
                                child: CircularProgressIndicator(color: AppColors.primary),
                              ))
                            else if (_schemes.isEmpty)
                              Text(
                                'No schemes found based on profile details. Add land size and crops to get recommendations.',
                                style: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: isDark ? Colors.white60 : AppColors.textMuted),
                              )
                            else
                              ListView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: _schemes.length,
                                itemBuilder: (context, i) {
                                  final s = _schemes[i] as Map<String, dynamic>;
                                  final sName = s['scheme_name'] ?? s['name'] ?? 'Scheme';
                                  final desc = s['description'] ?? s['benefit'] ?? '';
                                  final link = s['official_url'] ?? s['link'] ?? '';

                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 12),
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: isDark ? Colors.white.withValues(alpha: 0.04) : Colors.black.withValues(alpha: 0.02),
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: isDark ? Colors.white10 : Colors.black12),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            sName,
                                            style: TextStyle(
                                              fontFamily: 'Poppins',
                                              fontWeight: FontWeight.bold,
                                              fontSize: 13,
                                              color: textColor,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            desc,
                                            style: TextStyle(
                                              fontFamily: 'Poppins',
                                              fontSize: 12,
                                              color: isDark ? Colors.white70 : AppColors.textDark,
                                            ),
                                          ),
                                          if (link.isNotEmpty) ...[
                                            const SizedBox(height: 8),
                                            GestureDetector(
                                              onTap: () async {
                                                final uri = Uri.parse(link);
                                                try {
                                                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                                                } catch (_) {
                                                  try {
                                                    await launchUrl(uri);
                                                  } catch (e) {
                                                    if (context.mounted) {
                                                      ScaffoldMessenger.of(context).showSnackBar(
                                                        SnackBar(content: Text('Could not open scheme link: $link')),
                                                      );
                                                    }
                                                  }
                                                }
                                              },
                                              child: const Text(
                                                'Apply / Learn More →',
                                                style: TextStyle(
                                                  fontFamily: 'Poppins',
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.bold,
                                                  color: AppColors.primary,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value, Color textColor) {
    return Row(
      children: [
        Icon(icon, color: AppColors.primary, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 11,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  fontFamily: 'Poppins',
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                  color: textColor,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
