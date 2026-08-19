import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Switch, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../src/theme/colors';
import { NeuCard } from '../../src/components/NeuCard';
import { NeuButton } from '../../src/components/NeuButton';
import { NeuInput } from '../../src/components/NeuInput';
import { NeuHeader } from '../../src/components/NeuHeader';
import { mobileApi } from '../../src/lib/api';
import { 
  Sparkles, Calendar, User, Phone, IndianRupee, 
  UploadCloud, Download, ShieldCheck, ArrowLeft 
} from 'lucide-react-native';

export default function CreateEventScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [packageAmount, setPackageAmount] = useState('150000');
  const [allowGuestUploads, setAllowGuestUploads] = useState(true);
  const [allowDownloads, setAllowDownloads] = useState(true);
  const [requireOtp, setRequireOtp] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Event Name Required', 'Please enter the wedding / event title.');
      return;
    }

    try {
      setLoading(true);
      const newEvent = await mobileApi.createEvent({
        name: name.trim(),
        event_date: eventDate,
        client_name: clientName.trim() || undefined,
        client_phone: clientPhone.trim() || undefined,
        package_amount_inr: parseFloat(packageAmount) || 0,
        allow_downloads: allowDownloads,
        allow_guest_uploads: allowGuestUploads,
        require_otp: requireOtp,
      });

      Alert.alert('Event Created! 🎉', `Event "${newEvent.name}" is now ready for photo uploads and AI guest matching.`);
      router.replace(`/(studio)/events/${newEvent.id}`);
    } catch (err: any) {
      Alert.alert('Creation Failed', err.message || 'Could not create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <NeuHeader
        title="Create New Event"
        subtitle="Wedding & Shoot Setup"
        leftIcon={<ArrowLeft size={18} color={Colors.text} />}
        onLeftPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Core Details */}
        <NeuCard elevated style={styles.card}>
          <Text style={styles.sectionHeader}>Event Details</Text>

          <NeuInput
            label="Event / Wedding Title *"
            placeholder="e.g. Priya & Rahul's Royal Wedding"
            value={name}
            onChangeText={setName}
            icon={<Sparkles size={16} color={Colors.primary} />}
          />

          <NeuInput
            label="Event Date (YYYY-MM-DD)"
            placeholder="2026-12-15"
            value={eventDate}
            onChangeText={setEventDate}
            icon={<Calendar size={16} color={Colors.primary} />}
          />

          <NeuInput
            label="Package Amount (INR)"
            placeholder="150000"
            keyboardType="numeric"
            value={packageAmount}
            onChangeText={setPackageAmount}
            icon={<IndianRupee size={16} color={Colors.gold} />}
          />
        </NeuCard>

        {/* Client Details */}
        <NeuCard style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.sectionHeader}>Client Information</Text>

          <NeuInput
            label="Client / Bride & Groom Name"
            placeholder="e.g. Rahul Sharma"
            value={clientName}
            onChangeText={setClientName}
            icon={<User size={16} color={Colors.primary} />}
          />

          <NeuInput
            label="Client WhatsApp Mobile"
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            value={clientPhone}
            onChangeText={setClientPhone}
            icon={<Phone size={16} color={Colors.primary} />}
          />
        </NeuCard>

        {/* Settings & Permissions */}
        <NeuCard style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.sectionHeader}>Guest Access & Rights</Text>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.switchLabel}>Allow Guest Photo Uploads</Text>
              <Text style={styles.switchDesc}>Guests can upload their own phone clicks via Standee QR</Text>
            </View>
            <Switch
              value={allowGuestUploads}
              onValueChange={setAllowGuestUploads}
              trackColor={{ false: '#D4D0C7', true: Colors.primary }}
              thumbColor={Colors.white}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.switchLabel}>Allow High-Res Downloads</Text>
              <Text style={styles.switchDesc}>Guests can save matched photos to phone camera roll</Text>
            </View>
            <Switch
              value={allowDownloads}
              onValueChange={setAllowDownloads}
              trackColor={{ false: '#D4D0C7', true: Colors.emerald }}
              thumbColor={Colors.white}
            />
          </View>
        </NeuCard>

        <NeuButton
          title="Launch Event & Setup Command Center 🚀"
          onPress={handleCreate}
          loading={loading}
          style={{ marginTop: 20, marginBottom: 20 }}
        />
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
  card: {
    padding: 18,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 14,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#E8E4DD',
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
  },
  switchDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
