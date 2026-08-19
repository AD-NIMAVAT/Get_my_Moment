import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, 
  Alert, ActivityIndicator, FlatList, Dimensions, Share, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Colors } from '../../src/theme/colors';
import { NeuCard } from '../../src/components/NeuCard';
import { NeuButton } from '../../src/components/NeuButton';
import { NeuInput } from '../../src/components/NeuInput';
import { NeuHeader } from '../../src/components/NeuHeader';
import { 
  mobileApi, PublicEventItem, MatchSearchResult 
} from '../../src/lib/api';
import { 
  Sparkles, Camera, UploadCloud, Download, Share2, 
  ArrowLeft, CheckCircle2, User, Phone, Check 
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = (SCREEN_WIDTH - 56) / 2;

type Step = 'REGISTER' | 'SELFIE' | 'MATCHING' | 'GALLERY';

export default function GuestExperienceScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [event, setEvent] = useState<PublicEventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'AI_SEARCH' | 'GUEST_UPLOAD'>('AI_SEARCH');

  // Registration & Guest State
  const [step, setStep] = useState<Step>('REGISTER');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [guestId, setGuestId] = useState<string | null>(null);

  // Selfie & AI Match State
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<MatchSearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Community Uploads State
  const [uploadName, setUploadName] = useState('');
  const [uploadPhone, setUploadPhone] = useState('');
  const [selectedUploadUris, setSelectedUploadUris] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Saved Photos Tracking
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (token) {
      loadEventData();
    }
  }, [token]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      const data = await mobileApi.getPublicEvent(token);
      setEvent(data);
      if (!data.allow_guest_uploads) {
        setActiveTab('AI_SEARCH');
      }
    } catch (err: any) {
      Alert.alert('Event Error', err.message || 'Could not load event');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Register Guest
  const handleRegister = async () => {
    if (!event || !name.trim() || !mobile.trim()) {
      Alert.alert('Required Fields', 'Please enter your name and mobile number to proceed.');
      return;
    }

    try {
      setLoading(true);
      const res = await mobileApi.registerGuest(event.id, {
        name: name.trim(),
        mobile: mobile.trim(),
      });
      setGuestId(res.guest_id);
      setStep('SELFIE');
    } catch (err: any) {
      Alert.alert('Registration Error', err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Selfie Capture via Camera
  const handleTakeSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Permission', 'Camera permission is required to take a selfie.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
    });

    if (!result.canceled && result.assets[0]) {
      setSelfieUri(result.assets[0].uri);
    }
  };

  const handlePickSelfieGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelfieUri(result.assets[0].uri);
    }
  };

  // Step 3: Run AI Face Matching
  const handleRunSearch = async () => {
    if (!event || !guestId || !selfieUri) return;
    setSearching(true);
    setStep('MATCHING');

    try {
      const results = await mobileApi.searchSelfie(event.id, guestId, selfieUri);
      setMatchResult(results);
      setStep('GALLERY');
    } catch (err: any) {
      Alert.alert('AI Match Error', err.message || 'Face search failed');
      setStep('SELFIE');
    } finally {
      setSearching(false);
    }
  };

  // 1-Tap Save to Device Camera Roll
  const handleSaveToGallery = async (photoId: string, filename: string) => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Storage/Media permission is required to save photos.');
        return;
      }

      const downloadUrl = mobileApi.getDownloadUrl(photoId);
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      const downloaded = await FileSystem.downloadAsync(downloadUrl, fileUri);
      await MediaLibrary.saveToLibraryAsync(downloaded.uri);

      setSavedIds((prev) => ({ ...prev, [photoId]: true }));
      Alert.alert('Saved to Camera Roll', 'Photo successfully saved to your phone gallery! 📸');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not save photo to camera roll.');
    }
  };

  const handleSharePhoto = async (photoId: string) => {
    const downloadUrl = mobileApi.getDownloadUrl(photoId);
    try {
      await Share.share({
        message: `Look at this photo from ${event?.name}! Captured with Get My Moment AI: ${downloadUrl}`,
        url: downloadUrl,
      });
    } catch (err) {}
  };

  // Guest Community Uploads
  const handlePickGuestPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      setSelectedUploadUris(result.assets.map((a) => a.uri));
    }
  };

  const handleUploadGuestPhotos = async () => {
    const contributorName = (uploadName || name).trim();
    if (!contributorName) {
      Alert.alert('Name Required', 'Please enter your name so the couple and studio know who took these photos.');
      return;
    }
    if (selectedUploadUris.length === 0) {
      Alert.alert('No Photos Selected', 'Please select photos from your gallery to upload.');
      return;
    }

    try {
      setUploading(true);
      const res = await mobileApi.guestUploadPhotos(
        token,
        selectedUploadUris,
        contributorName,
        uploadPhone.trim() || mobile.trim() || undefined
      );
      Alert.alert('Upload Successful! 🎉', `${res.uploaded_count} photos added to the event community album.`);
      setSelectedUploadUris([]);
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Failed to upload guest photos.');
    } finally {
      setUploading(false);
    }
  };

  if (loading || !event) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading Event Gallery...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <NeuHeader
        title={event.name}
        subtitle={`Hosted by ${event.studio_name}`}
        leftIcon={<ArrowLeft size={18} color={Colors.text} />}
        onLeftPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Tab Switcher: Only visible if allow_guest_uploads is true */}
        {event.allow_guest_uploads && (
          <View style={styles.tabBar}>
            <TouchableOpacity
              onPress={() => setActiveTab('AI_SEARCH')}
              style={[styles.tabButton, activeTab === 'AI_SEARCH' && styles.tabButtonActive]}
            >
              <Sparkles size={14} color={activeTab === 'AI_SEARCH' ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.tabText, activeTab === 'AI_SEARCH' && styles.tabTextActive]}>
                Find My Photos (AI)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('GUEST_UPLOAD')}
              style={[styles.tabButton, activeTab === 'GUEST_UPLOAD' && styles.tabButtonActive]}
            >
              <UploadCloud size={14} color={activeTab === 'GUEST_UPLOAD' ? Colors.primary : Colors.textSecondary} />
              <Text style={[styles.tabText, activeTab === 'GUEST_UPLOAD' && styles.tabTextActive]}>
                Guest Uploads
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* TAB 1: AI SEARCH FLOW */}
        {activeTab === 'AI_SEARCH' && (
          <View>
            {/* STEP 1: Registration */}
            {step === 'REGISTER' && (
              <NeuCard elevated style={styles.card}>
                <View style={styles.cardHeader}>
                  <Sparkles size={24} color={Colors.primary} />
                  <Text style={styles.heading}>Find Your Photos with AI</Text>
                  <Text style={styles.subheading}>
                    Enter your name and mobile to receive instant facial matches from the wedding album.
                  </Text>
                </View>

                <NeuInput
                  label="Your Name *"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChangeText={setName}
                  icon={<User size={16} color={Colors.primary} />}
                />

                <NeuInput
                  label="Mobile Number *"
                  placeholder="+91 98765 43210"
                  keyboardType="phone-pad"
                  value={mobile}
                  onChangeText={setMobile}
                  icon={<Phone size={16} color={Colors.primary} />}
                />

                <NeuButton
                  title="Next: Take Selfie"
                  onPress={handleRegister}
                  style={{ marginTop: 8 }}
                />
              </NeuCard>
            )}

            {/* STEP 2: Selfie Capture */}
            {step === 'SELFIE' && (
              <NeuCard elevated style={styles.card}>
                <View style={styles.cardHeader}>
                  <Camera size={24} color={Colors.primary} />
                  <Text style={styles.heading}>Capture Your Selfie</Text>
                  <Text style={styles.subheading}>
                    Ensure good lighting and face clearly visible for 128-d AI facial recognition.
                  </Text>
                </View>

                {selfieUri ? (
                  <View style={styles.selfiePreviewContainer}>
                    <Image source={{ uri: selfieUri }} style={styles.selfieImage} />
                    <TouchableOpacity onPress={() => setSelfieUri(null)} style={styles.retakeBtn}>
                      <Text style={styles.retakeText}>Retake Selfie</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.selfieActions}>
                    <NeuButton
                      title="Open Front Camera"
                      onPress={handleTakeSelfie}
                      icon={<Camera size={16} color={Colors.white} />}
                      style={{ marginBottom: 12 }}
                    />
                    <NeuButton
                      title="Choose from Gallery"
                      variant="secondary"
                      onPress={handlePickSelfieGallery}
                      icon={<UploadCloud size={16} color={Colors.text} />}
                    />
                  </View>
                )}

                {selfieUri && (
                  <NeuButton
                    title="Find My Matched Photos ✨"
                    onPress={handleRunSearch}
                    style={{ marginTop: 16 }}
                  />
                )}
              </NeuCard>
            )}

            {/* STEP 3: Matching Spinner */}
            {step === 'MATCHING' && (
              <NeuCard elevated style={[styles.card, { alignItems: 'center', paddingVertical: 40 }]}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={[styles.heading, { marginTop: 16 }]}>Matching Your Facial Features...</Text>
                <Text style={styles.subheading}>
                  Scanning {event.photo_count} high-res wedding photos across all ceremonies.
                </Text>
              </NeuCard>
            )}

            {/* STEP 4: Results Gallery */}
            {step === 'GALLERY' && matchResult && (
              <View>
                <NeuCard style={{ padding: 16, marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={styles.matchedTitle}>
                        Found {matchResult.total_matches} Photos of You! 🎉
                      </Text>
                      <Text style={styles.matchedSubtitle}>
                        Search completed in {matchResult.search_latency_ms}ms
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setStep('SELFIE')} style={styles.searchAgainBtn}>
                      <Text style={styles.searchAgainText}>New Search</Text>
                    </TouchableOpacity>
                  </View>
                </NeuCard>

                {matchResult.matched_photos.length === 0 ? (
                  <NeuCard style={{ padding: 30, alignItems: 'center' }}>
                    <Text style={styles.subheading}>No matching photos found with this selfie.</Text>
                    <NeuButton
                      title="Try Another Selfie"
                      onPress={() => setStep('SELFIE')}
                      style={{ marginTop: 12 }}
                    />
                  </NeuCard>
                ) : (
                  <View style={styles.photoGrid}>
                    {matchResult.matched_photos.map((item) => (
                      <View key={item.photo_id} style={styles.photoCard}>
                        <Image
                          source={{ uri: mobileApi.getThumbnailUrl(item.photo_id) }}
                          style={styles.gridImage}
                        />
                        <View style={styles.photoOverlay}>
                          <TouchableOpacity
                            onPress={() => handleSaveToGallery(item.photo_id, item.original_file_name)}
                            style={styles.actionIconBtn}
                          >
                            {savedIds[item.photo_id] ? (
                              <Check size={14} color={Colors.emerald} />
                            ) : (
                              <Download size={14} color={Colors.text} />
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleSharePhoto(item.photo_id)}
                            style={styles.actionIconBtn}
                          >
                            <Share2 size={14} color={Colors.text} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: GUEST COMMUNITY UPLOADS */}
        {activeTab === 'GUEST_UPLOAD' && event.allow_guest_uploads && (
          <NeuCard elevated style={styles.card}>
            <View style={styles.cardHeader}>
              <UploadCloud size={24} color={Colors.cyan} />
              <Text style={styles.heading}>Share Your Wedding Clicks</Text>
              <Text style={styles.subheading}>
                Upload your candid phone shots to the community album for the couple!
              </Text>
            </View>

            <NeuInput
              label="Your Name *"
              placeholder="e.g. Rahul Sharma"
              value={uploadName || name}
              onChangeText={setUploadName}
              icon={<User size={16} color={Colors.primary} />}
            />

            <NeuInput
              label="Mobile Number (Optional)"
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              value={uploadPhone || mobile}
              onChangeText={setUploadPhone}
              icon={<Phone size={16} color={Colors.primary} />}
            />

            <NeuButton
              title={`Select Photos from Phone Gallery (${selectedUploadUris.length} Selected)`}
              variant="secondary"
              onPress={handlePickGuestPhotos}
              icon={<Camera size={16} color={Colors.text} />}
              style={{ marginBottom: 12 }}
            />

            {selectedUploadUris.length > 0 && (
              <NeuButton
                title={`Upload ${selectedUploadUris.length} Photos as ${uploadName || name || 'Guest'}`}
                onPress={handleUploadGuestPhotos}
                loading={uploading}
              />
            )}
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
    marginTop: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceInset,
    borderRadius: 18,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
  },
  tabButtonActive: {
    backgroundColor: Colors.card,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  card: {
    padding: 20,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  subheading: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  selfiePreviewContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  selfieImage: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  retakeBtn: {
    marginTop: 10,
    padding: 6,
  },
  retakeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  selfieActions: {
    marginTop: 8,
  },
  matchedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  matchedSubtitle: {
    fontSize: 11,
    color: Colors.emerald,
    fontWeight: '600',
    marginTop: 2,
  },
  searchAgainBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.surfaceInset,
  },
  searchAgainText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoCard: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: Colors.card,
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    gap: 6,
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
