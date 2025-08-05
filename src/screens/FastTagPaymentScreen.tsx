import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  StatusBar,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Card, Button, Divider, Appbar, ActivityIndicator } from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "react-native-axios";
import Toast from "react-native-toast-message";

const { width, height } = Dimensions.get('window');

interface FastTagData {
  amount: string;
  paymentMode: "Cash" | "Card";
  cardDetails: string;
}

interface FastTagPaymentScreenProps {
  navigation: any;
}

const FastTagPaymentScreen: React.FC<FastTagPaymentScreenProps> = ({ navigation }) => {
  const [cabNumber, setCabNumber] = useState<string>("");
  const [fastTag, setFastTag] = useState<FastTagData>({
    amount: "",
    paymentMode: "Cash",
    cardDetails: "",
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  useEffect(() => {
    const initializeScreen = async () => {
      await getCab();
      startAnimations();
    };
    initializeScreen();
  }, []);

  const startAnimations = () => {
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
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getCab = async (): Promise<void> => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("userToken");

      if (token) {
        const response = await axios.get(
          "http://192.168.1.34:5000/api/assignCab/driver",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data && response.data.length > 0) {
          setCabNumber(response.data[0]?.cab?.cabNumber || "");
        }
      } else {
        // For testing purposes, set a dummy cab number if no token
        setCabNumber("TEST-CAB-001");
      }
    } catch (error) {
      console.log("Error fetching cab data:", error);
      // Set a dummy cab number for testing
      setCabNumber("TEST-CAB-001");
    } finally {
      setLoading(false);
    }
  };

  const handleFastTag = async (): Promise<void> => {
    if (!fastTag.amount || parseFloat(fastTag.amount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("fastTag", JSON.stringify(fastTag));

      const token = await AsyncStorage.getItem("userToken");
      
      if (token) {
        const res = await axios.patch(
          "http://192.168.1.34:5000/api/assigncab/update-trip",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
      
      Alert.alert("Success", "Fast tag data submitted successfully!", [
        {
          text: "OK",
          onPress: () => navigation.navigate("Home"),
        },
      ]);
    } catch (error) {
      console.log("Error submitting fast tag data:", error);
      Alert.alert("Error", "Failed to submit fast tag data.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = (): void => {
    navigation.goBack();
  };

  const formatAmount = (text: string): string => {
    const numericValue = text.replace(/[^0-9.]/g, '');
    return numericValue;
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar backgroundColor="#1e40af" barStyle="light-content" />
      
      {/* Enhanced Header */}
      <View style={styles.headerGradient}>
        <Appbar.Header style={styles.header}>
          <Appbar.BackAction onPress={goBack} color="#fff" />
          <Appbar.Content
            title="FastTag Payment"
            titleStyle={styles.headerTitle}
          />
          <View style={styles.headerIcon}>
            <Text style={styles.headerIconText}>💳</Text>
          </View>
        </Appbar.Header>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading cab information...</Text>
        </View>
      ) : (
        <Animated.View 
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
            }
          ]}
        >
          <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Cab Information Card */}
            <Card style={styles.cabInfoCard}>
              <View style={styles.cabInfoContent}>
                <View style={styles.cabIconContainer}>
                  <Text style={styles.cabIcon}>🚗</Text>
                </View>
                <View style={styles.cabDetails}>
                  <Text style={styles.cabLabel}>Assigned Cab</Text>
                  <Text style={styles.cabNumber}>{cabNumber || "No cab assigned"}</Text>
                </View>
              </View>
            </Card>

            {/* Payment Form Card */}
            <Card style={styles.paymentCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Payment Details</Text>
                <View style={styles.cardIconContainer}>
                  <Text style={styles.cardIcon}>💰</Text>
                </View>
              </View>
              
              <Divider style={styles.divider} />

              {/* Payment Mode Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Payment Mode</Text>
                <View style={styles.pickerContainer}>
                  <View style={styles.pickerIcon}>
                    <Text style={styles.pickerIconText}>
                      {fastTag.paymentMode === 'Cash' ? '💵' : '💳'}
                    </Text>
                  </View>
                  <Picker
                    selectedValue={fastTag.paymentMode}
                    onValueChange={(itemValue: "Cash" | "Card") =>
                      setFastTag({ ...fastTag, paymentMode: itemValue })
                    }
                    style={styles.picker}
                    dropdownIconColor="#6b7280"
                  >
                    <Picker.Item label="💵 Cash Payment" value="Cash" />
                    <Picker.Item label="💳 Card Payment" value="Card" />
                  </Picker>
                </View>
              </View>

              {/* Amount Input */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Enter Amount</Text>
                <View style={styles.inputContainer}>
                  <View style={styles.currencyContainer}>
                    <Text style={styles.currencySymbol}>₹</Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    placeholderTextColor="#9ca3af"
                    keyboardType="numeric"
                    value={fastTag.amount}
                    onChangeText={(text) =>
                      setFastTag({ ...fastTag, amount: formatAmount(text) })
                    }
                  />
                </View>
                {fastTag.amount && parseFloat(fastTag.amount) > 0 && (
                  <Text style={styles.amountPreview}>
                    Amount: ₹{parseFloat(fastTag.amount).toFixed(2)}
                  </Text>
                )}
              </View>

              {/* Payment Summary */}
              {fastTag.amount && parseFloat(fastTag.amount) > 0 && (
                <View style={styles.summaryContainer}>
                  <Text style={styles.summaryTitle}>Payment Summary</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Payment Mode:</Text>
                    <Text style={styles.summaryValue}>{fastTag.paymentMode}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Amount:</Text>
                    <Text style={styles.summaryAmount}>₹{parseFloat(fastTag.amount).toFixed(2)}</Text>
                  </View>
                </View>
              )}
            </Card>
          </ScrollView>

          {/* Enhanced Submit Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!fastTag.amount || parseFloat(fastTag.amount) <= 0) && styles.submitButtonDisabled
              ]}
              onPress={handleFastTag}
              disabled={isSubmitting || !fastTag.amount || parseFloat(fastTag.amount) <= 0}
              activeOpacity={0.8}
            >
              <View style={[
                styles.submitButtonGradient,
                (!fastTag.amount || parseFloat(fastTag.amount) <= 0) && styles.submitButtonGradientDisabled
              ]}>
                {isSubmitting ? (
                  <View style={styles.loadingButtonContent}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.submitButtonText}>Processing...</Text>
                  </View>
                ) : (
                  <View style={styles.submitButtonContent}>
                    <Text style={styles.submitButtonIcon}>💸</Text>
                    <Text style={styles.submitButtonText}>Submit FastTag Payment</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerGradient: {
    backgroundColor: '#3b82f6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  header: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  headerIcon: {
    marginRight: 16,
  },
  headerIconText: {
    fontSize: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
  },
  container: {
    padding: 20,
    backgroundColor: '#f8fafc', 
  },
  cabInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cabInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  cabIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cabIcon: {
    fontSize: 28,
  },
  cabDetails: {
    flex: 1,
  },
  cabLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  cabNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: "#1f2937",
  },
  paymentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 24,
  },
  divider: {
    backgroundColor: '#e5e7eb',
    height: 1,
    marginHorizontal: 24,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 60,
    paddingHorizontal: 16,
  },
  pickerIcon: {
    marginRight: 12,
  },
  pickerIconText: {
    fontSize: 20,
  },
  picker: {
    flex: 1,
    color: '#1f2937',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 60,
    overflow: 'hidden',
  },
  currencyContainer: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  amountPreview: {
    marginTop: 8,
    fontSize: 14,
    color: '#059669',
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: '#f0f9ff',
    margin: 24,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0c4a6e',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
  },
  summaryAmount: {
    fontSize: 18,
    color: '#059669',
    fontWeight: '700',
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  submitButtonDisabled: {
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  submitButtonGradient: {
    backgroundColor: '#3b82f6',
    paddingVertical: 18,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonGradientDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 8,
  },
});

export default FastTagPaymentScreen;