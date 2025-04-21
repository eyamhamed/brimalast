import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  StatusBar,
  FlatList,
  Dimensions,
  Animated,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import authService from '../services/authService';
import productService from '../services/productService'; // Import the product service
import Icon from 'react-native-vector-icons/Ionicons';

// Constantes pour les dimensions
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 60) / 2;

// Images pour le banner dynamique
const bannerImages = [
  require('../assets/banner.jpg'),
  require('../assets/banner2.jpg'),
  require('../assets/banner3.jpg'),
  require('../assets/banner4.jpg'),
  require('../assets/banner5.jpg')
];

// Données simulées pour les catégories
const categories = [
  { id: 1, name: 'Femmes', icon: require('../assets/icons/women.png'), value: 'Women' },
  { id: 2, name: 'Hommes', icon: require('../assets/icons/men.png'), value: 'Men' },
  { id: 3, name: 'Enfants', icon: require('../assets/icons/kids.png'), value: 'Kids' },
  { id: 4, name: 'Maison', icon: require('../assets/icons/home.png'), value: 'Home' },
  { id: 5, name: 'Cadeaux', icon: require('../assets/icons/gift.png'), value: 'Gifts' },
  { id: 6, name: 'Beauté', icon: require('../assets/icons/beauty.png'), value: 'Beauty' },
];

const MainScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerFlatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  
  // State for dynamic products
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [bestsellerProducts, setBestsellerProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Load user data on component mount
  useEffect(() => {
    console.log('Main screen mounted');
    
    const loadUserData = async () => {
      try {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    
    loadUserData();
  }, []);

  // Load products on component mount
  useEffect(() => {
    loadAllProducts();
  }, []);

  // Function to load all product sections
  const loadAllProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load products for each section in parallel
      const [recommended, bestsellers, newItems] = await Promise.all([
        productService.getProductsBySection('recommended'),
        productService.getProductsBySection('bestsellers'),
        productService.getProductsBySection('new')
      ]);
      
      console.log('Fetched recommended products:', recommended?.length || 0);
      console.log('Fetched bestseller products:', bestsellers?.length || 0);
      console.log('Fetched new products:', newItems?.length || 0);
      
      setRecommendedProducts(recommended || []);
      setBestsellerProducts(bestsellers || []);
      setNewProducts(newItems || []);
    } catch (error) {
      console.error('Error loading products:', error);
      setError('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Function to handle pull-to-refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadAllProducts();
  };

  // Effet pour le défilement automatique du banner
  useEffect(() => {
    const autoScrollTimer = setInterval(() => {
      // Calculer le prochain index
      const nextIndex = (currentBannerIndex + 1) % bannerImages.length;
      
      // Faire défiler vers le prochain banner
      if (bannerFlatListRef.current) {
        bannerFlatListRef.current.scrollToIndex({
          index: nextIndex,
          animated: true
        });
      }
      
      // Mettre à jour l'index actuel
      setCurrentBannerIndex(nextIndex);
    }, 2000); // Changer le banner toutes les 2 secondes
    
    // Nettoyer le timer lors du démontage du composant
    return () => clearInterval(autoScrollTimer);
  }, [currentBannerIndex]);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              // Navigate to JoinBrima screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'JoinBrima' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Navigate to product details
  const navigateToProductDetails = (product) => {
    navigation.navigate('ProductDetails', { productId: product.id });
  };
  
  // Navigate to category
  const navigateToCategory = (category) => {
    navigation.navigate('CategoryProducts', { category: category.value });
  };

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.categoryItem}
      onPress={() => navigateToCategory(item)}
    >
      <Image source={item.icon} style={styles.categoryIcon} />
      <Text style={styles.categoryLabel}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderBannerItem = ({ item }) => (
    <Image
      source={item}
      style={styles.bannerImage}
      resizeMode="cover"
    />
  );

  const renderDotIndicator = () => {
    return (
      <View style={styles.paginationDots}>
        {bannerImages.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: index === currentBannerIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)' }
            ]}
          />
        ))}
      </View>
    );
  };

  const renderProductItem = ({ item }) => {
    // Default image if none provided
    const productImage = item.images && item.images.length > 0 
      ? { uri: item.images[0] } 
      : require('../assets/icons/women.png');
    
    // Handle discounted price if applicable
    const displayPrice = item.discountPercentage > 0 && item.discountedPrice 
      ? item.discountedPrice 
      : item.price;
    
    return (
      <TouchableOpacity 
        style={styles.productCard}
        onPress={() => navigateToProductDetails(item)}
      >
        <Image 
          source={productImage} 
          style={styles.productImage}
          defaultSource={require('../assets/icons/women.png')}
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.productRating}>
            <Icon name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{item.ratings || 0}</Text>
          </View>
          <Text style={styles.productPrice}>{displayPrice.toFixed(2)} DT</Text>
          
          {item.discountPercentage > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>-{item.discountPercentage}%</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderProductSection = (title, data, onSeeAllPress) => (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity onPress={onSeeAllPress}>
          <Text style={styles.seeAllText}>Voir tout</Text>
        </TouchableOpacity>
      </View>
      
      {data.length > 0 ? (
        <FlatList
          data={data}
          renderItem={renderProductItem}
          keyExtractor={item => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productList}
        />
      ) : loading ? (
        <ActivityIndicator style={styles.sectionLoader} color="#0047AB" />
      ) : (
        <View style={styles.emptyProductList}>
          <Text style={styles.emptyText}>No products available</Text>
        </View>
      )}
    </View>
  );

  // Show loading indicator while initial loading
  if (loading && !refreshing && !recommendedProducts.length && !bestsellerProducts.length && !newProducts.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0047AB" />
        <Text style={styles.loadingText}>Loading products...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />
      
      {/* Header with search bar */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Icon name="search-outline" size={20} color="#757575" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={18} color={searchQuery ? "#757575" : "transparent"} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.cartButton}>
          <Icon name="cart-outline" size={24} color="#0047AB" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#0047AB"]}
          />
        }
      >
        {/* Display error if there was a problem loading products */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadAllProducts}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      
        {/* Banner Carousel */}
        <View style={styles.bannerContainer}>
          <FlatList
            ref={bannerFlatListRef}
            data={bannerImages}
            renderItem={renderBannerItem}
            keyExtractor={(_, index) => `banner-${index}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentBannerIndex(index);
            }}
          />
          {renderDotIndicator()}
        </View>

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={item => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Product Sections - Using dynamic data */}
        {renderProductSection(
          'Recommandé pour vous', 
          recommendedProducts,
          () => navigation.navigate('ProductList', { title: 'Recommandé pour vous', section: 'recommended' })
        )}
        
        {renderProductSection(
          'Best-sellers', 
          bestsellerProducts,
          () => navigation.navigate('ProductList', { title: 'Best-sellers', section: 'bestsellers' })
        )}
        
        {renderProductSection(
          'Nouveautés', 
          newProducts,
          () => navigation.navigate('ProductList', { title: 'Nouveautés', section: 'new' })
        )}

      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navIconContainer}>
            <Icon name="home" size={24} color="#FFBF00" />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Icon name="heart-outline" size={24} color="#757575" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Icon name="person-outline" size={24} color="#757575" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333333',
    height: 40,
  },
  cartButton: {
    marginLeft: 10,
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#0047AB',
  },
  sectionLoader: {
    padding: 20,
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 8,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#0047AB',
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  bannerContainer: {
    height: 180,
    position: 'relative',
    marginVertical: 10,
  },
  bannerImage: {
    width: SCREEN_WIDTH,
    height: 180,
  },
  paginationDots: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 15,
    alignSelf: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  categoriesContainer: {
    marginVertical: 15,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  categoryLabel: {
    marginTop: 5,
    fontSize: 12,
    color: '#333333',
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#0047AB',
  },
  productList: {
    paddingHorizontal: 16,
  },
  emptyProductList: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#757575',
    fontStyle: 'italic',
  },
  productCard: {
    width: 150,
    marginRight: 15,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 5,
    height: 40,
  },
  productRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  ratingText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFBF00',
  },
  discountBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#0047AB',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MainScreen;