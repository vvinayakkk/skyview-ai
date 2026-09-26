import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import 'package:shared_preferences/shared_preferences.dart';
import '../utils/constants.dart';

// ─── Message model ────────────────────────────────────────────────────────────
enum MessageRole { user, assistant }

class ChatMessage {
  final String id;
  final MessageRole role;
  final String content;
  final DateTime timestamp;
  final bool isLoading;
  final List<String>? suggestions;

  ChatMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.timestamp,
    this.isLoading = false,
    this.suggestions,
  });

  bool get isUser => role == MessageRole.user;
  bool get isAssistant => role == MessageRole.assistant;

  ChatMessage copyWith({
    String? content,
    bool? isLoading,
    List<String>? suggestions,
  }) {
    return ChatMessage(
      id: id,
      role: role,
      content: content ?? this.content,
      timestamp: timestamp,
      isLoading: isLoading ?? this.isLoading,
      suggestions: suggestions ?? this.suggestions,
    );
  }

  static ChatMessage loading() => ChatMessage(
        id: 'loading_${DateTime.now().millisecondsSinceEpoch}',
        role: MessageRole.assistant,
        content: '',
        timestamp: DateTime.now(),
        isLoading: true,
      );

  static ChatMessage user(String text) => ChatMessage(
        id: 'u_${DateTime.now().millisecondsSinceEpoch}',
        role: MessageRole.user,
        content: text,
        timestamp: DateTime.now(),
      );
}

// ─── Internal-state step model (for the "thinking" panel) ───────────────────
class AgentStep {
  final String label;
  final String detail;
  final bool done;

  const AgentStep({
    required this.label,
    this.detail = '',
    this.done = false,
  });
}

// ─── Chat state ───────────────────────────────────────────────────────────────
class ChatState {
  final List<ChatMessage> messages;
  final bool isLoading;
  final List<AgentStep> steps;      // internal agentic thinking steps
  final String? overviewText;       // AI Overview panel text

  const ChatState({
    this.messages = const [],
    this.isLoading = false,
    this.steps = const [],
    this.overviewText,
  });

  ChatState copyWith({
    List<ChatMessage>? messages,
    bool? isLoading,
    List<AgentStep>? steps,
    String? overviewText,
  }) {
    return ChatState(
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      steps: steps ?? this.steps,
      overviewText: overviewText ?? this.overviewText,
    );
  }
}

// ─── Chat Notifier ────────────────────────────────────────────────────────────
class ChatNotifier extends StateNotifier<ChatState> {
  ChatNotifier() : super(const ChatState());

  /// POST /api/chat  { message, user_id }
  /// Returns { response, agent, reasoning_steps?, suggestions? }
  Future<void> send(String text, {String? phone}) async {
    final userMsg = ChatMessage.user(text);
    final loadingMsg = ChatMessage.loading();

    state = state.copyWith(
      messages: [loadingMsg, userMsg, ...state.messages],
      isLoading: true,
      steps: [
        const AgentStep(label: 'Routing to specialist agent'),
        const AgentStep(label: 'Gathering sensor + mandi context'),
        const AgentStep(label: 'Composing response'),
      ],
    );

    try {
      final res = await http.post(
        Uri.parse('$kBaseUrl/api/chat'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'message': text,
          'user_id': phone ?? 'anonymous',
        }),
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final reply = (data['response'] ?? data['answer'] ?? '').toString();
        final rawSuggestions = data['suggestions'];

        List<AgentStep> resolved = [];
        final intent = data['intent']?.toString() ?? 'general';
        final agent = data['agent']?.toString() ?? 'General Agent';
        
        resolved.add(AgentStep(label: 'Classified intent: ${intent.toUpperCase()}', done: true));
        resolved.add(AgentStep(label: 'Routed query to $agent', done: true));
        
        if (intent == 'weather' || intent == 'alert' || intent == 'farm' || intent == 'trend') {
          resolved.add(const AgentStep(label: 'Retrieved active weather sensor telemetry', done: true));
        } else if (intent == 'mandi') {
          resolved.add(const AgentStep(label: 'Fetched live mandi commodity rates', done: true));
        } else if (intent == 'scheme') {
          resolved.add(const AgentStep(label: 'Fetched government agriculture schemes', done: true));
        }
        
        resolved.add(const AgentStep(label: 'Generated natural language advisory response', done: true));

        List<String>? suggestions;
        if (rawSuggestions is List) {
          suggestions = rawSuggestions.whereType<String>().toList();
        }

        final assistantMsg = ChatMessage(
          id: 'a_${DateTime.now().millisecondsSinceEpoch}',
          role: MessageRole.assistant,
          content: reply,
          timestamp: DateTime.now(),
          suggestions: suggestions,
        );

        state = state.copyWith(
          messages: [
            assistantMsg,
            ...state.messages.where((m) => !m.isLoading),
          ],
          isLoading: false,
          steps: resolved,
        );
      } else {
        _handleError();
      }
    } catch (_) {
      _handleError();
    }
  }

  void _handleError() {
    final err = ChatMessage(
      id: 'err_${DateTime.now().millisecondsSinceEpoch}',
      role: MessageRole.assistant,
      content: 'Could not connect to SkyView backend. Please try again.',
      timestamp: DateTime.now(),
    );
    state = state.copyWith(
      messages: [err, ...state.messages.where((m) => !m.isLoading)],
      isLoading: false,
      steps: const [],
    );
  }

  /// POST /api/chat/overview  { page, user_phone, language }
  Future<void> loadOverview({required String page, String? phone}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString('cached_overview_$page');
      if (cached != null && cached.isNotEmpty) {
        state = state.copyWith(overviewText: cached);
      }
    } catch (_) {}

    try {
      final res = await http.post(
        Uri.parse('$kBaseUrl/api/chat/overview'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'page': page,
          'user_phone': phone,
          'language': 'en',
        }),
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final overview = data['overview']?.toString();
        if (overview != null) {
          state = state.copyWith(overviewText: overview);
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('cached_overview_$page', overview);
        }
      }
    } catch (_) {
      // Silent fail – overview is supplemental
    }
  }

  void clear() => state = const ChatState();

  void loadSession(List<ChatMessage> msgs) {
    state = ChatState(messages: msgs, isLoading: false, steps: const []);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
final chatProvider =
    StateNotifierProvider<ChatNotifier, ChatState>((_) => ChatNotifier());
