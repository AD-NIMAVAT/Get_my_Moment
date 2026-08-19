import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../constants/theme.dart';
import '../../services/api_service.dart';
import '../../widgets/neomorphic_widgets.dart';

class SupportTicketScreen extends StatefulWidget {
  const SupportTicketScreen({Key? key}) : super(key: key);

  @override
  State<SupportTicketScreen> createState() => _SupportTicketScreenState();
}

class _SupportTicketScreenState extends State<SupportTicketScreen> {
  final _subjectController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _category = 'AI_FACE_SEARCH';
  String _urgency = 'NORMAL';
  bool _isSubmitting = false;

  final List<String> _categories = [
    'AI_FACE_SEARCH',
    'CAMERA_FTP_SYNC',
    'GST_INVOICE_BILLING',
    'GUEST_PORTAL_ISSUE',
    'FEATURE_REQUEST',
    'OTHER'
  ];

  final List<String> _urgencies = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

  @override
  void dispose() {
    _subjectController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final subject = _subjectController.text.trim();
    final description = _descriptionController.text.trim();

    if (subject.isEmpty || description.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter ticket subject and description')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final res = await ApiService.submitSupportTicket(
        category: _category,
        urgency: _urgency,
        subject: subject,
        description: description,
      );

      setState(() => _isSubmitting = false);
      if (!mounted) return;

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Ticket Logged!', style: GoogleFonts.outfit(fontWeight: FontWeight.w800)),
          content: Text(
            'Your support ticket (${res['ticket_id']}) has been dispatched to engineering. We will follow up immediately via WhatsApp.',
            style: GoogleFonts.plusJakartaSans(fontSize: 12),
          ),
          actions: [
            NeuButton(
              text: 'Done',
              onPressed: () {
                Navigator.pop(ctx);
                Navigator.pop(context);
              },
            ),
          ],
        ),
      );
    } catch (e) {
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to submit ticket: $e'), backgroundColor: AppColors.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('In-App Studio Helpdesk', style: GoogleFonts.outfit(fontWeight: FontWeight.w800, fontSize: 18)),
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
                Text(
                  'Issue Category',
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
                      value: _category,
                      items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c.replaceAll('_', ' '), style: const TextStyle(fontSize: 13)))).toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _category = val);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                Text(
                  'Urgency Level',
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
                      value: _urgency,
                      items: _urgencies.map((u) => DropdownMenuItem(value: u, child: Text(u, style: const TextStyle(fontSize: 13)))).toList(),
                      onChanged: (val) {
                        if (val != null) setState(() => _urgency = val);
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                NeuInput(
                  label: 'Subject / Summary *',
                  hintText: 'e.g. Question regarding face search accuracy in low light',
                  controller: _subjectController,
                  prefixIcon: const Icon(Icons.title_rounded, size: 20, color: AppColors.primary),
                ),
                const SizedBox(height: 16),

                NeuInput(
                  label: 'Detailed Description *',
                  hintText: 'Please describe the steps or issue in detail...',
                  controller: _descriptionController,
                  maxLines: 4,
                ),
                const SizedBox(height: 24),

                NeuButton(
                  text: 'Submit VIP Support Ticket',
                  isLoading: _isSubmitting,
                  width: double.infinity,
                  onPressed: _handleSubmit,
                  icon: const Icon(Icons.send_rounded, size: 18, color: Colors.white),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
