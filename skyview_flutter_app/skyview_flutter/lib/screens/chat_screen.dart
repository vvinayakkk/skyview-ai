import 'package:easy_localization/easy_localization.dart';
import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/auth_service.dart';
import '../services/chat_service.dart';
import '../services/chat_history_service.dart';
import '../utils/constants.dart';

class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _controller = TextEditingController();
  final _scrollCtrl = ScrollController();
  bool _profileIncomplete = false;
  bool _hasText = false;
  bool _stepsExpanded = true;

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      final h = _controller.text.trim().isNotEmpty;
      if (h != _hasText) setState(() => _hasText = h);
    });
    _checkProfileCompletion();
  }

  Future<void> _checkProfileCompletion() async {
    final phone = ref.read(authProvider).phone;
    if (phone == null || phone.isEmpty) return;
    try {
      final res = await http.get(
        Uri.parse('$kBaseUrl/api/profile?phone=${Uri.encodeComponent(phone)}'),
      );
      if (res.statusCode == 200) {
        final d = jsonDecode(res.body);
        if (d['status'] == 'error') {
          if (mounted) setState(() => _profileIncomplete = true);
        } else if (d['status'] == 'success' && d['profile'] != null) {
          final p = d['profile'];
          final name = p['name']?.toString() ?? '';
          final land = p['land_size_acres'];
          final loc = p['location']?.toString() ?? '';
          final crops = p['crops'];

          final isCropsEmpty = crops is List ? crops.isEmpty : (crops == null || crops.toString().isEmpty);
          final isLandEmpty = land == null || double.tryParse(land.toString()) == 0.0;

          if (mounted) {
            setState(() {
              _profileIncomplete = name.isEmpty || isLandEmpty || loc.isEmpty || isCropsEmpty;
            });
          }
        }
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || !_scrollCtrl.hasClients) return;
      _scrollCtrl.animateTo(0,
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut);
    });
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty) return;
    _controller.clear();
    final phone = ref.read(authProvider).phone;
    await ref.read(chatProvider.notifier).send(text, phone: phone);
    _scrollToBottom();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final chatState = ref.watch(chatProvider);

    return Scaffold(
      extendBodyBehindAppBar: true,
      backgroundColor: Colors.transparent,
      appBar: _buildAppBar(isDark),
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? const [AppColors.darkBackground, AppColors.darkSurface]
                : const [AppColors.lightBackground, AppColors.lightSurface],
          ),
        ),
        child: Column(
          children: [
             SizedBox(
                height: MediaQuery.of(context).padding.top + kToolbarHeight),

            if (_profileIncomplete)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.primary.withValues(alpha: 0.15) : AppColors.primarySurface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded, color: AppColors.primary, size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'chat.lets_get_completed'.tr(),
                            style: TextStyle(
                              fontFamily: 'Poppins',
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: isDark ? Colors.white : AppColors.textDark,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'chat.fill_details_onboarding'.tr(),
                            style: TextStyle(
                              fontFamily: 'Poppins',
                              fontSize: 11,
                              color: isDark ? Colors.white70 : AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    ActionChip(
                      onPressed: () async {
                        await context.push('/profile');
                        _checkProfileCompletion();
                      },
                      backgroundColor: AppColors.primary,
                      side: BorderSide.none,
                      label: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'chat.complete_btn'.tr(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontFamily: 'Poppins',
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 10),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

            // ── Messages ────────────────────────────────────────────────
            Expanded(
              child: chatState.messages.isEmpty
                  ? _EmptyHint(isDark: isDark)
                  : ListView.builder(
                      controller: _scrollCtrl,
                      reverse: true,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 12),
                      itemCount: chatState.messages.length,
                      itemBuilder: (_, i) {
                        final msg = chatState.messages[i];
                        return _ChatBubble(
                          key: ValueKey(msg.id),
                          message: msg,
                          isDark: isDark,
                          onSuggestion: (s) {
                            _controller.text = s;
                            _send();
                          },
                        );
                      },
                    ),
            ),

            // ── Internal thinking state panel ───────────────────────────
            if (chatState.steps.isNotEmpty)
              _ThinkingPanel(
                steps: chatState.steps,
                expanded: _stepsExpanded,
                onToggle: () =>
                    setState(() => _stepsExpanded = !_stepsExpanded),
                isDark: isDark,
              ),

            // ── Input bar ───────────────────────────────────────────────
            _InputBar(
              controller: _controller,
              hasText: _hasText,
              isLoading: chatState.isLoading,
              onSend: _send,
              onVoice: () => context.push('/voice'),
              onNewChat: () async {
                final msgs = ref.read(chatProvider).messages;
                if (msgs.isNotEmpty) {
                  await ref.read(chatHistoryProvider.notifier).saveSession(msgs);
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('chat.chat_saved'.tr())),
                    );
                  }
                }
                ref.read(chatProvider.notifier).clear();
              },
              onChoice: () => context.go('/choice'),
              isDark: isDark,
            ),
          ],
        ),
      ),
    );
  }

  AppBar _buildAppBar(bool isDark) {
    return AppBar(
      backgroundColor: Colors.transparent,
      elevation: 0,
      centerTitle: true,
      leading: IconButton(
        icon: Icon(Icons.arrow_back_ios_rounded,
            color: isDark ? Colors.white : AppColors.textDark),
        onPressed: () => context.go('/choice'),
      ),
      title: Text(
        'chat.title'.tr(),
        style: TextStyle(
          fontFamily: 'Poppins',
          fontWeight: FontWeight.w700,
          fontSize: 18,
          color: isDark ? Colors.white : AppColors.textDark,
        ),
      ),
      actions: [
        IconButton(
          icon: Icon(Icons.history_rounded,
              color: isDark ? Colors.white70 : AppColors.textMuted),
          tooltip: 'Chat History',
          onPressed: () => context.push('/chat_history'),
        ),
        IconButton(
          icon: Icon(Icons.refresh_rounded,
              color: isDark ? Colors.white70 : AppColors.textMuted),
          tooltip: 'New chat',
          onPressed: () => ref.read(chatProvider.notifier).clear(),
        ),
      ],
    );
  }
}


// ─── Empty hint ───────────────────────────────────────────────────────────────
class _EmptyHint extends StatelessWidget {
  final bool isDark;
  const _EmptyHint({required this.isDark});

  @override
  Widget build(BuildContext context) {
    final chipBorder = isDark ? Colors.white60 : Colors.black87;
    final headingColor = isDark ? Colors.white : Colors.black87;

    final chips = [
      (
        label: 'chat.overview_label'.tr(),
        icon: Icons.dashboard_outlined,
        color: const Color(0xFF10B981),
        onTap: () => context.push('/overview'),
        isLanguage: false,
      ),
      (
        label: 'mandi.title'.tr(),
        icon: Icons.storefront_outlined,
        color: const Color(0xFFF59E0B),
        onTap: () => context.push('/mandi_rates'),
        isLanguage: false,
      ),
      (
        label: 'trends.title'.tr(),
        icon: Icons.analytics_outlined,
        color: const Color(0xFF3B82F6),
        onTap: () => context.push('/trends'),
        isLanguage: false,
      ),
      (
        label: 'reports.title'.tr(),
        icon: Icons.description_outlined,
        color: const Color(0xFF9C27B0),
        onTap: () => context.push('/reports'),
        isLanguage: false,
      ),
      (
        label: 'marketplace.title'.tr(),
        icon: Icons.shopping_bag_outlined,
        color: const Color(0xFF00BCD4),
        onTap: () => context.push('/marketplace'),
        isLanguage: false,
      ),
      (
        label: 'profile.title'.tr(),
        icon: Icons.person_outlined,
        color: const Color(0xFFFF5722),
        onTap: () => context.push('/profile'),
        isLanguage: false,
      ),
      (
        label: 'accelerator_title'.tr(),
        icon: Icons.developer_board_rounded,
        color: const Color(0xFFE91E63),
        onTap: () => context.push('/accelerator'),
        isLanguage: false,
      ),
      (
        label: 'language_select.title'.tr(),
        icon: Icons.translate_rounded,
        color: const Color(0xFF673AB7),
        onTap: () {},
        isLanguage: true,
      ),
    ];

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'chat.empty_title'.tr(),
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: headingColor,
              ),
            ),
            const SizedBox(height: 20),
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 10,
              runSpacing: 10,
              children: chips.map((chip) {
                return Builder(
                  builder: (chipContext) {
                    return InkWell(
                      borderRadius: BorderRadius.circular(18),
                      onTap: () async {
                        if (chip.isLanguage) {
                          final RenderBox renderBox = chipContext.findRenderObject() as RenderBox;
                          final offset = renderBox.localToGlobal(Offset.zero);
                          final String? selected = await showMenu<String>(
                            context: chipContext,
                            position: RelativeRect.fromLTRB(
                              offset.dx,
                              offset.dy + renderBox.size.height,
                              offset.dx + renderBox.size.width,
                              0,
                            ),
                            items: const [
                              PopupMenuItem(value: 'en', child: Text('English')),
                              PopupMenuItem(value: 'hi', child: Text('हिन्दी')),
                              PopupMenuItem(value: 'pa', child: Text('ਪੰਜਾਬੀ')),
                              PopupMenuItem(value: 'mr', child: Text('मराठी')),
                              PopupMenuItem(value: 'te', child: Text('తెలుగు')),
                              PopupMenuItem(value: 'ta', child: Text('தமிழ்')),
                              PopupMenuItem(value: 'bn', child: Text('বাংলা')),
                            ],
                          );
                          if (selected != null && chipContext.mounted) {
                            if (selected == 'en') {
                              await chipContext.setLocale(const Locale('en'));
                            } else {
                              await chipContext.setLocale(const Locale('hi'));
                            }
                          }
                        } else {
                          chip.onTap();
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 7,
                        ),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: chipBorder,
                            width: 1.1,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: chipBorder,
                                  width: 1.1,
                                ),
                              ),
                              child: Center(
                                child: Icon(
                                  chip.icon,
                                  size: 14,
                                  color: chip.color,
                                ),
                              ),
                            ),
                            const SizedBox(width: 7),
                            Text(
                              chip.label,
                              style: TextStyle(
                                fontFamily: 'Poppins',
                                fontSize: 12,
                                color: chipBorder,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 28),
            Text(
              'chat.call_hotline'.tr(),
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 12,
                color: isDark ? Colors.white60 : Colors.black54,
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                InkWell(
                  onTap: () async {
                    final uri = Uri.parse("tel:+12797599216");
                    try {
                      await launchUrl(uri);
                    } catch (_) {}
                  },
                  borderRadius: BorderRadius.circular(18),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: chipBorder,
                        width: 1.1,
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: chipBorder,
                              width: 1.1,
                            ),
                          ),
                          child: const Center(
                            child: Icon(
                              Icons.phone_in_talk_rounded,
                              size: 14,
                              color: Colors.redAccent,
                            ),
                          ),
                        ),
                        const SizedBox(width: 7),
                        Text(
                          '+1 (279) 759 9216',
                          style: TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 12,
                            color: chipBorder,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'choice.or'.tr(),
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 12,
                    color: isDark ? Colors.white60 : Colors.black54,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(width: 8),
                InkWell(
                  onTap: () async {
                    final uri = Uri.parse("https://wa.me/14155238886?text=${Uri.encodeComponent("join standard-stone")}");
                    try {
                      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
                      if (!launched) {
                        await launchUrl(uri, mode: LaunchMode.platformDefault);
                      }
                    } catch (e) {
                      try {
                        await launchUrl(uri, mode: LaunchMode.platformDefault);
                      } catch (_) {}
                    }
                  },
                  borderRadius: BorderRadius.circular(18),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: chipBorder,
                        width: 1.1,
                      ),
                    ),
                    child: Container(
                      width: 24,
                      height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: chipBorder,
                          width: 1.1,
                        ),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.chat_bubble_outline_rounded,
                          size: 14,
                          color: Colors.green,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'chat.hotline_languages'.tr(),
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 10,
                color: isDark ? Colors.white30 : Colors.black38,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Thinking / Internal State Panel ─────────────────────────────────────────
class _ThinkingPanel extends StatefulWidget {
  final List<AgentStep> steps;
  final bool expanded;
  final VoidCallback onToggle;
  final bool isDark;

  const _ThinkingPanel({
    required this.steps,
    required this.expanded,
    required this.onToggle,
    required this.isDark,
  });

  @override
  State<_ThinkingPanel> createState() => _ThinkingPanelState();
}

class _ThinkingPanelState extends State<_ThinkingPanel>
    with SingleTickerProviderStateMixin {
  late final AnimationController _dots;

  @override
  void initState() {
    super.initState();
    _dots = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1200))
      ..repeat();
  }

  @override
  void dispose() {
    _dots.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = widget.isDark;
    final cardColor = isDark
        ? Colors.white.withValues(alpha: 0.06)
        : AppColors.primarySurface.withValues(alpha: 0.8);
    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.12)
        : AppColors.primary.withValues(alpha: 0.2);

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 4),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        children: [
          // ── Header row ──────────────────────────────────────────────
          InkWell(
            onTap: widget.onToggle,
            borderRadius: BorderRadius.circular(14),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  Icon(Icons.psychology_outlined,
                      size: 16, color: AppColors.primary),
                  const SizedBox(width: 6),
                  Text(
                    'chat.thinking'.tr(),
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? Colors.white : AppColors.textDark,
                    ),
                  ),
                  // Animated dots
                  AnimatedBuilder(
                    animation: _dots,
                    builder: (_, __) {
                      final n = (_dots.value * 3).floor() % 3 + 1;
                      return Text(
                        '.' * n,
                        style: TextStyle(
                            fontFamily: 'Poppins',
                            color: AppColors.primary,
                            fontWeight: FontWeight.bold),
                      );
                    },
                  ),
                  const Spacer(),
                  AnimatedRotation(
                    turns: widget.expanded ? 0.0 : -0.5,
                    duration: const Duration(milliseconds: 180),
                    child: Icon(Icons.expand_more,
                        size: 18,
                        color: isDark ? Colors.white54 : AppColors.textMuted),
                  ),
                ],
              ),
            ),
          ),
          // ── Steps ───────────────────────────────────────────────────
          if (widget.expanded)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: widget.steps.map((step) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Icon(
                            step.done
                                ? Icons.check_circle_rounded
                                : Icons.radio_button_unchecked_rounded,
                            size: 14,
                            color: step.done
                                ? AppColors.primary
                                : AppColors.textMuted,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            step.label,
                            style: TextStyle(
                              fontFamily: 'Poppins',
                              fontSize: 12,
                              height: 1.4,
                              color: isDark
                                  ? Colors.white70
                                  : AppColors.textMuted,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }
}

// ─── Chat Bubble ──────────────────────────────────────────────────────────────
class _ChatBubble extends StatefulWidget {
  final ChatMessage message;
  final bool isDark;
  final void Function(String)? onSuggestion;

  const _ChatBubble({
    super.key,
    required this.message,
    required this.isDark,
    this.onSuggestion,
  });

  @override
  State<_ChatBubble> createState() => _ChatBubbleState();
}

class _ChatBubbleState extends State<_ChatBubble>
    with SingleTickerProviderStateMixin {
  late final AnimationController _anim;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1200))
      ..repeat();
  }

  @override
  void dispose() {
    _anim.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.message.isLoading) return _buildLoading();
    return widget.message.isUser ? _buildUser() : _buildAssistant();
  }

  Widget _buildLoading() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: widget.isDark
              ? Colors.white.withValues(alpha: 0.08)
              : Colors.white.withValues(alpha: 0.7),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(18),
            topRight: Radius.circular(18),
            bottomRight: Radius.circular(18),
          ),
          border: Border.all(
            color: widget.isDark
                ? Colors.white.withValues(alpha: 0.12)
                : AppColors.primary.withValues(alpha: 0.15),
          ),
        ),
        child: AnimatedBuilder(
          animation: _anim,
          builder: (_, __) {
            final n = (_anim.value * 3).floor() % 3 + 1;
            return Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.psychology_outlined,
                    size: 16, color: AppColors.primary),
                const SizedBox(width: 8),
                Text(
                  '${"chat.thinking".tr()}${"." * n}',
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 13,
                    color: widget.isDark ? Colors.white60 : AppColors.textMuted,
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildUser() {
    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        constraints:
            BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.78),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: widget.isDark
              ? const Color(0xFF1A3D20)
              : AppColors.primary.withValues(alpha: 0.12),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(18),
            topRight: Radius.circular(18),
            bottomLeft: Radius.circular(18),
          ),
          border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.3),
          ),
        ),
        child: Text(
          widget.message.content,
          style: TextStyle(
            fontFamily: 'Poppins',
            fontSize: 14,
            color: widget.isDark ? Colors.white : AppColors.textDark,
            height: 1.5,
          ),
        ),
      ),
    );
  }

  Widget _buildAssistant() {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        constraints:
            BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * 0.86),
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: widget.isDark
              ? Colors.white.withValues(alpha: 0.07)
              : Colors.white.withValues(alpha: 0.85),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(18),
            topRight: Radius.circular(18),
            bottomRight: Radius.circular(18),
          ),
          border: Border.all(
            color: widget.isDark
                ? Colors.white.withValues(alpha: 0.12)
                : AppColors.primary.withValues(alpha: 0.15),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            MarkdownBody(
              data: widget.message.content,
              styleSheet: MarkdownStyleSheet(
                p: TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 14,
                  height: 1.6,
                  color: widget.isDark ? Colors.white.withValues(alpha: 0.87) : AppColors.textDark,
                ),
                strong: TextStyle(
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                  fontFamily: 'Poppins',
                ),
                code: const TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 13,
                ),
              ),
            ),
            // Copy button
            const SizedBox(height: 6),
            GestureDetector(
              onTap: () {
                Clipboard.setData(
                    ClipboardData(text: widget.message.content));
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('chat.copied'.tr()),
                    duration: const Duration(seconds: 1),
                    backgroundColor: AppColors.primary,
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8)),
                  ),
                );
              },
              child: Icon(Icons.copy_outlined,
                  size: 15,
                  color: widget.isDark ? Colors.white38 : AppColors.textMuted),
            ),
            // Suggestions
            if (widget.message.suggestions != null &&
                widget.message.suggestions!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: widget.message.suggestions!.take(4).map((s) {
                  return ActionChip(
                    label: Text(s,
                        style: const TextStyle(
                            fontFamily: 'Poppins', fontSize: 12)),
                    onPressed: () => widget.onSuggestion?.call(s),
                    backgroundColor: widget.isDark
                        ? AppColors.primary.withValues(alpha: 0.15)
                        : AppColors.primarySurface,
                    side: BorderSide(
                        color: AppColors.primary.withValues(alpha: 0.3)),
                  );
                }).toList(),
              ),
            ],
            // Dynamic Action Cards
            _buildActionCards(widget.message.content, context),
          ],
        ),
      ),
    );
  }

  Widget _buildActionCards(String text, BuildContext ctx) {
    final lower = text.toLowerCase();
    final cards = <({String label, IconData icon, String route})>[];
    if (lower.contains('mandi') || lower.contains('price') || lower.contains('market price'))
      cards.add((label: 'mandi.title'.tr(), icon: Icons.storefront_outlined, route: '/mandi_rates'));
    if (lower.contains('market') || lower.contains('barter') || lower.contains('buy') || lower.contains('sell'))
      cards.add((label: 'marketplace.title'.tr(), icon: Icons.shopping_bag_outlined, route: '/marketplace'));
    if (lower.contains('trend') || lower.contains('moisture') || lower.contains('sensor') || lower.contains('temperature') || lower.contains('humidity'))
      cards.add((label: 'trends.title'.tr(), icon: Icons.analytics_outlined, route: '/trends'));
    if (lower.contains('report') || lower.contains('advisory') || lower.contains('recommendation'))
      cards.add((label: 'reports.title'.tr(), icon: Icons.description_outlined, route: '/reports'));
    if (lower.contains('profile') || lower.contains('your farm') || lower.contains('your crop'))
      cards.add((label: 'profile.title'.tr(), icon: Icons.person_outlined, route: '/profile'));
    if (cards.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'chat.jump_to'.tr(),
            style: TextStyle(
              fontFamily: 'Poppins',
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: widget.isDark ? Colors.white38 : AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: cards.map((c) {
              return GestureDetector(
                onTap: () => ctx.push(c.route),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: widget.isDark ? 0.18 : 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.35),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(c.icon, size: 15, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Text(
                        c.label,
                        style: const TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}


// ─── Input Bar ────────────────────────────────────────────────────────────────
class _InputBar extends StatelessWidget {
  final TextEditingController controller;
  final bool hasText;
  final bool isLoading;
  final VoidCallback onSend;
  final VoidCallback onVoice;
  final VoidCallback onNewChat;
  final VoidCallback onChoice;
  final bool isDark;

  const _InputBar({
    required this.controller,
    required this.hasText,
    required this.isLoading,
    required this.onSend,
    required this.onVoice,
    required this.onNewChat,
    required this.onChoice,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 16),
      decoration: const BoxDecoration(
        color: Colors.transparent,
      ),
      child: SafeArea(
        top: false,
        child: Container(
          decoration: BoxDecoration(
            color: isDark
                ? Colors.white.withValues(alpha: 0.08)
                : Colors.white.withValues(alpha: 0.92),
            borderRadius: BorderRadius.circular(26),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.14)
                  : AppColors.primary.withValues(alpha: 0.25),
            ),
            boxShadow: [
              BoxShadow(
                color: AppColors.primary.withValues(alpha: 0.08),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(width: 8),
              // Voice button
              IconButton(
                icon: Icon(Icons.graphic_eq_rounded,
                    size: 22,
                    color: isDark ? Colors.white70 : AppColors.textMuted),
                onPressed: onVoice,
                tooltip: 'Live voice',
              ),
              // Text field
              Expanded(
                child: TextField(
                  controller: controller,
                  maxLines: 4,
                  minLines: 1,
                  textInputAction: TextInputAction.send,
                  onSubmitted: (_) => onSend(),
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 14,
                    color: isDark ? Colors.white : AppColors.textDark,
                  ),
                  decoration: InputDecoration(
                    hintText: 'chat.hint'.tr(),
                    hintStyle: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 14,
                      color: isDark ? Colors.white38 : AppColors.textMuted,
                    ),
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    filled: false,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 4, vertical: 12),
                  ),
                ),
              ),
              // Right side actions
              if (hasText && !isLoading)
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: GestureDetector(
                    onTap: onSend,
                    child: Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: AppColors.primary,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.4),
                            blurRadius: 8,
                          ),
                        ],
                      ),
                      child: const Icon(Icons.arrow_upward_rounded,
                          color: Colors.white, size: 18),
                    ),
                  ),
                )
              else if (isLoading)
                Padding(
                  padding: const EdgeInsets.only(right: 12),
                  child: SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: AppColors.primary,
                    ),
                  ),
                )
              else ...[
                // Plus button (start new chat, save current)
                IconButton(
                  icon: Icon(Icons.add_circle_outline_rounded,
                      size: 22,
                      color: isDark ? Colors.white70 : AppColors.textMuted),
                  onPressed: onNewChat,
                  tooltip: 'Save & Start New Chat',
                ),
                // Choice screen button
                IconButton(
                  icon: Icon(Icons.grid_view_rounded,
                      size: 22,
                      color: isDark ? Colors.white70 : AppColors.textMuted),
                  onPressed: onChoice,
                  tooltip: 'Go to Choice Screen',
                ),
                const SizedBox(width: 4),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
