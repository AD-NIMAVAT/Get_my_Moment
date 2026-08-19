import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { NeuCard } from '../../src/components/NeuCard';
import { NeuButton } from '../../src/components/NeuButton';
import { NeuHeader } from '../../src/components/NeuHeader';
import { mobileApi, EventItem } from '../../src/lib/api';
import { 
  Camera, QrCode, Users, Layers, Sparkles, Plus, 
  Calendar, ArrowRight, LogOut, UploadCloud, 
  IndianRupee, HardDrive 
} from 'lucide-react-native';

export default function StudioDashboardScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const list = await mobileApi.getEvents();
      setEvents(list);
    } catch (err: any) {
      Alert.alert('Session / Connection', err.message || 'Please log in again');
      router.replace('/(auth)/login');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const handleLogout = () => {
    mobileApi.setToken(null);
    router.replace('/');
  };

  const totalPhotos = events.reduce((acc, e) => acc + (e.photo_count || 0), 0);
  const totalGuests = events.reduce((acc, e) => acc + (e.guest_count || 0), 0);
  const totalRevenue = events.reduce((acc, e) => acc + (e.package_amount_inr || 0), 0);
  const estimatedStorageGb = ((totalPhotos * 3.5) / 1024).toFixed(1);

  return (
    <SafeAreaView style={styles.container}>
      <NeuHeader
        title="Studio Command Center"
        subtitle="Business Operating System"
        rightIcon={<LogOut size={16} color={Colors.rose} />}
        onRightPress={handleLogout}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
      >
        {/* Create Event Action Button */}
        <NeuButton
          title="Create New Wedding Event"
          onPress={() => router.push('/(studio)/create-event')}
          icon={<Plus size={18} color={Colors.white} />}
          style={styles.createBtn}
        />

        {/* Studio Telemetry Cards */}
        <View style={styles.metricsRow}>
          <NeuCard style={styles.metricBox}>
            <Text style={styles.metricLabel}>EVENTS</Text>
            <Text style={styles.metricValue}>{events.length}</Text>
          </NeuCard>

          <NeuCard style={styles.metricBox}>
            <Text style={styles.metricLabel}>INDEXED</Text>
            <Text style={[styles.metricValue, { color: Colors.primary }]}>{totalPhotos}</Text>
          </NeuCard>

          <NeuCard style={styles.metricBox}>
            <Text style={styles.metricLabel}>GUESTS</Text>
            <Text style={[styles.metricValue, { color: Colors.emerald }]}>{totalGuests}</Text>
          </NeuCard>
        </View>

        {/* Revenue & Storage Bar */}
        <NeuCard elevated style={styles.storageCard}>
          <View style={styles.storageRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.storageTitle}>Studio Cloud Storage</Text>
              <Text style={styles.storageSub}>{estimatedStorageGb} GB used of 100 GB High-Speed AI Vault</Text>
            </View>
            <HardDrive size={22} color={Colors.primary} />
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(100, (parseFloat(estimatedStorageGb) / 100) * 100)}%` }]} />
          </View>
        </NeuCard>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Studio Events</Text>
          <Text style={styles.sectionSubtitle}>Tap an event to access photo ingest, guest uploads, CRM & crew</Text>
        </View>

        {/* Events List */}
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading studio events...</Text>
          </View>
        ) : events.length === 0 ? (
          <NeuCard style={{ padding: 30, alignItems: 'center' }}>
            <Calendar size={32} color={Colors.textMuted} />
            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>No Events Created Yet</Text>
            <Text style={[styles.sectionSubtitle, { textAlign: 'center', marginTop: 4 }]}>
              Tap the button above to create your first wedding event gallery!
            </Text>
          </NeuCard>
        ) : (
          <View style={styles.eventList}>
            {events.map((ev) => (
              <TouchableOpacity
                key={ev.id}
                activeOpacity={0.8}
                onPress={() => router.push(`/(studio)/events/${ev.id}`)}
              >
                <NeuCard elevated style={styles.eventCard}>
                  <View style={styles.eventCardHeader}>
                    <View style={styles.eventNameContainer}>
                      <Text style={styles.eventName}>{ev.name}</Text>
                      {ev.event_date && (
                        <Text style={styles.eventDate}>
                          {new Date(ev.event_date).toLocaleDateString(undefined, {
                            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                          })}
                        </Text>
                      )}
                    </View>
                    <View style={[
                      styles.statusPill, 
                      { backgroundColor: ev.status === 'ACTIVE' ? '#EBF7F0' : '#FEF8EC' }
                    ]}>
                      <Text style={[
                        styles.statusText, 
                        { color: ev.status === 'ACTIVE' ? Colors.emerald : Colors.gold }
                      ]}>
                        {ev.status}
                      </Text>
                    </View>
                  </View>

                  {/* Event Mini Stats */}
                  <View style={styles.eventStatsRow}>
                    <View style={styles.statItem}>
                      <Camera size={13} color={Colors.primary} />
                      <Text style={styles.statText}>{ev.photo_count || 0} Photos</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Users size={13} color={Colors.emerald} />
                      <Text style={styles.statText}>{ev.guest_count || 0} Guests</Text>
                    </View>
                    <View style={styles.statItem}>
                      <UploadCloud size={13} color={ev.allow_guest_uploads ? Colors.cyan : Colors.textMuted} />
                      <Text style={[styles.statText, { color: ev.allow_guest_uploads ? Colors.cyan : Colors.textMuted }]}>
                        {ev.allow_guest_uploads ? 'Uploads ON' : 'Uploads OFF'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.manageText}>Open 7-Tab Command Center</Text>
                    <ArrowRight size={14} color={Colors.primary} />
                  </View>
                </NeuCard>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  createBtn: {
    marginBottom: 16,
    height: 52,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricBox: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.text,
    marginTop: 4,
  },
  storageCard: {
    padding: 16,
    marginBottom: 20,
  },
  storageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  storageTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
  storageSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceInset,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  centerBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 10,
  },
  eventList: {
    gap: 14,
  },
  eventCard: {
    padding: 16,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventNameContainer: {
    flex: 1,
    paddingRight: 10,
  },
  eventName: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  eventDate: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  eventStatsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#E8E4DD',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#E8E4DD',
  },
  manageText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
});
