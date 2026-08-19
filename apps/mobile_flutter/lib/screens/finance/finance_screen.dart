import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../constants/theme.dart';
import '../../providers/crm_finance_provider.dart';
import '../../widgets/neomorphic_widgets.dart';

class FinanceScreen extends StatefulWidget {
  const FinanceScreen({Key? key}) : super(key: key);

  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<CrmFinanceProvider>(context, listen: false).fetchInvoices();
    });
  }

  void _sharePublicInvoice(String? token) async {
    if (token == null) return;
    final url = Uri.parse('http://192.168.1.98:3000/i/$token');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final finProv = Provider.of<CrmFinanceProvider>(context);

    double totalRevenue = 0.0;
    double totalPaid = 0.0;
    double totalBalance = 0.0;

    for (var inv in finProv.invoices) {
      totalRevenue += inv.grandTotalInr;
      totalPaid += inv.amountPaidInr;
      totalBalance += inv.balanceDueInr;
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Finance & GST Billing', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800)),
            Text(
              'TAX INVOICES, ADVANCES & BALANCE DUES',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 9,
                fontWeight: FontWeight.w700,
                color: AppColors.primary,
                letterSpacing: 1.2,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => finProv.fetchInvoices(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => finProv.fetchInvoices(),
        color: AppColors.primary,
        child: SafeArea(
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Financial Metrics Card
                NeuCard(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildFinanceStat('Total Contracted', '₹${totalRevenue.toInt()}', AppColors.textDark),
                          _buildFinanceStat('Received', '₹${totalPaid.toInt()}', AppColors.success),
                          _buildFinanceStat('Balance Due', '₹${totalBalance.toInt()}', AppColors.danger),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                Text(
                  'Client Invoices & Receipts',
                  style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 12),

                if (finProv.isLoading && finProv.invoices.isEmpty)
                  const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator(color: AppColors.primary)))
                else if (finProv.invoices.isEmpty)
                  _buildEmptyInvoices()
                else
                  ...finProv.invoices.map((inv) => _buildInvoiceCard(inv)).toList(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFinanceStat(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
        const SizedBox(height: 3),
        Text(value, style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800, color: color)),
      ],
    );
  }

  Widget _buildInvoiceCard(inv) {
    return NeuCard(
      margin: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                inv.invoiceNumber,
                style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w800, color: AppColors.textDark),
              ),
              NeuPill(
                text: inv.status,
                color: inv.status == 'PAID'
                    ? AppColors.success.withOpacity(0.15)
                    : inv.status == 'PARTIALLY_PAID'
                        ? AppColors.warning.withOpacity(0.15)
                        : AppColors.primary.withOpacity(0.15),
                textColor: inv.status == 'PAID'
                    ? AppColors.success
                    : inv.status == 'PARTIALLY_PAID'
                        ? AppColors.warning
                        : AppColors.primary,
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            inv.clientName,
            style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textDark),
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Grand Total: ₹${inv.grandTotalInr.toInt()}',
                style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMuted),
              ),
              Text(
                'Due: ₹${inv.balanceDueInr.toInt()}',
                style: GoogleFonts.outfit(fontSize: 13, fontWeight: FontWeight.w800, color: AppColors.danger),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: AppColors.border),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              NeuButton(
                text: 'View & Share /i/token',
                height: 34,
                isPrimary: false,
                onPressed: () => _sharePublicInvoice(inv.secureShareToken),
                icon: const Icon(Icons.open_in_new_rounded, size: 14, color: AppColors.textDark),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyInvoices() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          children: [
            const Icon(Icons.receipt_long_outlined, size: 48, color: AppColors.textMuted),
            const SizedBox(height: 12),
            Text('No Invoices Generated Yet', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text('Convert your CRM leads into GST Tax Invoices to track client payments.', textAlign: TextAlign.center, style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }
}
