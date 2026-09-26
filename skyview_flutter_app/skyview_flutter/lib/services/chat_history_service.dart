import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'chat_service.dart';

class ChatSession {
  final String id;
  final String title;
  final DateTime timestamp;
  final List<ChatMessage> messages;

  ChatSession({
    required this.id,
    required this.title,
    required this.timestamp,
    required this.messages,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'timestamp': timestamp.toIso8601String(),
      'messages': messages.map((m) => {
        'id': m.id,
        'role': m.role.name,
        'content': m.content,
        'timestamp': m.timestamp.toIso8601String(),
        'isLoading': m.isLoading,
        'suggestions': m.suggestions,
      }).toList(),
    };
  }

  factory ChatSession.fromJson(Map<String, dynamic> json) {
    return ChatSession(
      id: json['id'] as String,
      title: json['title'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      messages: (json['messages'] as List).map((m) {
        final map = m as Map<String, dynamic>;
        return ChatMessage(
          id: map['id'] as String,
          role: MessageRole.values.firstWhere((r) => r.name == map['role']),
          content: map['content'] as String,
          timestamp: DateTime.parse(map['timestamp'] as String),
          isLoading: map['isLoading'] as bool? ?? false,
          suggestions: (map['suggestions'] as List?)?.cast<String>(),
        );
      }).toList(),
    );
  }
}

class ChatHistoryNotifier extends StateNotifier<List<ChatSession>> {
  ChatHistoryNotifier() : super(const []) {
    loadHistory();
  }

  Future<void> loadHistory() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getStringList('skyview_chat_history') ?? [];
      state = raw
          .map((item) => ChatSession.fromJson(jsonDecode(item) as Map<String, dynamic>))
          .toList();
    } catch (_) {}
  }

  Future<void> saveSession(List<ChatMessage> messages) async {
    if (messages.isEmpty) return;
    
    // Title is the first user message
    String title = 'Chat Session';
    final userMsgs = messages.where((m) => m.isUser).toList();
    if (userMsgs.isNotEmpty) {
      final text = userMsgs.last.content;
      title = text.length > 30 ? '${text.substring(0, 27)}...' : text;
    }

    final session = ChatSession(
      id: 'session_${DateTime.now().millisecondsSinceEpoch}',
      title: title,
      timestamp: DateTime.now(),
      messages: messages.where((m) => !m.isLoading).toList(),
    );

    state = [session, ...state];
    await _persist();
  }

  Future<void> deleteSession(String id) async {
    state = state.where((s) => s.id != id).toList();
    await _persist();
  }

  Future<void> _persist() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final list = state.map((s) => jsonEncode(s.toJson())).toList();
      await prefs.setStringList('skyview_chat_history', list);
    } catch (_) {}
  }
}

final chatHistoryProvider =
    StateNotifierProvider<ChatHistoryNotifier, List<ChatSession>>((ref) {
  return ChatHistoryNotifier();
});
