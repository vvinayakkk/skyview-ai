import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../utils/constants.dart';
import '../widgets/ai_overview_widget.dart';

class OverviewScreen extends ConsumerStatefulWidget {
  const OverviewScreen({super.key});

  @override
  ConsumerState<OverviewScreen> createState() => _OverviewScreenState();
}

class _OverviewScreenState extends ConsumerState<OverviewScreen> {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      extendBodyBehindAppBar: true,
      backgroundColor: Colors.transparent,
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
          'overview.title'.tr(),
          style: const TextStyle(
            fontFamily: 'Poppins',
            fontWeight: FontWeight.w600,
            fontSize: 18,
          ),
        ),
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
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Full AI Overview with collapsible, chat, action cards
                AiOverviewWidget(
                  page: 'dashboard',
                  isDark: isDark,
                ),

                // Section title
                Padding(
                  padding: const EdgeInsets.only(top: 8, bottom: 12),
                  child: Text('overview.quick_access'.tr(), style: TextStyle(
                    fontFamily: 'Poppins', fontWeight: FontWeight.w700,
                    fontSize: 15, color: isDark ? Colors.white : AppColors.textDark,
                  )),
                ),

                // Quick navigation cards
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.5,
                  children: [
                    _navCard('overview.mandi_prices'.tr(), Icons.storefront_outlined, const Color(0xFF10B981), '/mandi_rates', isDark),
                    _navCard('overview.sensor_trends'.tr(), Icons.analytics_outlined, const Color(0xFF42A5F5), '/trends', isDark),
                    _navCard('overview.farm_reports'.tr(), Icons.description_outlined, const Color(0xFFF59E0B), '/reports', isDark),
                    _navCard('overview.marketplace'.tr(), Icons.shopping_bag_outlined, const Color(0xFF9C27B0), '/marketplace', isDark),
                    _navCard('overview.ai_chat'.tr(), Icons.chat_bubble_outline_rounded, const Color(0xFFE53935), '/chat', isDark),
                    _navCard('overview.my_profile'.tr(), Icons.person_outline_rounded, const Color(0xFF00BCD4), '/profile', isDark),
                    _navCard('overview.ai_accelerator'.tr(), Icons.developer_board_rounded, const Color(0xFFE91E63), '/accelerator', isDark),
                    _navCard('overview.gov_schemes'.tr(), Icons.gavel_rounded, const Color(0xFF8B5CF6), '/profile', isDark),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _navCard(String label, IconData icon, Color color, String route, bool isDark) {
    return GestureDetector(
      onTap: () => context.push(route),
      child: Container(
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkCard.withValues(alpha: 0.96) : Colors.white.withValues(alpha: 0.85),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withValues(alpha: 0.25)),
          boxShadow: [BoxShadow(color: color.withValues(alpha: 0.08), blurRadius: 8, offset: const Offset(0, 3))],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 8),
            Text(label, style: TextStyle(
              fontFamily: 'Poppins', fontWeight: FontWeight.w600, fontSize: 12,
              color: isDark ? Colors.white : AppColors.textDark,
            )),
          ],
        ),
      ),
    );
  }
}
