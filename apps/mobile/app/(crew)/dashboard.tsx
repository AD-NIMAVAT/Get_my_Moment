import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Alert, Image 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../src/theme/colors';
import { NeuCard } from '../../src/components/NeuCard';
import { NeuButton } from '../../src/components/NeuButton';
import { NeuHeader } from '../../src/components/NeuHeader';
import { mobileApi, CrewAssignedEvent } from '../../src/lib/api';
import { 
  Clapperboard, Calendar, MapPin, CheckCircle2, 
  UploadCloud, QrCode, LogOut, Camera, ArrowRight, 
  Clock, IndianRupee, ShieldCheck 
} from 'lucide-react-native';

export default function CrewDashboardScreen() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<CrewAssignedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingEventId, setUploadingEventId] = useState<string | null>(null);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const data = await mobileApi.getCrewAssignments();
      setAssignments(data);
    } catch (err: any) {
      Alert.alert('Session Ended', 'Please enter your mobile number again.');
      router.replace('/(auth)/crew-login');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAssignments();
  };

  const handleLogout = () => {
    mobileApi.setCrewPhone(null);
    mobileApi.setToken(null);
    router.replace('/');
  };

  // Field Photo Ingest by Crew Member
  const handleFieldUpload = async (assignment: CrewAssignedEvent) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.85,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploadingEventId(assignment.event_id);
      const uris = result.assets.map((a) => a.uri);

      const res = await mobileApi.crewUploadPhotos(
        assignment.event_id,
        uris,
        `${assignment.role} (${mobileApi.getCrewPhone()})`
      );

      Alert.alert('Upload Successful! 📸', `${res.uploaded_count} photos uploaded and queued for AI face indexing.`);
      loadAssignments();
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Could not upload photos from field.');
    } finally {
      setUploadingEventId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <NeuHeader
        title="My Assigned Duties"
        subtitle={`Crew Phone: ${mobileApi.getCrewPhone() || 'Staff'}`}
        rightIcon={<LogOut size={16} color={Colors.rose} />}
        onRightPress={handleLogout}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />}
      >
        {/* Crew Summary Card */}
        <NeuCard elevated style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.iconCircle}>
              <Clapperboard size={22} color={Colors.cyan} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.summaryTitle}>Field Staff Portal</Text>
              <Text style={styles.summarySubtitle}>
                {assignments.length} Events Assigned by your Studios
              </Text>
            </View>
          </View>
        </NeuCard>

        {/* Assignments List */}
        {loading && !refreshing ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={Colors.cyan} />
            <Text style={styles.loadingText}>Loading assigned duties...</Text>
          </View>
        ) : assignments.length === 0 ? (
          <NeuCard style={{ padding: 30, alignItems: 'center', marginTop: 14 }}>
            <Calendar size={32} color={Colors.textMuted} />
            <Text style={[styles.eventTitle, { marginTop: 10 }]}>No Assigned Events</Text>
            <Text style={[styles.studioSubtitle, { textAlign: 'center', marginTop: 4 }]}>
              You do not have any active duties assigned under this phone number.
            </Text>
          </NeuCard>
        ) : (
          <View style={styles.eventsList}>
            {assignments.map((item) => (
              <NeuCard elevated key={item.crew_id} style={styles.assignmentCard}>
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventTitle}>{item.event_name}</Text>
                    <Text style={styles.studioSubtitle}>Studio: {item.studio_name}</Text>
                  </View>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{item.role}</Text>
                  </View>
                </View>

                {/* Event Date & Payout */}
                <View style={styles.infoRow}>
                  {item.event_date && (
                    <View style={styles.infoItem}>
                      <Calendar size={13} color={Colors.textSecondary} />
                      <Text style={styles.infoText}>
                        {new Date(item.event_date).toLocaleDateString(undefined, {
                          weekday: 'short', month: 'short', day: 'numeric'
                        })}
                      </Text>
                    </View>
                  )}
                  {item.payout_inr > 0 && (
                    <View style={styles.infoItem}>
                      <IndianRupee size={13} color={item.payout_status === 'PAID' ? Colors.emerald : Colors.gold} />
                      <Text style={[
                        styles.infoText, 
                        { color: item.payout_status === 'PAID' ? Colors.emerald : Colors.gold, fontWeight: '800' }
                      ]}>
                        ₹{item.payout_inr.toLocaleString()} ({item.payout_status})
                      </Text>
                    </View>
                  )}
                </View>

                {/* Ceremonies Timeline */}
                {item.ceremonies && item.ceremonies.length > 0 && (
                  <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>Ceremony Call Sheet & Venues:</Text>
                    {item.ceremonies.map((c) => (
                      <View key={c.id} style={styles.ceremonyRow}>
                        <Clock size={12} color={Colors.primary} />
                        <Text style={styles.ceremonyName}>{c.name}</Text>
                        {c.venue && (
                          <View style={styles.venueBadge}>
                            <MapPin size={10} color={Colors.textSecondary} />
                            <Text style={styles.venueText} numberOfLines={1}>{c.venue}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}

                {/* Tasks List */}
                {item.tasks && item.tasks.length > 0 && (
                  <View style={styles.sectionBox}>
                    <Text style={styles.sectionTitle}>Assigned Tasks & Checklist:</Text>
                    {item.tasks.map((t) => (
                      <View key={t.id} style={styles.taskRow}>
                        <CheckCircle2 size={13} color={t.is_completed ? Colors.emerald : Colors.textMuted} />
                        <Text style={[styles.taskText, t.is_completed && styles.taskCompleted]}>
                          {t.title}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Field Actions */}
                <View style={styles.actionsRow}>
                  <NeuButton
                    title={uploadingEventId === item.event_id ? 'Uploading...' : 'Field Upload Photos'}
                    onPress={() => handleFieldUpload(item)}
                    loading={uploadingEventId === item.event_id}
                    icon={<Camera size={14} color={Colors.white} />}
                    style={{ flex: 1, height: 44 }}
                    textStyle={{ fontSize: 11 }}
                  />

                  <TouchableOpacity
                    onPress={() => router.push(`/(guest)/${item.access_token}`)}
                    style={styles.qrBtn}
                  >
                    <QrCode size={16} color={Colors.text} />
                  </TouchableOpacity>
                </View>
              </NeuCard>
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
  summaryCard: {
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  summarySubtitle: {
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
  eventsList: {
    gap: 16,
  },
  assignmentCard: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
  },
  studioSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.cyan,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#E8E4DD',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  infoText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  sectionBox: {
    backgroundColor: Colors.surfaceInset,
    borderRadius: 14,
    padding: 12,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  ceremonyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  ceremonyName: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  venueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 130,
  },
  venueText: {
    fontSize: 9,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  taskText: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '600',
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  qrBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
});
