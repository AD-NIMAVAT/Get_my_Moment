import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../src/theme/colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: Colors.background }}>
      <StatusBar style="dark" backgroundColor={Colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)/login" />
        <Stack.Screen name="(guest)/[token]" />
        <Stack.Screen name="(studio)/dashboard" />
        <Stack.Screen name="(studio)/events/[id]" />
      </Stack>
    </SafeAreaProvider>
  );
}
