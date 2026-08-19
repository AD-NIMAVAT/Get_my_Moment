import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, 
  ActivityIndicator, Alert, Linking, Dimensions, Platform, FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../../src/theme/colors';
import { NeuCard } from '../../../src/components/NeuCard';
import { NeuButton } from '../../../src/components/NeuButton';
import { NeuHeader } from '../../../src/components/NeuHeader';
import { 
  mobileApi, EventItem, PhotoItem, GuestUploadsReportResponse, 
  CrmLeadItem, FinanceSummary, OperationsSummary 
} from '../../../src/lib/api';
import { 
  Camera, QrCode, UploadCloud, Users, ArrowLeft, 
  ExternalLink, Phone, CheckCircle2, MessageSquare, 
  Download, Sparkles, IndianRupee, Clock, MapPin, 
  Check, HardDrive, Share2, Wifi, Radio, RefreshCw 
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMB_SIZE = (SCREEN_WIDTH - 56) / 3;

type TabKey = 'OVERVIEW' | 'WIRELESS' | 'GALLERY' | 'GUEST_UPLOADS' | 'CRM' | 'FINANCE' | 'CREW' | 'QR';

export default function EventCommandCenterScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [activeTab, setActiveTab] = useState<TabKey>('OVERVIEW');
  const [event, setEvent] = useState<EventItem | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [guestReport, setGuestReport] = useState<GuestUploadsReportResponse | null>(null);
  const [leads, setLeads] = useState<CrmLeadItem[]>([]);
  const [finance, setFinance] = useState<FinanceSummary | null>(null);
  const [operations, setOperations] = useState<OperationsSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [relayingPhotos, setRelayingPhotos] = useState(false);
  const [wirelessCreds, setWirelessCreds] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadAllEventData();
      loadWirelessCredentials();
    }
  }, [id]);

  // Real-Time Live Wireless Camera Ingestion Poller (every 3 seconds)
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(async () => {
      try {
        const latestPhotos = await mobileApi.getEventPhotos(id);
        setPhotos(prev => {
          if (latestPhotos.length !== prev.length) {
            return latestPhotos;
          }
          return prev;
        });
      } catch (e) {
        // silent polling catch
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [id]);

  const loadWirelessCredentials = async () => {
    try {
      const creds = await mobileApi.getWirelessCredentials(id);
      setWirelessCreds(creds);
    } catch (e) {
      // fallback
    }
  };

  const loadAllEventData = async () => {
    try {
      setLoading(true);
      const [evData, photosData, reportData, leadsData, finData, opsData] = await Promise.all([
        mobileApi.getEvent(id),
        mobileApi.getEventPhotos(id).catch(() => []),
        mobileApi.getGuestUploadsReport(id).catch(() => null),
        mobileApi.getEventLeads(id).catch(() => []),
        mobileApi.getEventFinance(id).catch(() => null),
        mobileApi.getEventOperations(id).catch(() => null),
      ]);

      setEvent(evData);
      setPhotos(photosData);
      setGuestReport(reportData);
      setLeads(leadsData);
      setFinance(finData);
      setOperations(opsData);
    } catch (err: any) {
      Alert.alert('Event Error', err.message || 'Could not load event data');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Guest Uploads Toggle
  const handleToggleUploads = async () => {
    try {
      setToggling(true);
      const res = await mobileApi.toggleGuestUploads(id);
      if (event) setEvent({ ...event, allow_guest_uploads: res.allow_guest_uploads });
      if (guestReport) setGuestReport({ ...guestReport, allow_guest_uploads: res.allow_guest_uploads });
      Alert.alert('Permission Updated', res.message);
    } catch (err: any) {
      Alert.alert('Toggle Error', err.message || 'Failed to update permissions');
    } finally {
      setToggling(false);
    }
  };

  // Batch Photo Ingest
  const handleUploadPhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.85,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploadingPhotos(true);
      const uris = result.assets.map((a) => a.uri);
      const res = await mobileApi.uploadEventPhotos(id, uris);

      Alert.alert('Photos Uploaded! 🚀', `${res.uploaded_count} photos queued for 128-d AI facial recognition indexing.`);
      loadAllEventData();
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Failed to upload photos');
    } finally {
      setUploadingPhotos(false);
    }
  };

  // Pocket Mobile 5G Field Relay (direct camera sync)
  const handlePocketRelay = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.95,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setRelayingPhotos(true);
        const uris = result.assets.map(a => a.uri);
        const res = await mobileApi.wirelessHttpIngest(id, uris, 'Pocket Mobile 5G Field Relay');
        Alert.alert('📡 Wireless Relay Success', `Directly ingested ${res.uploaded_count} photos from camera! AI Face indexing is active.`);
        loadAllEventData();
      }
    } catch (err: any) {
      Alert.alert('Relay Error', err.message || 'Failed to relay wireless photos');
    } finally {
      setRelayingPhotos(false);
    }
  };

  const handlePhotoClick = (p: PhotoItem) => {
    Alert.alert(
      p.original_file_name,
      `Faces Detected: ${p.faces_detected_count} | Size: ${(p.file_size / (1024 * 1024)).toFixed(2)} MB`,
      [
        {
          text: '📥 Download HD Photo',
          onPress: () => {
            Linking.openURL(mobileApi.getDownloadUrl(p.id)).catch(() => {
              Alert.alert('Download Error', 'Could not open download link');
            });
          }
        },
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  // WhatsApp 1-Click Automation
  const sendWhatsApp = (phone: string, message: string) => {
    const clean = phone.replace(/[^0-9]/g, '');
    const url = `whatsapp://send?phone=${clean}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp Error', 'Could not open WhatsApp on this device.');
    });
  };

  if (loading || !event) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading Command Center...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <NeuHeader
        title={event.name}
        subtitle="Event Command Center"
        leftIcon={<ArrowLeft size={18} color={Colors.text} />}
        onLeftPress={() => router.back()}
      />

      {/* 8-Tab Navigation Bar */}
      <View style={styles.tabScrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          <TouchableOpacity onPress={() => setActiveTab('OVERVIEW')} style={[styles.navTab, activeTab === 'OVERVIEW' && styles.navTabActive]}>
            <Text style={[styles.navTabText, activeTab === 'OVERVIEW' && styles.navTabTextActive]}>Overview</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTab('WIRELESS')} style={[styles.navTab, activeTab === 'WIRELESS' && styles.navTabActive]}>
            <Text style={[styles.navTabText, activeTab === 'WIRELESS' && styles.navTabTextActive]}>📡 Wi-Fi Cam</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTab('GALLERY')} style={[styles.navTab, activeTab === 'GALLERY' && styles.navTabActive]}>
            <Text style={[styles.navTabText, activeTab === 'GALLERY' && styles.navTabTextActive]}>Gallery ({photos.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTab('GUEST_UPLOADS')} style={[styles.navTab, activeTab === 'GUEST_UPLOADS' && styles.navTabActive]}>
            <Text style={[styles.navTabText, activeTab === 'GUEST_UPLOADS' && styles.navTabTextActive]}>Guest Uploads ({guestReport?.total_guest_photos || 0})</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTab('CRM')} style={[styles.navTab, activeTab === 'CRM' && styles.navTabActive]}>
            <Text style={[styles.navTabText, activeTab === 'CRM' && styles.navTabTextActive]}>CRM Leads ({leads.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTab('FINANCE')} style={[styles.navTab, activeTab === 'FINANCE' && styles.navTabActive]}>
            <Text style={[styles.navTabText, activeTab === 'FINANCE' && styles.navTabTextActive]}>Financials</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTab('CREW')} style={[styles.navTab, activeTab === 'CREW' && styles.navTabActive]}>
            <Text style={[styles.navTabText, activeTab === 'CREW' && styles.navTabTextActive]}>Operations & Crew</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setActiveTab('QR')} style={[styles.navTab, activeTab === 'QR' && styles.navTabActive]}>
            <Text style={[styles.navTabText, activeTab === 'QR' && styles.navTabTextActive]}>QR Standee</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <View style={{ gap: 14 }}>
            <NeuCard elevated style={styles.card}>
              <Text style={styles.cardSectionTitle}>Live Event Telemetry</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCell}>
                  <Text style={styles.statCellLabel}>INDEXED PHOTOS</Text>
                  <Text style={[styles.statCellValue, { color: Colors.primary }]}>{photos.length}</Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statCellLabel}>GUEST SEARCHES</Text>
                  <Text style={[styles.statCellValue, { color: Colors.emerald }]}>{event.guest_count}</Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statCellLabel}>GUEST UPLOADS</Text>
                  <Text style={[styles.statCellValue, { color: Colors.cyan }]}>
                    {guestReport?.total_guest_photos || 0}
                  </Text>
                </View>
              </View>
            </NeuCard>

            <NeuCard style={styles.card}>
              <Text style={styles.cardSectionTitle}>Quick Actions</Text>
              <NeuButton
                title="📡 Connect Wireless Camera (Wi-Fi)"
                onPress={() => setActiveTab('WIRELESS')}
                icon={<Wifi size={16} color={Colors.white} />}
                style={{ marginTop: 10, marginBottom: 10 }}
              />
              <NeuButton
                title="Preview Wedding Guest Experience"
                onPress={() => router.push(`/(guest)/${event.access_token}`)}
                icon={<ExternalLink size={16} color={Colors.white} />}
                style={{ marginBottom: 10 }}
              />
              <NeuButton
                title="Batch Upload Event Photos"
                variant="secondary"
                onPress={handleUploadPhotos}
                loading={uploadingPhotos}
                icon={<Camera size={16} color={Colors.text} />}
              />
            </NeuCard>
          </View>
        )}

        {/* TAB: WIRELESS WI-FI CAMERA INGEST */}
        {activeTab === 'WIRELESS' && (
          <View style={{ gap: 14 }}>
            <NeuCard elevated style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#3FA66B', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                  <Wifi size={18} color={Colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardSectionTitle}>Wireless Camera Live Sync</Text>
                  <Text style={styles.toggleDesc}>Cable-Free Sony / Canon / Nikon Ingest</Text>
                </View>
              </View>

              <View style={{ backgroundColor: '#EBE8E1', borderRadius: 14, padding: 14, gap: 8, marginBottom: 14 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.text }}>FTP Host: <Text style={{ color: Colors.primary }}>192.168.31.37</Text></Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.text }}>Port: <Text style={{ color: Colors.primary }}>2121</Text></Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.text }}>Username: <Text style={{ color: Colors.primary }}>camera</Text></Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.text }}>Password: <Text style={{ color: Colors.primary }}>shoot123</Text></Text>
              </View>

              <NeuButton
                title={relayingPhotos ? 'Streaming Wireless Photos...' : '⚡ Pocket 5G Field Relay Ingest'}
                onPress={handlePocketRelay}
                loading={relayingPhotos}
                icon={<Radio size={16} color={Colors.white} />}
              />
            </NeuCard>

            <NeuCard style={styles.card}>
              <Text style={styles.cardSectionTitle}>📸 Camera Menu Setup Guide</Text>
              <Text style={[styles.toggleDesc, { marginTop: 6, lineHeight: 18 }]}>
                • <Text style={{ fontWeight: '700', color: Colors.text }}>Sony Alpha:</Text> Menu → Network → FTP Transfer → Set Server 1 to Host 192.168.31.37, Port 2121, User camera, Pass shoot123. Turn Auto FTP ON.{'\n\n'}
                • <Text style={{ fontWeight: '700', color: Colors.text }}>Canon EOS:</Text> Menu → Communication → FTP transfer → Create Connection → Host 192.168.31.37, Port 2121. Turn Auto Transfer ON.{'\n\n'}
                • <Text style={{ fontWeight: '700', color: Colors.text }}>Nikon Z:</Text> Menu → Connect to PC / FTP → Add profile → Host 192.168.31.37, Port 2121. Turn Auto Send ON.
              </Text>
            </NeuCard>
          </View>
        )}

        {/* TAB 2: PHOTO GALLERY & INGEST */}
        {activeTab === 'GALLERY' && (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <NeuButton
                  title={uploadingPhotos ? 'Uploading...' : 'Upload Photos'}
                  onPress={handleUploadPhotos}
                  loading={uploadingPhotos}
                  icon={<UploadCloud size={16} color={Colors.white} />}
                />
              </View>
              {photos.length > 0 && (
                <View style={{ flex: 1 }}>
                  <NeuButton
                    title="📥 All (.ZIP)"
                    variant="secondary"
                    onPress={() => {
                      Linking.openURL(mobileApi.getDownloadAllZipUrl(id, 'studio')).catch(() => {
                        Alert.alert('Download Error', 'Could not open download link');
                      });
                    }}
                    icon={<Download size={16} color={Colors.text} />}
                  />
                </View>
              )}
            </View>

            {photos.length === 0 ? (
              <NeuCard style={{ padding: 30, alignItems: 'center' }}>
                <Camera size={32} color={Colors.textMuted} />
                <Text style={[styles.cardSectionTitle, { marginTop: 10 }]}>No Photos Uploaded</Text>
                <Text style={[styles.toggleDesc, { textAlign: 'center', marginTop: 4 }]}>
                  Upload high-res event photos to enable instant 128-d AI facial recognition matching for guests.
                </Text>
              </NeuCard>
            ) : (
              <View style={styles.photoGrid}>
                {photos.map((p) => (
                  <TouchableOpacity key={p.id} onPress={() => handlePhotoClick(p)} style={styles.photoBox}>
                    <Image source={{ uri: mobileApi.getThumbnailUrl(p.id) }} style={styles.photoImg} />
                    {p.faces_detected_count > 0 && (
                      <View style={styles.facesBadge}>
                        <Sparkles size={9} color={Colors.white} />
                        <Text style={styles.facesText}>{p.faces_detected_count}</Text>
                      </View>
                    )}
                    <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.6)', padding: 3, borderRadius: 6 }}>
                      <Download size={10} color={Colors.white} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 3: GUEST UPLOADS INSPECTOR */}
        {activeTab === 'GUEST_UPLOADS' && (
          <View style={{ gap: 14 }}>
            <NeuCard elevated style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.cardSectionTitle}>Guest Uploads Permission</Text>
                  <Text style={styles.toggleDesc}>
                    {event.allow_guest_uploads
                      ? '🟢 ENABLED: Guests can upload photos from QR standee.'
                      : '🔴 DISABLED: Guest uploads are blocked.'}
                  </Text>
                </View>
                <NeuButton
                  title={event.allow_guest_uploads ? 'Disable' : 'Enable'}
                  variant={event.allow_guest_uploads ? 'danger' : 'primary'}
                  onPress={handleToggleUploads}
                  loading={toggling}
                  style={{ height: 40, paddingHorizontal: 16 }}
                  textStyle={{ fontSize: 12 }}
                />
              </View>
            </NeuCard>

            {(!guestReport || guestReport.contributors.length === 0) ? (
              <NeuCard style={{ padding: 30, alignItems: 'center' }}>
                <UploadCloud size={32} color={Colors.textMuted} />
                <Text style={[styles.cardSectionTitle, { marginTop: 10 }]}>No Guest Uploads Yet</Text>
                <Text style={[styles.toggleDesc, { textAlign: 'center', marginTop: 4 }]}>
                  When guests upload candid photos via QR link, their names, numbers, and clicks will show here.
                </Text>
              </NeuCard>
            ) : (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.sectionHeading}>
                    Contributors ({guestReport.contributors_count} Guests)
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Linking.openURL(mobileApi.getDownloadAllZipUrl(id, 'guest')).catch(() => {
                        Alert.alert('Download Error', 'Could not open download link');
                      });
                    }}
                    style={{ backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  >
                    <Download size={12} color={Colors.white} />
                    <Text style={{ color: Colors.white, fontSize: 11, fontWeight: '700' }}>All Guest (.ZIP)</Text>
                  </TouchableOpacity>
                </View>
                {guestReport.contributors.map((c, idx) => (
                  <NeuCard key={idx} style={styles.contributorCard}>
                    <View style={styles.contributorHeader}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{c.guest_name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.contributorName}>{c.guest_name}</Text>
                        {c.guest_phone && c.guest_phone !== 'N/A' && (
                          <Text style={styles.contributorPhone}>📞 {c.guest_phone}</Text>
                        )}
                      </View>
                      <View style={styles.countBadge}>
                        <Text style={styles.countText}>{c.photo_count} Photos</Text>
                      </View>
                    </View>
                    <View style={styles.thumbGrid}>
                      {c.photos.map((p) => (
                        <TouchableOpacity key={p.id} onPress={() => handlePhotoClick(p)} style={styles.thumbBox}>
                          <Image source={{ uri: mobileApi.getThumbnailUrl(p.id) }} style={styles.thumbImage} />
                          <View style={{ position: 'absolute', bottom: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.6)', padding: 2, borderRadius: 4 }}>
                            <Download size={8} color={Colors.white} />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </NeuCard>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 4: CRM LEADS & WHATSAPP AUTOMATION */}
        {activeTab === 'CRM' && (
          <View style={{ gap: 14 }}>
            <NeuCard elevated style={styles.card}>
              <Text style={styles.cardSectionTitle}>Captured Guest Leads ({leads.length})</Text>
              <Text style={styles.toggleDesc}>
                Guests who registered to find their photos. Trigger 1-Click WhatsApp follow-ups below:
              </Text>
            </NeuCard>

            {leads.length === 0 ? (
              <NeuCard style={{ padding: 30, alignItems: 'center' }}>
                <Users size={32} color={Colors.textMuted} />
                <Text style={[styles.cardSectionTitle, { marginTop: 10 }]}>No Leads Captured Yet</Text>
                <Text style={[styles.toggleDesc, { textAlign: 'center', marginTop: 4 }]}>
                  When guests search their selfies, their verified WhatsApp numbers will automatically populate here.
                </Text>
              </NeuCard>
            ) : (
              leads.map((l) => (
                <NeuCard key={l.id} style={styles.leadCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={styles.leadName}>{l.name}</Text>
                      <Text style={styles.leadPhone}>📞 {l.phone}</Text>
                      <Text style={styles.leadMatches}>{l.matches_found_count} Matched Photos Found</Text>
                    </View>
                  </View>

                  {/* 1-Tap WhatsApp Actions */}
                  <View style={styles.leadActionsRow}>
                    <TouchableOpacity
                      onPress={() => sendWhatsApp(l.phone, `Hi ${l.name}! Thanks for attending ${event.name}. Here is your private AI gallery: getmymoment://e/${event.access_token}`)}
                      style={styles.whatsAppBtn}
                    >
                      <MessageSquare size={12} color={Colors.emerald} />
                      <Text style={styles.whatsAppBtnText}>Gallery Link</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => sendWhatsApp(l.phone, `Hi ${l.name}! Liked the photos from ${event.name}? Book your upcoming family event with us for premium live AI coverage!`)}
                      style={styles.whatsAppBtn}
                    >
                      <Sparkles size={12} color={Colors.gold} />
                      <Text style={styles.whatsAppBtnText}>Pitch Studio</Text>
                    </TouchableOpacity>
                  </View>
                </NeuCard>
              ))
            )}
          </View>
        )}

        {/* TAB 5: FINANCIALS */}
        {activeTab === 'FINANCE' && (
          <View style={{ gap: 14 }}>
            <NeuCard elevated style={styles.card}>
              <Text style={styles.cardSectionTitle}>Event Budget & Payments</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCell}>
                  <Text style={styles.statCellLabel}>PACKAGE</Text>
                  <Text style={[styles.statCellValue, { color: Colors.text }]}>
                    ₹{(finance?.package_amount_inr || event.package_amount_inr || 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statCellLabel}>RECEIVED</Text>
                  <Text style={[styles.statCellValue, { color: Colors.emerald }]}>
                    ₹{(finance?.total_received_inr || 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.statCell}>
                  <Text style={styles.statCellLabel}>BALANCE</Text>
                  <Text style={[styles.statCellValue, { color: Colors.rose }]}>
                    ₹{(finance?.balance_remaining_inr || event.package_amount_inr || 0).toLocaleString()}
                  </Text>
                </View>
              </View>
            </NeuCard>

            {event.client_phone && (
              <NeuButton
                title="Send WhatsApp Payment Reminder to Client"
                variant="secondary"
                onPress={() => sendWhatsApp(event.client_phone!, `Hello ${event.client_name || 'Client'}! This is a reminder regarding the pending milestone payment for ${event.name}. Thank you!`)}
                icon={<MessageSquare size={16} color={Colors.emerald} />}
              />
            )}
          </View>
        )}

        {/* TAB 6: OPERATIONS & CREW */}
        {activeTab === 'CREW' && (
          <View style={{ gap: 14 }}>
            <NeuCard elevated style={styles.card}>
              <Text style={styles.cardSectionTitle}>Assigned Crew Members</Text>
              {(!operations || operations.crew_members.length === 0) ? (
                <Text style={[styles.toggleDesc, { marginTop: 6 }]}>
                  No crew members assigned yet. Add crew members from the web portal or assignments list.
                </Text>
              ) : (
                operations.crew_members.map((c) => (
                  <View key={c.id} style={styles.crewRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.crewName}>{c.name}</Text>
                      <Text style={styles.crewRole}>{c.role} {c.phone ? `• 📞 ${c.phone}` : ''}</Text>
                    </View>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>₹{c.payout_inr.toLocaleString()}</Text>
                    </View>
                  </View>
                ))
              )}
            </NeuCard>

            <NeuCard style={styles.card}>
              <Text style={styles.cardSectionTitle}>Ceremony Timeline & Venues</Text>
              {(!operations || operations.ceremonies.length === 0) ? (
                <Text style={[styles.toggleDesc, { marginTop: 6 }]}>
                  Ceremonies (Haldi, Mehendi, Sangeet, Wedding, Reception) will show up here.
                </Text>
              ) : (
                operations.ceremonies.map((cer) => (
                  <View key={cer.id} style={styles.ceremonyItem}>
                    <Clock size={14} color={Colors.primary} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.crewName}>{cer.name}</Text>
                      {cer.venue && <Text style={styles.crewRole}>📍 {cer.venue}</Text>}
                    </View>
                  </View>
                ))
              )}
            </NeuCard>
          </View>
        )}

        {/* TAB 7: LIVE QR STANDEE */}
        {activeTab === 'QR' && (
          <NeuCard elevated style={[styles.card, { alignItems: 'center', paddingVertical: 30 }]}>
            <Text style={styles.cardSectionTitle}>Live Event QR Code</Text>
            <Text style={[styles.toggleDesc, { textAlign: 'center', marginBottom: 20 }]}>
              Show this QR code at the registration desk or reception standee for guests to scan.
            </Text>

            <View style={styles.qrContainer}>
              <Image
                source={{ uri: `${mobileApi.getBaseUrl()}/events/${event.id}/qr` }}
                style={styles.qrImage}
              />
            </View>

            <Text style={styles.qrTokenText}>Access Token: {event.access_token}</Text>
            <NeuButton
              title="Open Guest View Directly"
              onPress={() => router.push(`/(guest)/${event.access_token}`)}
              style={{ marginTop: 16 }}
            />
          </NeuCard>
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
  centerContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 10,
  },
  tabScrollWrapper: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderColor: '#E8E4DD',
  },
  tabScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  navTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.surfaceInset,
  },
  navTabActive: {
    backgroundColor: Colors.card,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  navTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  navTabTextActive: {
    color: Colors.primary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  statCell: {
    flex: 1,
    backgroundColor: Colors.surfaceInset,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  statCellLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  statCellValue: {
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoBox: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceInset,
    position: 'relative',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  facesBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(232, 106, 91, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  facesText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  contributorCard: {
    padding: 14,
  },
  contributorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FDECE9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  contributorName: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
  contributorPhone: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Colors.surfaceInset,
  },
  countText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.primary,
  },
  thumbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  thumbBox: {
    width: (SCREEN_WIDTH - 90) / 4,
    height: (SCREEN_WIDTH - 90) / 4,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceInset,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  leadCard: {
    padding: 14,
  },
  leadName: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.text,
  },
  leadPhone: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  leadMatches: {
    fontSize: 11,
    color: Colors.emerald,
    fontWeight: '700',
    marginTop: 2,
  },
  leadActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderColor: '#E8E4DD',
  },
  whatsAppBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surfaceInset,
  },
  whatsAppBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
  },
  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#E8E4DD',
  },
  crewName: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.text,
  },
  crewRole: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  ceremonyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: '#E8E4DD',
  },
  qrContainer: {
    width: 220,
    height: 220,
    borderRadius: 20,
    backgroundColor: Colors.white,
    padding: 10,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: '100%',
    height: '100%',
  },
  qrTokenText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 14,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
