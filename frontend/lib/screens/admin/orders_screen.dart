import 'package:flutter/material.dart';
import '../../config/app_theme.dart';
import '../../services/admin_service.dart';

class AdminOrdersScreen extends StatelessWidget {
  final AdminService adminService;

  const AdminOrdersScreen({Key? key, required this.adminService}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.receipt_long, size: 64, color: AppTheme.primaryColor),
          const SizedBox(height: 16),
          Text('Orders Overview', style: AppTheme.heading2),
          const SizedBox(height: 8),
          Text(
            'View and manage all orders across lounges',
            style: AppTheme.bodyMedium.copyWith(color: AppTheme.textSecondary),
          ),
        ],
      ),
    );
  }
}
