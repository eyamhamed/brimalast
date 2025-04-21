// src/services/productService.js
import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to identify physical devices vs emulators/simulators
const deviceIsPhysical = () => {
  if (Platform.OS === 'android') {
    return !Platform.constants.Brand?.includes('google');
  }
  return Platform.constants.utsname?.machine?.indexOf('simulator') === -1;
};

// Determine the appropriate base URL for API calls based on environment
const getApiBaseUrl = () => {
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
    
    // For physical devices, use the local network IP
    return 'http://192.168.12.198:5000/api'; // Updated with your correct IP

  }
  
  // Production environment
  return 'https://api.brimasouk.com/api';
};

class ProductService {
  constructor() {
    this.baseUrl = getApiBaseUrl();
    this.initializeAxios();
    console.log('ProductService initialized with baseUrl:', this.baseUrl);
  }

  // Initialize Axios with configuration
  initializeAxios() {
    // Create axios instance with configuration
    const axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000, // 10-second timeout
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Request interceptor to add auth token
    axiosInstance.interceptors.request.use(
      async (config) => {
        // Add auth token to request if available
        try {
          const token = await AsyncStorage.getItem('userToken');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.log('Error getting token for request:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for better error handling
    axiosInstance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        if (error.response) {
          console.error('API Error Response:', {
            status: error.response.status,
            data: error.response.data
          });
        } else if (error.request) {
          console.error('API Request Error (No Response):', error.request);
        } else {
          console.error('API Error:', error.message);
        }
        return Promise.reject(error);
      }
    );

    this.axios = axiosInstance;
  }

  // Get products by section (recommended, bestsellers, new)
  async getProductsBySection(section, limit = 8) {
    try {
      console.log(`🔍 Fetching ${section} products...`);
      const response = await this.axios.get(`/products/sections/${section}?limit=${limit}`);
      console.log(`✅ Fetched ${response.data.length} ${section} products`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching ${section} products:`, error.response?.data || error.message);
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  }

  // Get products with filters
  async getProducts(filters = {}) {
    try {
      console.log('🔍 Fetching products with filters:', filters);
      const response = await this.axios.get('/products', { params: filters });
      console.log(`✅ Fetched ${response.data.products.length} products`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching products:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get a single product
  async getProduct(productId) {
    try {
      console.log(`🔍 Fetching product details for ID: ${productId}`);
      const response = await this.axios.get(`/products/${productId}`);
      console.log('✅ Fetched product details');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching product details:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get products by category
  async getProductsByCategory(category, page = 1, limit = 10) {
    try {
      console.log(`🔍 Fetching products for category: ${category}`);
      const response = await this.axios.get(`/products/category/${category}`, {
        params: { page, limit }
      });
      console.log(`✅ Fetched ${response.data.products.length} products for category ${category}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching category products:`, error.response?.data || error.message);
      throw error;
    }
  }

  // For artisans: Create a new product
  async createProduct(productData) {
    try {
      console.log('📝 Creating new product...');
      const response = await this.axios.post('/products', productData);
      console.log('✅ Product created successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error creating product:', error.response?.data || error.message);
      throw error;
    }
  }

  // For artisans: Update an existing product
  async updateProduct(productId, productData) {
    try {
      console.log(`📝 Updating product ${productId}...`);
      const response = await this.axios.put(`/products/${productId}`, productData);
      console.log('✅ Product updated successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error updating product:', error.response?.data || error.message);
      throw error;
    }
  }

  // For artisans: Delete a product
  async deleteProduct(productId) {
    try {
      console.log(`🗑️ Deleting product ${productId}...`);
      const response = await this.axios.delete(`/products/${productId}`);
      console.log('✅ Product deleted successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting product:', error.response?.data || error.message);
      throw error;
    }
  }

  // For artisans: Get dashboard products
  async getArtisanProducts(status, page = 1, limit = 10) {
    try {
      console.log(`🔍 Fetching artisan products with status: ${status || 'all'}`);
      const response = await this.axios.get('/products/dashboard/artisan', {
        params: { status, page, limit }
      });
      console.log(`✅ Fetched artisan products`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching artisan products:', error.response?.data || error.message);
      throw error;
    }
  }

  // Check API health
  async checkHealth() {
    try {
      const response = await this.axios.get('/products/health/check');
      return response.data;
    } catch (error) {
      console.error('API Health check failed:', error.message);
      return { status: 'error', message: error.message };
    }
  }
}

// Export singleton instance
export default new ProductService();