import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';

import '../utils/constants.dart';

// ─── Live voice state ──────────────────────────────────────────────────────
enum VoiceStatus { idle, listening, processing, speaking, error }

class VoiceState {
  final VoiceStatus status;
  final String transcript;         // latest STT result
  final String agentReply;         // latest agent response text
  final List<String> stepLog;      // streaming steps from /api/voice/agent
  final String? error;

  const VoiceState({
    this.status = VoiceStatus.idle,
    this.transcript = '',
    this.agentReply = '',
    this.stepLog = const [],
    this.error,
  });

  VoiceState copyWith({
    VoiceStatus? status,
    String? transcript,
    String? agentReply,
    List<String>? stepLog,
    String? error,
  }) {
    return VoiceState(
      status: status ?? this.status,
      transcript: transcript ?? this.transcript,
      agentReply: agentReply ?? this.agentReply,
      stepLog: stepLog ?? this.stepLog,
      error: error,
    );
  }
}

// ─── Voice Notifier ────────────────────────────────────────────────────────
class VoiceNotifier extends StateNotifier<VoiceState> {
  final AudioRecorder _recorder = AudioRecorder();
  final AudioPlayer _player = AudioPlayer();
  String? _recordPath;

  VoiceNotifier() : super(const VoiceState());

  // ── 1. Start recording ──────────────────────────────────────────────────
  Future<bool> startListening() async {
    final status = await Permission.microphone.request();
    if (!status.isGranted) {
      state = state.copyWith(
          status: VoiceStatus.error, error: 'Microphone permission denied');
      return false;
    }
    final dir = await getTemporaryDirectory();
    _recordPath =
        '${dir.path}/voice_${DateTime.now().millisecondsSinceEpoch}.wav';
    await _recorder.start(
        const RecordConfig(encoder: AudioEncoder.wav), path: _recordPath!);
    state = state.copyWith(status: VoiceStatus.listening, transcript: '');
    return true;
  }

  // ── 2. Stop → STT → Agent → TTS ────────────────────────────────────────
  Future<void> stopAndProcess({String? phone, String languageCode = 'en'}) async {
    final path = await _recorder.stop();
    if (path == null) {
      state = state.copyWith(status: VoiceStatus.idle);
      return;
    }

    state = state.copyWith(
      status: VoiceStatus.processing,
      transcript: 'Transcribing your question...',
      stepLog: [],
    );

    // ── STT: POST /api/speech/transcribe  (multipart)
    final transcript = await _transcribe(path, languageCode);
    if (transcript == null || transcript.isEmpty) {
      state = state.copyWith(
          status: VoiceStatus.error, error: 'Could not understand speech.');
      return;
    }
    state = state.copyWith(transcript: transcript);

    // ── Agent: POST /api/voice/agent  { message, phone, language }
    final agentResult = await _callVoiceAgent(transcript, phone: phone, languageCode: languageCode);
    final reply = agentResult['response'] ?? agentResult['answer'] ?? '';
    final List<String> steps = (agentResult['steps'] as List?)
            ?.map((s) => s is Map ? (s['label'] ?? s['process'] ?? '').toString() : s.toString())
            .where((s) => s.isNotEmpty)
            .toList() ??
        [];

    state = state.copyWith(
      agentReply: reply.toString(),
      stepLog: steps,
    );

    // ── TTS: POST /api/speech/synthesize
    if (reply.toString().isNotEmpty) {
      state = state.copyWith(status: VoiceStatus.speaking);
      await _speak(reply.toString(), languageCode);
    }

    state = state.copyWith(status: VoiceStatus.idle);
  }

  Future<void> speakAgain(String text, String languageCode) async {
    state = state.copyWith(status: VoiceStatus.speaking);
    await _speak(text, languageCode);
    state = state.copyWith(status: VoiceStatus.idle);
  }

  Future<void> stop() async {
    await _recorder.stop();
    await _player.stop();
    state = const VoiceState();
  }

  // ── Internal helpers ────────────────────────────────────────────────────
  Future<String?> _transcribe(String filePath, String languageCode) async {
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$kBaseUrl/api/speech/transcribe'),
      );
      request.files.add(await http.MultipartFile.fromPath(
        'file',
        filePath,
        contentType: MediaType('audio', 'wav'),
      ));
      request.fields['language_code'] = languageCode == 'hi' ? 'hi-IN' : 'en-IN';
      request.fields['model'] = 'saaras:v3';

      final streamed = await request.send();
      if (streamed.statusCode == 200) {
        final body = await streamed.stream.bytesToString();
        final data = jsonDecode(body) as Map<String, dynamic>;
        return (data['transcript'] ?? data['text'] ?? '').toString();
      }
    } catch (_) {}
    return null;
  }

  Future<Map<String, dynamic>> _callVoiceAgent(String message,
      {String? phone, String languageCode = 'en'}) async {
    try {
      final res = await http.post(
        Uri.parse('$kBaseUrl/api/voice/agent'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'message': message,
          'language': languageCode == 'hi' ? 'hi-IN' : 'en-IN',
          'phone': phone,
          'stream_steps': false,
        }),
      );
      if (res.statusCode == 200) {
        return jsonDecode(res.body) as Map<String, dynamic>;
      }
    } catch (_) {}
    return {};
  }

  Future<void> _speak(String text, String languageCode) async {
    try {
      final res = await http.post(
        Uri.parse('$kBaseUrl/api/speech/synthesize'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'text': text, 'language': languageCode == 'hi' ? 'hi-IN' : 'en-IN'}),
      );
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final audioB64 = (data['audio'] ?? '').toString();
        if (audioB64.isNotEmpty) {
          final bytes = base64Decode(audioB64);
          
          // Stop current playback
          await _player.stop();

          // Try playing from bytes first, fallback to file if needed
          try {
            await _player.play(BytesSource(bytes));
          } catch (e) {
            final dir = await getTemporaryDirectory();
            final file = File('${dir.path}/tts_${DateTime.now().millisecondsSinceEpoch}.wav');
            await file.writeAsBytes(bytes);
            await _player.play(DeviceFileSource(file.path));
            
            final completer = Completer<void>();
            StreamSubscription<void>? sub;
            sub = _player.onPlayerComplete.listen((_) {
              if (!completer.isCompleted) completer.complete();
            });
            
            try {
              await completer.future.timeout(const Duration(seconds: 30));
            } catch (_) {
            } finally {
              await sub?.cancel();
              try {
                if (await file.exists()) {
                  await file.delete();
                }
              } catch (_) {}
            }
          }
        }
      }
    } catch (e, stackTrace) {
      // Log error for debugging
      print("TTS playback failed: $e");
      print(stackTrace);
    }
  }

  @override
  void dispose() {
    _recorder.dispose();
    _player.dispose();
    super.dispose();
  }
}

// ─── Provider ──────────────────────────────────────────────────────────────
final voiceProvider =
    StateNotifierProvider<VoiceNotifier, VoiceState>((_) => VoiceNotifier());
