import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import productService from '../services/productService';
import Icon from 'react-native-vector-icons/Ionicons';

const ProductDetailsScreen = ({ route, navigation }) => {
  const { productId } = route.params;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProductDetails();
  }, []);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      console.log('Loading product details for ID:', productId);
      const productData = await productService.getProduct(productId);
      console.log('Product data received:', productData);
      setProduct(productData);
    } catch (err) {
      console.error('Error loading product details:', err);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0047AB" />
        <Text style={styles.loadingText}>Loading product details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProductDetails}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {product.images && product.images.length > 0 ? (
          <Image 
            source={{ uri: product.images[0] }} 
            style={styles.productImage}
          />
        ) : (
          <View style={styles.noImageContainer}>
            <Icon name="image-outline" size={48} color="#CCCCCC" />
            <Text style={styles.noImageText}>No image available</Text>
          </View>
        )}
        
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          
          <View style={styles.priceRatingRow}>
            <Text style={styles.productPrice}>
              {product.discountPercentage > 0 
                ? product.discountedPrice?.toFixed(2) 
                : product.price?.toFixed(2)} DT
            </Text>
            
            <View style={styles.ratingContainer}>
              <Icon name="star" size={18} color="#FFD700" />
              <Text style={styles.ratingText}>{product.ratings || 0}</Text>
              <Text style={styles.reviewCount}>({product.totalReviews || 0} reviews)</Text>
            </View>
          </View>
          
          {product.discountPercentage > 0 && (
            <View style={styles.discountContainer}>
              <Text style={styles.originalPrice}>{product.price?.toFixed(2)} DT</Text>
              <Text style={styles.discountBadge}>-{product.discountPercentage}%</Text>
            </View>
          )}
          
          <Text style={styles.categoryLabel}>Category: <Text style={styles.categoryValue}>{product.category}</Text></Text>
          
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>
          
          {product.materials && product.materials.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Materials</Text>
              <View style={styles.materialsList}>
                {product.materials.map((material, index) => (
                  <View key={index} style={styles.materialItem}>
                    <Text style={styles.materialText}>{material}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
          
          <TouchableOpacity style={styles.addToCartButton}>
            <Text style={styles.addToCartButtonText}>Add to Cart</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#0047AB',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0047AB',
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  productImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  noImageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#999999',
    marginTop: 10,
  },
  productInfo: {
    padding: 16,
  },
  productName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 10,
  },
  priceRatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFBF00',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginLeft: 5,
  },
  reviewCount: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 5,
  },
  discountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  originalPrice: {
    fontSize: 16,
    color: '#757575',
    textDecorationLine: 'line-through',
    marginRight: 10,
  },
  discountBadge: {
    backgroundColor: '#FF3B30',
    color: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  categoryLabel: {
    fontSize: 16,
    marginBottom: 15,
    color: '#333333',
  },
  categoryValue: {
    fontWeight: '500',
    color: '#0047AB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
    marginTop: 15,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555555',
  },
  materialsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  materialItem: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  materialText: {
    fontSize: 14,
    color: '#333333',
  },
  addToCartButton: {
    backgroundColor: '#0047AB',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  addToCartButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProductDetailsScreen;