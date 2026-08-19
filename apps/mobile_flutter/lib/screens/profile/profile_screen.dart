import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../constants/theme.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../widgets/neomorphic_widgets.dart';
import '../auth/login_screen.dart';
import 'support_ticket_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final ImagePicker _picker = ImagePicker();

  Future<void> _uploadStudioLogo() async {
    final picked = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 90);
    if (picked != null) {
      try {
        await ApiService.uploadLogo(File(picked.path));
        final auth = Provider.of<AuthProvider>(context, listen: false);
        await auth.refreshProfile();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Studio logo updated successfully!'), backgroundColor: AppColors.success),
        );
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to upload logo: $e'), backgroundColor: AppColors.danger),
        );
      }
    }
  }

  void _openWhatsAppVIPSupport() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final user = auth.currentUser;
    final studioName = user?.studioName ?? 'Partner Studio';
    final plan = user?.subscriptionPlan ?? 'PRO';

    final text = Uri.encodeComponent(
      'Hello Get My Moment Support Team! I need priority assistance for my Studio ($studioName, Plan: $plan).',
    );
    final url = Uri.parse('https://wa.me/919876543210?text=$text');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final user = auth.currentUser;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Studio Identity & Settings', style: GoogleFonts.outfit(fontWeight: FontWeight.w800, fontSize: 18)),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            children: [
              // Studio Header Card
              NeuCard(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    Stack(
                      alignment: Alignment.bottomRight,
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: AppColors.card,
                            shape: BoxShape.circle,
                            border: Border.all(color: AppColors.primary, width: 2),
                            boxShadow: AppShadows.neuElevatedSm,
                          ),
                          child: const Icon(Icons.business_rounded, size: 40, color: AppColors.primary),
                        ),
                        GestureDetector(
                          onTap: _uploadStudioLogo,
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: const BoxDecoration(
                              color: AppColors.primary,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.camera_alt_rounded, size: 14, color: Colors.white),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      user?.studioName ?? 'Aurora Cinematic Studios',
                      style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textDark),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      user?.email ?? 'contact@studio.in',
                      style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted),
                    ),
                    const SizedBox(height: 12),
                    NeuPill(
                      text: user?.subscriptionPlan ?? 'STUDIO_OS VIP',
                      color: AppColors.primary.withOpacity(0.15),
                      textColor: AppColors.primary,
                      icon: Icons.workspace_premium_rounded,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Studio Actions Menu
              NeuCard(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Column(
                  children: [
                    _buildMenuItem(
                      Icons.support_agent_rounded,
                      'In-App Studio Helpdesk',
                      'Submit technical tickets & feature requests',
                      () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const SupportTicketScreen()),
                        );
                      },
                    ),
                    const Divider(height: 1, color: AppColors.border),
                    _buildMenuItem(
                      Icons.chat_bubble_outline_rounded,
                      '1-Click VIP WhatsApp Support',
                      'Direct chat with developer engineering team',
                      _openWhatsAppVIPSupport,
                    ),
                    const Divider(height: 1, color: AppColors.border),
                    _buildMenuItem(
                      Icons.verified_user_outlined,
                      'KYC & Verification Status',
                      user?.verificationStatus ?? 'VERIFIED_ACTIVE',
                      () {},
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Logout Button
              NeuButton(
                text: 'Sign Out of Studio OS',
                isPrimary: false,
                width: double.infinity,
                onPressed: () async {
                  await auth.logout();
                  if (!mounted) return;
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                    (route) => false,
                  );
                },
                icon: const Icon(Icons.logout_rounded, size: 18, color: AppColors.danger),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMenuItem(IconData icon, String title, String subtitle, VoidCallback onTap) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppColors.primary.withOpacity(0.12),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: AppColors.primary, size: 20),
      ),
      title: Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textDark)),
      subtitle: Text(subtitle, style: GoogleFonts.plusJakartaSans(fontSize: 11, color: AppColors.textMuted)),
      trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: AppColors.textMuted),
      onTap: onTap,
    );
  }
}
