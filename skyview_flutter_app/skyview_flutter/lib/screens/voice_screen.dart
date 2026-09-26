
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../services/auth_service.dart';
import '../services/voice_service.dart';
import '../utils/constants.dart';

class VoiceScreen extends ConsumerStatefulWidget {
  const VoiceScreen({super.key});

  @override
  ConsumerState<VoiceScreen> createState() => _VoiceScreenState();
}

class _VoiceScreenState extends ConsumerState<VoiceScreen>
    with TickerProviderStateMixin {
  late final AnimationController _pulseCtrl;
  late final AnimationController _waveCtrl;
  late final Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1400))
      ..repeat(reverse: true);
    _waveCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 800))
      ..repeat();
    _pulseAnim =
        CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut);
  }

  Timer? _thinkingTimer;
  final List<String> _thinkingSteps = [];

  void _startThinkingSimulation() {
    _thinkingTimer?.cancel();
    _thinkingSteps.clear();
    setState(() {
      _thinkingSteps.add('Understanding your voice request...');
    });

    int count = 0;
    _thinkingTimer = Timer.periodic(const Duration(milliseconds: 1400), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      count++;
      setState(() {
        if (count == 1) {
          _thinkingSteps.add('Fetching live weather and sensor readings...');
        } else if (count == 2) {
          _thinkingSteps.add('Checking current Mandi commodity rates...');
        } else if (count == 3) {
          _thinkingSteps.add('Synthesizing natural language response...');
        } else {
          timer.cancel();
        }
      });
    });
  }

  void _stopThinkingSimulation() {
    _thinkingTimer?.cancel();
    _thinkingTimer = null;
  }

  @override
  void dispose() {
    _pulseCtrl.dispose();
    _waveCtrl.dispose();
    _thinkingTimer?.cancel();
    super.dispose();
  }

  Future<void> _toggleListen() async {
    final voice = ref.read(voiceProvider.notifier);
    final status = ref.read(voiceProvider).status;
    final phone = ref.read(authProvider).phone;

    if (status == VoiceStatus.idle) {
      setState(() {
        _thinkingSteps.clear();
      });
      await voice.startListening();
    } else if (status == VoiceStatus.listening) {
      _startThinkingSimulation();
      final lang = Localizations.localeOf(context).languageCode;
      await voice.stopAndProcess(phone: phone, languageCode: lang);
      _stopThinkingSimulation();
    } else {
      await voice.stop();
      _stopThinkingSimulation();
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final voiceState = ref.watch(voiceProvider);
    final status = voiceState.status;

    ref.listen<VoiceState>(voiceProvider, (prev, next) {
      if (prev?.status != next.status) {
        if (next.status == VoiceStatus.listening) {
          _pulseCtrl.duration = const Duration(milliseconds: 800);
          _waveCtrl.duration = const Duration(milliseconds: 600);
          _pulseCtrl.repeat(reverse: true);
          _waveCtrl.repeat();
        } else if (next.status == VoiceStatus.speaking) {
          _pulseCtrl.duration = const Duration(milliseconds: 1400);
          _waveCtrl.duration = const Duration(milliseconds: 1000);
          _pulseCtrl.repeat(reverse: true);
          _waveCtrl.repeat();
        } else if (next.status == VoiceStatus.processing) {
          _pulseCtrl.duration = const Duration(milliseconds: 500);
          _pulseCtrl.repeat(reverse: true);
        } else {
          _pulseCtrl.duration = const Duration(milliseconds: 2000);
          _pulseCtrl.repeat(reverse: true);
        }
      }
    });

    final bool isActive =
        status == VoiceStatus.listening || status == VoiceStatus.speaking;
    final bool isProcessing = status == VoiceStatus.processing;

    final List<String> stepsToShow = isProcessing ? _thinkingSteps : voiceState.stepLog;

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
          'Live Voice Assistant',
          style: TextStyle(
            fontFamily: 'Poppins',
            fontWeight: FontWeight.w600,
            color: isDark ? Colors.white : AppColors.textDark,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.add_circle_outline_rounded,
                color: isDark ? Colors.white : AppColors.textDark),
            tooltip: 'New Voice Chat',
            onPressed: () {
              ref.read(voiceProvider.notifier).stop();
              _stopThinkingSimulation();
              setState(() {
                _thinkingSteps.clear();
              });
            },
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
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: Column(
              children: [
                const SizedBox(height: 20),

                // ── Status label ──────────────────────────────────────────
                _StatusLabel(status: status, isDark: isDark),
                const SizedBox(height: 32),

                // ── Animated orb ──────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: AnimatedBuilder(
                      animation: _pulseAnim,
                      builder: (_, __) {
                        final scale = isActive
                            ? 1.0 + _pulseAnim.value * 0.14
                            : 1.0;
                        return GestureDetector(
                          onTap: isProcessing ? null : _toggleListen,
                          child: Transform.scale(
                            scale: scale,
                            child: _VoiceOrb(
                              status: status,
                              waveAnim: _waveCtrl,
                              isDark: isDark,
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),

                // ── Transcript ────────────────────────────────────────────
                if (voiceState.transcript.isNotEmpty)
                  _TranscriptCard(
                      text: voiceState.transcript,
                      label: 'You said',
                      isDark: isDark,
                      color: AppColors.primary),

                // ── Steps / thinking log ──────────────────────────────────
                if (stepsToShow.isNotEmpty)
                  _StepLog(steps: stepsToShow, isDark: isDark),

                // ── Agent reply ───────────────────────────────────────────
                if (voiceState.agentReply.isNotEmpty)
                  _TranscriptCard(
                      text: voiceState.agentReply,
                      label: 'Kisan Mitra',
                      isDark: isDark,
                      color: AppColors.primaryDark,
                      onSpeak: () {
                        final lang = Localizations.localeOf(context).languageCode;
                        ref.read(voiceProvider.notifier).speakAgain(voiceState.agentReply, lang);
                      }),

                // ── Dynamic Action Cards ───────────────────────────────────
                if (voiceState.agentReply.isNotEmpty)
                  _buildVoiceActionCards(voiceState.agentReply, context, isDark),

                const SizedBox(height: 16),

                // ── Hint text ──────────────────────────────────────────────
                Padding(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 32, vertical: 8),
                  child: Text(
                    _hintText(status),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 13,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _hintText(VoiceStatus status) {
    switch (status) {
      case VoiceStatus.idle:
        return 'Tap the orb to start speaking';
      case VoiceStatus.listening:
        return 'Listening… tap again to stop';
      case VoiceStatus.processing:
        return 'Processing your question…';
      case VoiceStatus.speaking:
        return 'Speaking the response…';
      case VoiceStatus.error:
        return 'Something went wrong. Tap to try again.';
    }
  }

  Widget _buildVoiceActionCards(String text, BuildContext ctx, bool isDark) {
    final lower = text.toLowerCase();
    final cards = <({String label, IconData icon, String route})>[];
    if (lower.contains('mandi') || lower.contains('price') || lower.contains('market price'))
      cards.add((label: 'Mandi Prices', icon: Icons.storefront_outlined, route: '/mandi_rates'));
    if (lower.contains('market') || lower.contains('barter') || lower.contains('buy') || lower.contains('sell'))
      cards.add((label: 'Marketplace', icon: Icons.shopping_bag_outlined, route: '/marketplace'));
    if (lower.contains('trend') || lower.contains('moisture') || lower.contains('sensor') || lower.contains('temperature') || lower.contains('humidity'))
      cards.add((label: 'Sensor Trends', icon: Icons.analytics_outlined, route: '/trends'));
    if (lower.contains('report') || lower.contains('advisory') || lower.contains('recommendation'))
      cards.add((label: 'Reports', icon: Icons.description_outlined, route: '/reports'));
    if (lower.contains('profile') || lower.contains('your farm') || lower.contains('your crop'))
      cards.add((label: 'Profile', icon: Icons.person_outlined, route: '/profile'));
    if (cards.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Explore:',
            style: TextStyle(
              fontFamily: 'Poppins',
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: isDark ? Colors.white38 : AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: cards.map((c) {
              return GestureDetector(
                onTap: () => ctx.push(c.route),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: isDark ? 0.18 : 0.1),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.4),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(c.icon, size: 16, color: AppColors.primary),
                      const SizedBox(width: 7),
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

// ─── Orb ─────────────────────────────────────────────────────────────────────
class _VoiceOrb extends StatelessWidget {
  final VoiceStatus status;
  final Animation<double> waveAnim;
  final bool isDark;

  const _VoiceOrb({
    required this.status,
    required this.waveAnim,
    required this.isDark,
  });

  @override
  Widget build(BuildContext context) {
    final isListening = status == VoiceStatus.listening;
    final isSpeaking = status == VoiceStatus.speaking;
    final isProcessing = status == VoiceStatus.processing;

    Color orbColor = const Color(0xFF10B981); // Emerald green matching UI

    return Stack(
      alignment: Alignment.center,
      children: [
        // Outer ripple rings when active
        if (isListening || isSpeaking)
          AnimatedBuilder(
            animation: waveAnim,
            builder: (_, __) {
              return CustomPaint(
                painter: _RipplePainter(
                    progress: waveAnim.value, color: orbColor),
                size: const Size(220, 220),
              );
            },
          ),

        // Main orb
        Container(
          width: 140,
          height: 140,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                orbColor.withValues(alpha: 0.8),
                orbColor.withValues(alpha: 0.4),
              ],
            ),
            border: Border.all(
              color: orbColor.withValues(alpha: 0.6),
              width: 2.0,
            ),
            boxShadow: [
              BoxShadow(
                color: orbColor.withValues(alpha: 0.35),
                blurRadius: 30,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Center(
            child: isProcessing
                ? SizedBox(
                    width: 36,
                    height: 36,
                    child: CircularProgressIndicator(
                        strokeWidth: 3, color: Colors.white))
                : Icon(
                    isListening
                        ? Icons.mic_rounded
                        : isSpeaking
                            ? Icons.volume_up_rounded
                            : Icons.mic_none_rounded,
                    color: Colors.white,
                    size: 52,
                  ),
          ),
        ),
      ],
    );
  }
}

class _RipplePainter extends CustomPainter {
  final double progress;
  final Color color;
  _RipplePainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    for (var i = 0; i < 3; i++) {
      final p = (progress + i / 3) % 1.0;
      final radius = 70.0 + p * 40.0;
      final opacity = (1.0 - p) * 0.35;
      canvas.drawCircle(
        center,
        radius,
        Paint()
          ..color = color.withValues(alpha: opacity)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.5,
      );
    }
  }

  @override
  bool shouldRepaint(_RipplePainter old) => old.progress != progress;
}

// ─── Transcript card ──────────────────────────────────────────────────────────
class _TranscriptCard extends StatelessWidget {
  final String text;
  final String label;
  final bool isDark;
  final Color color;
  final VoidCallback? onSpeak;

  const _TranscriptCard({
    required this.text,
    required this.label,
    required this.isDark,
    required this.color,
    this.onSpeak,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark
            ? Colors.white.withValues(alpha: 0.06)
            : Colors.white.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: color,
                  letterSpacing: 0.5,
                ),
              ),
              if (onSpeak != null)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: Icon(Icons.volume_up_rounded, size: 16, color: color),
                      constraints: const BoxConstraints(),
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      onPressed: onSpeak,
                      tooltip: 'Speak again',
                    ),
                    IconButton(
                      icon: Icon(Icons.copy_rounded, size: 16, color: color),
                      constraints: const BoxConstraints(),
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      onPressed: () async {
                        await Clipboard.setData(ClipboardData(text: text));
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Copied response to clipboard')),
                          );
                        }
                      },
                      tooltip: 'Copy',
                    ),
                    IconButton(
                      icon: Icon(Icons.share_rounded, size: 16, color: color),
                      constraints: const BoxConstraints(),
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      onPressed: () {
                        Share.share(text);
                      },
                      tooltip: 'Share',
                    ),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            text,
            style: TextStyle(
              fontFamily: 'Poppins',
              fontSize: 14,
              height: 1.5,
              color: isDark ? Colors.white.withValues(alpha: 0.87) : AppColors.textDark,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Step log ─────────────────────────────────────────────────────────────────
class _StepLog extends StatelessWidget {
  final List<String> steps;
  final bool isDark;

  const _StepLog({required this.steps, required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark
            ? AppColors.primary.withValues(alpha: 0.08)
            : AppColors.primarySurface.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: steps.map((s) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Row(
              children: [
                Icon(Icons.check_circle_outline_rounded,
                    size: 13, color: AppColors.primary),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    s,
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 12,
                      color: isDark ? Colors.white70 : AppColors.textMuted,
                    ),
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ─── Status label ─────────────────────────────────────────────────────────────
class _StatusLabel extends StatelessWidget {
  final VoiceStatus status;
  final bool isDark;
  const _StatusLabel({required this.status, required this.isDark});

  @override
  Widget build(BuildContext context) {
    final Map<VoiceStatus, ({String text, Color color, IconData icon})> map = {
      VoiceStatus.idle: (
        text: 'Ready',
        color: AppColors.textMuted,
        icon: Icons.mic_none_rounded
      ),
      VoiceStatus.listening: (
        text: 'Listening',
        color: AppColors.primary,
        icon: Icons.mic_rounded
      ),
      VoiceStatus.processing: (
        text: 'Processing',
        color: AppColors.primary,
        icon: Icons.sync_rounded
      ),
      VoiceStatus.speaking: (
        text: 'Speaking',
        color: AppColors.primaryDark,
        icon: Icons.volume_up_rounded
      ),
      VoiceStatus.error: (
        text: 'Error',
        color: AppColors.error,
        icon: Icons.error_outline
      ),
    };

    final entry = map[status]!;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: entry.color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: entry.color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(entry.icon, size: 15, color: entry.color),
          const SizedBox(width: 6),
          Text(
            entry.text,
            style: TextStyle(
              fontFamily: 'Poppins',
              fontWeight: FontWeight.w600,
              fontSize: 13,
              color: entry.color,
            ),
          ),
        ],
      ),
    );
  }
}
