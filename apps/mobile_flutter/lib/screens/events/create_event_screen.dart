import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../constants/theme.dart';
import '../../providers/event_provider.dart';
import '../../widgets/neomorphic_widgets.dart';

class CreateEventScreen extends StatefulWidget {
  const CreateEventScreen({Key? key}) : super(key: key);

  @override
  State<CreateEventScreen> createState() => _CreateEventScreenState();
}

class _CreateEventScreenState extends State<CreateEventScreen> {
  final _nameController = TextEditingController();
  final _clientNameController = TextEditingController();
  final _clientPhoneController = TextEditingController();
  final _venueController = TextEditingController();
  final _cityController = TextEditingController();
  final _packageAmountController = TextEditingController();
  bool _allowGuestUploads = true;
  DateTime _selectedDate = DateTime.now().add(const Duration(days: 14));

  @override
  void dispose() {
    _nameController.dispose();
    _clientNameController.dispose();
    _clientPhoneController.dispose();
    _venueController.dispose();
    _cityController.dispose();
    _packageAmountController.dispose();
    super.dispose();
  }

  Future<void> _handleCreate() async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter an event name')),
      );
      return;
    }

    final packageAmount = double.tryParse(_packageAmountController.text.trim()) ?? 0.0;

    final eventProv = Provider.of<EventProvider>(context, listen: false);
    final success = await eventProv.createEvent(
      name: name,
      eventDate: _selectedDate,
      clientName: _clientNameController.text.trim().isNotEmpty ? _clientNameController.text.trim() : null,
      clientPhone: _clientPhoneController.text.trim().isNotEmpty ? _clientPhoneController.text.trim() : null,
      venue: _venueController.text.trim().isNotEmpty ? _venueController.text.trim() : null,
      city: _cityController.text.trim().isNotEmpty ? _cityController.text.trim() : null,
      packageAmountInr: packageAmount,
      allowGuestUploads: _allowGuestUploads,
    );

    if (!mounted) return;
    if (success) {
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(eventProv.errorMessage ?? 'Failed to create event'),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final eventProv = Provider.of<EventProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Create New Event', style: GoogleFonts.outfit(fontWeight: FontWeight.w800)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            children: [
              NeuCard(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    NeuInput(
                      label: 'Event / Wedding Title *',
                      hintText: 'e.g. Rohan & Priyal Destination Wedding',
                      controller: _nameController,
                      prefixIcon: const Icon(Icons.celebration_outlined, size: 20, color: AppColors.primary),
                    ),
                    const SizedBox(height: 16),
                    NeuInput(
                      label: 'Client / Couple Name',
                      hintText: 'e.g. Rohan & Priyal',
                      controller: _clientNameController,
                      prefixIcon: const Icon(Icons.person_outline_rounded, size: 20, color: AppColors.primary),
                    ),
                    const SizedBox(height: 16),
                    NeuInput(
                      label: 'Client WhatsApp Number',
                      hintText: '+91 98765 43210',
                      controller: _clientPhoneController,
                      keyboardType: TextInputType.phone,
                      prefixIcon: const Icon(Icons.phone_outlined, size: 20, color: AppColors.primary),
                    ),
                    const SizedBox(height: 16),
                    NeuInput(
                      label: 'Venue Name',
                      hintText: 'e.g. The Leela Palace, Udaipur',
                      controller: _venueController,
                      prefixIcon: const Icon(Icons.business_outlined, size: 20, color: AppColors.primary),
                    ),
                    const SizedBox(height: 16),
                    NeuInput(
                      label: 'City / Location',
                      hintText: 'e.g. Udaipur / Surat',
                      controller: _cityController,
                      prefixIcon: const Icon(Icons.location_on_outlined, size: 20, color: AppColors.primary),
                    ),
                    const SizedBox(height: 16),
                    NeuInput(
                      label: 'Package Contract Amount (INR)',
                      hintText: 'e.g. 250000',
                      controller: _packageAmountController,
                      keyboardType: TextInputType.number,
                      prefixIcon: const Icon(Icons.currency_rupee_rounded, size: 20, color: AppColors.primary),
                    ),
                    const SizedBox(height: 20),

                    // Allow guest uploads switch
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Guest Live Uploads',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textDark,
                              ),
                            ),
                            Text(
                              'Allow guests to contribute candid photos',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 11,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                        Switch(
                          value: _allowGuestUploads,
                          activeColor: AppColors.primary,
                          onChanged: (val) => setState(() => _allowGuestUploads = val),
                        ),
                      ],
                    ),

                    const SizedBox(height: 28),
                    NeuButton(
                      text: 'Launch Event Command Center',
                      isLoading: eventProv.isLoading,
                      width: double.infinity,
                      onPressed: _handleCreate,
                      icon: const Icon(Icons.rocket_launch_outlined, size: 18, color: Colors.white),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
