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
import { Send, Menu, LogOut, X, MessageSquare, Plus, Trash2, User, Mic, Globe, Activity } from 'lucide-react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';

import { THEMES } from '../theme';
import { GlassContainer } from '../components/GlassContainer';
import { ChatBubble } from '../components/ChatBubble';
import { TypingIndicator } from '../components/TypingIndicator';
import { DashboardModal } from '../components/DashboardModal';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  }),
});

// --- CONFIG --- 
// Using 10.0.2.2 for Android Emulator, localhost for iOS
const API_URL = 'http://100.30.177.1:8000';

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
  replyTo?: {
    text: string;
    isUser: boolean;
  };
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'Auto-Detect' | 'English' | 'Spanish' | 'Hindi' | 'Telugu' | 'French'>('Auto-Detect');
  const [location, setLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecordingDictation, setIsRecordingDictation] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [activeThemeKey, setActiveThemeKey] = useState<keyof typeof THEMES>('dark');
  const flatListRef = useRef<FlatList>(null);

  const activeTheme = THEMES[activeThemeKey];
  
  const micScale = useRef(new Animated.Value(1)).current;

  const handleMicPressIn = async () => {
    Vibration.vibrate(50); // micro haptic vibration
    Animated.spring(micScale, {
      toValue: 1.5,
      useNativeDriver: true,
    }).start();

    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
        setIsRecordingDictation(true);
      } else {
        Alert.alert('Permission Denied', 'Please grant microphone access to use dictation.');
      }
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const handleMicPressOut = async () => {
    Animated.spring(micScale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();

    if (!recording) return;

    try {
      setIsRecordingDictation(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) return;

      // Send to backend for STT Transcription
      setIsLoading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        type: 'audio/m4a',
        name: 'dictation.m4a'
      } as any);

      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.post(`${API_URL}/transcribe`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
      });

      if (response.data && response.data.text) {
        // Append transcribed text to the input field
        setInputText(prev => prev ? prev + ' ' + response.data.text : response.data.text);
      }

    } catch (err) {
      console.error('Failed to stop recording or transcribe', err);
      Alert.alert('Error', 'Failed to transcribe audio.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initPushNotifications = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "MindEase Connection 🌿",
            body: "Take a deep breath. We're here if you want to chat.",
          },
          trigger: { seconds: 24 * 60 * 60, repeats: true } as any
        });
      }
    };

    const loadData = async () => {
      initPushNotifications();
      // Get Location
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({});
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude
          });
        }
      } catch (e) {
        console.log("Location error:", e);
      }

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

  const cycleLanguage = () => {
    const langs: ('Auto-Detect' | 'English' | 'Spanish' | 'Hindi' | 'Telugu' | 'French')[] = ['Auto-Detect', 'English', 'Spanish', 'Hindi', 'Telugu', 'French'];
    const currentIndex = langs.indexOf(selectedLanguage);
    setSelectedLanguage(langs[(currentIndex + 1) % langs.length]);
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const currentInput = inputText.trim();
    const currentReplyContext = replyingTo ? {
      text: replyingTo.text,
      isUser: replyingTo.sender === 'user'
    } : undefined;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: currentInput,
      sender: 'user',
      replyTo: currentReplyContext
    };

    setInputText('');
    setReplyingTo(null);
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
          message: userMsg.text,
          latitude: location?.latitude,
          longitude: location?.longitude,
          language: selectedLanguage
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
        colors={[activeTheme.backgroundStart, activeTheme.backgroundEnd]}
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

          {/* KEYBOARD AVOIDING WRAPPER FOR BOTH CHAT AND INPUT */}
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
          >
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
                  onLongPress={() => setReplyingTo(item)}
                  replyTo={item.replyTo}
                />
              )}
              ListFooterComponent={isLoading ? <TypingIndicator /> : null}
              contentContainerStyle={styles.chatList}
              style={styles.flex}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            {/* INPUT AREA */}
            <View style={styles.inputContainer}>
              {replyingTo && (
                <View style={styles.replyingToBanner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.replyingToAuthor}>Replying to {replyingTo.sender === 'user' ? 'yourself' : 'MindEase AI'}</Text>
                    <Text style={styles.replyingToText} numberOfLines={1}>{replyingTo.text}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.cancelReplyBtn}>
                    <X color="white" size={18} />
                  </TouchableOpacity>
                </View>
              )}
              <GlassContainer style={styles.inputWrapper} borderRadius={replyingTo ? 20 : 50}>
              <TextInput
                style={[styles.input, { color: activeTheme.text }]}
                placeholder="What is on your mind?"
                placeholderTextColor="#666"
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              <Animated.View style={{ transform: [{ scale: micScale }] }}>
                <TouchableOpacity 
                  style={[styles.micButton, isRecordingDictation && styles.micButtonRecording]}
                  onPressIn={handleMicPressIn}
                  onPressOut={handleMicPressOut}
                  activeOpacity={0.7}
                >
                  <Mic color={isRecordingDictation ? "#ef4444" : "#666"} size={20} />
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

            {/* Language Toggle */}
            <TouchableOpacity style={styles.languageToggleBtn} onPress={cycleLanguage}>
              <View style={styles.languageToggleInner}>
                 <Globe color="white" size={18} />
                 <Text style={styles.languageToggleText}>Language: {selectedLanguage}</Text>
              </View>
            </TouchableOpacity>

            {/* Dashboard Button */}
            <TouchableOpacity style={styles.dashboardToggleBtn} onPress={() => { setIsDashboardOpen(true); setIsSidebarOpen(false); }}>
              <View style={styles.languageToggleInner}>
                 <Activity color="white" size={18} />
                 <Text style={styles.languageToggleText}>Dashboard & Settings</Text>
              </View>
            </TouchableOpacity>

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

    {/* Dashboard Modal */}
    <DashboardModal 
       visible={isDashboardOpen} 
       onClose={() => setIsDashboardOpen(false)} 
       themeKey={activeThemeKey} 
    />
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
  micButtonRecording: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 20,
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
  dashboardToggleBtn: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: '#1A1D20',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  languageToggleBtn: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#1A1D20',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  languageToggleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  languageToggleText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
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
  },
  replyingToBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    marginBottom: -10,
    paddingBottom: 15,
  },
  replyingToAuthor: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  replyingToText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  cancelReplyBtn: {
    padding: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
  }
});
