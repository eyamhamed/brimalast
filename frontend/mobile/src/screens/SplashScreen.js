import React, { useEffect, useState } from 'react';
import { 
  View, 
  Image, 
  StyleSheet, 
  Dimensions, 
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Text
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const navigation = useNavigation();
  const [timerComplete, setTimerComplete] = useState(false);

  useEffect(() => {
    console.log('SplashScreen mounted, setting up timer');
    
    const timer = setTimeout(() => {
      console.log('Timer finished, attempting to navigate to JoinBrima');
      setTimerComplete(true);
      try {
        navigation.replace('JoinBrima');
        console.log('Navigation command executed');
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }, 5000); // Increased to 5 seconds for debugging

    return () => {
      console.log('Cleaning up timer');
      clearTimeout(timer);
    };
  }, [navigation]);

  const handleManualNavigation = () => {
    console.log('Manual navigation button pressed');
    try {
      navigation.replace('JoinBrima');
      console.log('Manual navigation executed');
    } catch (error) {
      console.error('Manual navigation error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="#FFFFFF" 
      />
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/images/brimaIcon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        {timerComplete && (
          <Text style={styles.debugText}>
            Timer completed but navigation failed. Try the button below.
          </Text>
        )}
        <TouchableOpacity 
          style={styles.navButton}
          onPress={handleManualNavigation}
        >
          <Text style={styles.buttonText}>Go to Join Brima (Debug)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.7,
    height: height * 0.3,
    maxWidth: 300,
    maxHeight: 300,
  },
  debugText: {
    marginTop: 20,
    color: 'red',
    textAlign: 'center',
    padding: 10,
  },
  navButton: {
    marginTop: 20,
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  }
});

export default SplashScreen;