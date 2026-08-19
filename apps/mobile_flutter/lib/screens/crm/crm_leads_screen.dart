import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../constants/theme.dart';
import '../../providers/crm_finance_provider.dart';
import '../../widgets/neomorphic_widgets.dart';
import 'create_lead_screen.dart';

class CrmLeadsScreen extends StatefulWidget {
  const CrmLeadsScreen({Key? key}) : super(key: key);

  @override
  State<CrmLeadsScreen> createState() => _CrmLeadsScreenState();
}

class _CrmLeadsScreenState extends State<CrmLeadsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<CrmFinanceProvider>(context, listen: false).fetchLeads();
    });
  }

  void _openWhatsAppQuote(String clientName, String clientPhone, double budget) async {
    final cleanPhone = clientPhone.replaceAll(RegExp(r'[^0-9]'), '');
    final msg = Uri.encodeComponent(
      'Hello $clientName, Thank you for inquiring with our Studio. Here is your preliminary quotation for ₹${budget.toInt()}: https://getmymoment.in/q/preview',
    );
    final url = Uri.parse('https://wa.me/$cleanPhone?text=$msg');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final crmProv = Provider.of<CrmFinanceProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('CRM & Leads Pipeline', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800)),
            Text(
              'INQUIRIES, QUOTES & WHATSAPP PIPELINE',
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
            onPressed: () => crmProv.fetchLeads(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.person_add_alt_1_rounded, color: Colors.white),
        label: Text('New Lead', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, color: Colors.white)),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const CreateLeadScreen()),
          );
        },
      ),
      body: RefreshIndicator(
        onRefresh: () => crmProv.fetchLeads(),
        color: AppColors.primary,
        child: crmProv.isLoading && crmProv.leads.isEmpty
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : crmProv.leads.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    itemCount: crmProv.leads.length,
                    itemBuilder: (context, index) {
                      final lead = crmProv.leads[index];
                      return _buildLeadCard(lead);
                    },
                  ),
      ),
    );
  }

  Widget _buildLeadCard(lead) {
    final dateStr = lead.eventDate != null ? DateFormat('dd MMM yyyy').format(lead.eventDate!) : 'Date TBD';

    return NeuCard(
      margin: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  lead.clientName,
                  style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800),
                ),
              ),
              NeuPill(
                text: lead.stage.replaceAll('_', ' '),
                color: AppColors.primary.withOpacity(0.12),
                textColor: AppColors.primary,
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.phone_outlined, size: 13, color: AppColors.textMuted),
              const SizedBox(width: 5),
              Text(lead.clientPhone, style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted)),
              const SizedBox(width: 14),
              const Icon(Icons.celebration_outlined, size: 13, color: AppColors.textMuted),
              const SizedBox(width: 5),
              Text(lead.eventType, style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted)),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: AppColors.border),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Budget: ₹${lead.estimatedBudgetInr.toInt()}',
                style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.success),
              ),
              NeuButton(
                text: 'WhatsApp Quote',
                height: 36,
                isPrimary: true,
                onPressed: () => _openWhatsAppQuote(lead.clientName, lead.clientPhone, lead.estimatedBudgetInr),
                icon: const Icon(Icons.chat_bubble_outline_rounded, size: 14, color: Colors.white),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.contact_mail_outlined, size: 48, color: AppColors.textMuted),
            const SizedBox(height: 16),
            Text('No CRM Leads Recorded', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text('Add customer inquiries to track deals and send instant WhatsApp quotes.', textAlign: TextAlign.center, style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted)),
            const SizedBox(height: 20),
            NeuButton(
              text: 'Add First Lead',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CreateLeadScreen()),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
