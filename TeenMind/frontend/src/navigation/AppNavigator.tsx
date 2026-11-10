import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { BrandedLoading } from '../components/common/LoadingSpinner';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Student Screens
import StudentDashboardScreen from '../screens/student/DashboardScreen';

// Parent Screens
import ParentDashboardScreen from '../screens/parent/ParentDashboardScreen';

// Navigation types
export type RootStackParamList = {
  Auth: undefined;
  StudentMain: undefined;
  ParentMain: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type StudentStackParamList = {
  Dashboard: undefined;
  Profile: undefined;
  Settings: undefined;
  Questionnaire: undefined;
  MoodTracker: undefined;
  Journal: undefined;
  Chatbot: undefined;
};

export type ParentStackParamList = {
  ParentDashboard: undefined;
  ChildOverview: undefined;
  Reports: undefined;
  Settings: undefined;
};

// Create stack navigators
const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const StudentStack = createStackNavigator<StudentStackParamList>();
const ParentStack = createStackNavigator<ParentStackParamList>();

// Auth Stack Navigator (Login/Register)
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: 'transparent' },
        cardOverlayEnabled: true,
        cardStyleInterpolator: ({ current: { progress } }) => ({
          cardStyle: {
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
          },
          overlayStyle: {
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          },
        }),
      }}
    >
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Sign In' }}
      />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: 'Create Account' }}
      />
    </AuthStack.Navigator>
  );
}

// Student Stack Navigator
function StudentNavigator() {
  return (
    <StudentStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F8FAFF' },
      }}
    >
      <StudentStack.Screen
        name="Dashboard"
        component={StudentDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      {/* Future screens */}
      {/*
      <StudentStack.Screen
        name="Profile"
        component={StudentProfileScreen}
        options={{ title: 'Profile' }}
      />
      <StudentStack.Screen
        name="MoodTracker"
        component={MoodTrackerScreen}
        options={{ title: 'Mood Tracker' }}
      />
      <StudentStack.Screen
        name="Journal"
        component={JournalScreen}
        options={{ title: 'Journal' }}
      />
      <StudentStack.Screen
        name="Questionnaire"
        component={QuestionnaireScreen}
        options={{ title: 'Assessment' }}
      />
      <StudentStack.Screen
        name="Chatbot"
        component={ChatbotScreen}
        options={{ title: 'AI Support' }}
      />
      */}
    </StudentStack.Navigator>
  );
}

// Parent Stack Navigator
function ParentNavigator() {
  return (
    <ParentStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F8FAFF' },
      }}
    >
      <ParentStack.Screen
        name="ParentDashboard"
        component={ParentDashboardScreen}
        options={{ title: 'Parent Dashboard' }}
      />
      {/* Future screens */}
      {/*
      <ParentStack.Screen
        name="ChildOverview"
        component={ChildOverviewScreen}
        options={{ title: 'Child Overview' }}
      />
      <ParentStack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Reports' }}
      />
      <ParentStack.Screen
        name="Settings"
        component={ParentSettingsScreen}
        options={{ title: 'Settings' }}
      />
      */}
    </ParentStack.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { user, loading } = useAuth();

  // Show loading screen while checking authentication
  if (loading) {
    return <BrandedLoading message="Loading TeenMind..." />;
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          presentation: 'card',
          animationEnabled: true,
        }}
      >
        {user ? (
          // User is authenticated - show role-based navigation
          user.role === 'student' ? (
            <RootStack.Screen
              name="StudentMain"
              component={StudentNavigator}
              options={{
                title: 'TeenMind Student',
                animationTypeForReplace: 'push',
              }}
            />
          ) : (
            <RootStack.Screen
              name="ParentMain"
              component={ParentNavigator}
              options={{
                title: 'TeenMind Parent',
                animationTypeForReplace: 'push',
              }}
            />
          )
        ) : (
          // User is not authenticated - show auth screens
          <RootStack.Screen
            name="Auth"
            component={AuthNavigator}
            options={{
              title: 'Authentication',
              animationTypeForReplace: 'pop',
            }}
          />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

// Hook for accessing navigation in nested components
export { useNavigation } from '@react-navigation/native';