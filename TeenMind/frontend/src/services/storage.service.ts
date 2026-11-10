import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'teenmind_auth_token';
const USER_KEY = 'teenmind_user_data';

export class StorageService {
  // Token management
  static async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Error storing token:', error);
      throw new Error('Failed to store authentication token');
    }
  }

  static async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error retrieving token:', error);
      return null;
    }
  }

  static async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  // User data management
  static async setUser(user: any): Promise<void> {
    try {
      const userData = JSON.stringify(user);
      await AsyncStorage.setItem(USER_KEY, userData);
    } catch (error) {
      console.error('Error storing user data:', error);
      throw new Error('Failed to store user data');
    }
  }

  static async getUser(): Promise<any | null> {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error retrieving user data:', error);
      return null;
    }
  }

  static async removeUser(): Promise<void> {
    try {
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Error removing user data:', error);
    }
  }

  // Clear all app data (logout)
  static async clearAll(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);
    } catch (error) {
      console.error('Error clearing app data:', error);
    }
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    try {
      const token = await StorageService.getToken();
      const user = await StorageService.getUser();
      return !!(token && user);
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  }

  // Store app preferences (for future use)
  static async setPreference(key: string, value: any): Promise<void> {
    try {
      const prefKey = `teenmind_pref_${key}`;
      await AsyncStorage.setItem(prefKey, JSON.stringify(value));
    } catch (error) {
      console.error(`Error storing preference ${key}:`, error);
    }
  }

  static async getPreference(key: string): Promise<any | null> {
    try {
      const prefKey = `teenmind_pref_${key}`;
      const value = await AsyncStorage.getItem(prefKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error retrieving preference ${key}:`, error);
      return null;
    }
  }

  // Debug: Get all stored keys
  static async getAllKeys(): Promise<string[]> {
    try {
      return await AsyncStorage.getAllKeys();
    } catch (error) {
      console.error('Error getting all keys:', error);
      return [];
    }
  }

  // Clear specific preference
  static async removePreference(key: string): Promise<void> {
    try {
      const prefKey = `teenmind_pref_${key}`;
      await AsyncStorage.removeItem(prefKey);
    } catch (error) {
      console.error(`Error removing preference ${key}:`, error);
    }
  }
}