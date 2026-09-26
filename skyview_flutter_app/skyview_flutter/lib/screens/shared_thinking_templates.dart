class SharedThinkingTemplates {
  static const List<String> loadingHints = [
    'Analyzing query context...',
    'Understanding language and intent...',
    'Fetching relative agricultural data...',
    'Analyzing soil and weather information...',
    'Synthesizing expert recommendations...',
    'Drafting final response...',
  ];

  static List<String> buildThoughtTemplates({
    required String phase,
    String? contextHint,
  }) {
    final contextStr = (contextHint != null && contextHint.isNotEmpty) ? ' for "$contextHint"' : '';
    return [
      'Initializing request: $phase',
      'Detecting language and tone$contextStr...',
      'Routing query to specialist agents...',
      'Querying active sensors and mandi rates...',
      'Applying agricultural knowledge models...',
      'Synthesizing local recommendations...',
      'Generating final natural language response...',
    ];
  }
}
