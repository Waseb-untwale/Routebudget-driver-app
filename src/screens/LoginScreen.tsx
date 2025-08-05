import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  StatusBar, 
  SafeAreaView,
  KeyboardAvoidingView, 
  Platform,
  Modal,
  Animated,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/FontAwesome';
import axios from 'react-native-axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../App';

const { width, height } = Dimensions.get('window');
const expengoLogo = require('../assets/expengologo.png');

type LoginScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailForPass, setEmailForPass] = useState('');
  const [driverId, setDriverId] = useState("");
  const [newPassword, setNewPassword] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [loadingVerification, setLoadingVerification] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const navigation = useNavigation<LoginScreenNavigationProp>();
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  // Initial animations
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(formTranslateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  // Modal animations
  useEffect(() => {
    if (showForgotModal) {
      Animated.parallel([
        Animated.timing(modalScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalScale, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showForgotModal]);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      setIsLoading(true);
      const response = await axios.post('http://192.168.1.34:5000/api/login', {
        email: email,
        password: password,
      }, {
        headers: { "content-type": "application/json" }
      });

      const receivedToken = response.data.token;

      if (receivedToken) {
        await AsyncStorage.setItem('userToken', receivedToken);
        await AsyncStorage.setItem("userid", response.data.user._id);
        
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }
    } catch (error) {
      Alert.alert('Login Failed', 'Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmail = async () => {
    if (!emailForPass) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    
    setLoadingVerification(true);
    
    try {
      const res = await axios.post("http://192.168.1.34:5000/api/driver/forgot-password", {
        email: emailForPass
      });
      setDriverId(res.data.driverId);
      setEmailVerified(true);
      setLoadingVerification(false);
    } catch (error) {
      setLoadingVerification(false);
      Alert.alert('Verification Failed', 'Could not verify your email. Please try again.');
    }
  };
  
  const submitNewPassword = async () => {
    if (!newPassword) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }
    
    try {
      if (newPassword.length < 6) {
        Alert.alert('Invalid Password', 'Password should be at least 6 characters long.');
        return;
      }
      
      if(driverId){
        const res = await axios.post("http://192.168.1.34:5000/api/driver/reset-password", {
          driverId: driverId,
          newPassword: newPassword
        });
      }
      
      Alert.alert('Success', 'Your password has been reset successfully');
      setShowForgotModal(false);
      setEmailVerified(false);
      setEmailForPass('');
      setNewPassword('');
    } catch (error) {
      Alert.alert('Reset Failed', 'Could not reset your password. Please try again.');
    }
  };

  const handleForgotPassword = () => {
    setShowForgotModal(true);
    setEmailVerified(false);
    setEmailForPass('');
    setNewPassword('');
  };

  const handleInputTap = (inputType: string) => {
    if (inputType === 'email') {
      setEmailFocused(true);
      setPasswordFocused(false);
      emailInputRef.current?.focus();
    } else if (inputType === 'password') {
      setPasswordFocused(true);
      setEmailFocused(false);
      passwordInputRef.current?.focus();
    }
  };

  const handleDismissKeyboard = () => {
    Keyboard.dismiss();
    setEmailFocused(false);
    setPasswordFocused(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#f0f4ff" barStyle="dark-content" />
      
      <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidView}
        >
          {/* Background gradient effect */}
          <View style={styles.backgroundGradient} />
          
          <View style={styles.contentContainer}>
            {/* Animated Logo Section */}
            <Animated.View 
              style={[
                styles.logoContainer,
                {
                  transform: [{ scale: logoScale }],
                  opacity: logoOpacity,
                }
              ]}
            >
              <View style={styles.logoWrapper}>
                <Image 
                  source={expengoLogo} 
                  style={styles.logo}
                  resizeMode="contain"
                />
                <View style={styles.logoShadow} />
              </View>
              
              <Text style={styles.welcomeText}>Welcome Back</Text>
              <Text style={styles.subtitleText}>Sign in to your account</Text>
            </Animated.View>
            
            {/* Animated Form Section */}
            <Animated.View 
              style={[
                styles.formContainer,
                {
                  transform: [{ translateY: formTranslateY }],
                  opacity: formOpacity,
                }
              ]}
            >
              <View style={styles.inputSection}>
                {/* Email Input */}
                <TouchableOpacity 
                  style={[
                    styles.inputWrapper, 
                    emailFocused && styles.inputWrapperFocused,
                    email && styles.inputWrapperActive
                  ]}
                  activeOpacity={1}
                  onPress={() => handleInputTap('email')}
                >
                  <View style={styles.inputIconContainer}>
                    <Icon 
                      name="envelope" 
                      size={18} 
                      color={emailFocused ? "#667eea" : "#718096"} 
                    />
                  </View>
                  
                  {(emailFocused || email.length > 0) && (
                    <Text style={[styles.floatingLabel, emailFocused && styles.floatingLabelActive]}>
                      Email Address
                    </Text>
                  )}
                  
                  <TextInput
                    ref={emailInputRef}
                    style={styles.input}
                    placeholder={emailFocused || email.length > 0 ? "" : "Email Address"}
                    placeholderTextColor="#9E9E9E"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => {
                      setEmailFocused(true);
                      setPasswordFocused(false);
                    }}
                    onBlur={() => {
                      if (!email) {
                        setEmailFocused(false);
                      }
                    }}
                  />
                </TouchableOpacity>
                
                {/* Password Input */}
                <TouchableOpacity 
                  style={[
                    styles.inputWrapper, 
                    passwordFocused && styles.inputWrapperFocused,
                    password && styles.inputWrapperActive
                  ]}
                  activeOpacity={1}
                  onPress={() => handleInputTap('password')}
                >
                  <View style={styles.inputIconContainer}>
                    <Icon 
                      name="lock" 
                      size={20} 
                      color={passwordFocused ? "#667eea" : "#718096"} 
                    />
                  </View>
                  
                  {(passwordFocused || password.length > 0) && (
                    <Text style={[styles.floatingLabel, passwordFocused && styles.floatingLabelActive]}>
                      Password
                    </Text>
                  )}
                  
                  <TextInput
                    ref={passwordInputRef}
                    style={styles.input}
                    placeholder={passwordFocused || password.length > 0 ? "" : "Password"}  
                    placeholderTextColor="#9E9E9E"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => {
                      setPasswordFocused(true);
                      setEmailFocused(false);
                    }}
                    onBlur={() => {
                      if (!password) {
                        setPasswordFocused(false);
                      }
                    }}
                  />
                  
                  <TouchableOpacity 
                    onPress={() => setShowPassword(!showPassword)} 
                    style={styles.toggleButton}
                  >
                    <Icon 
                      name={showPassword ? "eye-slash" : "eye"} 
                      size={18} 
                      color="#757575" 
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
              
              <View style={styles.forgotContainer}>
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>
              
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity 
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]} 
                  onPress={handleSignIn} 
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.loadingText}>Signing In...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContent}>
                      <Text style={styles.loginButtonText}>Sign In</Text>
                      <Icon name="arrow-right" size={16} color="#FFFFFF" style={styles.buttonIcon} />
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
      
      {/* Enhanced Forgot Password Modal */}
      <Modal
        visible={showForgotModal}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowForgotModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View 
                style={[
                  styles.modalCard,
                  {
                    transform: [{ scale: modalScale }],
                    opacity: modalOpacity,
                  }
                ]}
              >
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setShowForgotModal(false)}
                >
                  <Icon name="times" size={20} color="#666" />
                </TouchableOpacity>
                
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconContainer}>
                    <Icon name="lock" size={28} color="#667eea" />
                  </View>
                  <Text style={styles.cardTitle}>
                    {emailVerified ? 'Create New Password' : 'Reset Password'}
                  </Text>
                </View>
                
                {!emailVerified ? (
                  <>
                    <Text style={styles.cardDescription}>
                      Enter your email address and we'll help you reset your password
                    </Text>
                    <View style={styles.cardInputWrapper}>
                      <Icon 
                        name="envelope" 
                        size={18} 
                        color="#757575" 
                        style={styles.cardInputIcon}
                      />
                      <TextInput
                        style={styles.cardInput}
                        placeholder="Enter your email address"
                        placeholderTextColor="#9E9E9E"
                        value={emailForPass}
                        onChangeText={setEmailForPass}
                        autoCapitalize="none"
                        keyboardType="email-address"
                      />
                    </View>
                    <TouchableOpacity 
                      style={[styles.cardButton, loadingVerification && styles.cardButtonDisabled]}
                      onPress={verifyEmail}
                      disabled={loadingVerification}
                    >
                      {loadingVerification ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.cardButtonText}>Verify Email</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.cardDescription}>
                      Email verified successfully! Enter your new password below
                    </Text>
                    <View style={styles.cardInputWrapper}>
                      <Icon 
                        name="lock" 
                        size={18} 
                        color="#757575" 
                        style={styles.cardInputIcon}
                      />
                      <TextInput
                        style={styles.cardInput}
                        placeholder="Enter new password (min. 6 characters)"
                        placeholderTextColor="#9E9E9E"
                        secureTextEntry={true}
                        value={newPassword}
                        onChangeText={setNewPassword}
                      />
                    </View>
                    <TouchableOpacity 
                      style={styles.cardButton}
                      onPress={submitNewPassword}
                    >
                      <Text style={styles.cardButtonText}>Update Password</Text>
                    </TouchableOpacity>
                  </>
                )}
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4ff',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    opacity: 0.1,
  },
  keyboardAvoidView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  logo: {
    width: 120,
    height: 120,
  },
  logoShadow: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 120,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 60,
    zIndex: -1,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 64,
    paddingHorizontal: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputWrapperFocused: {
    borderColor: '#667eea',
    shadowOpacity: 0.2,
    elevation: 8,
  },
  inputWrapperActive: {
    backgroundColor: '#fafafa',
  },
  inputIconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
  },
  floatingLabel: {
    position: 'absolute',
    left: 16,
    top: -8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
    zIndex: 1,
  },
  floatingLabelActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#212121',
    fontWeight: '500',
  },
  toggleButton: {
    padding: 8,
    marginLeft: 8,
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginBottom: 32,
  },
  forgotText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#667eea',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: 'rgba(102, 126, 234, 0.7)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 55, 72, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  cardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2d3748',
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  cardInputWrapper: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardInputIcon: {
    marginRight: 12,
  },
  cardInput: {
    flex: 1,
    fontSize: 16,
    color: '#212121',
    fontWeight: '500',
  },
  cardButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cardButtonDisabled: {
    backgroundColor: 'rgba(102, 126, 234, 0.7)',
  },
  cardButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default LoginScreen;