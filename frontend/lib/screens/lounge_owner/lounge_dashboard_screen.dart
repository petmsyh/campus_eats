import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../services/lounge_service.dart';
import 'orders_screen.dart';
import 'menu_screen.dart';
import 'commission_screen.dart';

class LoungeDashboardScreen extends StatefulWidget {
  final LoungeService loungeService;
  final String loungeId;

  const LoungeDashboardScreen({
    Key? key,
    required this.loungeService,
    required this.loungeId,
  }) : super(key: key);

  @override
  State<LoungeDashboardScreen> createState() => _LoungeDashboardScreenState();
}

class _LoungeDashboardScreenState extends State<LoungeDashboardScreen> {
  int _selectedIndex = 0;
  Map<String, dynamic>? _stats;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    try {
      setState(() => _isLoading = true);
      final ordersResponse = await widget.loungeService.getOrders(limit: 100);
      final orders = ordersResponse['data'] as List;

      final pending = orders.where((o) => o['status'] == 'PENDING').length;
      final preparing = orders.where((o) => o['status'] == 'PREPARING').length;
      final ready = orders.where((o) => o['status'] == 'READY').length;
      final delivered = orders.where((o) => o['status'] == 'DELIVERED').length;
      
      double totalRevenue = 0;
      for (var order in orders) {
        if (order['status'] == 'DELIVERED') {
          totalRevenue += (order['totalPrice'] ?? 0).toDouble();
        }
      }

      final commissionStats = await widget.loungeService.getCommissionStats();

      setState(() {
        _stats = {
          'pendingOrders': pending,
          'preparingOrders': preparing,
          'readyOrders': ready,
          'totalOrders': orders.length,
          'deliveredOrders': delivered,
          'totalRevenue': totalRevenue,
          'totalCommission': commissionStats['total'],
          'pendingCommission': commissionStats['pending'],
        };
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error loading stats: $e'),
            backgroundColor: AppTheme.errorColor,
          ),
        );
      }
    }
  }

  void _onItemTapped(int index) {
    setState(() => _selectedIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lounge Dashboard'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadStats),
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('QR Scanner coming soon')),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => Navigator.of(context).pushReplacementNamed('/login'),
          ),
        ],
      ),
      drawer: _buildDrawer(),
      body: _buildBody(),
    );
  }

  Widget _buildDrawer() {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(color: AppTheme.primaryColor),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const CircleAvatar(
                  radius: 30,
                  backgroundColor: Colors.white,
                  child: Icon(Icons.restaurant, size: 35, color: AppTheme.primaryColor),
                ),
                const SizedBox(height: 10),
                Text('Lounge Panel', style: AppTheme.heading3.copyWith(color: Colors.white)),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.dashboard),
            title: const Text('Dashboard'),
            selected: _selectedIndex == 0,
            onTap: () {
              _onItemTapped(0);
              Navigator.pop(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.receipt_long),
            title: const Text('Orders'),
            selected: _selectedIndex == 1,
            onTap: () {
              _onItemTapped(1);
              Navigator.pop(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.restaurant_menu),
            title: const Text('Menu'),
            selected: _selectedIndex == 2,
            onTap: () {
              _onItemTapped(2);
              Navigator.pop(context);
            },
          ),
          ListTile(
            leading: const Icon(Icons.monetization_on),
            title: const Text('Commission'),
            selected: _selectedIndex == 3,
            onTap: () {
              _onItemTapped(3);
              Navigator.pop(context);
            },
          ),
        ],
      ),
    );
  }

  Widget _buildBody() {
    switch (_selectedIndex) {
      case 0:
        return _buildDashboardTab();
      case 1:
        return LoungeOrdersScreen(loungeService: widget.loungeService, loungeId: widget.loungeId);
      case 2:
        return LoungeMenuScreen(loungeService: widget.loungeService, loungeId: widget.loungeId);
      case 3:
        return LoungeCommissionScreen(loungeService: widget.loungeService);
      default:
        return _buildDashboardTab();
    }
  }

  Widget _buildDashboardTab() {
    if (_isLoading) return const Center(child: CircularProgressIndicator());
    if (_stats == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 64, color: AppTheme.errorColor),
            const SizedBox(height: 16),
            Text('Failed to load statistics', style: AppTheme.heading3),
            const SizedBox(height: 16),
            ElevatedButton(onPressed: _loadStats, child: const Text('Retry')),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadStats,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Overview', style: AppTheme.heading2),
            const SizedBox(height: 16),
            _buildStatsGrid(),
            const SizedBox(height: 24),
            Text('Revenue & Commission', style: AppTheme.heading2),
            const SizedBox(height: 16),
            _buildRevenueCard(),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsGrid() {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard('Pending', _stats!['pendingOrders'].toString(), Icons.pending_actions, Colors.orange),
        _buildStatCard('Preparing', _stats!['preparingOrders'].toString(), Icons.restaurant, Colors.blue),
        _buildStatCard('Ready', _stats!['readyOrders'].toString(), Icons.check_circle, Colors.green),
        _buildStatCard('Delivered', _stats!['deliveredOrders'].toString(), Icons.done_all, Colors.teal),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 32, color: color),
            const SizedBox(height: 8),
            Text(value, style: AppTheme.heading2.copyWith(color: color)),
            const SizedBox(height: 4),
            Text(title, style: AppTheme.bodyMedium.copyWith(color: AppTheme.textSecondary), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  Widget _buildRevenueCard() {
    return Card(
      color: AppTheme.primaryColor,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.monetization_on, color: Colors.white, size: 32),
                const SizedBox(width: 12),
                Text('Financial Overview', style: AppTheme.heading3.copyWith(color: Colors.white)),
              ],
            ),
            const SizedBox(height: 20),
            _buildRevenueItem('Total Revenue', 'ETB ${_stats!['totalRevenue'].toStringAsFixed(2)}'),
            const Divider(color: Colors.white30, height: 24),
            _buildRevenueItem('Total Commission', 'ETB ${_stats!['totalCommission'].toStringAsFixed(2)}'),
            const Divider(color: Colors.white30, height: 24),
            _buildRevenueItem('Pending Commission', 'ETB ${_stats!['pendingCommission'].toStringAsFixed(2)}'),
          ],
        ),
      ),
    );
  }

  Widget _buildRevenueItem(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: AppTheme.bodyLarge.copyWith(color: Colors.white70)),
        Text(value, style: AppTheme.heading3.copyWith(color: Colors.white, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
