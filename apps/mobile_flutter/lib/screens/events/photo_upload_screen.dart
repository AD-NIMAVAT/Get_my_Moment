import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../../constants/theme.dart';
import '../../providers/event_provider.dart';
import '../../widgets/neomorphic_widgets.dart';

class PhotoUploadScreen extends StatefulWidget {
  final String eventId;
  const PhotoUploadScreen({Key? key, required this.eventId}) : super(key: key);

  @override
  State<PhotoUploadScreen> createState() => _PhotoUploadScreenState();
}

class _PhotoUploadScreenState extends State<PhotoUploadScreen> {
  final List<File> _selectedFiles = [];
  final ImagePicker _picker = ImagePicker();

  Future<void> _pickImages() async {
    final pickedList = await _picker.pickMultiImage(imageQuality: 85);
    if (pickedList.isNotEmpty) {
      setState(() {
        _selectedFiles.addAll(pickedList.map((x) => File(x.path)));
      });
    }
  }

  Future<void> _handleUpload() async {
    if (_selectedFiles.isEmpty) return;

    final eventProv = Provider.of<EventProvider>(context, listen: false);
    final success = await eventProv.uploadPhotos(widget.eventId, _selectedFiles);

    if (!mounted) return;
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Successfully uploaded ${_selectedFiles.length} photos!'),
          backgroundColor: AppColors.success,
        ),
      );
      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(eventProv.errorMessage ?? 'Upload failed'),
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
        title: Text('Upload Event Photos', style: GoogleFonts.outfit(fontWeight: FontWeight.w800)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          child: NeuButton(
            text: _selectedFiles.isEmpty
                ? 'Select Photos from Gallery'
                : 'Upload ${_selectedFiles.length} Photos & Trigger AI',
            isLoading: eventProv.isUploading,
            width: double.infinity,
            onPressed: _selectedFiles.isEmpty ? _pickImages : _handleUpload,
            icon: Icon(
              _selectedFiles.isEmpty ? Icons.photo_library_outlined : Icons.cloud_upload_outlined,
              size: 20,
              color: Colors.white,
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: _selectedFiles.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          shape: BoxShape.circle,
                          boxShadow: AppShadows.neuElevatedSm,
                        ),
                        child: const Icon(Icons.add_photo_alternate_outlined, size: 52, color: AppColors.primary),
                      ),
                      const SizedBox(height: 20),
                      Text(
                        'Select High-Res Photos',
                        style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'FastAPI backend will automatically detect faces (YuNet) and generate 128-d biometric embeddings (SFace).',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted),
                      ),
                      const SizedBox(height: 24),
                      NeuButton(
                        text: 'Pick Photos',
                        onPressed: _pickImages,
                        icon: const Icon(Icons.photo_library_outlined, size: 18, color: Colors.white),
                      ),
                    ],
                  ),
                ),
              )
            : GridView.builder(
                padding: const EdgeInsets.all(16),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  crossAxisSpacing: 10,
                  mainAxisSpacing: 10,
                ),
                itemCount: _selectedFiles.length,
                itemBuilder: (context, index) {
                  final file = _selectedFiles[index];
                  return Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: Image.file(
                          file,
                          width: double.infinity,
                          height: double.infinity,
                          fit: BoxFit.cover,
                        ),
                      ),
                      Positioned(
                        top: 4,
                        right: 4,
                        child: GestureDetector(
                          onTap: () => setState(() => _selectedFiles.removeAt(index)),
                          child: Container(
                            padding: const EdgeInsets.all(4),
                            decoration: const BoxDecoration(
                              color: Colors.black54,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.close_rounded, size: 14, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
      ),
    );
  }
}
