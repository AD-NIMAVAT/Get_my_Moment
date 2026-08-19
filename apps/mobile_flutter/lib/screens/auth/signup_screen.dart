import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../constants/theme.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/neomorphic_widgets.dart';
import '../main_navigation_screen.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({Key? key}) : super(key: key);

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  int _currentStep = 1;

  // Step 1: Account
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _studioNameController = TextEditingController();
  final _phoneController = TextEditingController();

  // Step 2: KYC & Details
  final _cityController = TextEditingController();
  final _stateController = TextEditingController();
  final _gstController = TextEditingController();
  String _yearsOfExp = '3 - 5 Years (Established Pro)';

  final List<String> _expOptions = [
    '1 - 2 Years (Emerging Studio)',
    '3 - 5 Years (Established Pro)',
    '5 - 10 Years (Senior Studio Leader)',
    '10+ Years (Master Veteran)',
  ];

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _studioNameController.dispose();
    _phoneController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _gstController.dispose();
    super.dispose();
  }

  void _handleNext() {
    if (_studioNameController.text.trim().isEmpty) {
      _showSnack('Please enter your Studio / Brand Name');
      return;
    }
    if (_emailController.text.trim().isEmpty || _passwordController.text.isEmpty) {
      _showSnack('Please enter your email and password');
      return;
    }
    if (_passwordController.text.length < 8) {
      _showSnack('Password must be at least 8 characters long');
      return;
    }
    setState(() => _currentStep = 2);
  }

  Future<void> _handleCompleteSignup() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.signup(
      email: _emailController.text.trim(),
      password: _passwordController.text,
      studioName: _studioNameController.text.trim(),
      phone: _phoneController.text.trim().isNotEmpty ? _phoneController.text.trim() : null,
      city: _cityController.text.trim().isNotEmpty ? _cityController.text.trim() : null,
      state: _stateController.text.trim().isNotEmpty ? _stateController.text.trim() : null,
      yearsOfExperience: _yearsOfExp,
      specializations: 'Wedding & Pre-Wedding, Candid Photography',
      gstNumber: _gstController.text.trim().isNotEmpty ? _gstController.text.trim() : null,
    );

    if (!mounted) return;
    if (success) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (_) => const MainNavigationScreen()),
        (route) => false,
      );
    } else {
      _showSnack(auth.errorMessage ?? 'Signup failed');
    }
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), backgroundColor: AppColors.danger),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Register Studio', style: GoogleFonts.outfit(fontWeight: FontWeight.w800)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () {
            if (_currentStep == 2) {
              setState(() => _currentStep = 1);
            } else {
              Navigator.pop(context);
            }
          },
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Step Indicators
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  NeuPill(
                    text: '1. Account',
                    color: _currentStep == 1 ? AppColors.primary.withOpacity(0.2) : AppColors.card,
                    textColor: _currentStep == 1 ? AppColors.primary : AppColors.textMuted,
                  ),
                  const SizedBox(width: 8),
                  const Icon(Icons.arrow_forward_rounded, size: 14, color: AppColors.textSubtle),
                  const SizedBox(width: 8),
                  NeuPill(
                    text: '2. Studio KYC',
                    color: _currentStep == 2 ? AppColors.primary.withOpacity(0.2) : AppColors.card,
                    textColor: _currentStep == 2 ? AppColors.primary : AppColors.textMuted,
                  ),
                ],
              ),
              const SizedBox(height: 24),

              if (_currentStep == 1) ...[
                // STEP 1 FORM
                NeuCard(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      NeuInput(
                        label: 'Studio / Brand Name *',
                        hintText: 'e.g. Luminary Moments Wedding Studio',
                        controller: _studioNameController,
                        prefixIcon: const Icon(Icons.business_rounded, size: 20, color: AppColors.primary),
                      ),
                      const SizedBox(height: 16),
                      NeuInput(
                        label: 'Owner Email Address *',
                        hintText: 'contact@luminarystudio.in',
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        prefixIcon: const Icon(Icons.mail_outline_rounded, size: 20, color: AppColors.primary),
                      ),
                      const SizedBox(height: 16),
                      NeuInput(
                        label: 'Password (Min 8 characters) *',
                        hintText: '••••••••',
                        controller: _passwordController,
                        obscureText: true,
                        prefixIcon: const Icon(Icons.lock_outline_rounded, size: 20, color: AppColors.primary),
                      ),
                      const SizedBox(height: 16),
                      NeuInput(
                        label: 'WhatsApp / Mobile Number',
                        hintText: '+91 98765 43210',
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        prefixIcon: const Icon(Icons.phone_outlined, size: 20, color: AppColors.primary),
                      ),
                      const SizedBox(height: 24),
                      NeuButton(
                        text: 'Next: Studio KYC Profile',
                        width: double.infinity,
                        onPressed: _handleNext,
                        icon: const Icon(Icons.arrow_forward_rounded, size: 18, color: Colors.white),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                // STEP 2 FORM
                NeuCard(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      NeuInput(
                        label: 'City / Location',
                        hintText: 'e.g. Surat / Ahmedabad',
                        controller: _cityController,
                        prefixIcon: const Icon(Icons.location_on_outlined, size: 20, color: AppColors.primary),
                      ),
                      const SizedBox(height: 16),
                      NeuInput(
                        label: 'State',
                        hintText: 'e.g. Gujarat',
                        controller: _stateController,
                        prefixIcon: const Icon(Icons.map_outlined, size: 20, color: AppColors.primary),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Years of Experience',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textDark,
                        ),
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
                            value: _yearsOfExp,
                            items: _expOptions.map((e) {
                              return DropdownMenuItem(value: e, child: Text(e, style: const TextStyle(fontSize: 13)));
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => _yearsOfExp = val);
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      NeuInput(
                        label: 'GST Number (Optional)',
                        hintText: 'e.g. 24ABCDE1234F1Z5',
                        controller: _gstController,
                        prefixIcon: const Icon(Icons.receipt_long_outlined, size: 20, color: AppColors.primary),
                      ),
                      const SizedBox(height: 24),
                      NeuButton(
                        text: 'Complete Registration & Start Trial',
                        isLoading: auth.isLoading,
                        width: double.infinity,
                        onPressed: _handleCompleteSignup,
                        icon: const Icon(Icons.check_circle_outline_rounded, size: 18, color: Colors.white),
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
