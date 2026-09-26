import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'package:easy_localization/easy_localization.dart';

import '../services/auth_service.dart';
import '../utils/constants.dart';
import '../widgets/ai_overview_widget.dart';

class MarketplaceScreen extends ConsumerStatefulWidget {
  const MarketplaceScreen({super.key});

  @override
  ConsumerState<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends ConsumerState<MarketplaceScreen> {
  bool _isLoading = true;
  List<dynamic> _matches = [];
  List<dynamic> _circularLoops = [];
  List<dynamic> _pools = [];
  String _activeTab = 'matching'; // matching, circular, pooling
  bool _isNegotiating = false;
  bool _isNegotiatingRerun = false;
  Map<String, dynamic>? _userProfile;
  String _aiAdvisory = '';
  
  // Deal Broker active negotiation context
  dynamic _activeMatch;
  Map<String, dynamic>? _activeNegotiation;
  String _selectedCrop = 'Wheat';

  static List<dynamic>? _cachedMatches;
  static List<dynamic>? _cachedCircularLoops;
  static List<dynamic>? _cachedPools;

  @override
  void initState() {
    super.initState();
    _loadMarketplaceData();
  }

  Future<void> _loadMarketplaceData() async {
    if (!mounted) return;
    if (_cachedMatches != null) _matches = _cachedMatches!;
    if (_cachedCircularLoops != null) _circularLoops = _cachedCircularLoops!;
    if (_cachedPools != null) _pools = _cachedPools!;

    setState(() => _isLoading = true);

    // 1-second artificial loading delay for smooth feel
    await Future.delayed(const Duration(seconds: 1));

    final phone = ref.read(authProvider).phone;

    // Fetch user profile for listings
    try {
      final res = await http.get(Uri.parse('$kBaseUrl/api/profile?phone=${Uri.encodeComponent(phone ?? '')}'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        if (data['status'] == 'success' && mounted) {
          setState(() {
            _userProfile = data['profile'] as Map<String, dynamic>?;
          });
        }
      }
    } catch (_) {}

    // Fetch 2-party Matches
    try {
      final res = await http.post(
        Uri.parse('$kBaseUrl/api/marketplace/match'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'phone': phone}),
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        if (data['status'] == 'success' && mounted) {
          setState(() {
            _matches = data['matches'] as List<dynamic>? ?? [];
            _cachedMatches = _matches;
            _aiAdvisory = data['ai_advisory']?.toString() ?? '';
          });
        }
      }
    } catch (_) {}

    // Fetch 3-party Circular Loops
    try {
      final res = await http.post(
        Uri.parse('$kBaseUrl/api/marketplace/circular-barter'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'phone': phone, 'max_distance_km': 1000.0}),
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        if (data['status'] == 'success' && mounted) {
          setState(() {
            _circularLoops = data['loops'] as List<dynamic>? ?? [];
            _cachedCircularLoops = _circularLoops;
          });
        }
      }
    } catch (_) {}

    // Fetch Pooling Data
    try {
      final res = await http.get(Uri.parse('$kBaseUrl/api/marketplace/pooling'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        if (data['status'] == 'success' && mounted) {
          setState(() {
            _pools = data['clusters'] as List<dynamic>? ?? [];
            _cachedPools = _pools;
          });
        }
      }
    } catch (_) {}

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _startNegotiation(dynamic match, {String? crop, Function(void Function())? dialogSetState}) async {
    final phone = ref.read(authProvider).phone;
    final cropToUse = crop ?? _selectedCrop;

    if (dialogSetState != null) {
      dialogSetState(() {
        _isNegotiatingRerun = true;
      });
    } else {
      if (!mounted) return;
      setState(() {
        _isNegotiating = true;
        _activeMatch = match;
        _selectedCrop = cropToUse;
      });
    }

    try {
      final res = await http.post(
        Uri.parse('$kBaseUrl/api/marketplace/negotiate'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'farmer_a_phone': phone,
          'farmer_b_phone': match['phone'],
          'item_a': (_userProfile?['excess_resources'] is List && (_userProfile?['excess_resources'] as List).isNotEmpty)
              ? (_userProfile?['excess_resources'] as List).first.toString()
              : 'Tractor',
          'item_b': match['they_provide_i_need']?[0] ?? match['what_they_have']?[0] ?? 'Harvester',
          'crop': cropToUse,
        }),
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        if (data['status'] == 'success') {
          final neg = data['negotiation'] as Map<String, dynamic>;
          if (dialogSetState != null) {
            dialogSetState(() {
              _activeNegotiation = neg;
              _isNegotiatingRerun = false;
            });
          } else {
            if (mounted) {
              setState(() {
                _activeNegotiation = neg;
              });
              _showNegotiationDialog();
            }
          }
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Negotiation simulation failed.')),
        );
      }
      if (dialogSetState != null) {
        dialogSetState(() {
          _isNegotiatingRerun = false;
        });
      }
    } finally {
      if (dialogSetState == null && mounted) {
        setState(() => _isNegotiating = false);
      }
    }
  }

  void _showNegotiationDialog() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final primaryName = _userProfile?['name']?.toString() ?? 'Guest Farmer';
    final partnerName = _activeMatch?['name']?.toString() ?? 'Partner Farmer';

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, dialogSetState) {
            final details = _activeNegotiation?['details'] as Map<String, dynamic>? ?? {};
            final logs = _activeNegotiation?['logs'] as List<dynamic>? ?? [];

            return AlertDialog(
              backgroundColor: isDark ? AppColors.darkCard : Colors.white,
              titlePadding: EdgeInsets.zero,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: const BoxDecoration(
                  color: AppColors.primaryDark,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.handshake_rounded, color: Colors.white, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Kisan Mitra AI Deal Broker',
                            style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
                          ),
                          Text(
                            'Automated negotiation based on distance and Mandi rates',
                            style: TextStyle(fontFamily: 'Poppins', fontSize: 10, color: Colors.white.withOpacity(0.7)),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, color: Colors.white, size: 18),
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      onPressed: () => Navigator.of(ctx).pop(),
                    ),
                  ],
                ),
              ),
              content: SizedBox(
                width: double.maxFinite,
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Crop selector
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Negotiation Crop Reference:',
                            style: TextStyle(fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                          Row(
                            children: [
                              DropdownButton<String>(
                                value: _selectedCrop,
                                style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: isDark ? Colors.white : Colors.black87),
                                items: ["Wheat", "Rice", "Paddy", "Cotton", "Grapes", "Onion", "Sugarcane", "Potato", "Maize"]
                                    .map((String value) {
                                  return DropdownMenuItem<String>(
                                    value: value,
                                    child: Text(value),
                                  );
                                }).toList(),
                                onChanged: (val) {
                                  if (val != null) {
                                    dialogSetState(() {
                                      _selectedCrop = val;
                                    });
                                    _startNegotiation(_activeMatch, crop: val, dialogSetState: dialogSetState);
                                  }
                                },
                              ),
                              const SizedBox(width: 4),
                              TextButton(
                                onPressed: _isNegotiatingRerun
                                    ? null
                                    : () => _startNegotiation(_activeMatch, crop: _selectedCrop, dialogSetState: dialogSetState),
                                style: TextButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  minimumSize: Size.zero,
                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                ),
                                child: const Text('Re-run', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      if (_isNegotiatingRerun)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 24),
                          child: Center(
                            child: Column(
                              children: [
                                CircularProgressIndicator(color: AppColors.primary),
                                SizedBox(height: 8),
                                Text(
                                  'AI Broker negotiating logistics & rates...',
                                  style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: Colors.grey),
                                )
                              ],
                            ),
                          ),
                        )
                      else ...[
                        // Metric blocks
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.white.withOpacity(0.04) : Colors.grey.withOpacity(0.05),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: GridView.count(
                            shrinkWrap: true,
                            crossAxisCount: 2,
                            childAspectRatio: 2.8,
                            physics: const NeverScrollableScrollPhysics(),
                            children: [
                              _buildMetricItem('Distance', '${details['distance_km'] ?? 'N/A'} km', isDark),
                              _buildMetricItem('Transit Cost Est', '₹${details['transport_cost_rs'] ?? 'N/A'}', isDark, isBlue: true),
                              _buildMetricItem('Mandi Rate Ref', '${details['mandi_rate_reference'] ?? 'N/A'}', isDark, isAmber: true),
                              _buildMetricItem('Offset Payment', '₹${details['suggested_offset_rs'] ?? '0'}', isDark, isGreen: true),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Dialogue Transcript Logs
                        const Text(
                          'Negotiation Logs',
                          style: TextStyle(fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                        ),
                        const SizedBox(height: 6),
                        Container(
                          constraints: const BoxConstraints(maxHeight: 180),
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.black26 : Colors.grey.withOpacity(0.04),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                          ),
                          child: ListView.builder(
                            shrinkWrap: true,
                            itemCount: logs.length,
                            itemBuilder: (lCtx, lIdx) {
                              final log = logs[lIdx];
                              final speaker = log['speaker']?.toString() ?? '';
                              final messageText = log['text']?.toString() ?? '';
                              final isBroker = speaker == 'Deal Broker';
                              final isMe = speaker == primaryName;

                              return Align(
                                alignment: isBroker
                                    ? Alignment.center
                                    : (isMe ? Alignment.centerRight : Alignment.centerLeft),
                                child: Container(
                                  margin: const EdgeInsets.symmetric(vertical: 4),
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: isBroker
                                        ? (isDark ? AppColors.primaryDark.withOpacity(0.2) : AppColors.primaryLight.withOpacity(0.15))
                                        : (isMe
                                            ? AppColors.primary
                                            : (isDark ? Colors.white10 : Colors.grey.shade200)),
                                    borderRadius: BorderRadius.circular(8),
                                    border: isBroker
                                        ? Border.all(color: AppColors.primary.withOpacity(0.3))
                                        : null,
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        speaker,
                                        style: TextStyle(
                                          fontFamily: 'Poppins',
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                          color: isMe ? Colors.white70 : Colors.grey,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        messageText,
                                        style: TextStyle(
                                          fontFamily: 'Poppins',
                                          fontSize: 11,
                                          color: isMe ? Colors.white : (isDark ? Colors.white70 : Colors.black87),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
                        const SizedBox(height: 12),

                        // Final terms
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Proposed Agreement terms',
                                style: TextStyle(fontFamily: 'Poppins', fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                details['agreement_terms']?.toString() ?? 'Terms are being brokered.',
                                style: TextStyle(
                                  fontFamily: 'Poppins',
                                  fontSize: 12,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? Colors.white70 : Colors.black87,
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
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Cancel', style: TextStyle(fontFamily: 'Poppins')),
                ),
                if (!_isNegotiatingRerun)
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      final whatsappText = "Hi $partnerName, our SkyView AI Deal Broker proposed these terms: ${details['agreement_terms']}. Can we proceed?";
                      final whatsappNum = _activeMatch?['whatsapp_number']?.toString() ?? _activeMatch?['phone']?.toString() ?? '';
                      _launchWhatsApp(whatsappNum, whatsappText);
                    },
                    icon: const Icon(Icons.chat_bubble_outline_rounded, size: 14),
                    label: const Text('Accept & WhatsApp', style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 12)),
                  ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildMetricItem(String label, String value, bool isDark, {bool isBlue = false, bool isAmber = false, bool isGreen = false}) {
    Color valColor = isDark ? Colors.white : Colors.black87;
    if (isBlue) valColor = Colors.blueAccent;
    if (isAmber) valColor = Colors.orange;
    if (isGreen) valColor = AppColors.primary;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4.0, vertical: 2.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(label, style: const TextStyle(fontFamily: 'Poppins', fontSize: 9, color: Colors.grey, fontWeight: FontWeight.bold)),
          const SizedBox(height: 1),
          Text(value, style: TextStyle(fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.bold, color: valColor), overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }

  Future<void> _launchWhatsApp(String phone, String message) async {
    final cleanedPhone = phone.replaceAll(RegExp(r'[^\d+]'), '');
    final uri = Uri.parse("https://wa.me/$cleanedPhone?text=${Uri.encodeComponent(message)}");
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      }
    } catch (e) {
      try {
        await launchUrl(uri, mode: LaunchMode.platformDefault);
      } catch (err) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not open WhatsApp. Please make sure WhatsApp is installed.')),
          );
        }
      }
    }
  }

  Future<void> _launchPhoneCall(String phone) async {
    final uri = Uri.parse("tel:$phone");
    try {
      final launched = await launchUrl(uri);
      if (!launched) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not launch phone call dialer.')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not launch phone call dialer.')),
        );
      }
    }
  }

  List<TextSpan> _parseFormattedText(String text, TextStyle baseStyle, TextStyle boldStyle) {
    final List<TextSpan> spans = [];
    final regExp = RegExp(r'\*\*(.*?)\*\*');
    int lastIndex = 0;
    
    for (final match in regExp.allMatches(text)) {
      if (match.start > lastIndex) {
        spans.add(TextSpan(
          text: text.substring(lastIndex, match.start),
          style: baseStyle,
        ));
      }
      spans.add(TextSpan(
        text: match.group(1),
        style: boldStyle,
      ));
      lastIndex = match.end;
    }
    
    if (lastIndex < text.length) {
      spans.add(TextSpan(
        text: text.substring(lastIndex),
        style: baseStyle,
      ));
    }
    
    return spans;
  }

  String _getWhatsAppMatchText(dynamic match) {
    final name = match['name']?.toString() ?? 'Partner';
    final theyNeed = (match['i_provide_they_need'] as List?)?.join(', ') ?? '';
    final theyHave = (match['they_provide_i_need'] as List?)?.join(', ') ?? '';
    final matchType = match['match_type']?.toString() ?? '';

    if (matchType == 'mutual') {
      return "Hi $name, I found a match on SkyView! I see you need \"$theyNeed\" and have excess \"$theyHave\". Can we co-operatively trade?";
    } else if (matchType == 'provider') {
      return "Hi $name, I found your listing on SkyView. I noticed you have excess \"$theyHave\", which I need for my farm. Can we chat about renting/sharing?";
    } else {
      return "Hi $name, I found a match on SkyView. I noticed you need \"$theyNeed\" which I currently have in excess. Can we discuss resource sharing?";
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final cardColor = isDark
        ? AppColors.darkCard.withOpacity(0.96)
        : Colors.white.withOpacity(0.56);
    final borderColor = isDark
        ? Colors.white.withOpacity(0.12)
        : Colors.white.withOpacity(0.8);
    final textColor = isDark ? Colors.white : AppColors.textDark;
    final subColor = isDark ? Colors.white70 : AppColors.textMuted;

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
          'marketplace.title'.tr(),
          style: TextStyle(
            fontFamily: 'Poppins',
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : AppColors.textDark,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh_rounded, color: isDark ? Colors.white70 : AppColors.textMuted),
            onPressed: _loadMarketplaceData,
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

                      // Collapsible AI Overview widget
                      AiOverviewWidget(
                        page: 'marketplace',
                        isDark: isDark,
                      ),

                      const SizedBox(height: 14),

                      // Your Active listings card (matches website styling)
                      if (_userProfile != null)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: cardColor,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: borderColor),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withOpacity(0.1),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              )
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'marketplace.active_listings'.tr().toUpperCase(),
                                style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
                              ),
                              const SizedBox(height: 4),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    _userProfile?['name']?.toString() ?? 'Guest Farmer',
                                    style: TextStyle(fontFamily: 'Poppins', fontSize: 16, fontWeight: FontWeight.bold, color: textColor),
                                  ),
                                  TextButton(
                                    onPressed: () => context.push('/profile'),
                                    style: TextButton.styleFrom(
                                      padding: EdgeInsets.zero,
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    child: Text('marketplace.edit_listings'.tr(), style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 12)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('marketplace.offering'.tr(), style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, color: Colors.grey)),
                                        const SizedBox(height: 2),
                                        Text(
                                          (_userProfile?['excess_resources'] is List)
                                              ? (_userProfile?['excess_resources'] as List).join(", ")
                                              : (_userProfile?['excess_resources']?.toString() ?? "None listed"),
                                          style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primary),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text('marketplace.seeking'.tr(), style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, color: Colors.grey)),
                                        const SizedBox(height: 2),
                                        Text(
                                          (_userProfile?['required_resources'] is List)
                                              ? (_userProfile?['required_resources'] as List).join(", ")
                                              : (_userProfile?['required_resources']?.toString() ?? "None listed"),
                                          style: const TextStyle(fontFamily: 'Poppins', fontSize: 13, fontWeight: FontWeight.bold, color: Colors.orange),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                      const SizedBox(height: 16),

                      // Tab selector (3 tabs)
                      Row(
                        children: [
                          Expanded(
                            child: _tabButton('matching', 'marketplace.matches'.tr(), cardColor, borderColor, textColor),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _tabButton('circular', 'marketplace.loops'.tr(), cardColor, borderColor, textColor),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: _tabButton('pooling', 'marketplace.pools'.tr(), cardColor, borderColor, textColor),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // Tab Content rendering
                      if (_activeTab == 'matching') ...[
                        if (_aiAdvisory.isNotEmpty) ...[
                          Container(
                            width: double.infinity,
                            margin: const EdgeInsets.only(bottom: 16),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.auto_awesome_rounded, color: AppColors.primary, size: 16),
                                    const SizedBox(width: 6),
                                    Text(
                                      'marketplace.ai_insights'.tr(),
                                      style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primaryDark),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  _aiAdvisory,
                                  style: TextStyle(fontFamily: 'Poppins', fontSize: 12, height: 1.4, color: textColor.withOpacity(0.85)),
                                ),
                              ],
                            ),
                          ),
                        ],
                        _buildMatchingTab(cardColor, borderColor, textColor, subColor, isDark)
                      ] else if (_activeTab == 'circular')
                        _buildCircularTab(cardColor, borderColor, textColor, subColor, isDark)
                      else if (_activeTab == 'pooling')
                        _buildPoolingTab(cardColor, borderColor, textColor, subColor, isDark),

                      const SizedBox(height: 32),
                    ],
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildMatchingTab(Color cardColor, Color borderColor, Color textColor, Color subColor, bool isDark) {
    if (_matches.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: borderColor),
        ),
        child: Text(
          'marketplace.no_matches'.tr(),
          textAlign: TextAlign.center,
          style: TextStyle(fontFamily: 'Poppins', color: subColor),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _matches.length,
      itemBuilder: (context, index) {
        final match = _matches[index];
        final distance = match['distance_km'] ?? 'N/A';
        final matchScore = match['match_percentage'] ?? 0;
        final matchType = match['match_type']?.toString() ?? 'mutual';
        final List crops = match['crops'] ?? [];

        // Match type colors
        Color badgeColor = Colors.orange;
        String badgeLabel = 'marketplace.consumer'.tr();
        if (matchType == 'mutual') {
          badgeColor = AppColors.primary;
          badgeLabel = 'marketplace.mutual_swap'.tr();
        } else if (matchType == 'provider') {
          badgeColor = Colors.blueAccent;
          badgeLabel = 'marketplace.provider'.tr();
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: cardColor,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: matchType == 'mutual' ? AppColors.primary.withOpacity(0.35) : borderColor,
              width: matchType == 'mutual' ? 1.5 : 1.0,
            ),
            boxShadow: matchType == 'mutual'
                ? [BoxShadow(color: AppColors.primary.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4))]
                : null,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: badgeColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      badgeLabel.toUpperCase(),
                      style: TextStyle(fontFamily: 'Poppins', fontSize: 9, fontWeight: FontWeight.bold, color: badgeColor),
                    ),
                  ),
                  Row(
                    children: [
                      const Text(
                        'Match Score: ',
                        style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '$matchScore%',
                        style: TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: matchScore >= 70 ? AppColors.primary : Colors.orange,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Icon(Icons.person_rounded, color: isDark ? Colors.white70 : AppColors.textDark, size: 18),
                  const SizedBox(width: 6),
                  Text(
                    match['name']?.toString() ?? 'Partner Farmer',
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                      color: textColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.location_on_rounded, color: AppColors.primary, size: 13),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      '${match['district'] != null ? "${match['district']}, ${match['state']}" : (match['location'] ?? '')} • $distance km away',
                      style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: subColor),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              
              // Crops cultivated
              if (crops.isNotEmpty) ...[
                Text('profile.crops'.tr() + ':', style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 4,
                  runSpacing: 4,
                  children: crops.map((c) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withOpacity(0.06) : Colors.grey.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        c.toString(),
                        style: TextStyle(fontFamily: 'Poppins', fontSize: 10, color: textColor.withOpacity(0.8)),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 10),
              ],

              // Provide & Need boxes (matching website logic)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isDark ? Colors.black26 : Colors.grey.withOpacity(0.03),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (matchType == 'mutual' || matchType == 'provider') ...[
                      Text('marketplace.they_provide'.tr(), style: const TextStyle(fontFamily: 'Poppins', fontSize: 9, color: Colors.blueAccent, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 2),
                      Text(
                        (match['they_provide_i_need'] as List?)?.join(", ") ?? 'None',
                        style: TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.bold, color: textColor),
                      ),
                      const SizedBox(height: 8),
                    ],
                    if (matchType == 'mutual' || matchType == 'consumer') ...[
                      Text('marketplace.they_need'.tr(), style: const TextStyle(fontFamily: 'Poppins', fontSize: 9, color: Colors.orange, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 2),
                      Text(
                        (match['i_provide_they_need'] as List?)?.join(", ") ?? 'None',
                        style: TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.bold, color: textColor),
                      ),
                    ],
                  ],
                ),
              ),
              
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.primary, width: 1.2),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      onPressed: () => _launchWhatsApp(
                        match['whatsapp_number']?.toString() ?? match['phone']?.toString() ?? '',
                        _getWhatsAppMatchText(match),
                      ),
                      icon: const Icon(Icons.chat_bubble_outline_rounded, size: 16, color: AppColors.primary),
                      label: Text('marketplace.whatsapp_trade'.tr(), style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primary)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    style: IconButton.styleFrom(
                      side: const BorderSide(color: AppColors.primary, width: 1.2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: () => _launchPhoneCall(match['phone']?.toString() ?? ''),
                    icon: const Icon(Icons.phone_rounded, size: 16, color: AppColors.primary),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
                    foregroundColor: isDark ? Colors.white : AppColors.textDark,
                    shadowColor: Colors.transparent,
                    side: const BorderSide(color: AppColors.primary, width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onPressed: _isNegotiating ? null : () => _startNegotiation(match),
                  icon: (_isNegotiating && _activeMatch == match)
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                        )
                      : const Icon(Icons.handshake_rounded, size: 18, color: AppColors.primary),
                  label: Text(
                    (_isNegotiating && _activeMatch == match) ? 'marketplace.negotiating'.tr() : 'marketplace.negotiate'.tr(),
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : AppColors.textDark,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCircularTab(Color cardColor, Color borderColor, Color textColor, Color subColor, bool isDark) {
    if (_circularLoops.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: borderColor),
        ),
        child: Text(
          'marketplace.no_loops'.tr(),
          textAlign: TextAlign.center,
          style: TextStyle(fontFamily: 'Poppins', color: subColor),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _circularLoops.length,
      itemBuilder: (context, index) {
        final loop = _circularLoops[index];
        final List farmers = loop['farmers'] ?? [];
        final List transfers = loop['transfer_flow'] ?? [];
        final totalDist = loop['total_distance_km'] ?? 'N/A';
        final aiScheduleText = loop['ai_schedule']?.toString() ?? '';

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(16),
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
                  const Icon(Icons.loop_rounded, color: Colors.blueAccent, size: 22),
                  const SizedBox(width: 8),
                  Text(
                    'Loop #${index + 1}: ${farmers.map((f) => f['name']?.toString().split(" ").first ?? 'Farmer').join(" ➔ ")}',
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: textColor,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Total Distance: $totalDist km',
                style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.bold, color: Colors.blueAccent),
              ),
              const SizedBox(height: 12),

              // Loop transfer flows (website visualization style)
              const Text('Circular Flow:', style: TextStyle(fontFamily: 'Poppins', fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              ...transfers.map((flow) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white.withOpacity(0.02) : Colors.grey.withOpacity(0.04),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(flow['from']?.toString() ?? '', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.bold, color: textColor)),
                            const SizedBox(height: 2),
                            Text('Lends: ${flow['item']}', style: const TextStyle(fontFamily: 'Poppins', fontSize: 11, color: Colors.blueAccent, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                      const Icon(Icons.arrow_forward_rounded, color: Colors.blueAccent, size: 16),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(flow['to']?.toString() ?? '', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.bold, color: textColor)),
                            const SizedBox(height: 2),
                            Text('${flow['distance_km']} km away', style: TextStyle(fontFamily: 'Poppins', fontSize: 10, color: subColor)),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }),

              const SizedBox(height: 10),

              // AI Generated schedule directly on the card
              if (aiScheduleText.isNotEmpty) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.blueAccent.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.blueAccent.withOpacity(0.2)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.auto_awesome_rounded, color: Colors.blueAccent, size: 15),
                          const SizedBox(width: 6),
                          Text(
                            'marketplace.sharing_schedule'.tr(),
                            style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 11, color: Colors.blueAccent),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      RichText(
                        text: TextSpan(
                          children: _parseFormattedText(
                            aiScheduleText,
                            TextStyle(fontFamily: 'Poppins', fontSize: 11, fontStyle: FontStyle.italic, color: textColor.withOpacity(0.85), height: 1.4),
                            TextStyle(fontFamily: 'Poppins', fontSize: 11, fontStyle: FontStyle.italic, fontWeight: FontWeight.bold, color: isDark ? Colors.white : AppColors.textDark, height: 1.4),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // WhatsApp buttons for other farmers to coordinate
              Text('marketplace.coordinate_partners'.tr(), style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: farmers.map<Widget>((farmer) {
                  final fPhone = farmer['phone']?.toString() ?? '';
                  final fName = farmer['name']?.toString() ?? '';
                  final myPhone = ref.read(authProvider).phone;

                  if (fPhone == myPhone) return const SizedBox.shrink();

                  return OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Colors.blueAccent, width: 1.0),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    ),
                    onPressed: () {
                      final message = "Hi $fName, I saw our 3-party cooperative barter match on SkyView! Can we coordinate our schedule?";
                      final whatsappNum = farmer['whatsapp']?.toString() ?? fPhone;
                      _launchWhatsApp(whatsappNum, message);
                    },
                    icon: const Icon(Icons.chat_bubble_outline_rounded, size: 12, color: Colors.blueAccent),
                    label: Text(
                      'WhatsApp ${fName.split(" ").first}',
                      style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 10, color: Colors.blueAccent),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPoolingTab(Color cardColor, Color borderColor, Color textColor, Color subColor, bool isDark) {
    if (_pools.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(32),
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: borderColor),
        ),
        child: Text(
          'marketplace.no_pools'.tr(),
          textAlign: TextAlign.center,
          style: TextStyle(fontFamily: 'Poppins', color: subColor),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _pools.length,
      itemBuilder: (context, index) {
        final pool = _pools[index];
        final region = pool['region']?.toString() ?? 'Panvel';
        final totalAcres = pool['total_land_acres'] ?? 0;
        final farmerCount = pool['farmer_count'] ?? 0;
        final List farmers = pool['farmers'] ?? [];
        final List excessPool = pool['excess_pool'] ?? [];
        final List requiredPool = pool['required_pool'] ?? [];
        final List optimizationPlan = pool['optimization_plan'] ?? [];

        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: cardColor,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: borderColor),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      region,
                      style: TextStyle(
                        fontFamily: 'Poppins',
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: textColor,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.purple.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '$farmerCount Farmers • $totalAcres Acres',
                      style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, fontWeight: FontWeight.bold, color: Colors.purple),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Equipment pools
              Row(
                children: [
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withOpacity(0.04),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.primary.withOpacity(0.1)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Shared Equipment Pool', style: TextStyle(fontFamily: 'Poppins', fontSize: 9, color: AppColors.primary, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Wrap(
                            spacing: 4,
                            runSpacing: 4,
                            children: excessPool.isEmpty
                                ? [const Text('None listed', style: TextStyle(fontFamily: 'Poppins', fontSize: 9, color: Colors.grey))]
                                : excessPool.map((e) => Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: AppColors.primary.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(e.toString(), style: const TextStyle(fontFamily: 'Poppins', fontSize: 9, color: AppColors.primaryDark, fontWeight: FontWeight.bold)),
                                    )).toList(),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.04),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.orange.withOpacity(0.1)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Missing Resources Needed', style: TextStyle(fontFamily: 'Poppins', fontSize: 9, color: Colors.orange, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Wrap(
                            spacing: 4,
                            runSpacing: 4,
                            children: requiredPool.isEmpty
                                ? [const Text('None listed', style: TextStyle(fontFamily: 'Poppins', fontSize: 9, color: Colors.grey))]
                                : requiredPool.map((r) => Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: Colors.orange.withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(r.toString(), style: const TextStyle(fontFamily: 'Poppins', fontSize: 9, color: Colors.orange, fontWeight: FontWeight.bold)),
                                    )).toList(),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // AI optimization plan (website style)
              if (optimizationPlan.isNotEmpty) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.06),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.primary.withOpacity(0.15)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.auto_awesome_rounded, color: AppColors.primary, size: 14),
                          SizedBox(width: 6),
                          Text(
                            'AI Regional Optimization Plan',
                            style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, fontSize: 11, color: AppColors.primaryDark),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ...optimizationPlan.map((step) => Padding(
                            padding: const EdgeInsets.only(bottom: 6.0),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(Icons.check_circle_outline_rounded, color: AppColors.primary, size: 13),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    step.toString(),
                                    style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: textColor.withOpacity(0.85)),
                                  ),
                                ),
                              ],
                            ),
                          )),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
              ],

              // Cluster members directory
              Text('marketplace.active_members'.tr(), style: const TextStyle(fontFamily: 'Poppins', fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Container(
                constraints: const BoxConstraints(maxHeight: 120),
                decoration: BoxDecoration(
                  border: Border.all(color: isDark ? Colors.white10 : Colors.grey.shade200),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: ListView.builder(
                  shrinkWrap: true,
                  itemCount: farmers.length,
                  itemBuilder: (fCtx, fIdx) {
                    final f = farmers[fIdx];
                    final fName = f['name']?.toString() ?? 'Farmer';
                    final fCrops = (f['crops'] as List?)?.join(", ") ?? 'No crops listed';
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        border: Border(bottom: BorderSide(color: isDark ? Colors.white10 : Colors.grey.shade200)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(fName, style: TextStyle(fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.bold, color: textColor)),
                          Expanded(
                            child: Text(
                              fCrops,
                              style: TextStyle(fontFamily: 'Poppins', fontSize: 10, color: subColor),
                              textAlign: TextAlign.end,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isDark ? Colors.white.withOpacity(0.05) : Colors.white,
                    foregroundColor: isDark ? Colors.white : AppColors.textDark,
                    shadowColor: Colors.transparent,
                    side: const BorderSide(color: Colors.purple, width: 1.5),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () async {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Opening regional group chat on WhatsApp...')),
                    );
                    try {
                      await launchUrl(
                        Uri.parse("https://chat.whatsapp.com/Gk8x93kJmNDL0o29Kx2j3A"),
                        mode: LaunchMode.externalApplication,
                      );
                    } catch (e) {
                      try {
                        await launchUrl(
                          Uri.parse("https://chat.whatsapp.com/Gk8x93kJmNDL0o29Kx2j3A"),
                          mode: LaunchMode.platformDefault,
                        );
                      } catch (err) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Could not open regional chat link.')),
                          );
                        }
                      }
                    }
                  },
                  icon: const Icon(Icons.forum_outlined, size: 18, color: Colors.purple),
                  label: Text('marketplace.join_pool'.tr(), style: const TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.bold, color: Colors.purple)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _tabButton(String tab, String label, Color cardBg, Color border, Color textCol) {
    final active = _activeTab == tab;
    return GestureDetector(
      onTap: () => setState(() => _activeTab = tab),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: active ? AppColors.primary : cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: active ? Colors.transparent : border),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontFamily: 'Poppins',
            fontWeight: FontWeight.bold,
            fontSize: 11,
            color: active ? Colors.white : textCol,
          ),
        ),
      ),
    );
  }
}
