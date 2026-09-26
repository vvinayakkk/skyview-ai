import 'package:easy_localization/easy_localization.dart';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../utils/constants.dart';
import '../widgets/ai_overview_widget.dart';

class MandiRatesScreen extends ConsumerStatefulWidget {
  const MandiRatesScreen({super.key});

  @override
  ConsumerState<MandiRatesScreen> createState() => _MandiRatesScreenState();
}

class _MandiRatesScreenState extends ConsumerState<MandiRatesScreen> {
  bool _isLoading = true;
  List<dynamic> _rates = [];
  List<String> _commodities = ['Wheat', 'Rice', 'Potato', 'Onion', 'Tomato', 'Cotton'];
  String _selectedCommodity = '';
  String _selectedState = '';
  final TextEditingController _searchCtrl = TextEditingController();

  static const _states = [
    '', 'Andhra Pradesh', 'Bihar', 'Gujarat', 'Haryana', 'Karnataka',
    'Madhya Pradesh', 'Maharashtra', 'Punjab', 'Rajasthan', 'Tamil Nadu',
    'Telangana', 'Uttar Pradesh', 'West Bengal',
  ];

  List<dynamic> get _filtered {
    var list = List<dynamic>.from(_rates);
    if (_searchCtrl.text.trim().isNotEmpty) {
      final q = _searchCtrl.text.trim().toLowerCase();
      list = list.where((r) =>
        r['commodity'].toString().toLowerCase().contains(q) ||
        r['market'].toString().toLowerCase().contains(q) ||
        r['state'].toString().toLowerCase().contains(q)
      ).toList();
    }
    return list;
  }

  @override
  void initState() {
    super.initState();
    _fetchAll();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _fetchAll() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    await Future.wait([_fetchCommodities(), _fetchRates()]);
    if (!mounted) return;
    setState(() => _isLoading = false);
  }

  Future<void> _fetchCommodities() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString('mandi_commodities');
      if (cached != null && mounted) {
        final List raw = json.decode(cached);
        setState(() => _commodities = raw.cast<String>());
      }
      final res = await http.get(
        Uri.parse('$kBaseUrl/api/mandi/commodities'),
      ).timeout(const Duration(seconds: 10));
      if (res.statusCode == 200) {
        final data = json.decode(res.body) as Map<String, dynamic>;
        final List raw = data['commodities'] ?? [];
        final list = raw.cast<String>();
        if (mounted) {
          setState(() => _commodities = list.isNotEmpty ? list : _commodities);
        }
        await prefs.setString('mandi_commodities', json.encode(list));
      }
    } catch (_) {}
  }

  Future<void> _fetchRates() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString('mandi_rates_${_selectedState}_$_selectedCommodity');
      if (cached != null && mounted) {
        final List raw = json.decode(cached);
        setState(() => _rates = raw);
      }

      final uri = Uri.parse('$kBaseUrl/api/mandi/rates').replace(queryParameters: {
        if (_selectedState.isNotEmpty) 'state': _selectedState,
        if (_selectedCommodity.isNotEmpty) 'commodity': _selectedCommodity,
        'limit': '100',
      });
      final res = await http.get(uri).timeout(const Duration(seconds: 15));
      if (res.statusCode == 200) {
        final data = json.decode(res.body) as Map<String, dynamic>;
        final List newRates = data['rates'] ?? [];
        if (mounted) {
          setState(() => _rates = newRates);
        }
        await prefs.setString('mandi_rates_${_selectedState}_$_selectedCommodity', json.encode(newRates));
      }
    } catch (e) {
      debugPrint('Mandi rates fetch error: $e');
    }
  }

  double _price(dynamic r, String key) {
    final v = r[key];
    if (v == null) return 0;
    if (v is num) return v.toDouble();
    return double.tryParse(v.toString().replaceAll(',', '')) ?? 0;
  }

  // Summary stats
  double get _avgModal {
    if (_rates.isEmpty) return 0;
    final vals = _rates.map((r) => _price(r, 'modal_price')).where((v) => v > 0).toList();
    if (vals.isEmpty) return 0;
    return vals.reduce((a, b) => a + b) / vals.length;
  }

  double get _maxModal {
    if (_rates.isEmpty) return 0;
    final vals = _rates.map((r) => _price(r, 'modal_price')).where((v) => v > 0).toList();
    if (vals.isEmpty) return 0;
    return vals.reduce((a, b) => a > b ? a : b);
  }

  double get _minModal {
    if (_rates.isEmpty) return 0;
    final vals = _rates.map((r) => _price(r, 'modal_price')).where((v) => v > 0).toList();
    if (vals.isEmpty) return 0;
    return vals.reduce((a, b) => a < b ? a : b);
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
    final mutedColor = isDark ? Colors.white54 : AppColors.textMuted;

    final filtered = _filtered;

    return Scaffold(
      backgroundColor: Colors.transparent,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_rounded, color: isDark ? Colors.white : AppColors.textDark),
          onPressed: () => context.pop(),
        ),
        title: Text('mandi.title'.tr(), style: TextStyle(
          fontFamily: 'Poppins', fontWeight: FontWeight.w600, fontSize: 18,
          color: isDark ? Colors.white : AppColors.textDark,
        )),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh_rounded, color: isDark ? Colors.white70 : AppColors.textMuted),
            onPressed: _fetchAll,
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
          child: RefreshIndicator(
            onRefresh: _fetchAll,
            color: AppColors.primary,
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [

                  // AI Overview
                  AiOverviewWidget(page: 'mandi', isDark: isDark),

                  // Summary stat cards
                  if (_rates.isNotEmpty) ...[
                    Row(children: [
                      _summaryCard('Avg Modal', '₹${_avgModal.toStringAsFixed(0)}', Icons.analytics_outlined,
                          AppColors.primary, cardColor, borderColor, textColor),
                      const SizedBox(width: 10),
                      _summaryCard('Highest', '₹${_maxModal.toStringAsFixed(0)}', Icons.trending_up_rounded,
                          const Color(0xFF2ECC71), cardColor, borderColor, textColor),
                      const SizedBox(width: 10),
                      _summaryCard('Lowest', '₹${_minModal.toStringAsFixed(0)}', Icons.trending_down_rounded,
                          const Color(0xFFEF4444), cardColor, borderColor, textColor),
                    ]),
                    const SizedBox(height: 16),
                  ],

                  // Filters row
                  _buildFilters(isDark, cardColor, borderColor, textColor, mutedColor),
                  const SizedBox(height: 16),

                  // Search bar
                  _buildSearchBar(isDark, cardColor, borderColor, textColor),
                  const SizedBox(height: 16),

                  if (_isLoading)
                    const Center(child: Padding(
                      padding: EdgeInsets.all(40),
                      child: CircularProgressIndicator(color: AppColors.primary),
                    ))
                  else if (filtered.isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(40),
                        child: Column(
                          children: [
                            Icon(Icons.storefront_outlined, size: 48, color: AppColors.textMuted),
                            const SizedBox(height: 12),
                            Text('No rates found.', style: TextStyle(fontFamily: 'Poppins', color: mutedColor)),
                            const SizedBox(height: 8),
                            Text('Try clearing filters or refreshing.', style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: mutedColor)),
                          ],
                        ),
                      ),
                    )
                  else ...[
                    // Count
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Text('${filtered.length} results', style: TextStyle(
                        fontFamily: 'Poppins', fontSize: 12, color: mutedColor,
                      )),
                    ),

                    // Price chart of top 12 rates
                    if (_rates.length >= 3) _buildPriceChart(isDark, cardColor, borderColor, textColor, mutedColor),

                    const SizedBox(height: 16),

                    // Rates table
                    _buildRatesTable(filtered, isDark, cardColor, borderColor, textColor, mutedColor),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _summaryCard(String label, String value, IconData icon, Color accent,
      Color cardColor, Color borderColor, Color textColor) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: borderColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 18, color: accent),
            const SizedBox(height: 6),
            Text(value, style: TextStyle(fontFamily: 'Poppins', fontWeight: FontWeight.w800, fontSize: 16, color: textColor)),
            Text(label, style: TextStyle(fontFamily: 'Poppins', fontSize: 10, color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }

  Widget _buildFilters(bool isDark, Color cardColor, Color borderColor, Color textColor, Color mutedColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // State filter
        Container(
          decoration: BoxDecoration(
            color: cardColor, borderRadius: BorderRadius.circular(10), border: Border.all(color: borderColor),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          height: 44,
          child: Row(
            children: [
              Icon(Icons.map_outlined, size: 16, color: mutedColor),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedState,
                    isExpanded: true,
                    dropdownColor: isDark ? const Color(0xFF0A2010) : Colors.white,
                    style: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: textColor),
                    items: _states.map((s) => DropdownMenuItem(
                      value: s,
                      child: Text(s.isEmpty ? 'All States' : s),
                    )).toList(),
                    onChanged: (v) {
                      setState(() => _selectedState = v ?? '');
                      _fetchRates();
                    },
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        // Commodity chips
        SizedBox(
          height: 36,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _filterChip('All', _selectedCommodity == '', isDark, () {
                setState(() => _selectedCommodity = '');
                _fetchRates();
              }),
              ..._commodities.map((c) => _filterChip(c, _selectedCommodity == c, isDark, () {
                setState(() => _selectedCommodity = c);
                _fetchRates();
              })),
            ],
          ),
        ),
      ],
    );
  }

  Widget _filterChip(String label, bool selected, bool isDark, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: selected ? AppColors.primary : (isDark ? Colors.white.withValues(alpha: 0.07) : Colors.white),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: selected ? AppColors.primary : AppColors.primary.withValues(alpha: 0.25),
          ),
        ),
        child: Text(label, style: TextStyle(
          fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.w600,
          color: selected ? Colors.white : (isDark ? Colors.white70 : AppColors.textDark),
        )),
      ),
    );
  }

  Widget _buildSearchBar(bool isDark, Color cardColor, Color borderColor, Color textColor) {
    return Container(
      height: 44,
      decoration: BoxDecoration(
        color: cardColor, borderRadius: BorderRadius.circular(10), border: Border.all(color: borderColor),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 12),
      child: Row(
        children: [
          Icon(Icons.search_rounded, size: 18, color: AppColors.textMuted),
          const SizedBox(width: 8),
          Expanded(
            child: TextField(
              controller: _searchCtrl,
              onChanged: (_) => setState(() {}),
              style: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: textColor),
              decoration: InputDecoration(
                border: InputBorder.none,
                hintText: 'Search commodity, market, state…',
                hintStyle: TextStyle(fontFamily: 'Poppins', fontSize: 13, color: AppColors.textMuted),
                contentPadding: EdgeInsets.zero, isCollapsed: true, isDense: true,
              ),
            ),
          ),
          if (_searchCtrl.text.isNotEmpty)
            GestureDetector(
              onTap: () => setState(() => _searchCtrl.clear()),
              child: const Icon(Icons.close_rounded, size: 16, color: AppColors.textMuted),
            ),
        ],
      ),
    );
  }

  Widget _buildPriceChart(bool isDark, Color cardColor, Color borderColor, Color textColor, Color mutedColor) {
    final top = _rates.take(12).toList();
    final prices = top.map((r) => _price(r, 'modal_price')).toList();
    final labels = top.map((r) => r['commodity']?.toString() ?? '').toList();

    return Container(
      decoration: BoxDecoration(
        color: cardColor, borderRadius: BorderRadius.circular(16), border: Border.all(color: borderColor),
      ),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Container(width: 8, height: 8, decoration: BoxDecoration(color: AppColors.primary, shape: BoxShape.circle)),
            const SizedBox(width: 8),
            Text('Modal Price Comparison (₹/qtl)', style: TextStyle(
              fontFamily: 'Poppins', fontWeight: FontWeight.w700, fontSize: 13, color: textColor,
            )),
          ]),
          const SizedBox(height: 14),
          SizedBox(
            height: 180,
            child: _BarChart(prices: prices, labels: labels, isDark: isDark),
          ),
        ],
      ),
    );
  }

  Widget _buildRatesTable(List<dynamic> filtered, bool isDark, Color cardColor, Color borderColor, Color textColor, Color mutedColor) {
    return Container(
      decoration: BoxDecoration(
        color: cardColor, borderRadius: BorderRadius.circular(16), border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
            child: Text('Rate Table', style: TextStyle(
              fontFamily: 'Poppins', fontWeight: FontWeight.w700, fontSize: 13, color: textColor,
            )),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              headingRowColor: WidgetStateProperty.all(AppColors.primary.withValues(alpha: 0.08)),
              dataRowMinHeight: 44,
              dataRowMaxHeight: 56,
              columnSpacing: 20,
              headingTextStyle: TextStyle(
                fontFamily: 'Poppins', fontWeight: FontWeight.w700,
                fontSize: 11, color: AppColors.primary,
              ),
              columns: const [
                DataColumn(label: Text('Commodity')),
                DataColumn(label: Text('Market')),
                DataColumn(label: Text('State')),
                DataColumn(label: Text('Min ₹')),
                DataColumn(label: Text('Max ₹')),
                DataColumn(label: Text('Modal ₹')),
                DataColumn(label: Text('Date')),
              ],
              rows: filtered.take(50).map((r) {
                final modal = _price(r, 'modal_price');
                final min = _price(r, 'min_price');
                final max = _price(r, 'max_price');
                final isHigh = modal > _avgModal * 1.05;
                final isLow = modal < _avgModal * 0.95;
                return DataRow(cells: [
                  DataCell(Text(r['commodity']?.toString() ?? '-',
                      style: TextStyle(fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.w600, color: textColor))),
                  DataCell(Text(r['market']?.toString() ?? '-',
                      style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: textColor))),
                  DataCell(Text(r['state']?.toString() ?? '-',
                      style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: mutedColor))),
                  DataCell(Text('₹${min.toStringAsFixed(0)}',
                      style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: const Color(0xFF3B82F6)))),
                  DataCell(Text('₹${max.toStringAsFixed(0)}',
                      style: TextStyle(fontFamily: 'Poppins', fontSize: 12, color: const Color(0xFF9C27B0)))),
                  DataCell(Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: isHigh
                          ? const Color(0xFF10B981).withValues(alpha: 0.15)
                          : isLow
                              ? const Color(0xFFEF4444).withValues(alpha: 0.12)
                              : Colors.transparent,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      if (isHigh) const Icon(Icons.trending_up_rounded, size: 12, color: Color(0xFF10B981)),
                      if (isLow) const Icon(Icons.trending_down_rounded, size: 12, color: Color(0xFFEF4444)),
                      if (isHigh || isLow) const SizedBox(width: 4),
                      Text('₹${modal.toStringAsFixed(0)}', style: TextStyle(
                        fontFamily: 'Poppins', fontSize: 12, fontWeight: FontWeight.w700,
                        color: isHigh ? const Color(0xFF10B981) : isLow ? const Color(0xFFEF4444) : textColor,
                      )),
                    ]),
                  )),
                  DataCell(Text(
                    (r['arrival_date']?.toString() ?? '').isNotEmpty
                        ? (r['arrival_date']?.toString() ?? '-').substring(0, 10)
                        : '-',
                    style: TextStyle(fontFamily: 'Poppins', fontSize: 11, color: mutedColor),
                  )),
                ]);
              }).toList(),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}

// ─── Bar chart for price comparison ──────────────────────────────────────────

class _BarChart extends StatelessWidget {
  final List<double> prices;
  final List<String> labels;
  final bool isDark;

  const _BarChart({required this.prices, required this.labels, required this.isDark});

  @override
  Widget build(BuildContext context) {
    if (prices.isEmpty) return const SizedBox.shrink();
    final maxP = prices.reduce((a, b) => a > b ? a : b);
    final minP = prices.reduce((a, b) => a < b ? a : b);
    final range = (maxP - minP).abs();

    return Row(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        // Y-axis labels
        Column(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            for (var i = 4; i >= 0; i--)
              Text(
                '₹${(minP + range * i / 4).toStringAsFixed(0)}',
                style: TextStyle(fontFamily: 'Poppins', fontSize: 8, color: isDark ? Colors.white30 : Colors.black38),
              ),
          ],
        ),
        const SizedBox(width: 6),
        // Bars
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: List.generate(prices.length, (i) {
                    final fraction = range > 0 ? (prices[i] - minP) / range : 0.5;
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            Text(
                              '₹${prices[i].toStringAsFixed(0)}',
                              style: TextStyle(
                                fontFamily: 'Poppins', fontSize: 7.5, fontWeight: FontWeight.w600,
                                color: isDark ? Colors.white60 : Colors.black54,
                              ),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 2),
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 500),
                              height: 120 * fraction.clamp(0.05, 1),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [AppColors.primary, AppColors.primaryDark],
                                ),
                                borderRadius: const BorderRadius.only(
                                  topLeft: Radius.circular(4),
                                  topRight: Radius.circular(4),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(height: 4),
              // X-axis labels
              Row(
                children: List.generate(labels.length, (i) => Expanded(
                  child: Text(
                    labels[i].length > 6 ? labels[i].substring(0, 6) : labels[i],
                    style: TextStyle(fontFamily: 'Poppins', fontSize: 7.5, color: isDark ? Colors.white38 : Colors.black38),
                    textAlign: TextAlign.center,
                    overflow: TextOverflow.ellipsis,
                  ),
                )),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
