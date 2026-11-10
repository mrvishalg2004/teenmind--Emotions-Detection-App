import { Stack } from 'expo-router';
import { AuthProvider } from '../src/components/auth/AuthProvider';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="(parent)" />
      </Stack>
    </AuthProvider>
  );
}