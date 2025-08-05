import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  ActivityIndicator, 
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  
} from "react-native";
import axios from "react-native-axios";
import { Button, Card, Divider } from "react-native-paper";
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Footer from "./footer/Footer";
import LinearGradient from 'react-native-linear-gradient';

const Profile = ({navigation}) => {
  const [driverData, setDriverData] = useState(null);
  const [cabData, setCabData] = useState([]);  // if you want to store multiple cabs
  const [loading, setLoading] = useState(false);
  
  // Get the height of the footer to calculate proper padding
  const [footerHeight, setFooterHeight] = useState(20); // Default estimated height

  useEffect(() => {
    fetchAssignedCab();
  }, []);

  const fetchAssignedCab = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const userId = await AsyncStorage.getItem("userid");
  
      if (token) {
        const response = await axios.get("http://192.168.1.34:5000/api/cabDetails/driver", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
  
        const driverDetail = response.data["Driver Detail"];  // New
        const cabAdmin = response.data["Cab Admin"];          // New
  
        setDriverData(driverDetail); // 👈 Set driver detail to your state
        setCabData(cabAdmin);         // 👈 Also you may want to save cabs separately
      }
    } catch (error) {
      console.log("Error fetching driver cab details", error);
      // Optionally show alert
      // Alert.alert("Error", "Failed to fetch assigned cab data");
    } finally {
      setLoading(false);
    }
  };
  

  // Function to measure footer height
  const onFooterLayout = (event) => {
    const { height } = event.nativeEvent.layout;
    setFooterHeight(height/3);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a3b6e" />
        <Text style={styles.loadingText}>Loading driver profile...</Text>
      </View>
    );
  }

  if (!driverData) {
    return (
      <View style={styles.errorContainer}>
         <StatusBar barStyle="dark-content" backgroundColor="#D0EFFF" />
         
      
        <Text style={styles.errorText}>Loading ...</Text>
      
      </View>
    );
  }

  const profileImage = driverData?.profileImage || "https://via.placeholder.com/100";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[
          styles.scrollViewContent,
          { paddingBottom: footerHeight + 40 } // Add extra padding (40dp) to create gap
        ]}
      >
        <View style={styles.header}>
          <View style={styles.coverPhoto}>
            <TouchableOpacity style={styles.backButton} onPress={()=>navigation.navigate("Home")}>
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.profileImageContainer}>
            <Image 
              source={{ uri: profileImage }} 
              style={styles.profileImage} 
            />
          </View>
          
          <Text style={styles.driverName}>{driverData?.name || "Driver Name"}</Text>
          <Text style={styles.driverRole}>Professional Driver</Text>
          
          <TouchableOpacity style={styles.editButton} onPress={()=>navigation.navigate("EditProfile")}>
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoSection}>
          <Card style={styles.card} elevation={2}>
            <Card.Content>
              <View style={styles.sectionTitleContainer}>
                <Icon name="person" size={22} color="#6200ea" />
                <Text style={styles.sectionTitle}>Personal Information</Text>
              </View>
              <Divider style={styles.divider} />
              
              <View style={styles.infoItem}>
                <Icon name="email" size={20} color="#757575" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{driverData?.email || "Not provided"}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <Icon name="phone" size={20} color="#757575" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{driverData?.phone || "Not provided"}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card} elevation={2}>
            <Card.Content>
              <View style={styles.sectionTitleContainer}>
                <Icon name="badge" size={22} color="#6200ea" />
                <Text style={styles.sectionTitle}>Documents</Text>
              </View>
              <Divider style={styles.divider} />
              
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="license" size={20} color="#757575" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>License Number</Text>
                  <Text style={styles.infoValue}>{driverData?.licenseNo || "Not provided"}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <MaterialCommunityIcons name="card-account-details" size={20} color="#757575" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Aadhaar Number</Text>
                  <Text style={styles.infoValue}>{driverData?.adharNo || "Not provided"}</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>
      
      {/* Sticky Footer */}
      <View 
        style={styles.footerWrapper}
        onLayout={onFooterLayout}
      >
         <LinearGradient 
              colors={['#00529B', '#003B7A']} 
              start={{ x: 0, y: 0 }} 
              end={{ x: 1, y: 0 }} 
              style={styles.footerContainer}
            >
          <Footer />
        </LinearGradient>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    // We'll dynamically add padding based on footer height
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa"
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#757575"
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8f9fa"
  },
  errorText: {
    fontSize: 18,
    marginTop: 10,
    marginBottom: 20,
    color: "#555"
  },
  retryButton: {
    backgroundColor: "#6200ea",
    paddingHorizontal: 20
  },
  header: {
    alignItems: "center",
    marginBottom: 20
  },
  coverPhoto: {
    backgroundColor: "#1a3b6e",
    height: 150,
    width: "100%",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20
  },
  backButton: {
    margin: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center"
  },
  profileImageContainer: {
    position: "relative",
    marginTop: -60,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "#f0f0f0"
  },
  driverName: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
    color: "#333"
  },
  driverRole: {
    fontSize: 16,
    color: "#757575",
    marginBottom: 15
  },
  editButton: {
    backgroundColor: "#1a3b6e",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 5
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "bold"
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 8,
    color: "#333"
  },
  divider: {
    marginBottom: 15,
    height: 1.5,
    backgroundColor: "#e0e0e0",
  },
  infoItem: {
    flexDirection: "row",
    marginBottom: 15,
    alignItems: "flex-start"
  },
  infoContent: {
    marginLeft: 15,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#757575"
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    marginTop: 2,
  },
  footerWrapper: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  footerContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
  }
});

export default Profile;