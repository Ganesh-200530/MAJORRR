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
  Image,
  Animated,
  Vibration
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Send, Menu, LogOut, X, MessageSquare, Plus, Trash2, User, Mic } from 'lucide-react-native';
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

interface Hospital {
  name: string;
  address: string;
  contact: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isCrisis?: boolean;
  isAnxiety?: boolean;
  hospitalData?: Hospital[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
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
  const [userName, setUserName] = useState('');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  const micScale = useRef(new Animated.Value(1)).current;

  const handleMicPressIn = () => {
    Vibration.vibrate(50); // micro haptic vibration
    Animated.spring(micScale, {
      toValue: 1.2,
      useNativeDriver: true,
    }).start();
  };

  const handleMicPressOut = () => {
    Animated.spring(micScale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedName = await AsyncStorage.getItem('userName') || 'User';
        setUserName(storedName);

        const storageKey = `chat_history_${storedName}`;
        const storedSessions = await AsyncStorage.getItem(storageKey);
        
        const defaultMsg: Message = { id: '1', text: `Hi ${storedName}! I'm MindEase. How can I help you today?`, sender: 'ai' };

        if (storedSessions) {
          const parsed = JSON.parse(storedSessions);
          if (parsed && parsed.length > 0) {
            setSessions(parsed);
            setActiveSessionId(parsed[0].id);
            return;
          }
        }
        
        // No sessions found, create default
        const newSession = {
          id: Date.now().toString(),
          title: 'New Conversation',
          messages: [defaultMsg],
          updatedAt: Date.now()
        };
        setSessions([newSession]);
        setActiveSessionId(newSession.id);
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    };
    loadData();
  }, []);

  // Save history on change
  useEffect(() => {
    if (sessions.length > 0 && userName) {
      AsyncStorage.setItem(`chat_history_${userName}`, JSON.stringify(sessions));
    }
  }, [sessions, userName]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  const handleNewConversation = () => {
    const defaultMsg: Message = { id: Date.now().toString(), text: `Hi ${userName}! I'm MindEase. How can I help you today?`, sender: 'ai' };
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [defaultMsg],
      updatedAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setIsSidebarOpen(false);
  };

  const handleDeleteSession = (idToDelete: string) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== idToDelete);
      if (filtered.length === 0) {
        const defaultMsg: Message = { id: Date.now().toString(), text: `Hi ${userName}! I'm MindEase. How can I help you today?`, sender: 'ai' };
        const newSession = {
          id: Date.now().toString(),
          title: 'New Conversation',
          messages: [defaultMsg],
          updatedAt: Date.now()
        };
        setActiveSessionId(newSession.id);
        return [newSession];
      }
      if (idToDelete === activeSessionId) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

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

    const currentInput = inputText.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      text: currentInput,
      sender: 'user'
    };

    setInputText('');
    setIsLoading(true);

    setSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        const isFirstMessage = session.messages.length <= 1;
        return {
          ...session,
          title: isFirstMessage ? currentInput.substring(0, 30) + (currentInput.length > 30 ? '...' : '') : session.title,
          messages: [...session.messages, userMsg],
          updatedAt: Date.now()
        };
      }
      return session;
    }).sort((a, b) => b.updatedAt - a.updatedAt));

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'No authentication token found. Please log in again.');
        await handleLogout();
        return;
      }

      const response = await axios.post(
        `${API_URL}/chat`, 
        {
          session_id: `mobile-${userName}-${activeSessionId}`,
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
        isCrisis: data.suggest_hospitals,
        isAnxiety: data.anxiety_detected,
        hospitalData: data.hospital_data
      };

      // Vibrate slightly when AI replies
      Vibration.vibrate(30);

      setSessions(prev => prev.map(session => {
        if (session.id === activeSessionId) {
          return {
            ...session,
            messages: [...session.messages, aiMsg],
            updatedAt: Date.now()
          };
        }
        return session;
      }));

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
      setSessions(prev => prev.map(session => {
        if (session.id === activeSessionId) {
          return {
            ...session,
            messages: [...session.messages, errorMsg]
          };
        }
        return session;
      }));
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
    <>
    <LinearGradient
        colors={[theme.backgroundStart, theme.backgroundEnd]}
        style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        
        {/* HEADER */}
        <View style={styles.header}>
            {/* Menu Button from design */}
            <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.menuIcon}>
                 <View style={{ width: 14, height: 2, backgroundColor: 'white', borderRadius: 2 }} />
                 <View style={{ width: 22, height: 2, backgroundColor: 'white', borderRadius: 2 }} />
                 <View style={{ width: 10, height: 2, backgroundColor: 'white', borderRadius: 2 }} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>MINDEASE</Text>
            </View>

            <TouchableOpacity onPress={() => setIsSidebarOpen(true)} style={styles.dummyProfileRight}>
                 <User color="rgba(255,255,255,0.7)" size={20} />
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
              isAnxiety={item.isAnxiety}
              hospitalData={item.hospitalData}
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
              <Animated.View style={{ transform: [{ scale: micScale }] }}>
                <TouchableOpacity 
                  style={styles.micButton}
                  onPressIn={handleMicPressIn}
                  onPressOut={handleMicPressOut}
                  activeOpacity={0.7}
                >
                  <Mic color="#666" size={20} />
                </TouchableOpacity>
              </Animated.View>
              <TouchableOpacity 
                onPress={sendMessage} 
                style={[styles.sendButton, { opacity: inputText.trim() ? 1 : 0.5 }]}
                disabled={!inputText.trim() || isLoading}
              >
                <Send color="black" size={20} strokeWidth={2.5} />
              </TouchableOpacity>
            </GlassContainer>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>

    {/* SIDEBAR OVERLAY */}
    {isSidebarOpen && (
      <View style={styles.sidebarOverlay}>
        <TouchableOpacity 
          style={styles.sidebarBackdrop} 
          activeOpacity={1} 
          onPress={() => setIsSidebarOpen(false)} 
        />
        <View style={styles.sidebarContent}>
          <SafeAreaView style={styles.sidebarSafeArea}>
            {/* Sidebar Header */}
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarProfile}>
                <View style={styles.avatarPlaceholder}>
                  <User color="rgba(255,255,255,0.8)" size={20} />
                </View>
                <Text style={styles.sidebarName}>{userName}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsSidebarOpen(false)} style={styles.closeBtn}>
                <X color="white" size={24} />
              </TouchableOpacity>
            </View>

            {/* New Chat Button */}
            <TouchableOpacity style={styles.newChatBtn} onPress={handleNewConversation}>
              <Plus color="white" size={20} />
              <Text style={styles.newChatText}>New Conversation</Text>
            </TouchableOpacity>

            <Text style={styles.historyTitle}>Recent Chats</Text>

            {/* Session List */}
            <FlatList
              data={sessions}
              keyExtractor={item => item.id}
              style={{ flex: 1 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.sessionItem, activeSessionId === item.id && styles.activeSessionItem]}
                  onPress={() => {
                    setActiveSessionId(item.id);
                    setIsSidebarOpen(false);
                  }}
                >
                  <MessageSquare color={activeSessionId === item.id ? "white" : "rgba(255,255,255,0.5)"} size={18} />
                  <Text style={[styles.sessionItemText, activeSessionId === item.id && styles.activeSessionItemText]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteSession(item.id)} style={styles.deleteBtn}>
                    <Trash2 color={activeSessionId === item.id ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)"} size={16} />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
            />

            {/* Logout Footer */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <LogOut color="rgba(248, 113, 113, 0.8)" size={20} />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>

          </SafeAreaView>
        </View>
      </View>
    )}
    </>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: 'white',
    letterSpacing: 2,
    textTransform: 'uppercase'
  },
  dummyProfileRight: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
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
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  micButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Sidebar Styles
  sidebarOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    zIndex: 999,
  },
  sidebarBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebarContent: {
    width: '75%',
    maxWidth: 300,
    backgroundColor: '#0B0D0E',
    height: '100%',
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sidebarSafeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  sidebarProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1D20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sidebarName: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 20,
    padding: 14,
    backgroundColor: '#1A1D20',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  newChatText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  historyTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  activeSessionItem: {
    backgroundColor: '#1A1D20',
    borderRightWidth: 3,
    borderRightColor: 'white',
  },
  sessionItemText: {
    flex: 1,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  activeSessionItemText: {
    color: 'white',
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 4,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  logoutText: {
    color: 'rgba(248, 113, 113, 0.8)',
    fontSize: 15,
    fontWeight: '600',
  }
});
