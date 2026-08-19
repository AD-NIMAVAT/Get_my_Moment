import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:share_plus/share_plus.dart';
import '../../constants/theme.dart';
import '../../providers/event_provider.dart';
import '../../widgets/neomorphic_widgets.dart';
import 'photo_upload_screen.dart';

class EventDetailScreen extends StatefulWidget {
  final String eventId;
  const EventDetailScreen({Key? key, required this.eventId}) : super(key: key);

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<EventProvider>(context, listen: false).selectEvent(widget.eventId);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showQrDialog(String accessToken, String eventName) {
    final qrUrl = 'http://192.168.1.98:3000/e/$accessToken'; // Web guest URL

    showDialog(
      context: context,
      builder: (ctx) {
        return Dialog(
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Guest QR Portal',
                  style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 6),
                Text(
                  'Guests scan this QR code on table tents for AI face match.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted),
                ),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: AppShadows.neuElevatedSm,
                  ),
                  child: QrImageView(
                    data: qrUrl,
                    version: QrVersions.auto,
                    size: 180,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'Token: $accessToken',
                  style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textMuted),
                ),
                const SizedBox(height: 24),
                NeuButton(
                  text: 'Share Guest Link',
                  width: double.infinity,
                  onPressed: () {
                    Share.share('Find your photos instantly from $eventName: $qrUrl');
                  },
                  icon: const Icon(Icons.share_rounded, size: 18, color: Colors.white),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final eventProv = Provider.of<EventProvider>(context);
    final ev = eventProv.selectedEvent;

    if (eventProv.isLoading && ev == null) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    if (ev == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(),
        body: const Center(child: Text('Event details not available')),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(ev.name, style: GoogleFonts.outfit(fontWeight: FontWeight.w800, fontSize: 18)),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_2_rounded, color: AppColors.primary),
            onPressed: () => _showQrDialog(ev.accessToken, ev.name),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_a_photo_rounded, color: Colors.white),
        label: Text('Upload Photos', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, color: Colors.white)),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => PhotoUploadScreen(eventId: ev.id)),
          );
        },
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Top Overview Card
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: NeuCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              ev.venue ?? 'Venue TBD',
                              style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textDark),
                            ),
                            Text(
                              ev.city ?? 'Location TBD',
                              style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted),
                            ),
                          ],
                        ),
                        NeuPill(
                          text: '${ev.photoCount} Photos',
                          color: AppColors.primary.withOpacity(0.12),
                          textColor: AppColors.primary,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Divider(height: 1, color: AppColors.border),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildQuickMetric('Guests Scanned', '${ev.guestCount}'),
                        _buildQuickMetric('AI Engine', 'SFace 128-d'),
                        _buildQuickMetric('FTP Port', '2121 Sync'),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Tab Bar
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(16),
              ),
              child: TabBar(
                controller: _tabController,
                indicator: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(16),
                ),
                indicatorSize: TabBarIndicatorSize.tab,
                labelColor: Colors.white,
                unselectedLabelColor: AppColors.textMuted,
                labelStyle: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, fontSize: 13),
                tabs: const [
                  Tab(text: 'Photos Gallery'),
                  Tab(text: 'Guest QR & Share'),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Tab Views
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  // TAB 1: Photos Grid
                  eventProv.eventPhotos.isEmpty
                      ? _buildNoPhotosState(ev.id)
                      : GridView.builder(
                          padding: const EdgeInsets.all(20),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            crossAxisSpacing: 8,
                            mainAxisSpacing: 8,
                          ),
                          itemCount: eventProv.eventPhotos.length,
                          itemBuilder: (context, index) {
                            final p = eventProv.eventPhotos[index];
                            return Container(
                              decoration: BoxDecoration(
                                color: AppColors.card,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.border),
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: const Center(
                                  child: Icon(Icons.image_outlined, color: AppColors.textMuted),
                                ),
                              ),
                            );
                          },
                        ),

                  // TAB 2: Guest QR
                  Padding(
                    padding: const EdgeInsets.all(24),
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              boxShadow: AppShadows.neuElevated,
                            ),
                            child: QrImageView(
                              data: 'http://192.168.1.98:3000/e/${ev.accessToken}',
                              version: QrVersions.auto,
                              size: 200,
                            ),
                          ),
                          const SizedBox(height: 20),
                          Text(
                            'Scan to Open Event AI Kiosk',
                            style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Guests can also upload their live shots directly to your studio gallery.',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickMetric(String title, String val) {
    return Column(
      children: [
        Text(val, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textDark)),
        Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.textMuted)),
      ],
    );
  }

  Widget _buildNoPhotosState(String eventId) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.photo_album_outlined, size: 48, color: AppColors.textMuted),
          const SizedBox(height: 12),
          Text(
            'No Photos Ingested',
            style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            'Upload batch photos or connect Sony/Canon camera via FTP (port 2121).',
            textAlign: TextAlign.center,
            style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted),
          ),
          const SizedBox(height: 20),
          NeuButton(
            text: 'Pick Photos from Device',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => PhotoUploadScreen(eventId: eventId)),
              );
            },
          ),
        ],
      ),
    );
  }
}
