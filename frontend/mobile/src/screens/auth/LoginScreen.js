// src/screens/auth/LoginScreen.js

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import authService from '../../services/authService';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const navigation = useNavigation();

  const validateInputs = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateInputs()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Debug the values being sent
      console.log('Attempting login with:', { email, password: '******' });
      
      // Use the login method from your authService
      const response = await authService.login(email, password);
      
      // Login successful
      console.log('Login successful:', response);
      setIsLoading(false);
      
      // Au lieu de naviguer directement vers Main, réinitialisons la navigation
      // pour qu'elle recharge la configuration en fonction de l'état d'authentification
      navigation.reset({
        index: 0,
        routes: [{ name: 'Splash' }], // Retourner à l'écran Splash qui vérifiera l'authentification
      });
    } catch (error) {
      setIsLoading(false);
      
      // Show more detailed error info
      console.error('Login error details:', error);
      
      // Handle specific authentication errors
      if (error.message?.includes('Invalid credentials')) {
        Alert.alert(
          'Login Failed',
          'The email or password you entered is incorrect. Please try again.'
        );
      } else {
        // Display the error message
        Alert.alert(
          'Login Failed',
          error.message || 'Invalid credentials. Please try again.'
        );
      }
    }
  };

  const navigateToSignup = () => {
    navigation.navigate('Signup');
  };

  const navigateToForgotPassword = () => {
    // Implement this when you have a forgot password screen
    // navigation.navigate('ForgotPassword');
    Alert.alert('Coming Soon', 'Password reset functionality will be available soon.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, width: '100%' }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={styles.tilesContainer}>
            {/* Tile patterns could be added here */}
          </View>
          
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>
            Sign in to continue exploring authentic Tunisian crafts.
          </Text>
          
          <View style={styles.formContainer}>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              placeholder="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) {
                  setErrors({ ...errors, email: null });
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email ? (
              <Text style={styles.errorText}>{errors.email}</Text>
            ) : null}
            
            <View style={[styles.passwordContainer, errors.password ? styles.inputError : null]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors({ ...errors, password: null });
                  }
                }}
                secureTextEntry={!isPasswordVisible}
              />
              <TouchableOpacity 
                style={styles.eyeIcon}
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              >
                <Text>{isPasswordVisible ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
            
            <TouchableOpacity 
              style={styles.forgotPasswordButton}
              onPress={navigateToForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.loginButtonText}>Sign in</Text>
              )}
            </TouchableOpacity>
            
            <Text style={styles.orText}>Or</Text>
            
            <View style={styles.socialContainer}>
              <TouchableOpacity style={styles.socialButton}>
                <Text>📱</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Text>📘</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton}>
                <Text>🍎</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.signupLinkContainer}
              onPress={navigateToSignup}
            >
              <Text style={styles.signupLinkText}>
                Don't have an account? <Text style={styles.signupLink}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  tilesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '500',
    color: '#0047AB',
    marginTop: 100,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  formContainer: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  passwordContainer: {
    width: '100%',
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 15,
  },
  eyeIcon: {
    padding: 10,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#0047AB',
    fontSize: 12,
  },
  loginButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFBF00',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#000',
    fontWeight: '500',
  },
  orText: {
    color: '#666',
    marginVertical: 15,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  signupLinkContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  signupLinkText: {
    color: '#666',
  },
  signupLink: {
    color: '#0047AB',
    fontWeight: '500',
  },
});

export default LoginScreen;