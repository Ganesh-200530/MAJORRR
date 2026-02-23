import React, { useState, useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Send, Menu, LogOut } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';

import { theme } from '../theme';
import { GlassContainer } from '../components/GlassContainer';
import { ChatBubble } from '../components/ChatBubble';

// --- CONFIG --- 
// Using 10.0.2.2 for Android Emulator, localhost for iOS
const API_URL = 'http://192.168.29.173:8000';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isCrisis?: boolean;
}

type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Chat: undefined;
};

type ChatScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
};

export default function ChatScreen({ navigation }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: "Hey! I'm MindEase. How's it going today?", sender: 'ai' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userName');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user'
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'No authentication token found. Please log in again.');
        await handleLogout();
        return;
      }

      // NOTE: Replace with your machine's IP if running on physical device
      const response = await axios.post(
        `${API_URL}/chat`, 
        {
          session_id: 'mobile-user',
          message: userMsg.text
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = response.data;
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: data.message,
        sender: 'ai',
        isCrisis: data.suggest_hospitals
      };

      setMessages(prev => [...prev, aiMsg]);

      if (data.suggest_hospitals && data.hospital_data) {
        Alert.alert(
          "Support Available",
          "I've detected you might be going through a tough time.",
          [{ text: "OK" }]
        );
      }

    } catch (error: any) {
      console.error(error);
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          Alert.alert('Session Expired', 'Please log in again.');
          await handleLogout();
          return;
      }
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm having trouble connecting to my brain right now. 🧠💤 Check your internet?",
        sender: 'ai'
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  return (
    <LinearGradient
        colors={[theme.backgroundStart, theme.backgroundEnd]}
        style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        
        {/* HEADER */}
        <View style={styles.header}>
            <View style={styles.headerLeft}>
                {/* Menu Button from design */}
                <TouchableOpacity onPress={() => navigation.replace('Onboarding')} style={styles.menuIcon}>
                     <View style={{ width: 14, height: 2, backgroundColor: 'white', borderRadius: 2 }} />
                     <View style={{ width: 22, height: 2, backgroundColor: 'white', borderRadius: 2 }} />
                     <View style={{ width: 10, height: 2, backgroundColor: 'white', borderRadius: 2 }} />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>CHAT</Text>
                </View>
            </View>
            <TouchableOpacity onPress={handleLogout} style={{ padding: 8 }}>
                <LogOut color="rgba(255,255,255,0.7)" size={20} />
            </TouchableOpacity>
        </View>

        {/* CHAT AREA */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ChatBubble 
              text={item.text} 
              isUser={item.sender === 'user'} 
              isCrisis={item.isCrisis}
            />
          )}
          contentContainerStyle={styles.chatList}
          style={styles.flex}
        />

        {/* INPUT AREA (Floating Glass Bar) */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.inputContainer}>
            <GlassContainer style={styles.inputWrapper} borderRadius={50}>
              <TextInput
                style={styles.input}
                placeholder="What is on your mind?"
                placeholderTextColor="#666"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              <TouchableOpacity 
                onPress={sendMessage} 
                style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.5 }]}
                disabled={!inputText.trim() || isLoading}
              >
                <View style={{ width: 10, height: 10, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#000', transform: [{rotate: '-45deg'}]}} />
              </TouchableOpacity>
            </GlassContainer>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.1)',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4
  },
  headerTitleContainer: {
      flex: 1,
      alignItems: 'center',
      marginRight: 40, // offset menu width to center title
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 2,
    textTransform: 'uppercase'
  },
  chatList: {
    padding: 16,
    paddingBottom: 20,
  },
  
  // Input
  inputContainer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 10 : 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingLeft: 20,
    justifyContent: 'space-between'
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.text,
    maxHeight: 100,
    paddingVertical: 10,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
