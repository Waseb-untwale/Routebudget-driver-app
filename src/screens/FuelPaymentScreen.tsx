import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  Image,
  Alert,
  ScrollView,
  PermissionsAndroid,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  SafeAreaView,
  Platform,
  Animated
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "react-native-axios";
import Geolocation from '@react-native-community/geolocation';

const { width, height } = Dimensions.get('window');

interface FuelData {
  type: string;
  amount: string;
  location: string;
}

interface FuelPaymentScreenProps {
  navigation: any;
}

const FuelPaymentScreen: React.FC<FuelPaymentScreenProps> = ({ navigation }) => {
  const [fuel, setFuel] = useState<FuelData>({ type: "Cash", amount: "", location: "" });
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [cabNumber, setCabNumber] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoLocationAttempted, setAutoLocationAttempted] = useState(false);
  
  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  useEffect(() => { 
    // Animate screen entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();

    getCab(); 
    autoFetchLocation();
  }, []);

  const autoFetchLocation = async () => {
    if (autoLocationAttempted) return;
    setAutoLocationAttempted(true);
    
    setIsLocationLoading(true);
    
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setIsLocationLoading(false);
        return;
      }

      const locationPromise = new Promise<any>(async (resolve, reject) => {
        try {
          const position = await getLocationWithTimeout();
          const { latitude, longitude } = position.coords;
          const address = await getAddressFromCoords(latitude, longitude);
          resolve({ latitude, longitude, address });
        } catch (error) {
          reject(error);
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Auto-location timeout')), 10000);
      });

      const result = await Promise.race([locationPromise, timeoutPromise]);
      
      setFuel(prev => ({ ...prev, location: result.address }));
      setCurrentLocation(result);
      setErrors(prev => ({...prev, location: ''}));
      
    } catch (error) {
      console.log('Auto-location failed:', error);
    } finally {
      setIsLocationLoading(false);
    }
  };

  const getLocationWithTimeout = () => {
    return new Promise<any>((resolve, reject) => {
      Geolocation.getCurrentPosition(
        resolve,
        (error) => {
          Geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 10000,
            }
          );
        },
        {
          enableHighAccuracy: false,
          timeout: 1500,
          maximumAge: 30000,
        }
      );
    });
  };

  const getAddressFromCoords = async (latitude: number, longitude: number): Promise<string> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyCelDo4I5cPQ72TfCTQW-arhPZ7ALNcp8w`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        return data.results[0].formatted_address;
      } else {
        throw new Error('No address found');
      }
    } catch (error) {
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        ]);
        
        return (
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED ||
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
        );
      }
      return true;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  const getCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert("Permission Denied", "Location permission is required to get current location.");
      return;
    }

    setIsLocationLoading(true);
    
    try {
      const position = await getLocationWithTimeout();
      const { latitude, longitude } = position.coords;
      const address = await getAddressFromCoords(latitude, longitude);
      
      setFuel(prev => ({ ...prev, location: address }));
      setCurrentLocation({ latitude, longitude, address });
      setErrors(prev => ({...prev, location: ''}));
      
    } catch (error) {
      console.error('Manual location error:', error);
      Alert.alert(
        "Location Error", 
        "Unable to get location. Please enter manually or try again.",
        [{ text: "OK", style: "default" }]
      );
    } finally {
      setIsLocationLoading(false);
    }
  };

  const requestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
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
    }
    return true;
  };

  const openCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert("Permission Denied", "You need to allow camera access to take pictures.");
      return;
    }
  
    const options = { 
      mediaType: "photo" as const, 
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.7,
      includeBase64: false,
    };
    
    launchCamera(options, (response) => {
      if (response.didCancel) {
        return;
      } else if (response.errorCode) {
        console.error("Camera error:", response.errorCode);
      } else if (response.assets && response.assets.length > 0) {
        setUploadedImage(response.assets[0].uri || null);
        setErrors({...errors, image: ''});
      }
    });
  };

  const openGallery = async () => {
    const options = { 
      mediaType: 'photo' as const, 
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.7,
      includeBase64: false,
    };
    
    try {
      const result = await launchImageLibrary(options);
      if (result.assets && result.assets[0]) {
        setUploadedImage(result.assets[0].uri || null);
        setErrors({...errors, image: ''});
      }
    } catch (error) {
      console.error("Gallery error:", error);
    }
  };

  const getCab = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        return;
      }
      
      const axiosInstance = axios.create({
        timeout: 5000,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const response = await axiosInstance.get("http://192.168.1.34:5000/api/assignCab/driver");
      
      if (response.data && response.data.length > 0 && response.data[0]?.cab?.cabNumber) {
        setCabNumber(response.data[0].cab.cabNumber);
      }
    } catch (error) {
      console.error("Cab fetch error:", error);
      setTimeout(() => {
        Alert.alert("Warning", "Could not fetch cab data. Please try again.");
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  const validateInputs = (): boolean => {
    let newErrors: Record<string, string> = {};
    
    if (!uploadedImage) {
      newErrors.image = 'Please upload a receipt image';
    }
    
    if (!fuel.type) {
      newErrors.type = 'Please select payment type';
    }
    
    if (!fuel.amount) {
      newErrors.amount = 'Please enter amount';
    } else if (isNaN(parseFloat(fuel.amount))) {
      newErrors.amount = 'Amount must be a number';
    }
    
    if (!fuel.location) {
      newErrors.location = 'Please enter location';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFuelPayment = async () => {
    if (!validateInputs()) {
      Alert.alert("Validation Error", "Please fill all required fields correctly");
      return;
    }
    
    if (!cabNumber) {
      Alert.alert("Error", "No cab assigned to you.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        throw new Error("Authentication token not found");
      }
      
      let optimizedImageData = null;
      if (uploadedImage) {
        optimizedImageData = {
          uri: uploadedImage,
          type: "image/jpeg",
          name: `fuel_receipt_${Date.now()}.jpg`,
        };
      }
      
      const formData = new FormData();
      formData.append("fuel", JSON.stringify({
        type: fuel.type.trim(),
        amount: parseFloat(fuel.amount).toString(),
        location: fuel.location.trim()
      }));
      
      if (optimizedImageData) {
        formData.append("receiptImage", optimizedImageData as any);
      }
      
      const uploadConfig = {
        timeout: 15000,
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (progressEvent: any) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload Progress: ${percentCompleted}%`);
        },
      };

      setTimeout(()=>{
         Alert.alert("Success", "Fuel payment submitted successfully!", [
          {
            text: "OK",
            onPress: () => {
                navigation.navigate("Home");
                setIsSubmitting(false)
            },
          },
        ]);
        setIsSubmitting(false);
      },1000)

      
      const response = await axios.patch(
        "http://192.168.1.34:5000/api/assigncab/update-trip",
        formData,
        uploadConfig
      );
      
      if (response.status === 200 || response.status === 201) {
       
              setFuel({ type: "Cash", amount: "", location: "" });
              setUploadedImage(null);
              setCurrentLocation(null);
              setErrors({});
             
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
      
    } catch (error: any) {
      console.error("Submission error:", error);
      
      let errorMessage = "Failed to submit fuel payment. Please try again.";
      
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = "Upload timed out. Please check your internet connection and try again.";
      } else if (error.response?.status === 413) {
        errorMessage = "Image file is too large. Please try taking a new photo.";
      } else if (error.response?.status === 401) {
        errorMessage = "Session expired. Please login again.";
      } else if (error.response?.status >= 500) {
        errorMessage = "Server error. Please try again in a few moments.";
      } else if (!error.response && error.message.includes('Network')) {
        errorMessage = "Network error. Please check your internet connection.";
      }
      
      Alert.alert("Upload Error", errorMessage, [
        { text: "OK", style: "default" }
      ]);
      
    } finally {
      // setIsSubmitting(false);
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#1e40af" barStyle="light-content" />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate("Home")}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fuel Payment</Text>
        <TouchableOpacity style={styles.headerAction}>
          <MaterialIcons name="help-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      <Animated.View style={[
        styles.animatedContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ]
        }
      ]}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Vehicle Info Card */}
          {cabNumber && (
            <View style={styles.vehicleCard}>
              <View style={styles.vehicleIconContainer}>
                <MaterialIcons name="local-gas-station" size={28} color="#1e40af" />
              </View>
              <View style={styles.vehicleInfo}>
                <Text style={styles.vehicleNumber}>{cabNumber}</Text>
                <Text style={styles.vehicleSubtitle}>Fuel Payment</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>
          )}

          {/* Receipt Upload Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="receipt" size={20} color="#1e40af" />
              <Text style={styles.cardTitle}>Upload Receipt</Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.uploadContainer, errors.image && styles.uploadError]} 
              onPress={selectImage}
              activeOpacity={0.7}
            >
              {uploadedImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: uploadedImage }} style={styles.previewImage} />
                  <View style={styles.imageOverlay}>
                    <TouchableOpacity style={styles.changeImageButton} onPress={selectImage}>
                      <MaterialIcons name="edit" size={16} color="#fff" />
                      <Text style={styles.changeImageText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.uploadContent}>
                  <View style={styles.uploadIconContainer}>
                    <MaterialIcons name="cloud-upload" size={32} color="#1e40af" />
                  </View>
                  <Text style={styles.uploadTitle}>Upload Receipt</Text>
                  <Text style={styles.uploadSubtitle}>Tap to take photo or choose from gallery</Text>
                </View>
              )}
            </TouchableOpacity>
            {errors.image ? (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                <Text style={styles.errorText}>{errors.image}</Text>
              </View>
            ) : null}
          </View>

          {/* Payment Details Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialIcons name="payment" size={20} color="#1e40af" />
              <Text style={styles.cardTitle}>Payment Details</Text>
            </View>
            
            {/* Payment Method */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Payment Method <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.pickerWrapper, errors.type && styles.inputError]}>
                <MaterialIcons name="credit-card" size={20} color="#6b7280" style={styles.inputIcon} />
                <Picker
                  selectedValue={fuel.type}
                  style={styles.picker}
                  onValueChange={(itemValue) => {
                    setFuel({ ...fuel, type: itemValue });
                    setErrors({...errors, type: ''});
                  }}
                >
                  <Picker.Item label="Cash Payment" value="Cash" />
                  <Picker.Item label="Card Payment" value="Card" />
                </Picker>
              </View>
              {errors.type ? (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{errors.type}</Text>
                </View>
              ) : null}
            </View>
            
            {/* Amount */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Amount <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.inputWrapper, errors.amount && styles.inputError]}>
                <MaterialIcons name="currency-rupee" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput 
                  style={styles.textInput}
                  value={fuel.amount} 
                  onChangeText={(text) => {
                    setFuel({ ...fuel, amount: text });
                    setErrors({...errors, amount: ''});
                  }} 
                  keyboardType="decimal-pad" 
                  placeholder="Enter fuel amount" 
                  placeholderTextColor="#9ca3af"
                />
              </View>
              {errors.amount ? (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{errors.amount}</Text>
                </View>
              ) : null}
            </View>
            
            {/* Location */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>
                Location <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.locationInputContainer, errors.location && styles.inputError]}>
                <View style={styles.locationTextInputContainer}>
                  <MaterialIcons name="location-on" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput 
                    style={styles.textInput}
                    value={fuel.location} 
                    onChangeText={(text) => {
                      setFuel({ ...fuel, location: text });
                      setErrors({...errors, location: ''});
                    }}
                    placeholder={isLocationLoading ? "Getting your location..." : "Enter location or tap GPS button"} 
                    placeholderTextColor="#9ca3af"
                    multiline={true}
                    numberOfLines={2}
                  />
                </View>
                <TouchableOpacity 
                  style={[styles.locationButton, isLocationLoading && styles.locationButtonLoading]} 
                  onPress={getCurrentLocation}
                  disabled={isLocationLoading}
                >
                  {isLocationLoading ? (
                    <ActivityIndicator size="small" color="#1e40af" />
                  ) : (
                    <MaterialIcons name="my-location" size={20} color="#1e40af" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.location ? (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{errors.location}</Text>
                </View>
              ) : null}
              {currentLocation && (
                <View style={styles.locationSuccessContainer}>
                  <MaterialIcons name="check-circle" size={16} color="#10b981" />
                  <Text style={styles.locationSuccessText}>Location detected automatically</Text>
                </View>
              )}
              {isLocationLoading && (
                <View style={styles.locationLoadingContainer}>
                  <MaterialIcons name="location-searching" size={16} color="#1e40af" />
                  <Text style={styles.locationLoadingText}>Fetching your current location...</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
      
      {/* Enhanced Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
          onPress={handleFuelPayment}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <View style={styles.loadingButtonContent}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.submitText}>Submitting...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.submitText}>Submit Payment</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  animatedContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#1e40af",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  headerAction: {
    padding: 8,
    borderRadius: 8,
  },
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#1e40af"
  },
  vehicleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  vehicleSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500"
  },
  statusBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16a34a",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginLeft: 8,
  },
  uploadContainer: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    backgroundColor: "#f9fafb",
    minHeight: 120,
  },
  uploadError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  uploadContent: {
    alignItems: "center",
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#eff6ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  imagePreviewContainer: {
    position: "relative",
    alignItems: "center",
  },
  previewImage: {
    width: width * 0.6,
    height: width * 0.4,
    borderRadius: 12,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
  },
  changeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e40af",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeImageText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  pickerWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingLeft: 16,
  },
  picker: {
    flex: 1,
    height: 50,
    color: "#1f2937",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "500",
    minHeight: 24,
  },
  locationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    minHeight: 50,
  },
  locationTextInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  locationButton: {
    padding: 15,
    borderLeftWidth: 1,
    borderLeftColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  locationButtonLoading: {
    backgroundColor: "#eff6ff",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginLeft: 4,
    fontWeight: "500",
  },
  locationSuccessContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  locationSuccessText: {
    fontSize: 12,
    color: "#10b981",
    marginLeft: 4,
    fontWeight: "500",
  },
  locationLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  locationLoadingText: {
    fontSize: 12,
    color: "#1e40af",
    marginLeft: 4,
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  submitButton: {
    backgroundColor: "#1e40af",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#1e40af",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#9ca3af",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  submitText: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "700",
    marginLeft: 8,
  },
});

export default FuelPaymentScreen;