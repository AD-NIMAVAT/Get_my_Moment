import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../constants/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/event_provider.dart';
import '../../widgets/neomorphic_widgets.dart';
import 'create_event_screen.dart';
import 'event_detail_screen.dart';

class EventsListScreen extends StatefulWidget {
  const EventsListScreen({Key? key}) : super(key: key);

  @override
  State<EventsListScreen> createState() => _EventsListScreenState();
}

class _EventsListScreenState extends State<EventsListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<EventProvider>(context, listen: false).fetchEvents();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final eventProv = Provider.of<EventProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              auth.currentUser?.studioName ?? 'Get My Moment',
              style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800),
            ),
            Text(
              'WEDDING & EVENT COMMAND CENTER',
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
            onPressed: () => eventProv.fetchEvents(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppColors.primary,
        elevation: 4,
        icon: const Icon(Icons.add_rounded, color: Colors.white),
        label: Text(
          'New Event',
          style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, color: Colors.white),
        ),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const CreateEventScreen()),
          );
        },
      ),
      body: RefreshIndicator(
        onRefresh: () => eventProv.fetchEvents(),
        color: AppColors.primary,
        child: eventProv.isLoading && eventProv.events.isEmpty
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : eventProv.events.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    itemCount: eventProv.events.length,
                    itemBuilder: (context, index) {
                      final ev = eventProv.events[index];
                      return _buildEventCard(ev);
                    },
                  ),
      ),
    );
  }

  Widget _buildEventCard(ev) {
    final dateStr = ev.eventDate != null ? DateFormat('dd MMM yyyy').format(ev.eventDate!) : 'Date TBD';

    return NeuCard(
      margin: const EdgeInsets.only(bottom: 16),
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => EventDetailScreen(eventId: ev.id)),
        );
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  ev.name,
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textDark,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              NeuPill(
                text: ev.status,
                color: ev.status == 'ACTIVE' ? AppColors.success.withOpacity(0.15) : AppColors.card,
                textColor: ev.status == 'ACTIVE' ? AppColors.success : AppColors.textMuted,
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Details Row
          Row(
            children: [
              const Icon(Icons.calendar_today_rounded, size: 13, color: AppColors.primary),
              const SizedBox(width: 5),
              Text(
                dateStr,
                style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMuted),
              ),
              if (ev.city != null) ...[
                const SizedBox(width: 14),
                const Icon(Icons.location_on_outlined, size: 14, color: AppColors.primary),
                const SizedBox(width: 4),
                Text(
                  ev.city!,
                  style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textMuted),
                ),
              ],
            ],
          ),
          const SizedBox(height: 14),
          const Divider(height: 1, color: AppColors.border),
          const SizedBox(height: 12),

          // Bottom Stats Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  _buildStatBadge(Icons.photo_library_outlined, '${ev.photoCount} Photos'),
                  const SizedBox(width: 10),
                  _buildStatBadge(Icons.people_outline_rounded, '${ev.guestCount} Guests'),
                ],
              ),
              const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.primary),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatBadge(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: AppColors.textDark),
          const SizedBox(width: 4),
          Text(
            text,
            style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textDark),
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
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.card,
                shape: BoxShape.circle,
                boxShadow: AppShadows.neuElevatedSm,
              ),
              child: const Icon(Icons.photo_camera_back_outlined, size: 48, color: AppColors.primary),
            ),
            const SizedBox(height: 20),
            Text(
              'No Events Yet',
              style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textDark),
            ),
            const SizedBox(height: 6),
            Text(
              'Create your first wedding or corporate shoot to start AI photo delivery.',
              textAlign: TextAlign.center,
              style: GoogleFonts.plusJakartaSans(fontSize: 12, color: AppColors.textMuted),
            ),
            const SizedBox(height: 24),
            NeuButton(
              text: 'Create New Event',
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CreateEventScreen()),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
