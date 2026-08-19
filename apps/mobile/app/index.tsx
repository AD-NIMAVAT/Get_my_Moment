import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Image, TextInput, Alert, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../src/theme/colors';
import { NeuCard } from '../src/components/NeuCard';
import { NeuButton } from '../src/components/NeuButton';
import { NeuInput } from '../src/components/NeuInput';
import { QRScannerModal } from '../src/components/QRScannerModal';
import { mobileApi } from '../src/lib/api';
import { 
  Sparkles, Camera, QrCode, ArrowRight, ShieldCheck, 
  Settings, User, Users, Clapperboard, Scan 
} from 'lucide-react-native';

export default function WelcomeScreen() {
  const router = useRouter();
  const [eventCode, setEventCode] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [apiHost, setApiHost] = useState(mobileApi.getBaseUrl());
  const [scannerVisible, setScannerVisible] = useState(false);

  // Load saved backend IP from permanent file storage on startup
  useEffect(() => {
    mobileApi.initFromStorage().then((saved) => {
      if (saved) setApiHost(saved);
    });
  }, []);

  const handleGuestSubmit = () => {
    const code = eventCode.trim();
    if (!code) {
      Alert.alert('Event Token Required', 'Please enter your event access token or tap "Scan QR Code".');
      return;
    }
    router.push(`/(guest)/${code}`);
  };

  const handleScanSuccess = (token: string) => {
    setScannerVisible(false);
    router.push(`/(guest)/${token}`);
  };

  const handleSaveApiHost = async () => {
    await mobileApi.setBaseUrl(apiHost);
    setShowConfig(false);
    Alert.alert('Server Saved Permanently', `API base URL set to: ${apiHost}\nThis configuration will persist across app restarts.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Branding Header */}
        <View style={styles.brandHeader}>
          <View style={styles.logoBadge}>
            <Camera size={26} color={Colors.white} />
          </View>
          <Text style={styles.brandTitle}>Get My Moment</Text>
          <Text style={styles.brandTagline}>AI Face Recognition & Live Event Suite</Text>
        </View>

        {/* 1. WEDDING GUEST MODE */}
        <NeuCard elevated style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#FDECE9' }]}>
              <Sparkles size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>Wedding Guest Portal</Text>
              <Text style={styles.cardSubtitle}>Find your photos in seconds with AI selfie search</Text>
            </View>
          </View>

          {/* 1-Tap QR Scanner Button */}
          <NeuButton
            title="Scan Standee QR Code"
            onPress={() => setScannerVisible(true)}
            icon={<Scan size={18} color={Colors.white} />}
            style={styles.scanBtn}
          />

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR ENTER CODE</Text>
            <View style={styles.dividerLine} />
          </View>

          <NeuInput
            placeholder="e.g. e709add0995e"
            value={eventCode}
            onChangeText={setEventCode}
            autoCapitalize="none"
            containerStyle={{ marginBottom: 12 }}
            icon={<QrCode size={18} color={Colors.primary} />}
          />

          <NeuButton
            title="Enter Event Gallery"
            variant="secondary"
            onPress={handleGuestSubmit}
            icon={<ArrowRight size={16} color={Colors.text} />}
          />
        </NeuCard>

        {/* 2. ASSIGNED CREW & STAFF MEMBER MODE */}
        <NeuCard style={[styles.mainCard, { marginTop: 16 }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Clapperboard size={20} color={Colors.cyan} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>Assigned Crew & Staff</Text>
              <Text style={styles.cardSubtitle}>Call sheets, ceremony venues & field photo upload</Text>
            </View>
          </View>

          <NeuButton
            title="Crew Staff Login"
            variant="secondary"
            onPress={() => router.push('/(auth)/crew-login')}
            icon={<Users size={16} color={Colors.cyan} />}
            style={{ marginTop: 16 }}
          />
        </NeuCard>

        {/* 3. STUDIO OWNER & PHOTOGRAPHER MODE */}
        <NeuCard style={[styles.mainCard, { marginTop: 16 }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEF8EC' }]}>
              <Camera size={20} color={Colors.gold} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.cardTitle}>Studio Owner Portal</Text>
              <Text style={styles.cardSubtitle}>Manage events, live QR standees, CRM & revenue</Text>
            </View>
          </View>

          <NeuButton
            title="Studio Login / Register"
            variant="secondary"
            onPress={() => router.push('/(auth)/login')}
            icon={<User size={16} color={Colors.gold} />}
            style={{ marginTop: 16 }}
          />
        </NeuCard>

        {/* Server Config & IP Toggle for local/online testing */}
        <View style={styles.footer}>
          <TouchableOpacity 
            onPress={() => setShowConfig(!showConfig)}
            style={styles.configToggle}
          >
            <Settings size={14} color={Colors.textSecondary} />
            <Text style={styles.configToggleText}>
              {showConfig ? 'Hide Server Config' : 'Configure Backend Server IP'}
            </Text>
          </TouchableOpacity>

          {showConfig && (
            <NeuCard style={{ marginTop: 12, padding: 14 }}>
              <Text style={styles.configLabel}>FastAPI Backend URL:</Text>
              <TextInput
                value={apiHost}
                onChangeText={setApiHost}
                autoCapitalize="none"
                style={styles.configInput}
                placeholder="http://192.168.31.37:8000/api/v1"
              />
              <NeuButton
                title="Update Server Address"
                onPress={handleSaveApiHost}
                variant="secondary"
                style={{ height: 40, marginTop: 8 }}
                textStyle={{ fontSize: 12 }}
              />
            </NeuCard>
          )}
        </View>
      </ScrollView>

      {/* QR Scanner Camera Viewfinder Modal */}
      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanSuccess={handleScanSuccess}
      />
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
  brandHeader: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C94F43',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: 0.4,
  },
  brandTagline: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 3,
  },
  mainCard: {
    padding: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scanBtn: {
    marginTop: 16,
    height: 52,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2DDD5',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 26,
    alignItems: 'center',
  },
  configToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  configToggleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  configLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
  },
  configInput: {
    backgroundColor: Colors.surfaceInset,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2DDD5',
    paddingHorizontal: 12,
    height: 42,
    fontSize: 12,
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
