import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar,
  Image,
  Dimensions,
  Alert,
  FlatList,
  RefreshControl
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import Footer from './footer/Footer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "react-native-axios";
import { CommonActions } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';

const { width, height } = Dimensions.get('window');

interface CabDetails {
  cabNumber: string;
  cabImage?: string;
}

interface Driver {
  name: string;
}

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  screen: string;
  description: string;
}

const ExpenseTracker: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const navigation = useNavigation();
  const [cabDetails, setCabDetails] = useState<CabDetails | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [assignedCabId, setAssignedCabId] = useState<string>("");
  const flatListRef = useRef<FlatList>(null);
  const [showImageCarousel, setShowImageCarousel] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [scrollPosition, setScrollPosition] = useState<number>(0);
  const [contentWidth, setContentWidth] = useState<number>(0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  
  const carImages = [
    require("../assets/cabexpensetwo.jpeg"),
    require("../assets/cabexpensethree.jpg"),
    require("../assets/cabexpensefour.jpg"),
  ];
  
  const categories: Category[] = [
    { 
      id: 1, 
      name: 'Location', 
      icon: 'map-marker-radius', 
      color: '#FF6B6B', 
      screen: 'Location',
      description: 'Track trip routes'
    },
    { 
      id: 2, 
      name: 'Odometer', 
      icon: 'speedometer', 
      color: '#4ECDC4', 
      screen: 'Odometer',
      description: 'Monitor distance'
    },
    { 
      id: 3, 
      name: 'Fuel', 
      icon: 'gas-station', 
      color: '#45B7D1', 
      screen: 'FuelStatus',
      description: 'Fuel expenses'
    },
    { 
      id: 4, 
      name: 'Service', 
      icon: 'car-wrench', 
      color: '#96CEB4', 
      screen: 'VehicleService',
      description: 'Vehicle maintenance'
    },
    { 
      id: 5, 
      name: 'Fast Tag', 
      icon: 'highway', 
      color: '#FFEAA7', 
      screen: 'FastTag',
      description: 'Toll payments'
    },
    { 
      id: 6, 
      name: 'Tyre', 
      icon: 'car-tire-alert', 
      color: '#FD79A8', 
      screen: 'TyrePuncture',
      description: 'Tyre issues'
    },
    { 
      id: 7, 
      name: 'Issues', 
      icon: 'alert-circle-outline', 
      color: '#E17055', 
      screen: 'ReportProblem',
      description: 'Report problems'
    },
  ];
  
  const handleCategoryPress = (screen: string) => {
    navigation.navigate(screen as never);
  };

  useEffect(() => {

   if (!showImageCarousel) return;
    const slideInterval = setInterval(() => {
      if (flatListRef.current) {
        const nextIndex = (currentImageIndex + 1) % carImages.length;
        flatListRef.current.scrollToIndex({
          index: nextIndex,
          animated: true
        });
        setCurrentImageIndex(nextIndex);
      }
    }, 4000);

    return () => clearInterval(slideInterval);
  }, [currentImageIndex,showImageCarousel]);

  useEffect(() => {
    fetchAssignedCab();
  }, []);

  const fetchAssignedCab = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (token) {
        const response = await axios.get("http://192.168.1.34:5000/api/assignCab/driver", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const assignedCab = response.data[0];
        setDriver(assignedCab?.driver);
        setCabDetails(assignedCab?.cab);
        setAssignedCabId(assignedCab._id);
      }
    } catch (error) {
      console.log("Error fetching cab details:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAssignedCab();
    } catch (error) {
      console.log("Error refreshing data:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: async () => {
            await AsyncStorage.removeItem("userToken");
            await AsyncStorage.removeItem("userid");
            await AsyncStorage.removeItem("savedLocationData");
            await AsyncStorage.removeItem("lastKnownPosition");
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            );
          },
        },
      ]
    );
  };
  
  const renderCarImage = ({ item }: { item: any }) => (
    <View style={styles.carSlide}>
      <Image 
        source={item} 
        style={styles.carImage} 
        resizeMode="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)']}
        style={styles.imageOverlay}
      >
        <View style={styles.imageContent}>
          <Text style={styles.imageTitle}>Smart Expense Tracking</Text>
          <Text style={styles.imageSubtitle}>Track every mile, save every penny</Text>
        </View>
      </LinearGradient>
    </View>
  );

  const handleTripComplete = () => {
    Alert.alert(
      "Complete Trip",
      "Are you sure you want to mark this trip as complete?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Complete", onPress: () => completeTrip() }
      ]
    );
  };
  
  const completeTrip = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
  
      if (token && assignedCabId) {
        const res = await axios.put(
          `http://192.168.1.34:5000/api/assigncab/complete/${assignedCabId}`,
          {}, 
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setCabDetails(null);
        setDriver(null);
        setAssignedCabId("");
        setShowImageCarousel(false);
        Alert.alert("Success", "Trip completed successfully!");
        await AsyncStorage.removeItem("savedLocationData");
      }
    } catch (error) {
      console.log("Error completing trip:", error);
    }
  };

  const renderCategoryCard = (category: Category, index: number) => (
    <TouchableOpacity 
      key={category.id}
      style={[styles.categoryCard, { 
        marginLeft: index === 0 ? 0 : 12,
        marginRight: index === categories.length - 1 ? 20 : 0 
      }]}
      onPress={() => handleCategoryPress(category.screen)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[category.color, category.color + 'DD']}
        style={styles.categoryGradient}
      >
        <View style={styles.categoryIconWrapper}>
          <View style={styles.categoryIconContainer}>
            <Icon name={category.icon} size={26} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.categoryTextContainer}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.categoryDescription}>{category.description}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a"  />
      
      {/* Premium Header */}
      <LinearGradient 
        colors={['#1e3a8a', '#3b82f6', '#60a5fa']}
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#ffffff', '#f8fafc']}
                style={styles.logoBackground}
              >
                <Icon name="wallet" size={24} color="#1e3a8a" />
              </LinearGradient>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Route Budget</Text>
              <Text style={styles.headerSubtitle}>Smart Trip Management</Text>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton} 
              onPress={() => navigation.navigate("Profile" as never)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#ffffff', '#f1f5f9']}
                style={styles.headerButtonGradient}
              >
                <Icon name="account-circle" size={20} color="#1e3a8a" />
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={styles.headerButtonGradient}
              >
                <Icon name="logout" size={18} color="#ffffff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.mainContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1e3a8a', '#3b82f6']}
            tintColor="#1e3a8a"
            title="Refreshing..."
            titleColor="#1e3a8a"
          />
        }
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroCard}>
            <View style={styles.galleryContainer}>
              <FlatList
                ref={flatListRef}
                data={carImages}
                renderItem={renderCarImage}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event) => {
                  const slideWidth = event.nativeEvent.layoutMeasurement.width;
                  const index = Math.floor(event.nativeEvent.contentOffset.x / slideWidth);
                  setCurrentImageIndex(index);
                }}
                onScrollToIndexFailed={(info) => {
                  const wait = new Promise(resolve => setTimeout(resolve, 500));
                  wait.then(() => {
                    flatListRef.current?.scrollToIndex({ 
                      index: info.index, 
                      animated: true 
                    });
                  });
                }}
              />
              
              <View style={styles.paginationContainer}>
                {carImages.map((_, index) => (
                  <View 
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === currentImageIndex ? styles.paginationDotActive : {}
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={styles.quickActionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <Text style={styles.sectionSubtitle}>Manage your trip expenses efficiently</Text>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
            style={styles.categoriesScrollView}
          >
            {categories.map((category, index) => renderCategoryCard(category, index))}
          </ScrollView>
        </View>

        {/* Cab Details Section */}
        <View style={styles.cabSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Ride</Text>
            <Text style={styles.sectionSubtitle}>Current vehicle assignment</Text>
          </View>
          
          {cabDetails && driver ? (
            <View style={styles.cabCard}>
              <LinearGradient
                colors={['#ffffff', '#f8fafc']}
                style={styles.cabCardGradient}
              >
                {cabDetails?.cabImage && (
                  <View style={styles.cabImageContainer}>
                    <Image 
                      source={{ uri: cabDetails.cabImage }} 
                      style={styles.cabImage} 
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.3)']}
                      style={styles.cabImageOverlay}
                    />
                  </View>
                )}
                
                <View style={styles.cabDetailsContainer}>
                  <View style={styles.cabInfoRow}>
                    <View style={styles.cabInfoItem}>
                      <View style={[styles.cabInfoIconBg, { backgroundColor: '#10b981' }]}>
                        <Icon name="account" size={16} color="#ffffff" />
                      </View>
                      <View style={styles.cabInfoTextContainer}>
                        <Text style={styles.cabInfoLabel}>Driver</Text>
                        <Text style={styles.cabInfoValue}>{driver.name}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.cabInfoDivider} />
                    
                    <View style={styles.cabInfoItem}>
                      <View style={[styles.cabInfoIconBg, { backgroundColor: '#3b82f6' }]}>
                        <Icon name="car" size={16} color="#ffffff" />
                      </View>
                      <View style={styles.cabInfoTextContainer}>
                        <Text style={styles.cabInfoLabel}>Vehicle</Text>
                        <Text style={styles.cabInfoValue}>{cabDetails?.cabNumber}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.noCabCard}>
              <LinearGradient
                colors={['#f8fafc', '#f1f5f9']}
                style={styles.noCabGradient}
              >
                <View style={styles.noCabContent}>
                  <View style={styles.noCabIconContainer}>
                    <Icon name="car-off" size={32} color="#94a3b8" />
                  </View>
                  <Text style={styles.noCabTitle}>No Vehicle Assigned</Text>
                  <Text style={styles.noCabSubtitle}>Please wait for vehicle assignment from admin</Text>
                </View>
              </LinearGradient>
            </View>
          )}
        </View>
        
        {/* Complete Trip Button */}
        {cabDetails && (
          <View style={styles.actionSection}>
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={handleTripComplete}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.completeButtonGradient}
              >
                <Icon name="check-circle-outline" size={22} color="#ffffff" />
                <Text style={styles.completeButtonText}>Complete Trip</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Premium Footer */}
      <LinearGradient 
        colors={['#1e3a8a', '#3b82f6']} 
        style={styles.footerContainer}
      >
        <Footer />
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // Header Styles
  header: {
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 1 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoContainer: {
    marginRight: 12,
  },
  logoBackground: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginLeft: 10,
  },
  headerButtonGradient: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  
  // Main Content
  mainContent: {
    flex: 1,
  },
  
  // Hero Section
  heroSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  heroCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  galleryContainer: {
    backgroundColor: '#ffffff',
  },
  carSlide: {
    width: width - 32,
    height: 200,
    position: 'relative',
  },
  carImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  imageContent: {
    alignItems: 'flex-start',
  },
  imageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  imageSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 3,
  },
  paginationDotActive: {
    backgroundColor: '#1e3a8a',
    width: 20,
    borderRadius: 3,
  },
  
  // Quick Actions
  quickActionsSection: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  categoriesScrollView: {
    paddingLeft: 16,
  },
  categoriesContainer: {
    paddingRight: 16,
  },
  categoryCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  categoryGradient: {
    width: 140,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  categoryIconWrapper: {
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryTextContainer: {
    alignItems: 'center',
  },
  categoryName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  
  // Cab Section
  cabSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  cabCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  cabCardGradient: {
    flex: 1,
  },
  cabImageContainer: {
    height: 160,
    position: 'relative',
  },
  cabImage: {
    width: '100%',
    height: '100%',
  },
  cabImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  cabDetailsContainer: {
    padding: 20,
  },
  cabInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cabInfoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cabInfoDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 16,
  },
  cabInfoIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cabInfoTextContainer: {
    flex: 1,
  },
  cabInfoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  cabInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  
  // No Cab Card
  noCabCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  noCabGradient: {
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  noCabContent: {
    alignItems: 'center',
  },
  noCabIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noCabTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    textAlign: 'center',
  },
  noCabSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Action Section
  actionSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  completeButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.3,
  },
  
  // Footer
  footerContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default ExpenseTracker;