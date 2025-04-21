import React, { useEffect, useState, useRef } from 'react';
import { View, Text, LogBox, ActivityIndicator, Button } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import authService from '../services/authService'; // Import the auth service
import MainScreen from '../screens/MainScreen';
import ProductDetailsScreen from '../screens/ProductDetailsScreen';

// Suppress specific warnings
LogBox.ignoreLogs([
  'The action \'NAVIGATE\' with payload',
  'Sending `onAnimatedValueUpdate` with no listeners registered.',
]);

// Import screens - wrap these in try/catch to prevent crashes if files have issues
let SplashScreen, JoinBrimaScreen, LoginScreen, SignupScreen;

// Debugging wrapper component
const ScreenWithLogging = ({ WrappedComponent, screenName }) => {
  const navigation = useNavigation();

  useEffect(() => {
    console.log(`${screenName} screen mounted`);
    
    // Log available routes
    const unsubscribe = navigation.addListener('state', (e) => {
      console.log(`Navigation state for ${screenName}:`, JSON.stringify(e.data.state.routes, null, 2));
    });

    return unsubscribe;
  }, [navigation]);

  return <WrappedComponent />;
};

// Dev Mode Header for easy testing
const DevModeHeader = ({ onLogout, forceAuth, toggleForceAuth }) => {
  // Only show in development mode
  if (!__DEV__) return null;
  
  return (
    <View style={{ 
      position: 'absolute', 
      top: 0, 
      right: 0, 
      left: 0, 
      flexDirection: 'row', 
      justifyContent: 'space-between', 
      padding: 4,
      backgroundColor: '#FFC107',
      zIndex: 999
    }}>
      <Text style={{ fontSize: 10, color: '#333' }}>DEV MODE</Text>
      <View style={{ flexDirection: 'row' }}>
        <Button
          title={forceAuth ? "Disable Auth" : "Force Auth"}
          onPress={toggleForceAuth}
          color={forceAuth ? '#4CAF50' : '#F44336'}
        />
        <Button
          title="Logout"
          onPress={onLogout}
          color="#2196F3"
        />
      </View>
    </View>
  );
};

try {
  SplashScreen = require('../screens/SplashScreen').default;
} catch (error) {
  console.warn('Error loading SplashScreen:', error);
  SplashScreen = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <Text>Splash Screen (Fallback)</Text>
    </View>
  );
}

try {
  JoinBrimaScreen = require('../screens/JoinBrimaScreen').default;
} catch (error) {
  console.warn('Error loading JoinBrimaScreen:', error);
  JoinBrimaScreen = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <Text>Join Brima Screen (Fallback)</Text>
    </View>
  );
}

try {
  LoginScreen = require('../screens/auth/LoginScreen').default;
} catch (error) {
  console.warn('Error loading LoginScreen:', error);
  LoginScreen = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <Text>Login Screen (Fallback)</Text>
    </View>
  );
}

try {
  SignupScreen = require('../screens/auth/SignupScreen').default;
} catch (error) {
  console.warn('Error loading SignupScreen:', error);
  SignupScreen = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <Text>Signup Screen (Fallback)</Text>
    </View>
  );
}

const Stack = createStackNavigator();

// Route names as constants to prevent typos
export const ROUTES = {
  SPLASH: 'Splash',
  JOIN_BRIMA: 'JoinBrima',
  LOGIN: 'Login',
  SIGNUP: 'Signup',
  MAIN: 'Main',
  PRODUCT_DETAILS: 'ProductDetails'
};

const Navigation = () => {
  // Add state for authentication
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [forceAuth, setForceAuth] = useState(false); // Dev mode toggle for auth flow
  const navigationRef = useRef(null);

  // Function to handle logout
  const handleLogout = async () => {
    try {
      await authService.logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Toggle force auth mode (for development)
  const toggleForceAuth = () => {
    setForceAuth(prev => !prev);
  };

  // Check authentication state when component mounts
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        console.log('Checking authentication state...');
        // Use the authService to check if user is logged in
        const isAuth = await authService.isAuthenticated();
        console.log('Authentication state:', isAuth ? 'Authenticated' : 'Not authenticated');
        setIsAuthenticated(isAuth);
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthState();
  }, []);

  // Effectuer une redirection si nécessaire après avoir vérifié l'état d'authentification
  useEffect(() => {
    if (!isLoading && navigationRef.current) {
      // Si l'utilisateur n'est pas authentifié et tente d'accéder à MainScreen, rediriger vers JoinBrima
      if (!isAuthenticated && !forceAuth) {
        const state = navigationRef.current.getRootState();
        const currentRoute = state?.routes[state.index]?.name;
        
        if (currentRoute === ROUTES.MAIN) {
          navigationRef.current.reset({
            index: 0,
            routes: [{ name: ROUTES.JOIN_BRIMA }]
          });
        }
      }
    }
  }, [isAuthenticated, isLoading, forceAuth]);

  // Display a loading indicator while checking auth state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#0047AB" />
        <Text style={{ marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={(state) => {
        console.log('Navigation state changed:', 
          state?.routes?.map(route => ({
            name: route.name,
            key: route.key
          }))
        );
      }}
    >
      {/* Add Dev Mode Header */}
      <DevModeHeader 
        onLogout={handleLogout} 
        forceAuth={forceAuth} 
        toggleForceAuth={toggleForceAuth} 
      />
      
      <Stack.Navigator
        initialRouteName={(isAuthenticated && !forceAuth) ? ROUTES.MAIN : ROUTES.SPLASH}
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: 'white' },
          animationEnabled: true,
        }}
      >
        {/* Rendre tous les écrans disponibles, mais contrôler l'accès programmatiquement */}
        <Stack.Screen 
          name={ROUTES.SPLASH} 
          component={(props) => (
            <ScreenWithLogging 
              WrappedComponent={SplashScreen} 
              screenName="Splash" 
              {...props} 
            />
          )}
        />
        <Stack.Screen 
          name={ROUTES.JOIN_BRIMA} 
          component={(props) => (
            <ScreenWithLogging 
              WrappedComponent={JoinBrimaScreen} 
              screenName="JoinBrima" 
              {...props} 
            />
          )}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen 
          name={ROUTES.LOGIN} 
          component={(props) => (
            <ScreenWithLogging 
              WrappedComponent={LoginScreen} 
              screenName="Login" 
              {...props} 
            />
          )}
        />
        <Stack.Screen 
          name={ROUTES.SIGNUP} 
          component={(props) => (
            <ScreenWithLogging 
              WrappedComponent={SignupScreen} 
              screenName="Signup" 
              {...props} 
            />
          )}
        />
        <Stack.Screen 
          name={ROUTES.MAIN} 
          component={(props) => (
            <ScreenWithLogging 
              WrappedComponent={MainScreen} 
              screenName="Main" 
              {...props} 
            />
          )}
        />
        <Stack.Screen 
          name={ROUTES.PRODUCT_DETAILS} 
          component={ProductDetailsScreen} 
          options={({ route }) => ({ 
            title: route.params?.title || 'Product Details',
            headerShown: true
          })} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;