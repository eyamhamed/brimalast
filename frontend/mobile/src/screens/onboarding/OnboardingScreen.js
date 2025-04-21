import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Define colors since the import may be failing
const colors = {
  primary: {
    main: '#0047AB', // Royal blue
  },
  secondary: {
    main: '#FFBF00', // Amber/Gold
  }
};

const onboardingData = [
  {
    id: '1',
    title: 'Authentic',
    subtitle: 'made with quality materials',
    // Remove image reference temporarily
  },
  {
    id: '2',
    title: 'Culture',
    subtitle: 'Experience authentic Tunisian craftsmanship',
    // Remove image reference temporarily
  },
  {
    id: '3',
    title: 'Sustainability',
    subtitle: 'Supporting local artisans and traditional techniques',
    // Remove image reference temporarily
  },
];

const OnboardingScreen = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const navigation = useNavigation();

  const renderTileBackground = () => {
    // Return colored placeholder instead of tiles
    return (
      <View style={[
        styles.tilesContainer, 
        { backgroundColor: currentIndex === 0 ? '#f0f8ff' : 
                         currentIndex === 1 ? '#fff8e0' : 
                         '#f0fff0' }
      ]} />
    );
  };

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    try {
      // Mark that the user has seen the onboarding
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      // Navigate to JoinBrima instead of Auth
      navigation.replace('JoinBrima');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      // In case of error, still navigate
      navigation.replace('JoinBrima');
    }
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.slide}>
        {renderTileBackground()}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </View>
        {/* Replace Image with a placeholder View */}
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderText}>Image Placeholder</Text>
        </View>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.paginationContainer}>
        <View style={styles.dotsContainer}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { opacity: index === currentIndex ? 1 : 0.5 }
              ]}
            />
          ))}
        </View>
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === onboardingData.length - 1 ? 'Start' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / width);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
      />
      {renderPagination()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  slide: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  tilesContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    opacity: 0.3,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 42,
    fontWeight: '700',
    color: colors.primary.main,
    marginBottom: 10,
    fontFamily: 'serif',
  },
  subtitle: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  imagePlaceholder: {
    width: width * 0.8,
    height: height * 0.4,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#555',
    fontSize: 18,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary.main,
    marginHorizontal: 4,
  },
  nextButton: {
    backgroundColor: colors.secondary.main,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OnboardingScreen;