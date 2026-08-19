import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:share_plus/share_plus.dart';
import '../../constants/theme.dart';
import '../../providers/guest_provider.dart';
import '../../widgets/neomorphic_widgets.dart';

class GuestSelfieMatchScreen extends StatefulWidget {
  const GuestSelfieMatchScreen({Key? key}) : super(key: key);

  @override
  State<GuestSelfieMatchScreen> createState() => _GuestSelfieMatchScreenState();
}

class _GuestSelfieMatchScreenState extends State<GuestSelfieMatchScreen> {
  File? _selfieFile;
  final ImagePicker _picker = ImagePicker();

  Future<void> _captureSelfie() async {
    final picked = await _picker.pickImage(
      source: ImageSource.camera,
      preferredCameraDevice: CameraDevice.front,
      imageQuality: 85,
    );

    if (picked != null) {
      setState(() => _selfieFile = File(picked.path));
      _runAiMatch();
    }
  }

  Future<void> _pickFromGallery() async {
    final picked = await _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 85,
    );

    if (picked != null) {
      setState(() => _selfieFile = File(picked.path));
      _runAiMatch();
    }
  }

  Future<void> _runAiMatch() async {
    if (_selfieFile == null) return;
    final guestProv = Provider.of<GuestProvider>(context, listen: false);
    await guestProv.searchWithSelfie(_selfieFile!);
  }

  @override
  Widget build(BuildContext context) {
    final guestProv = Provider.of<GuestProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text('Your Matched Photos', style: GoogleFonts.outfit(fontWeight: FontWeight.w800)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: _selfieFile == null
            ? _buildSelfieCapturePrompt()
            : guestProv.isSearching
                ? _buildSearchingState()
                : _buildMatchedResults(guestProv),
      ),
    );
  }

  Widget _buildSelfieCapturePrompt() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: AppColors.card,
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.primary, width: 2),
                boxShadow: AppShadows.neuElevated,
              ),
              child: const Icon(Icons.face_retouching_natural_rounded, size: 56, color: AppColors.primary),
            ),
            const SizedBox(height: 24),
            Text(
              'Take a Quick Selfie',
              style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Text(
              'Our ONNX AI model (YuNet + SFace) will scan the entire event album and find every photo you appear in within 50 milliseconds.',
              textAlign: TextAlign.center,
              style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted, height: 1.4),
            ),
            const SizedBox(height: 32),
            NeuButton(
              text: 'Open Front Camera',
              width: double.infinity,
              onPressed: _captureSelfie,
              icon: const Icon(Icons.camera_alt_rounded, size: 20, color: Colors.white),
            ),
            const SizedBox(height: 12),
            NeuButton(
              text: 'Choose from Gallery',
              isPrimary: false,
              width: double.infinity,
              onPressed: _pickFromGallery,
              icon: const Icon(Icons.photo_library_outlined, size: 20, color: AppColors.textDark),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchingState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 50,
            height: 50,
            child: CircularProgressIndicator(color: AppColors.primary, strokeWidth: 3),
          ),
          const SizedBox(height: 24),
          Text(
            'Analyzing Facial Vectors...',
            style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            'Computing 128-d cosine similarity embeddings',
            style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }

  Widget _buildMatchedResults(GuestProvider guestProv) {
    if (guestProv.matchedPhotos.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.search_off_rounded, size: 52, color: AppColors.textMuted),
              const SizedBox(height: 16),
              Text(
                'No Direct Matches Found',
                style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 6),
              Text(
                'Try taking another selfie with clear lighting or check back once the studio finishes uploading all ceremony shots.',
                textAlign: TextAlign.center,
                style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted),
              ),
              const SizedBox(height: 20),
              NeuButton(
                text: 'Retake Selfie',
                onPressed: _captureSelfie,
                icon: const Icon(Icons.refresh_rounded, size: 18, color: Colors.white),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Found ${guestProv.matchedPhotos.length} Photos of You',
                style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w800),
              ),
              NeuPill(
                text: 'Sub-50ms Match',
                color: AppColors.success.withOpacity(0.15),
                textColor: AppColors.success,
              ),
            ],
          ),
        ),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.all(16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.85,
            ),
            itemCount: guestProv.matchedPhotos.length,
            itemBuilder: (context, index) {
              final photo = guestProv.matchedPhotos[index];
              return NeuCard(
                padding: EdgeInsets.zero,
                child: Column(
                  children: [
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                        ),
                        child: const Center(
                          child: Icon(Icons.image_outlined, size: 40, color: AppColors.textMuted),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(8),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            '${(photo.confidenceScore * 100).toInt()}% Match',
                            style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.success),
                          ),
                          IconButton(
                            icon: const Icon(Icons.share_outlined, size: 18, color: AppColors.primary),
                            onPressed: () {
                              Share.share('Check out my wedding photo from Get My Moment!');
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
