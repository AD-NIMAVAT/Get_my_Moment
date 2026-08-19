import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { NeuCard } from '../../src/components/NeuCard';
import { NeuButton } from '../../src/components/NeuButton';
import { NeuInput } from '../../src/components/NeuInput';
import { NeuHeader } from '../../src/components/NeuHeader';
import { mobileApi } from '../../src/lib/api';
import { Clapperboard, Phone, Lock, ArrowLeft, Users, ShieldCheck } from 'lucide-react-native';

export default function CrewLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCrewLogin = async () => {
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      Alert.alert('Phone Number Required', 'Please enter your registered mobile number assigned by your photography studio.');
      return;
    }

    try {
      setLoading(true);
      const res = await mobileApi.crewLogin(cleanPhone);
      Alert.alert('Welcome, Crew Member! 🎬', `Hello ${res.name}! Loaded ${res.total_assigned_events} assigned events.`);
      router.replace('/(crew)/dashboard');
    } catch (err: any) {
      Alert.alert(
        'Crew Assignment Not Found',
        err.message || 'No events found for this phone number. Please check with your studio owner/manager.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <NeuHeader
        title="Crew Staff Login"
        subtitle="Field Operations Portal"
        leftIcon={<ArrowLeft size={18} color={Colors.text} />}
        onLeftPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <Clapperboard size={28} color={Colors.cyan} />
        </View>

        <Text style={styles.title}>Crew & Staff Portal</Text>
        <Text style={styles.subtitle}>
          Access your assigned wedding shoots, ceremony call sheets, venues, and upload photos directly from the field.
        </Text>

        <NeuCard elevated style={styles.card}>
          <NeuInput
            label="Registered Mobile Number *"
            placeholder="e.g. 9876543210"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            icon={<Phone size={16} color={Colors.cyan} />}
          />

          <View style={styles.helperBox}>
            <ShieldCheck size={14} color={Colors.emerald} />
            <Text style={styles.helperText}>
              Enter the mobile number your studio owner used when assigning you to the event.
            </Text>
          </View>

          <NeuButton
            title="Sign In to Crew Portal"
            variant="primary"
            onPress={handleCrewLogin}
            loading={loading}
            icon={<Users size={16} color={Colors.white} />}
            style={{ marginTop: 14 }}
          />
        </NeuCard>
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
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
    maxWidth: 300,
    lineHeight: 18,
  },
  card: {
    width: '100%',
    padding: 20,
  },
  helperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceInset,
    padding: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  helperText: {
    flex: 1,
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 15,
  },
});
