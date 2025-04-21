import React from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Import route names to ensure consistency
import { ROUTES } from '../navigation';

// Dimensions to help with responsive design
const { width, height } = Dimensions.get('window');

// Colors based on the design
const COLORS = {
  background: 'white',
  primary: '#007bff',
  yellow: '#FFD700',
  blue: '#0D47A1',
  grayButton: '#E0E0E0',
  yellowButton: '#FFC107'
};

const JoinBrimaScreen = () => {
  const navigation = useNavigation();

  // Render decorative tiles using specific layer images
  const renderDecorationTiles = () => {
    const tiles = [
      { 
        top: height * 0.05, 
        left: width * 0.1, 
        source: require('../assets/images/Layer_1.png'),
        rotation: '0deg'
      },
      { 
        top: height * 0.15, 
        left: width * 0.6, 
        source: require('../assets/images/Layer_2.png'),
        rotation: '45deg'
      },
      { 
        top: height * 0.25, 
        left: width * 0.2, 
        source: require('../assets/images/Layer_3.png'),
        rotation: '90deg'
      },
      { 
        top: height * 0.35, 
        left: width * 0.7, 
        source: require('../assets/images/Layer_1.png'),
        rotation: '135deg'
      },
      { 
        top: height * 0.45, 
        left: width * 0.3, 
        source: require('../assets/images/Layer_2.png'),
        rotation: '180deg'
      },
    ];

    return tiles.map((tile, index) => (
      <Image 
        key={index}
        source={tile.source}
        style={{
          position: 'absolute',
          top: tile.top,
          left: tile.left,
          width: 70,
          height: 70,
          opacity: 0.5,
          transform: [{ rotate: tile.rotation }]
        }}
        resizeMode="contain"
      />
    ));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      {renderDecorationTiles()}

      <View style={styles.logoContainer}>
        <Image 
          source={require('../assets/images/brimaIcon.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.logoText}>Brima</Text>
      </View>

      <View style={styles.contentContainer}>
        <Image 
          source={require('../assets/images/joinBrima.png')}
          style={styles.titleImage}
          resizeMode="contain"
        />
        <Text style={styles.subtitleText}>
          Uncover unique Tunisian handmade treasures. 
          Empower local artisans and shop responsibly.
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => navigation.navigate(ROUTES.LOGIN)}
          >
            <Text style={styles.signInText}>Sign in</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.signUpButton}
            onPress={() => navigation.navigate(ROUTES.SIGNUP)}
          >
            <Text style={styles.signUpText}>Sign up</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            New to Brima? Create an account to start exploring.
          </Text>
          <Text style={styles.footerText}>
            Already have an account? Log in to continue your journey.
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    overflow: 'hidden'
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: height * 0.1,
    marginBottom: 20,
  },
  logo: {
    width: 100,
    height: 100,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.blue,
    marginTop: 10,
  },
  contentContainer: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  titleImage: {
    width: 200,
    height: 50,
    marginBottom: 15,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  signInButton: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 15,
    backgroundColor: COLORS.grayButton,
    borderRadius: 8,
    alignItems: 'center',
  },
  signUpButton: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 15,
    backgroundColor: COLORS.yellowButton,
    borderRadius: 8,
    alignItems: 'center',
  },
  signInText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 16,
  },
  signUpText: {
    color: 'black',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footerContainer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 5,
  },
});

export default JoinBrimaScreen;