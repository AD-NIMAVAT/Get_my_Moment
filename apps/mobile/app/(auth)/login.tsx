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
import { Camera, Mail, Lock, Building, ArrowLeft } from 'lucide-react-native';

export default function StudioLoginScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studioName, setStudioName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required Fields', 'Please fill in your email and password.');
      return;
    }

    try {
      setLoading(true);
      if (isLogin) {
        await mobileApi.login({ email: email.trim(), password });
        router.replace('/(studio)/dashboard');
      } else {
        if (!studioName.trim()) {
          Alert.alert('Studio Name Required', 'Please enter your photography studio name.');
          return;
        }
        await mobileApi.signup({
          email: email.trim(),
          password,
          studio_name: studioName.trim(),
        });
        router.replace('/(studio)/dashboard');
      }
    } catch (err: any) {
      Alert.alert('Authentication Error', err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <NeuHeader
        title={isLogin ? 'Studio Sign In' : 'Create Studio Account'}
        leftIcon={<ArrowLeft size={18} color={Colors.text} />}
        onLeftPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <Camera size={28} color={Colors.primary} />
        </View>

        <Text style={styles.title}>
          {isLogin ? 'Welcome Back, Photographer' : 'Join Get My Moment'}
        </Text>
        <Text style={styles.subtitle}>
          {isLogin 
            ? 'Manage your events, crew, and live AI facial galleries.' 
            : 'Deliver live wedding galleries with instant 128-d AI face recognition.'}
        </Text>

        <NeuCard elevated style={styles.card}>
          {!isLogin && (
            <NeuInput
              label="Studio / Brand Name *"
              placeholder="e.g. Royal Heritage Photography"
              value={studioName}
              onChangeText={setStudioName}
              icon={<Building size={16} color={Colors.primary} />}
            />
          )}

          <NeuInput
            label="Email Address *"
            placeholder="studio@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            icon={<Mail size={16} color={Colors.primary} />}
          />

          <NeuInput
            label="Password *"
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            icon={<Lock size={16} color={Colors.primary} />}
          />

          <NeuButton
            title={isLogin ? 'Sign In to Studio Portal' : 'Register Studio Account'}
            onPress={handleSubmit}
            loading={loading}
            style={{ marginTop: 8 }}
          />

          <TouchableOpacity 
            onPress={() => setIsLogin(!isLogin)} 
            style={styles.switchMode}
          >
            <Text style={styles.switchModeText}>
              {isLogin 
                ? "Don't have a studio account? Register here" 
                : 'Already registered? Sign in instead'}
            </Text>
          </TouchableOpacity>
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
    backgroundColor: '#FDECE9',
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
    maxWidth: 280,
    lineHeight: 18,
  },
  card: {
    width: '100%',
    padding: 20,
  },
  switchMode: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});
