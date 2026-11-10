import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../../src/hooks/useAuth';

const TabIcon = ({ name, size = 24 }: { name: string; size?: number; color?: string }) => {
  const icons: Record<string, string> = {
    dashboard: '🏠',
    mood: '💭',
    journal: '📝',
    chatbot: '🤖',
    profile: '👤',
  };
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size - 4 }}>{icons[name] ?? '•'}</Text>
    </View>
  );
};

export default function MainLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6B4EFF" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#6B4EFF', // Purple for mental health theme
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F0ECFF',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
          elevation: 8,
          shadowColor: '#6B4EFF',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mood-tracker"
        options={{
          title: 'Mood',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="mood" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="journal" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chatbot"
        options={{
          title: 'MindBot',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="chatbot" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="assessment"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}