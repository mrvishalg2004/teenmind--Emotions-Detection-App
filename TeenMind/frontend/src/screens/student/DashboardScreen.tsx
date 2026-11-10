import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';

interface DashboardScreenProps {
  navigation?: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();

  const quickActions = [
    {
      id: 'mood',
      title: 'Track Mood',
      icon: '😊',
      description: 'Log your current mood',
      color: '#FFB84D',
      onPress: () => {
        // navigation?.navigate('MoodTracker');
        console.log('Navigate to Mood Tracker');
      },
    },
    {
      id: 'journal',
      title: 'Write Journal',
      icon: '📝',
      description: 'Express your thoughts',
      color: '#4A9EFF',
      onPress: () => {
        // navigation?.navigate('Journal');
        console.log('Navigate to Journal');
      },
    },
    {
      id: 'questionnaire',
      title: 'Take Assessment',
      icon: '📋',
      description: 'Mental health check-in',
      color: '#6C63FF',
      onPress: () => {
        // navigation?.navigate('Questionnaire');
        console.log('Navigate to Questionnaire');
      },
    },
    {
      id: 'chatbot',
      title: 'AI Support',
      icon: '🤖',
      description: 'Chat with our AI assistant',
      color: '#10B981',
      onPress: () => {
        // navigation?.navigate('Chatbot');
        console.log('Navigate to Chatbot');
      },
    },
  ];

  const wellnessTips = [
    "Take 5 deep breaths when feeling overwhelmed",
    "A 10-minute walk can boost your mood significantly",
    "Write down three things you're grateful for today",
    "Stay hydrated - drink water throughout the day",
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#4A9EFF', '#2196F3']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.username}>{user?.name}</Text>
            <Text style={styles.studentId}>ID: {user?.studentId}</Text>
          </View>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => {
              // navigation?.navigate('Profile');
              console.log('Navigate to Profile');
            }}
          >
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Mood Quick Check */}
        <View style={styles.quickMoodCheck}>
          <Text style={styles.quickMoodTitle}>How are you feeling today?</Text>
          <View style={styles.moodOptions}>
            {['😊', '😐', '😔', '😟', '😢'].map((emoji, index) => (
              <TouchableOpacity
                key={index}
                style={styles.moodOption}
                onPress={() => console.log(`Selected mood: ${emoji}`)}
              >
                <Text style={styles.moodEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.actionCard, { borderLeftColor: action.color }]}
                onPress={action.onPress}
              >
                <View style={styles.actionHeader}>
                  <Text style={styles.actionIcon}>{action.icon}</Text>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                </View>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <Text style={styles.activityTitle}>Your Progress This Week</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>5</Text>
                <Text style={styles.statLabel}>Mood entries</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>3</Text>
                <Text style={styles.statLabel}>Journal entries</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>7.2</Text>
                <Text style={styles.statLabel}>Avg. mood</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Wellness Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Wellness Tip</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>
              {wellnessTips[Math.floor(Math.random() * wellnessTips.length)]}
            </Text>
          </View>
        </View>

        {/* Emergency Support */}
        <View style={styles.section}>
          <View style={styles.emergencyCard}>
            <Text style={styles.emergencyTitle}>Need Immediate Support?</Text>
            <Text style={styles.emergencyText}>
              If you're having thoughts of self-harm or suicide, please reach out for help immediately.
            </Text>
            <Button
              title="Get Help Now"
              variant="danger"
              size="medium"
              onPress={() => {
                console.log('Emergency support contacted');
                // In real app, this would show emergency contacts or crisis helplines
              }}
            />
          </View>
        </View>

        {/* Debug/Testing */}
        <View style={styles.section}>
          <Button
            title="Logout"
            variant="outline"
            onPress={logout}
            style={styles.logoutButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },

  greeting: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.8,
  },

  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },

  studentId: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 2,
  },

  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileIcon: {
    fontSize: 24,
  },

  quickMoodCheck: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
  },

  quickMoodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },

  moodOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  moodOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  moodEmoji: {
    fontSize: 24,
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
  },

  section: {
    marginTop: 24,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E3A59',
    marginBottom: 16,
  },

  actionsGrid: {
    gap: 12,
  },

  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  actionIcon: {
    fontSize: 24,
    marginRight: 12,
  },

  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E3A59',
  },

  actionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: 16,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  statItem: {
    alignItems: 'center',
    flex: 1,
  },

  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A9EFF',
  },

  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },

  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },

  tipCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  tipIcon: {
    fontSize: 24,
    marginRight: 12,
  },

  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },

  emergencyCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },

  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 8,
  },

  emergencyText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
    marginBottom: 16,
  },

  logoutButton: {
    marginBottom: 40,
  },
});

export default DashboardScreen;