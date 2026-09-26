import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../utils/constants.dart';

// ─── Page-specific config ────────────────────────────────────────────────────

class _PageConfig {
  final List<String> chips;
  final List<({String title, String desc, IconData icon, String route})> actionCards;

  const _PageConfig({required this.chips, required this.actionCards});
}

final _configs = <String, _PageConfig>{
  'dashboard': _PageConfig(
    chips: ['What does high humidity mean?', 'Should I water today?', 'Any sensor warnings?'],
    actionCards: [
      (title: 'Sensor Trends', desc: 'View live environmental analytics.', icon: Icons.analytics_outlined, route: '/trends'),
      (title: 'Advisory Reports', desc: 'Compile a complete farm audit.', icon: Icons.description_outlined, route: '/reports'),
      (title: 'Mandi Prices', desc: 'Check live commodity rates.', icon: Icons.storefront_outlined, route: '/mandi_rates'),
    ],
  ),
  'mandi': _PageConfig(
    chips: ['Which market has highest wheat price?', 'What are potato rates in Maharashtra?', 'Explain price fluctuation.'],
    actionCards: [
      (title: 'Sensor Trends', desc: 'Correlate prices with sensor data.', icon: Icons.analytics_outlined, route: '/trends'),
      (title: 'Advisory Reports', desc: 'Include mandi data in report.', icon: Icons.description_outlined, route: '/reports'),
      (title: 'My Profile', desc: 'Update your preferred crops.', icon: Icons.person_outlined, route: '/profile'),
    ],
  ),
  'trends': _PageConfig(
    chips: ['Analyze the temperature slope.', 'Is rain likely?', 'How does light affect growth?'],
    actionCards: [
      (title: 'Advisory Reports', desc: 'Generate report from sensor data.', icon: Icons.description_outlined, route: '/reports'),
      (title: 'Mandi Prices', desc: 'Cross-reference weather with prices.', icon: Icons.storefront_outlined, route: '/mandi_rates'),
      (title: 'My Profile', desc: 'Update your farm details.', icon: Icons.person_outlined, route: '/profile'),
    ],
  ),
  'marketplace': _PageConfig(
    chips: ['How does resource matching work?', 'Who is nearest tractor provider?', 'Any mutual barters nearby?'],
    actionCards: [
      (title: 'My Profile', desc: 'Update your resource listings.', icon: Icons.person_outlined, route: '/profile'),
      (title: 'Sensor Trends', desc: 'View your farm conditions.', icon: Icons.analytics_outlined, route: '/trends'),
      (title: 'Advisory Reports', desc: 'Get AI farming advice.', icon: Icons.description_outlined, route: '/reports'),
    ],
  ),
  'reports': _PageConfig(
    chips: ['Generate a soil report.', 'What is my irrigation schedule?', 'Any pest risks today?'],
    actionCards: [
      (title: 'Sensor Trends', desc: 'View live telemetry first.', icon: Icons.analytics_outlined, route: '/trends'),
      (title: 'Mandi Prices', desc: 'Include market prices in report.', icon: Icons.storefront_outlined, route: '/mandi_rates'),
      (title: 'My Profile', desc: 'Update farm for accurate reports.', icon: Icons.person_outlined, route: '/profile'),
    ],
  ),
  'profile': _PageConfig(
    chips: ['Am I eligible for PM-Kisan?', 'What crops suit my location?', 'How do I list excess resources?'],
    actionCards: [
      (title: 'Marketplace', desc: 'List your excess resources.', icon: Icons.shopping_bag_outlined, route: '/marketplace'),
      (title: 'Mandi Prices', desc: 'Check rates for your crops.', icon: Icons.storefront_outlined, route: '/mandi_rates'),
      (title: 'Advisory Reports', desc: 'Get personalized advice.', icon: Icons.description_outlined, route: '/reports'),
    ],
  ),
  'growth': _PageConfig(
    chips: ['What is the current FPGA status?', 'How does random-forest prediction work?', 'Explain Kalman sensor fusion.'],
    actionCards: [
      (title: 'Sensor Trends', desc: 'View live environmental trends.', icon: Icons.analytics_outlined, route: '/trends'),
      (title: 'Mandi Prices', desc: 'Check live commodity rates.', icon: Icons.storefront_outlined, route: '/mandi_rates'),
      (title: 'Advisory Reports', desc: 'Generate a crop health report.', icon: Icons.description_outlined, route: '/reports'),
    ],
  ),
};

// ─── Widget ──────────────────────────────────────────────────────────────────

class AiOverviewWidget extends StatefulWidget {
  final String page;
  final bool isDark;
  final Map<String, dynamic>? extraContext;

  const AiOverviewWidget({
    super.key,
    required this.page,
    required this.isDark,
    this.extraContext,
  });

  @override
  State<AiOverviewWidget> createState() => _AiOverviewWidgetState();
}

class _AiOverviewWidgetState extends State<AiOverviewWidget> {
  String _overview = '';
  bool _loading = false;
  bool _expanded = false;
  String? _error;

  // Chat
  final List<({bool isUser, String text})> _chatHistory = [];
  bool _chatLoading = false;
  final TextEditingController _chatCtrl = TextEditingController();
  final ScrollController _chatScroll = ScrollController();

  String get _cacheKey => 'ai_overview_${widget.page}_en';

  @override
  void initState() {
    super.initState();
    _loadOverview();
  }

  @override
  void dispose() {
    _chatCtrl.dispose();
    _chatScroll.dispose();
    super.dispose();
  }

  Future<void> _loadOverview({bool force = false}) async {
    setState(() { _loading = true; _error = null; });
    try {
      final prefs = await SharedPreferences.getInstance();
      if (!force) {
        final cached = prefs.getString(_cacheKey);
        if (cached != null && cached.isNotEmpty) {
          setState(() { _overview = cached; _loading = false; });
          return;
        }
      }

      final phone = prefs.getString(kPhoneKey) ?? '';
      final body = json.encode({
        'page': widget.page,
        'user_phone': phone,
        'language': 'en',
        if (widget.extraContext != null) 'extra_context': widget.extraContext,
      });

      final res = await http.post(
        Uri.parse('$kBaseUrl/api/chat/overview'),
        headers: {'Content-Type': 'application/json'},
        body: body,
      ).timeout(const Duration(seconds: 20));

      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final text = (data['overview'] as String?) ?? '';
        if (text.isNotEmpty) {
          setState(() => _overview = text);
          await prefs.setString(_cacheKey, text);
        } else {
          throw Exception('Empty overview');
        }
      } else {
        throw Exception('HTTP ${res.statusCode}');
      }
    } catch (e) {
      final fallbacks = {
        'dashboard': 'Your farm dashboard shows **live sensor data** from station WS01. Monitor temperature, humidity and soil moisture to optimize crop health.',
        'mandi': 'Live **Mandi Rates** for your region are loaded. Compare commodity prices across markets and track price trends.',
        'trends': 'Environmental trends show **stable conditions**. Temperature and humidity are within optimal range for most crops.',
        'marketplace': 'The **Barter Marketplace** connects farmers for resource sharing. Update your profile to see personalized matches.',
        'reports': 'Generate a **comprehensive farm intelligence report** combining live sensor data, mandi prices, and AI advisory insights.',
        'profile': 'Your **farmer profile** determines advisory accuracy. Keep your location, crops, and resource listings up to date.',
      };
      setState(() {
        _error = e.toString();
        _overview = fallbacks[widget.page] ?? 'AI Overview is loading diagnostics for this page.';
      });
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _sendChat(String query) async {
    if (query.trim().isEmpty) return;
    _chatCtrl.clear();
    setState(() {
      _chatHistory.add((isUser: true, text: query));
      _chatLoading = true;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollChat());

    try {
      final prefs = await SharedPreferences.getInstance();
      final phone = prefs.getString(kPhoneKey) ?? '';
      final res = await http.post(
        Uri.parse('$kBaseUrl/api/chat/overview/ask'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'page': widget.page,
          'question': query,
          'previous_overview': _overview,
          'user_phone': phone,
          'language': 'en',
        }),
      ).timeout(const Duration(seconds: 20));

      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final answer = (data['answer'] as String?) ?? 'No answer received.';
        setState(() => _chatHistory.add((isUser: false, text: answer)));
      } else {
        setState(() => _chatHistory.add((isUser: false, text: 'Could not connect to server. Please try again.')));
      }
    } catch (e) {
      setState(() => _chatHistory.add((isUser: false, text: 'Connection error. Please check your internet.')));
    } finally {
      setState(() => _chatLoading = false);
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollChat());
    }
  }

  void _scrollChat() {
    if (_chatScroll.hasClients) {
      _chatScroll.animateTo(
        _chatScroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final config = _configs[widget.page];
    final isDark = widget.isDark;
    final primary = AppColors.primary;
    final borderColorUniform = isDark ? Colors.white.withValues(alpha: 0.12) : Colors.white.withValues(alpha: 0.8);
    final cardBgUniform = isDark ? AppColors.darkCard.withValues(alpha: 0.96) : Colors.white.withValues(alpha: 0.56);
    final textColor = isDark ? Colors.white.withValues(alpha: 0.82) : const Color(0xFF1A2E1A);
    final mutedColor = isDark ? Colors.white.withValues(alpha: 0.38) : Colors.black.withValues(alpha: 0.42);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: cardBgUniform,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColorUniform, width: 1.2),
        boxShadow: [
          BoxShadow(
            color: primary.withValues(alpha: isDark ? 0.08 : 0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(height: 3, color: primary),
            // ── Header ──────────────────────────────────────────────────────
            _buildHeader(primary, isDark, mutedColor),

            // ── Overview text (collapsed preview) ───────────────────────────
            _buildOverviewText(textColor, mutedColor, isDark),

            // ── Expanded drawer ──────────────────────────────────────────────
            AnimatedCrossFade(
              firstChild: const SizedBox.shrink(),
              secondChild: _buildExpandedContent(config, isDark, primary, borderColorUniform, textColor, mutedColor),
              crossFadeState: _expanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
              duration: const Duration(milliseconds: 280),
            ),

            // ── Expand / Collapse toggle ─────────────────────────────────────
            _buildToggle(primary, isDark, mutedColor),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(Color primary, bool isDark, Color mutedColor) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
      child: Row(
        children: [
          Container(
            width: 26, height: 26,
            decoration: BoxDecoration(
              color: primary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(7),
              border: Border.all(color: primary.withValues(alpha: 0.2), width: 0.5),
            ),
            child: Icon(Icons.auto_awesome_rounded, size: 14, color: primary),
          ),
          const SizedBox(width: 9),
          Text(
            'AI OVERVIEW',
            style: TextStyle(
              fontFamily: 'Poppins',
              fontWeight: FontWeight.w600,
              fontSize: 11,
              letterSpacing: 0.08,
              color: mutedColor,
            ),
          ),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: isDark ? Colors.white.withValues(alpha: 0.06) : Colors.black.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: isDark ? Colors.white.withValues(alpha: 0.08) : Colors.black.withValues(alpha: 0.08), width: 0.5),
            ),
            child: Text('EN', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w500, color: mutedColor, fontFamily: 'Poppins')),
          ),
          const Spacer(),
          // Refresh button
          if (_loading)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 1.5, color: primary)),
            )
          else
            IconButton(
              icon: Icon(Icons.refresh_rounded, size: 15, color: mutedColor),
              onPressed: () => _loadOverview(force: true),
              visualDensity: VisualDensity.compact,
              tooltip: 'Regenerate',
            ),
        ],
      ),
    );
  }

  Widget _buildOverviewText(Color textColor, Color mutedColor, bool isDark) {
    if (_loading && _overview.isEmpty) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(14, 0, 14, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [92, 86, 68].map((w) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Container(
              height: 14,
              width: MediaQuery.sizeOf(context).width * w / 100,
              decoration: BoxDecoration(
                color: isDark ? Colors.white.withValues(alpha: 0.06) : Colors.black.withValues(alpha: 0.05),
                borderRadius: BorderRadius.circular(4),
              ),
            ),
          )).toList(),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 0, 14, 4),
      child: _expanded
          ? MarkdownBody(
              data: _overview,
              styleSheet: MarkdownStyleSheet(
                p: TextStyle(fontFamily: 'Poppins', fontSize: 13.5, height: 1.65, color: textColor),
                strong: TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary, fontFamily: 'Poppins'),
                em: TextStyle(fontStyle: FontStyle.italic, color: textColor, fontFamily: 'Poppins'),
                listBullet: TextStyle(color: AppColors.primary, fontFamily: 'Poppins', fontSize: 13.5),
                h1: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.primary),
                h2: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w700, fontSize: 14.5, color: AppColors.primary),
                h3: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w600, fontSize: 13.5, color: AppColors.primary),
              ),
            )
          : Stack(
              children: [
                MarkdownBody(
                  data: _overview.length > 220 ? '${_overview.substring(0, 220)}…' : _overview,
                  styleSheet: MarkdownStyleSheet(
                    p: TextStyle(fontFamily: 'Poppins', fontSize: 13.5, height: 1.65, color: textColor),
                    strong: TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary, fontFamily: 'Poppins'),
                  ),
                ),
                Positioned(
                  bottom: 0, left: 0, right: 0,
                  child: Container(
                    height: 28,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter, end: Alignment.bottomCenter,
                        colors: [
                          (isDark ? AppColors.darkCard : Colors.white).withValues(alpha: 0.0),
                          isDark ? AppColors.darkCard.withValues(alpha: 0.96) : Colors.white.withValues(alpha: 0.56),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildExpandedContent(
    _PageConfig? config, bool isDark, Color primary, Color borderColor, Color textColor, Color mutedColor,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Divider(color: borderColor, thickness: 0.5, height: 1),

        // Quick Actions
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('QUICK ACTIONS', style: TextStyle(
                fontFamily: 'Poppins', fontSize: 9.5, fontWeight: FontWeight.w600,
                color: mutedColor, letterSpacing: 0.08,
              )),
              const SizedBox(height: 9),
              SizedBox(
                height: 94,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: (config?.actionCards ?? []).map((card) => GestureDetector(
                    onTap: () => context.push(card.route),
                    child: Container(
                      width: 200,
                      margin: const EdgeInsets.only(right: 10),
                      padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.white.withValues(alpha: 0.03) : const Color(0xFFFAFAFA),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: borderColor, width: 0.5),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(children: [
                            Icon(card.icon, size: 13, color: primary),
                            const SizedBox(width: 6),
                            Expanded(child: Text(card.title, style: TextStyle(
                              fontFamily: 'Poppins', fontWeight: FontWeight.w600, fontSize: 12, color: textColor,
                            ), overflow: TextOverflow.ellipsis)),
                          ]),
                          const SizedBox(height: 4),
                          Text(card.desc, style: TextStyle(
                            fontFamily: 'Poppins', fontSize: 10.5, color: mutedColor, height: 1.4,
                          ), maxLines: 2, overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    ),
                  )).toList(),
                ),
              ),
            ],
          ),
        ),

        // Chat section
        Padding(
          padding: const EdgeInsets.fromLTRB(14, 16, 14, 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Divider(color: borderColor, thickness: 0.5, height: 1),
              const SizedBox(height: 12),
              Text('ASK KISAN MITRA', style: TextStyle(
                fontFamily: 'Poppins', fontSize: 9.5, fontWeight: FontWeight.w600,
                color: mutedColor, letterSpacing: 0.08,
              )),
              const SizedBox(height: 10),

              // Suggestion chips
              if (_chatHistory.isEmpty)
                Wrap(
                  spacing: 7, runSpacing: 7,
                  children: (config?.chips ?? []).map((chip) => GestureDetector(
                    onTap: () => _sendChat(chip),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
                      decoration: BoxDecoration(
                        color: primary.withValues(alpha: isDark ? 0.12 : 0.07),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: primary.withValues(alpha: isDark ? 0.22 : 0.18), width: 0.5),
                      ),
                      child: Text(chip, style: TextStyle(
                        fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.w500,
                        color: isDark ? AppColors.primaryLight : AppColors.primaryDark,
                      )),
                    ),
                  )).toList(),
                ),

              // Chat history
              if (_chatHistory.isNotEmpty) ...[
                const SizedBox(height: 10),
                Container(
                  height: 200,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.black.withValues(alpha: 0.12) : Colors.black.withValues(alpha: 0.02),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: borderColor, width: 0.5),
                  ),
                  child: ListView(
                    controller: _chatScroll,
                    padding: const EdgeInsets.all(10),
                    children: [
                      ..._chatHistory.map((msg) => Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: msg.isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
                          children: [
                            if (!msg.isUser) ...[
                              Container(
                                width: 22, height: 22,
                                margin: const EdgeInsets.only(right: 6, top: 2),
                                decoration: BoxDecoration(
                                  color: primary.withValues(alpha: 0.12),
                                  shape: BoxShape.circle,
                                  border: Border.all(color: primary.withValues(alpha: 0.22), width: 0.5),
                                ),
                                child: Icon(Icons.smart_toy_rounded, size: 12, color: primary),
                              ),
                            ],
                            Flexible(
                              child: Container(
                                padding: const EdgeInsets.fromLTRB(10, 7, 10, 7),
                                decoration: BoxDecoration(
                                  color: msg.isUser
                                      ? (isDark ? Colors.white.withValues(alpha: 0.08) : Colors.black.withValues(alpha: 0.06))
                                      : (isDark ? Colors.white.withValues(alpha: 0.03) : Colors.black.withValues(alpha: 0.02)),
                                  borderRadius: BorderRadius.only(
                                    topLeft: Radius.circular(msg.isUser ? 8 : 2),
                                    topRight: Radius.circular(msg.isUser ? 2 : 8),
                                    bottomLeft: const Radius.circular(8),
                                    bottomRight: const Radius.circular(8),
                                  ),
                                  border: Border.all(color: borderColor, width: 0.5),
                                ),
                                child: msg.isUser
                                    ? Text(msg.text, style: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: textColor, height: 1.5))
                                    : MarkdownBody(
                                        data: msg.text,
                                        styleSheet: MarkdownStyleSheet(
                                          p: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: textColor, height: 1.5),
                                          strong: TextStyle(fontWeight: FontWeight.w700, color: primary, fontFamily: 'Poppins'),
                                        ),
                                      ),
                              ),
                            ),
                            if (msg.isUser) ...[
                              Container(
                                width: 22, height: 22,
                                margin: const EdgeInsets.only(left: 6, top: 2),
                                decoration: BoxDecoration(
                                  color: isDark ? Colors.white.withValues(alpha: 0.07) : Colors.black.withValues(alpha: 0.05),
                                  shape: BoxShape.circle,
                                  border: Border.all(color: borderColor, width: 0.5),
                                ),
                                child: Icon(Icons.person_rounded, size: 12, color: mutedColor),
                              ),
                            ],
                          ],
                        ),
                      )),
                      if (_chatLoading)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Row(
                            children: [
                              SizedBox(width: 12, height: 12, child: CircularProgressIndicator(strokeWidth: 1.5, color: primary)),
                              const SizedBox(width: 8),
                              Text('Kisan Mitra is writing…', style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: mutedColor)),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 10),
              // Chat input
              Container(
                decoration: BoxDecoration(
                  color: isDark ? Colors.white.withValues(alpha: 0.04) : Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: borderColor, width: 0.5),
                ),
                padding: const EdgeInsets.fromLTRB(10, 4, 6, 4),
                child: Row(
                  children: [
                    Icon(Icons.help_outline_rounded, size: 14, color: mutedColor),
                    const SizedBox(width: 8),
                    Expanded(
                      child: TextField(
                        controller: _chatCtrl,
                        style: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: textColor),
                        decoration: InputDecoration(
                          hintText: 'Ask a follow-up question…',
                          hintStyle: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: mutedColor),
                          border: InputBorder.none,
                          contentPadding: EdgeInsets.zero,
                          isCollapsed: true,
                          isDense: true,
                        ),
                        onSubmitted: _sendChat,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => _sendChat(_chatCtrl.text),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 150),
                        padding: const EdgeInsets.all(5),
                        decoration: BoxDecoration(
                          color: _chatCtrl.text.trim().isNotEmpty ? primary : Colors.transparent,
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Icon(
                          Icons.send_rounded,
                          size: 13,
                          color: _chatCtrl.text.trim().isNotEmpty ? Colors.white : mutedColor,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildToggle(Color primary, bool isDark, Color mutedColor) {
    return GestureDetector(
      onTap: () => setState(() => _expanded = !_expanded),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          border: Border(top: BorderSide(
            color: isDark ? Colors.white.withValues(alpha: 0.06) : Colors.black.withValues(alpha: 0.06),
            width: 0.5,
          )),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              _expanded ? 'Collapse' : 'View details, actions & chat',
              style: TextStyle(fontFamily: 'Poppins', fontSize: 11, fontWeight: FontWeight.w500, color: mutedColor),
            ),
            const SizedBox(width: 4),
            Icon(_expanded ? Icons.expand_less_rounded : Icons.expand_more_rounded, size: 15, color: mutedColor),
          ],
        ),
      ),
    );
  }
}
