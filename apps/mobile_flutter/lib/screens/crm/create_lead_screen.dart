import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../constants/theme.dart';
import '../../providers/crm_finance_provider.dart';
import '../../widgets/neomorphic_widgets.dart';

class CreateLeadScreen extends StatefulWidget {
  const CreateLeadScreen({Key? key}) : super(key: key);

  @override
  State<CreateLeadScreen> createState() => _CreateLeadScreenState();
}

class _CreateLeadScreenState extends State<CreateLeadScreen> {
  final _clientNameController = TextEditingController();
  final _clientPhoneController = TextEditingController();
  final _clientEmailController = TextEditingController();
  final _venueCityController = TextEditingController();
  final _budgetController = TextEditingController();
  final _notesController = TextEditingController();
  String _eventType = 'Wedding';

  final List<String> _eventTypes = ['Wedding', 'Pre-Wedding', 'Reception', 'Corporate Shoot', 'Birthday', 'Baby Shower'];

  @override
  void dispose() {
    _clientNameController.dispose();
    _clientPhoneController.dispose();
    _clientEmailController.dispose();
    _venueCityController.dispose();
    _budgetController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    final name = _clientNameController.text.trim();
    final phone = _clientPhoneController.text.trim();

    if (name.isEmpty || phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter client name and phone number')),
      );
      return;
    }

    final budget = double.tryParse(_budgetController.text.trim()) ?? 0.0;
    final crmProv = Provider.of<CrmFinanceProvider>(context, listen: false);

    final success = await crmProv.createLead(
      clientName: name,
      clientPhone: phone,
      clientEmail: _clientEmailController.text.trim().isNotEmpty ? _clientEmailController.text.trim() : null,
      eventType: _eventType,
      venueCity: _venueCityController.text.trim().isNotEmpty ? _venueCityController.text.trim() : null,
      estimatedBudgetInr: budget,
      notes: _notesController.text.trim().isNotEmpty ? _notesController.text.trim() : null,
    );

    if (!mounted) return;
    if (success) {
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(crmProv.errorMessage ?? 'Failed to save lead'), backgroundColor: AppColors.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final crmProv = Provider.of<CrmFinanceProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Add New CRM Lead', style: GoogleFonts.outfit(fontWeight: FontWeight.w800)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: NeuCard(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                NeuInput(
                  label: 'Client / Couple Name *',
                  hintText: 'e.g. Anand & Ritu Wedding',
                  controller: _clientNameController,
                  prefixIcon: const Icon(Icons.person_outline_rounded, size: 20, color: AppColors.primary),
                ),
                const SizedBox(height: 16),
                NeuInput(
                  label: 'WhatsApp Mobile Number *',
                  hintText: '+91 98250 12345',
                  controller: _clientPhoneController,
                  keyboardType: TextInputType.phone,
                  prefixIcon: const Icon(Icons.phone_outlined, size: 20, color: AppColors.primary),
                ),
                const SizedBox(height: 16),
                NeuInput(
                  label: 'Client Email Address',
                  hintText: 'anand.ritu@wedding.in',
                  controller: _clientEmailController,
                  keyboardType: TextInputType.emailAddress,
                  prefixIcon: const Icon(Icons.mail_outline_rounded, size: 20, color: AppColors.primary),
                ),
                const SizedBox(height: 16),
                Text(
                  'Event Type',
                  style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textDark),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: _eventType,
                      items: _eventTypes.map((e) => DropdownMenuItem(value: e, child: Text(e, style: const TextStyle(fontSize: 13)))).toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _eventType = val);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                NeuInput(
                  label: 'Estimated Budget (INR)',
                  hintText: 'e.g. 150000',
                  controller: _budgetController,
                  keyboardType: TextInputType.number,
                  prefixIcon: const Icon(Icons.currency_rupee_rounded, size: 20, color: AppColors.primary),
                ),
                const SizedBox(height: 16),
                NeuInput(
                  label: 'City / Venue',
                  hintText: 'e.g. Surat, Gujarat',
                  controller: _venueCityController,
                  prefixIcon: const Icon(Icons.location_on_outlined, size: 20, color: AppColors.primary),
                ),
                const SizedBox(height: 24),
                NeuButton(
                  text: 'Save Inquiry to Pipeline',
                  isLoading: crmProv.isLoading,
                  width: double.infinity,
                  onPressed: _handleSave,
                  icon: const Icon(Icons.save_outlined, size: 18, color: Colors.white),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
