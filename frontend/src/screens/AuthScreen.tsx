import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define the navigation param list - update this to match App.tsx later
type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Chat: undefined;
};

type AuthScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;

interface Props {
  navigation: AuthScreenNavigationProp;
}

// UPDATE THIS TO YOUR LOCAL IP ADDRESS
const API_URL = 'http://192.168.29.173:8000'; 

export default function AuthScreen({ navigation }: Props) {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password || (!isLogin && !email)) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        // Login Flow (FormData for OAuth2)
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        // Note: Axios with FormData in React Native can be tricky, sometimes better to use fetch or verify headers
        // But let's try standard axios first. 
        // Important: Manually setting Content-Type to multipart/form-data boundary is handled by axios/fetch usually
        
        const response = await axios.post(`${API_URL}/token`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });

        const { access_token, username: user_name } = response.data;
        await handleAuthSuccess(access_token, user_name);

      } else {
        // Signup Flow (JSON)
        const response = await axios.post(`${API_URL}/signup`, {
          username,
          email,
          password
        });
        
        const { access_token, username: user_name } = response.data;
        await handleAuthSuccess(access_token, user_name);
      }
    } catch (err: any) {
      console.error(err);
      const message = err.response?.data?.detail || 'Authentication failed. Please check your connection and credentials.';
      Alert.alert('Error', typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthSuccess = async (token: string, userName: string) => {
    try {
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userName', userName);
      // Reset navigation stack to Chat so user can't go back to Auth
      navigation.reset({
        index: 0,
        routes: [{ name: 'Chat' }],
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to save login data');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0B0D0E', '#0B0D0E', '#0B0D0E']}
        style={StyleSheet.absoluteFill}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <SafeAreaView style={styles.innerContent}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isLogin ? 'Welcome Back' : 'Join MindEase'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Your supportive AI friend is waiting.' : 'Start your journey to better mental wellness.'}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <User color="rgba(255,255,255,0.4)" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            {!isLogin && (
              <View style={styles.inputContainer}>
                <Mail color="rgba(255,255,255,0.4)" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Lock color="rgba(255,255,255,0.4)" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                {showPassword ? (
                  <EyeOff color="rgba(255,255,255,0.4)" size={20} />
                ) : (
                  <Eye color="rgba(255,255,255,0.4)" size={20} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.button}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={styles.buttonText}>
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </Text>
                  <ArrowRight color="#000" size={20} />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.switchButton}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={styles.switchText}>
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050a08',
  },
  content: {
    flex: 1,
  },
  innerContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff', // Matched with Web/Onboarding Theme
    borderRadius: 12,
    height: 56,
    marginTop: 8,
    gap: 8,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
});
