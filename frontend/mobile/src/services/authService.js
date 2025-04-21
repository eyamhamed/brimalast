import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import NetInfo from "@react-native-community/netinfo";

/**
 * Helper function to identify physical devices vs emulators/simulators
 */
const deviceIsPhysical = () => {
  if (Platform.OS === 'android') {
    return !Platform.constants.Brand?.includes('google');
  }
  return Platform.constants.utsname?.machine?.indexOf('simulator') === -1;
};

/**
 * Determine the appropriate base URL for API calls based on environment
 */
const getApiBaseUrl = () => {
  // Log device information for debugging
  console.log('Running on platform:', Platform.OS);
  console.log('Is running in dev mode:', __DEV__);
  console.log('Is physical device:', deviceIsPhysical());
  
  // Environment specific configuration
  if (__DEV__) {
    // Development environment
    if (Platform.OS === 'android' && !deviceIsPhysical()) {
      // Android emulator uses 10.0.2.2 to access host machine's localhost
      return 'http://10.0.2.2:5000/api';
    } else if (Platform.OS === 'ios' && !deviceIsPhysical()) {
      // iOS simulator can use localhost
      return 'http://localhost:5000/api';
    }
    
    // For physical devices, try multiple IPs in case one doesn't work
    // IMPORTANT: This should ideally be configured via environment variables
    const possibleIPs = [
      'http://192.168.12.198:5000/api', // Your original IP
      'http://192.168.1.100:5000/api',    // Common home network IP
      'http://192.168.0.100:5000/api',    // Another common IP range
      'http://127.0.0.1:5000/api'         // Last resort, might work in some cases
    ];
    
    console.log('Available development IPs:', possibleIPs);
    
    // Return the first IP as default but we'll try them all in testConnection
    return possibleIPs[0];
  }
  
  // Production environment - use your actual API endpoint
  return 'https://api.brimasouk.com/api';
};

class AuthService {
  constructor() {
    this.baseUrl = getApiBaseUrl();
    this.initializeAxios();
    this.possibleIPs = [
      'http://192.168.12.198:5000/api',
      'http://192.168.1.100:5000/api'
    ];
    this.currentIPIndex = 0;
  }

  /**
   * Initialize Axios with Advanced Configuration
   */
  initializeAxios() {
    console.log('📡 [Auth Service] Initializing with base URL:', this.baseUrl);
    
    // Create axios instance with comprehensive configuration
    const axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000, // 30-second timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Request interceptor with better error handling
    axiosInstance.interceptors.request.use(
      async (config) => {
        console.log(`📤 [Auth Service] Request: ${config.method} ${config.url}`);
        
        // Add auth token to request if it exists
        try {
          const token = await AsyncStorage.getItem('userToken');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.warn('Token retrieval failed:', error.message);
        }
        
        return config;
      },
      (error) => {
        console.error('❌ [Auth Service] Request Error:', error.message);
        return Promise.reject(error);
      }
    );

    // Response interceptor with better error handling
    axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`📥 [Auth Service] Response: ${response.status}`);
        return response;
      },
      (error) => {
        this.logDetailedError(error);
        
        // Special handling for status 401 (Unauthorized)
        if (error.response && error.response.status === 401) {
          // Clear invalid auth data
          this.clearAuthData();
        }
        
        return Promise.reject(error);
      }
    );

    // Replace default axios with configured instance
    this.axios = axiosInstance;
  }

  /**
   * Clear auth data in case of unauthorized responses
   */
  async clearAuthData() {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userProfile');
      delete this.axios.defaults.headers.common['Authorization'];
      console.log('🔄 [Auth Service] Cleared auth data due to unauthorized response');
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }

  /**
   * Log detailed error information
   */
  logDetailedError(error) {
    console.error('❌ [Auth Service] Error:', {
      message: error.message,
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });
    
    // If no response, log more network details
    if (!error.response) {
      console.error('Network error details:', {
        timeout: error.code === 'ECONNABORTED',
        noInternet: error.message.includes('Network Error')
      });
    }
  }

  /**
   * Try multiple IP addresses to find a working connection
   * This helps with development on different networks
   */
  async tryMultipleIPs(endpoint) {
    for (let i = 0; i < this.possibleIPs.length; i++) {
      const currentURL = `${this.possibleIPs[i]}${endpoint}`;
      console.log(`🔄 Trying URL ${i+1}/${this.possibleIPs.length}: ${currentURL}`);
      
      try {
        const response = await axios.get(currentURL, { timeout: 3000 });
        if (response.status === 200) {
          console.log(`✅ Found working IP: ${this.possibleIPs[i]}`);
          
          // Update the baseURL for future requests
          this.baseUrl = this.possibleIPs[i];
          this.axios.defaults.baseURL = this.baseUrl;
          
          return true;
        }
      } catch (err) {
        console.log(`❌ IP ${this.possibleIPs[i]} failed: ${err.message}`);
      }
    }
    
    console.error('❌ All IP addresses failed');
    return false;
  }

  /**
   * Network connection test to validate API connectivity
   */
  async testConnection() {
    try {
      // Log network state first
      const netInfo = await NetInfo.fetch();
      console.log('🌐 Network status:', {
        type: netInfo.type,
        isConnected: netInfo.isConnected,
        isInternetReachable: netInfo.isInternetReachable
      });
      
      if (!netInfo.isConnected) {
        return { success: false, message: 'No network connection' };
      }
      
      // Try the current configured URL first
      try {
        console.log('🔗 Testing connection to:', `${this.baseUrl}/health`);
        const response = await this.axios.get('/health', { timeout: 5000 });
        console.log('✅ Connection successful:', response.status);
        return { success: true, message: 'Connection successful' };
      } catch (initialError) {
        console.warn('Initial connection failed:', initialError.message);
        
        // If that fails, try other IPs (only in dev mode)
        if (__DEV__ && deviceIsPhysical()) {
          console.log('🔄 Trying alternative IPs...');
          const foundWorking = await this.tryMultipleIPs('/health');
          
          if (foundWorking) {
            return { success: true, message: 'Connection successful with alternative IP' };
          }
        }
        
        // All attempts failed
        throw initialError;
      }
    } catch (error) {
      console.error('❌ Connection test failed:', error.message);
      return { 
        success: false, 
        message: 'Connection failed', 
        error: error.message 
      };
    }
  }

  /**
   * Signup Method with Enhanced Error Handling
   */
  async signup(userData) {
    try {
      // Test connection before attempting signup
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        throw new Error(`Connection test failed: ${connectionTest.message}`);
      }
      
      console.log('🔄 [Auth Service] Attempting signup');
      
      const response = await this.axios.post('/auth/signup', {
        fullName: userData.fullName,
        email: userData.email,
        password: userData.password,
        role: userData.role || 'user'
      });
      
      console.log('✅ [Auth Service] Signup successful');
      await this.saveAuthData(response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [Auth Service] Signup failed:', error.message);
      
      // Provide specific error message based on error type
      if (error.response) {
        // The server responded with an error status
        const errorMsg = error.response.data.message || 'Server returned an error';
        throw new Error(errorMsg);
      } else if (error.request) {
        // No response received from the server
        throw new Error('No response from server. Please check your network connection.');
      } else {
        // Error in the request setup
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  /**
   * Login Method with Enhanced Handling
   */
  async login(email, password) {
    try {
      // Validate inputs first
      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      // Test connection before attempting login
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        throw new Error(`Cannot connect to server: ${connectionTest.message}`);
      }
      
      console.log('🔄 [Auth Service] Attempting login for:', email);
      
      // Ensure email is lowercase for consistency
      const normalizedEmail = email.toLowerCase().trim();
      
      // Try the direct authentication request
      const response = await this.axios.post('/auth/signin', {
        email: normalizedEmail,
        password
      });
      
      console.log('✅ [Auth Service] Login successful:', {
        userId: response.data.user?.id,
        hasToken: !!response.data.token
      });
      
      // Validate the response contains what we expect
      if (!response.data.token || !response.data.user) {
        throw new Error('Invalid server response: missing authentication data');
      }
      
      // Save the authentication data
      await this.saveAuthData(response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [Auth Service] Login failed:', error.message);
      
      // Forward the error with improved messages
      if (error.response) {
        const errorData = error.response.data;
        const errorMsg = errorData.message || 'Authentication failed';
        
        // Enhanced error with context
        const enhancedError = new Error(errorMsg);
        enhancedError.status = error.response.status;
        
        // For field-specific errors
        if (errorData.field) {
          enhancedError.field = errorData.field;
          
          if (errorData.field === 'email') {
            enhancedError.message = 'The email you entered doesn\'t exist or is incorrect';
          } else if (errorData.field === 'password') {
            enhancedError.message = 'The password you entered is incorrect';
          }
        }
        
        throw enhancedError;
      } else if (error.request) {
        // No response received from the server
        throw new Error('Cannot reach the server. Please check your internet connection and try again.');
      } else {
        // Error in the request setup
        throw new Error(`Login failed: ${error.message}`);
      }
    }
  }

  /**
   * Debug login method - use this for troubleshooting
   */
  async debugLogin(email, password) {
    try {
      // Log the exact URL we're using
      const fullUrl = `${this.baseUrl}/auth/signin`;
      console.log('🔍 [DEBUG] Login request URL:', fullUrl);
      console.log('🔍 [DEBUG] Credentials:', { email, passwordProvided: !!password });
      
      // Use fetch to send raw request
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });
      
      const responseText = await response.text();
      console.log('🔍 [DEBUG] Response status:', response.status);
      console.log('🔍 [DEBUG] Response headers:', Object.fromEntries([...response.headers.entries()]));
      console.log('🔍 [DEBUG] Response text:', responseText);
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { text: responseText };
      }
      
      return {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        data: responseData
      };
    } catch (error) {
      console.error('🔍 [DEBUG] Raw login error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Save Authentication Data to AsyncStorage
   */
  async saveAuthData(data) {
    try {
      console.log('💾 [Auth Service] Saving auth data');
      
      // Save JWT token
      await AsyncStorage.setItem('userToken', data.token);
      
      // Save user profile
      await AsyncStorage.setItem('userProfile', JSON.stringify(data.user));

      // Set authorization header for future requests
      this.axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      
      console.log('✅ [Auth Service] Auth data saved successfully');
      return true;
    } catch (error) {
      console.error('❌ [Auth Service] Error saving auth data:', error.message);
      throw new Error('Could not save authentication data');
    }
  }

  /**
   * Check if User is Authenticated
   */
  async isAuthenticated() {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const isAuth = !!token;
      
      if (isAuth) {
        // Set the auth header with the stored token
        this.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      return isAuth;
    } catch (error) {
      console.error('❌ [Auth Service] Error checking authentication:', error.message);
      return false;
    }
  }

  /**
   * Get Current User from AsyncStorage
   */
  async getCurrentUser() {
    try {
      const userProfile = await AsyncStorage.getItem('userProfile');
      return userProfile ? JSON.parse(userProfile) : null;
    } catch (error) {
      console.error('❌ [Auth Service] Error getting current user:', error.message);
      return null;
    }
  }

  /**
   * Logout Method
   */
  async logout() {
    try {
      console.log('🔄 [Auth Service] Logging out');
      
      // Remove token and user profile
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userProfile');
      
      // Remove authorization header
      delete this.axios.defaults.headers.common['Authorization'];
      
      console.log('✅ [Auth Service] Logout successful');
      return true;
    } catch (error) {
      console.error('❌ [Auth Service] Logout error:', error.message);
      throw new Error('Could not logout');
    }
  }
}

// Export singleton instance
export default new AuthService();