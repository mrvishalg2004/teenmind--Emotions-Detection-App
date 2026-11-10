import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';

interface ParentDashboardScreenProps {
  navigation?: any;
}

const ParentDashboardScreen: React.FC<ParentDashboardScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();

  // Mock data for child's information (in real app, this would come from API)
  const childData = {
    name: 'Alex Johnson', // This would be fetched based on linkedStudentId
    studentId: user?.linkedStudentId,
    lastActivity: '2 hours ago',
    currentMoodTrend: 'Stable',
    weeklyAverage: 7.2,
    alertsCount: 0,
  };

  const insights = [
    {
      id: 'mood',
      title: 'Mood Trends',
      icon: '📊',
      value: 'Generally positive',
      change: '+0.5 this week',
      color: '#10B981',
    },
    {
      id: 'activity',
      title: 'App Engagement',
      icon: '📱',
      value: '5 days this week',
      change: 'Consistent usage',
      color: '#4A9EFF',
    },
    {
      id: 'journal',
      title: 'Journal Entries',
      icon: '📝',
      value: '3 this week',
      change: '+1 from last week',
      color: '#FFB84D',
    },
    {
      id: 'alerts',
      title: 'Alerts',
      icon: '⚠️',
      value: childData.alertsCount.toString(),
      change: childData.alertsCount === 0 ? 'All clear' : 'Requires attention',
      color: childData.alertsCount > 0 ? '#EF4444' : '#10B981',
    },
  ];

  const recentActivities = [
    {
      timestamp: '2 hours ago',
      activity: 'Completed mood check-in',
      mood: '😊',
      details: 'Feeling happy and energetic',
    },
    {
      timestamp: 'Yesterday',
      activity: 'Wrote journal entry',
      mood: '😐',
      details: 'Reflection on school day',
    },
    {
      timestamp: '2 days ago',
      activity: 'Used AI chatbot',
      mood: '😕',
      details: 'Discussed stress management',
    },
  ];

  const parentResources = [
    {
      title: 'Understanding Teen Mental Health',
      description: 'Guide to recognizing signs and providing support',
      onPress: () => console.log('Open mental health guide'),
    },
    {
      title: 'Communication Tips',
      description: 'How to talk to your teen about mental health',
      onPress: () => console.log('Open communication tips'),
    },
    {
      title: 'Crisis Support Resources',
      description: 'Emergency contacts and professional help',
      onPress: () => console.log('Open crisis resources'),
    },
  ];

  const handleViewDetailedReport = () => {
    console.log('Navigate to detailed reports');
    // navigation?.navigate('Reports');
  };

  const handleSetupAlerts = () => {
    Alert.alert(
      'Alert Preferences',
      'Configure when you want to be notified about your child\'s mental health indicators.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Configure', onPress: () => console.log('Navigate to alert settings') },
      ]
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#6C63FF', '#5A52FF']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.username}>{user?.name}</Text>
            <Text style={styles.role}>Parent Dashboard</Text>
          </View>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => console.log('Navigate to Profile')}
          >
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Child Overview Card */}
        <View style={styles.childOverviewCard}>
          <View style={styles.childHeader}>
            <View>
              <Text style={styles.childName}>{childData.name}</Text>
              <Text style={styles.childId}>Student ID: {childData.studentId}</Text>
            </View>
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={handleViewDetailedReport}
            >
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.childStats}>
            <View style={styles.childStat}>
              <Text style={styles.childStatValue}>{childData.weeklyAverage}</Text>
              <Text style={styles.childStatLabel}>Avg. Mood</Text>
            </View>
            <View style={styles.childStat}>
              <Text style={styles.childStatValue}>{childData.currentMoodTrend}</Text>
              <Text style={styles.childStatLabel}>Trend</Text>
            </View>
            <View style={styles.childStat}>
              <Text style={styles.childStatValue}>{childData.lastActivity}</Text>
              <Text style={styles.childStatLabel}>Last Active</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Key Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Insights</Text>
          <View style={styles.insightsGrid}>
            {insights.map((insight) => (
              <View key={insight.id} style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <Text style={styles.insightIcon}>{insight.icon}</Text>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                </View>
                <Text style={[styles.insightValue, { color: insight.color }]}>
                  {insight.value}
                </Text>
                <Text style={styles.insightChange}>{insight.change}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityContainer}>
            {recentActivities.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityMood}>
                  <Text style={styles.activityMoodEmoji}>{activity.mood}</Text>
                </View>
                <View style={styles.activityDetails}>
                  <Text style={styles.activityTitle}>{activity.activity}</Text>
                  <Text style={styles.activityDescription}>{activity.details}</Text>
                  <Text style={styles.activityTimestamp}>{activity.timestamp}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parent Actions</Text>
          <View style={styles.actionsContainer}>
            <Button
              title="Setup Alerts"
              onPress={handleSetupAlerts}
              leftIcon="🔔"
              variant="outline"
              style={styles.actionButton}
            />
            <Button
              title="View Reports"
              onPress={handleViewDetailedReport}
              leftIcon="📊"
              variant="primary"
              style={styles.actionButton}
            />
          </View>
        </View>

        {/* Parent Resources */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Parent Resources</Text>
          <View style={styles.resourcesContainer}>
            {parentResources.map((resource, index) => (
              <TouchableOpacity
                key={index}
                style={styles.resourceCard}
                onPress={resource.onPress}
              >
                <View style={styles.resourceContent}>
                  <Text style={styles.resourceTitle}>{resource.title}</Text>
                  <Text style={styles.resourceDescription}>{resource.description}</Text>
                </View>
                <Text style={styles.resourceArrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Emergency Support */}
        <View style={styles.section}>
          <View style={styles.emergencyCard}>
            <Text style={styles.emergencyTitle}>Concerned About Your Child?</Text>
            <Text style={styles.emergencyText}>
              If you notice signs of severe distress or have concerns about your child's safety,
              please reach out to a mental health professional immediately.
            </Text>
            <Button
              title="Emergency Resources"
              variant="danger"
              size="medium"
              onPress={() => {
                console.log('Emergency resources for parents');
                Alert.alert(
                  'Emergency Resources',
                  'National Suicide Prevention Lifeline: 988\nCrisis Text Line: Text HOME to 741741\n\nFor immediate danger, call 911.'
                );
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

  role: {
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

  childOverviewCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
  },

  childHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  childName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  childId: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 2,
  },

  viewDetailsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  viewDetailsText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  childStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  childStat: {
    alignItems: 'center',
  },

  childStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  childStatLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 4,
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

  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  insightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  insightIcon: {
    fontSize: 20,
    marginRight: 8,
  },

  insightTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    flex: 1,
  },

  insightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },

  insightChange: {
    fontSize: 11,
    color: '#6B7280',
  },

  activityContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  activityMood: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  activityMoodEmoji: {
    fontSize: 20,
  },

  activityDetails: {
    flex: 1,
  },

  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: 2,
  },

  activityDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },

  activityTimestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },

  actionButton: {
    flex: 1,
  },

  resourcesContainer: {
    gap: 12,
  },

  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },

  resourceContent: {
    flex: 1,
  },

  resourceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E3A59',
    marginBottom: 4,
  },

  resourceDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  resourceArrow: {
    fontSize: 18,
    color: '#6B7280',
    marginLeft: 12,
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

export default ParentDashboardScreen;