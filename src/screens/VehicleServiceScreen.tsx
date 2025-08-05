import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet, 
  Alert, 
  SafeAreaView, 
  StatusBar, 
  Dimensions, 
  PermissionsAndroid, 
  Image, 
  ActivityIndicator 
} from "react-native";
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from "react-native-axios";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import Voice from '@react-native-voice/voice';

const { width } = Dimensions.get('window');

const VehicleServiceScreen = ({ navigation }) => {
  const [serviceType, setServiceType] = useState({});
  const [serviceId, setServiceId] = useState("");
  const [servicing, setServicing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [servicingCost, setServicingCost] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [meterReading, setMeterReading] = useState("");
  const [errors, setErrors] = useState({
    odometer: "",
    serviceCenterName: "",
    contactNumber: "",
    image: ""
  });
  // Store token in component state to avoid retrieving it multiple times
  const [userToken, setUserToken] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    // Get token and user ID once at component mount
    const initializeData = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const id = await AsyncStorage.getItem("userid");
        
        if (token) {
          setUserToken(token);
          setUserId(id);
          fetchAssignmentData(token);
        }
      } catch (error) {
        console.error("Error initializing data:", error);
      }
    };
    
    initializeData();
  }, []);

  // Separated fetch function for better organization
  const fetchAssignmentData = async (token) => {
    try {
      setLoading(true);
      
      // Create optimized axios instance with timeout
      const axiosInstance = axios.create({
        baseURL: "http://192.168.1.34:5000/api",
        timeout: 5000, // 5 second timeout
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const response = await axiosInstance.get("/servicing/my-assignments");
      
      if (response.data.services && response.data.services.length > 0) {
        setServiceId(response.data.services[0]._id);
        setServicing(response.data.services[0]);
      }
    } catch (error) {
      console.error("Assignment fetch error:", error);
      Alert.alert("Error", "Failed to fetch service assignment data");
    } finally {
      setLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;
    
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "This app needs camera access to take photos.",
          buttonPositive: "OK",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const openCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert("Permission Denied", "You need to allow camera access to take pictures.");
      return;
    }

    // Optimized options for faster image processing
    const options = {
      mediaType: "photo",
      maxWidth: 600,    // Reduced from 1200
      maxHeight: 600,   // Reduced from 1200
      quality: 0.5,     // Reduced from 0.8 for faster upload
      includeBase64: false,
      cameraType: 'back'
    };

    launchCamera(options, (response) => {
      if (response.didCancel) {
        // User cancelled
      } else if (response.errorCode) {
        console.error("Camera error:", response.errorCode, response.errorMessage);
      } else if (response.assets && response.assets.length > 0) {
        setUploadedImage(response.assets[0].uri);
        setErrors({ ...errors, image: null });
      }
    });
  };

  const openGallery = async () => {
    // Optimized options for faster image processing
    const options = { 
      mediaType: 'photo', 
      maxWidth: 600,    // Reduced from 1200
      maxHeight: 600,   // Reduced from 1200
      quality: 0.5,     // Reduced from 0.8 for faster upload
      includeBase64: false
    };
    
    try {
      const result = await launchImageLibrary(options);
      if (result.assets && result.assets[0]) {
        setUploadedImage(result.assets[0].uri);
        setErrors({ ...errors, image: null });
      }
    } catch (error) {
      console.error("Gallery error:", error);
    }
  };

  

  const selectImage = () => {
    Alert.alert(
      "Upload Receipt",
      "Choose an option",
      [
        { text: "Take Photo", onPress: openCamera },
        // { text: "Choose from Gallery", onPress: openGallery },
        { text: "Cancel", style: "cancel" }
      ],
      { cancelable: true }
    );
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {...errors};
    
    if (!servicingCost || servicingCost.trim() === '') {
      newErrors.serviceCenterName = 'Please enter the total amount';
      isValid = false;
    } else if (isNaN(Number(servicingCost)) || Number(servicingCost) <= 0) {
      newErrors.serviceCenterName = 'Please enter a valid amount';
      isValid = false;
    } else {
      newErrors.serviceCenterName = '';
    }
    
    if (!uploadedImage) {
      newErrors.image = 'Please upload a receipt image';
      isValid = false;
    } else {
      newErrors.image = '';
    }
    
    setErrors(newErrors);
    return isValid;
  };
 
  const handleSubmit = async () => {
    // Quick validation before proceeding
    if (!validateForm()) {
      return;
    }
    
    if (!serviceId) {
      Alert.alert("Error", "No service assignment found");
      return;
    }
  
    setLoading(true);
    try {
      // Pre-prepare image data
      const imageData = uploadedImage ? {
        uri: uploadedImage,
        type: "image/jpeg",
        name: "receipt.jpg",
      } : null;
      
      // Build form data efficiently
      const formData = new FormData();
      formData.append("servicingCost", servicingCost);
      if (imageData) {
        formData.append("receiptImage", imageData);
      }
      
      // Use cached token if available, otherwise fetch it
      const token = userToken || await AsyncStorage.getItem("userToken");
  
      // Create optimized axios instance with timeout and proper headers
      const axiosInstance = axios.create({
        baseURL: "http://192.168.1.34:5000/api",
        timeout: 15000, // 15 second timeout for image upload
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        }
      });
      
      // Make the API request
      const res = await axiosInstance.put(
        `/servicing/update/${serviceId}`,
        formData
      );
     
      Alert.alert("Success", "Service data submitted successfully!", [
        {
          text: "OK",
          onPress: () => navigation.navigate("Home"),
        },
      ]);
      
      // Reset form
      setServicingCost("");
      setUploadedImage(null);
    } catch (error) {
      console.error("Submission error:", error);
      Alert.alert("Error", "Failed to submit service data.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    navigation.navigate("Home");
  };
  
  // Show loading state
  if (loading && !servicing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#0277bd" />
        <View style={styles.appHeader}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule Service</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0277bd" />
          <Text style={styles.loadingText}>Loading service data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#0277bd" />
      <View style={styles.appHeader}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
         <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule Service</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {serviceId ? (
        <ScrollView style={styles.container}>
          <View style={styles.header}>
            <Icon name="car" size={30} color="#4A90E2" />
            <View style={styles.headerText}>
              <Text style={styles.title}>{servicing?.cab?.cabNumber}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Service Schedule</Text>

            <Text style={styles.label}>Last Service Date</Text>
            <View style={[styles.readOnlyContainer, styles.inputServiceDate]}>
              <Text style={styles.readOnlyText}>
                {servicing?.serviceDate ? new Date(servicing.serviceDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                }) : 'N/A'}
              </Text>
              <Icon name="lock" size={16} color="#4B5563" style={styles.lockIcon} />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.uploadContainer, errors.image && styles.inputError]}
            onPress={selectImage}
            activeOpacity={0.8}
          >
            {uploadedImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: uploadedImage }} style={styles.previewImage} />
                <TouchableOpacity style={styles.changeImageButton} onPress={selectImage}>
                  <Text style={styles.changeImageText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.uploadCircle}>
                  <Icon name="upload" size={24} color="#ffffff" />
                </View>
                <Text style={styles.uploadText}>Tap to upload Servicing receipt image</Text>
                {errors.image && <Text style={styles.errorText}>{errors.image}</Text>}
              </>
            )}
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.label}>Enter Total Amount <Text style={styles.required}>*</Text></Text>
            <TextInput
              placeholder="Enter Amount"
              placeholderTextColor="#9e9e9e"
              keyboardType="numeric"
              style={[
                styles.input,
                styles.inputServiceCenter,
                errors.serviceCenterName ? styles.inputError : null
              ]}
              value={servicingCost}
              onChangeText={(text) => setServicingCost(text)}
            />
            {errors.serviceCenterName ? (
              <Text style={styles.errorText}>
                <Icon name="alert-circle-outline" size={14} color="#EF4444" /> {errors.serviceCenterName}
              </Text>
            ) : null}
            
            {errors.odometer ? (
              <Text style={styles.errorText}>
                <Icon name="alert-circle-outline" size={14} color="#EF4444" /> {errors.odometer}
              </Text>
            ) : null}
          </View>

          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.noCabContainer}>
          <Text style={styles.noCabText}>No cab assigned to you for servicing.</Text>
        </View>
      )}
    </SafeAreaView>
  );
};





const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },

  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#0277bd",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 2
  },

  backButton: {
    padding: 6,
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff"
  },

  headerRightPlaceholder: {
    width: 36,
  },

  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    padding: 16
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E6EEFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },

  headerText: {
    marginLeft: 12
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333F4D"
  },

  subtitle: {
    color: "#6B7280",
    fontSize: 15
  },

  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333F4D",
    marginBottom: 16
  },

  label: {
    fontSize: 15,
    color: "#4B5563",
    marginBottom: 6,
    fontWeight: "500"
  },

  required: {
    color: "#EF4444",
    fontWeight: "bold"
  },

  input: {
    padding: 16,
    borderRadius: 10,
    fontSize: 16,
    color: "#333F4D",
    marginBottom: 5,
    borderWidth: 0
  },

  inputError: {
    borderWidth: 1,
    borderColor: "#EF4444"
  },

  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 5
  },

  readOnlyContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 0,
    borderLeftWidth: 4,
    borderLeftColor: "#9CA3AF"
  },

  readOnlyText: {
    fontSize: 16,
    color: "#333F4D",
    fontWeight: "500"
  },

  lockIcon: {
    opacity: 0.7
  },

  inputServiceDate: {
    backgroundColor: "#D1FAE5",
    borderLeftColor: "#10B981"
  },

  inputDueDate: {
    backgroundColor: "#E0E7FF",
    borderLeftColor: "#6366F1"
  },

  inputOdometer: { backgroundColor: "#FEF3C7" }, // Yellow
  inputServiceCenter: { backgroundColor: "#FDE2E2" }, // Red
  inputLocation: { backgroundColor: "#E5E7EB" }, // Gray
  inputContact: { backgroundColor: "#BEE3F8" }, // Light Blue

  buttonContainer: {
    flexDirection: "row",
    marginTop: 8,
    justifyContent: "space-between",
    marginBottom: 8
  },

  button: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    marginHorizontal: 4
  },

  activeButton: {
    backgroundColor: "#4CAF50"
  },

  buttonText: {
    fontWeight: "600",
    color: "#4B5563",
    fontSize: 15
  },

  activeButtonText: {
    color: "#FFFFFF"
  },

  historyItemContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },

  historyItem: {
    fontSize: 15,
    color: "#4B5563",
    fontWeight: "500"
  },

  submitButton: {
    backgroundColor: "#4A90E2",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 32,
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },

  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 17
  },
  uploadContainer: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#CBD5E0",
    borderRadius: 12,
    padding: 25,
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    marginBottom: 25,
  },
  uploadCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  uploadText: {
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "500",
    textAlign: "center",
  },
  previewImage: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 12,
    marginBottom: 10,
  },
  changeImageButton: {
    marginTop: 10,
    backgroundColor: '#4a56e2',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeImageText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  noCabContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noCabText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  imagePreviewContainer: {
    alignItems: "center",
    width: "100%",
  },
});

export default VehicleServiceScreen;