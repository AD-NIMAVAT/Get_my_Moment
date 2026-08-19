import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../constants/theme.dart';
import '../../providers/guest_provider.dart';
import '../../widgets/neomorphic_widgets.dart';
import 'guest_selfie_match_screen.dart';

class GuestPortalScreen extends StatefulWidget {
  const GuestPortalScreen({Key? key}) : super(key: key);

  @override
  State<GuestPortalScreen> createState() => _GuestPortalScreenState();
}

class _GuestPortalScreenState extends State<GuestPortalScreen> {
  final _tokenController = TextEditingController();
  final _nameController = TextEditingController();
  final _mobileController = TextEditingController();
  bool _faceConsent = true;
  int _step = 1; // 1: Token, 2: Registration & Biometric Consent

  @override
  void dispose() {
    _tokenController.dispose();
    _nameController.dispose();
    _mobileController.dispose();
    super.dispose();
  }

  Future<void> _handleFindEvent() async {
    final token = _tokenController.text.trim();
    if (token.isEmpty) {
      _showSnack('Please enter or scan an event code');
      return;
    }

    final guestProv = Provider.of<GuestProvider>(context, listen: false);
    final success = await guestProv.loadEventByToken(token);

    if (!mounted) return;
    if (success) {
      setState(() => _step = 2);
    } else {
      _showSnack(guestProv.errorMessage ?? 'Event not found');
    }
  }

  Future<void> _handleRegisterAndProceed() async {
    final name = _nameController.text.trim();
    final mobile = _mobileController.text.trim();

    if (name.isEmpty || mobile.isEmpty) {
      _showSnack('Please enter your name and mobile number');
      return;
    }

    if (!_faceConsent) {
      _showSnack('Facial search consent is required for AI photo delivery');
      return;
    }

    final guestProv = Provider.of<GuestProvider>(context, listen: false);
    final success = await guestProv.registerGuest(name, mobile);

    if (!mounted) return;
    if (success) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const GuestSelfieMatchScreen()),
      );
    } else {
      _showSnack(guestProv.errorMessage ?? 'Registration failed');
    }
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.danger),
    );
  }

  @override
  Widget build(BuildContext context) {
    final guestProv = Provider.of<GuestProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Guest AI Portal', style: GoogleFonts.outfit(fontWeight: FontWeight.w800)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () {
            if (_step == 2) {
              setState(() => _step = 1);
            } else {
              Navigator.pop(context);
            }
          },
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Column(
            children: [
              if (_step == 1) ...[
                // STEP 1: EVENT TOKEN
                Center(
                  child: Container(
                    width: 70,
                    height: 70,
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      shape: BoxShape.circle,
                      boxShadow: AppShadows.neuElevatedSm,
                    ),
                    child: const Icon(Icons.qr_code_scanner_rounded, size: 36, color: AppColors.primary),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Enter Event Access Code',
                  style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 6),
                Text(
                  'Find the 12-character token printed on the table tent or invitation.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted),
                ),
                const SizedBox(height: 28),
                NeuCard(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      NeuInput(
                        label: 'Event Code / Access Token *',
                        hintText: 'e.g. JYpyr2WB9bDl',
                        controller: _tokenController,
                        prefixIcon: const Icon(Icons.vpn_key_outlined, size: 20, color: AppColors.primary),
                      ),
                      const SizedBox(height: 24),
                      NeuButton(
                        text: 'Find My Event Photos',
                        isLoading: guestProv.isLoading,
                        width: double.infinity,
                        onPressed: _handleFindEvent,
                        icon: const Icon(Icons.search_rounded, size: 18, color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                // STEP 2: GUEST REGISTRATION & PRIVACY CONSENT
                if (guestProv.publicEvent != null) ...[
                  NeuCard(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.celebration_rounded, color: AppColors.primary),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                guestProv.publicEvent!.name,
                                style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w800),
                              ),
                              Text(
                                guestProv.publicEvent!.studioName ?? 'Verified Studio Partner',
                                style: GoogleFonts.plusJakartaSans(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                NeuCard(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Guest Details',
                        style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 16),
                      NeuInput(
                        label: 'Your Full Name *',
                        hintText: 'e.g. Kavita Sharma',
                        controller: _nameController,
                        prefixIcon: const Icon(Icons.person_outline_rounded, size: 20, color: AppColors.primary),
                      ),
                      const SizedBox(height: 16),
                      NeuInput(
                        label: 'Mobile Number *',
                        hintText: '9876543210',
                        controller: _mobileController,
                        keyboardType: TextInputType.phone,
                        prefixIcon: const Icon(Icons.phone_outlined, size: 20, color: AppColors.primary),
                      ),
                      const SizedBox(height: 20),

                      // Biometric Consent Box
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.background,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Checkbox(
                              value: _faceConsent,
                              activeColor: AppColors.primary,
                              onChanged: (val) => setState(() => _faceConsent = val ?? false),
                            ),
                            Expanded(
                              child: Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Text(
                                  'I explicitly consent to Get My Moment extracting temporary 128-d biometric facial vectors solely to match my photos from this event.',
                                  style: GoogleFonts.plusJakartaSans(fontSize: 11, color: AppColors.textDark, height: 1.4),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 24),
                      NeuButton(
                        text: 'Continue to Selfie Capture',
                        isLoading: guestProv.isLoading,
                        width: double.infinity,
                        onPressed: _handleRegisterAndProceed,
                        icon: const Icon(Icons.camera_front_rounded, size: 18, color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
