import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, Briefcase, Heart } from 'lucide-react-native';

import { theme } from '../theme';
import { GlassContainer } from '../components/GlassContainer';

type RootStackParamList = {
  Onboarding: undefined;
  Chat: undefined;
};

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  return (
    <LinearGradient
      colors={[theme.backgroundStart, theme.backgroundEnd]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        
        <View style={styles.content}>
            
            {/* Logo / Header Branding */}
            <View style={styles.brandingContainer}>
                 <GlassContainer style={styles.logoContainer} borderRadius={40}>
                    <Image 
                        source={{ uri: 'https://api.dicebear.com/9.x/bottts-neutral/png?seed=MindEase&backgroundColor=b6e3f4' }} 
                        style={styles.logo} 
                    />
                 </GlassContainer>
                 <Text style={styles.appName}>MINDEASE</Text>
                 <Text style={styles.appTagline}>Your AI Companion</Text>
            </View>

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Main Action Button */}
            <TouchableOpacity onPress={() => navigation.replace('Chat')} activeOpacity={0.8}>
                <View style={styles.startButton}>
                    <Text style={styles.startButtonText}>Let's Begin</Text>
                    <View style={styles.arrowIcon}>
                        <View style={{ width: 10, height: 10, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#000', transform: [{rotate: '45deg'}]}} />
                    </View>
                </View>
            </TouchableOpacity>

            {/* Recent Chats Section (Placeholder) */}
            <View style={styles.historyContainer}>
                <View style={styles.historyHeader}>
                    <Text style={styles.historyTitle}>Recent Chats</Text>
                    {/* <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity> */}
                </View>
                
                <GlassContainer style={styles.historyItem}>
                    <View style={styles.historyIcon}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />
                    </View>
                    <View>
                        <Text style={styles.historyItemTitle}>No previous conversations</Text>
                        <Text style={styles.historyItemSub}>Start a new chat to see history here.</Text>
                    </View>
                </GlassContainer>
            </View>

        </View>

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
  content: {
    padding: 24,
    flex: 1,
    justifyContent: 'center',
  },
  brandingContainer: {
      alignItems: 'center',
      marginTop: 60,
  },
  logoContainer: {
      padding: 4,
      borderRadius: 50,
      marginBottom: 20,
      width: 100,
      height: 100,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.05)'
  },
  logo: {
      width: 80,
      height: 80,
  },
  appName: {
      fontSize: 32,
      fontWeight: '900',
      color: 'white',
      letterSpacing: 4,
  },
  appTagline: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 8,
      letterSpacing: 1,
  },
  startButton: {
      backgroundColor: theme.primary,
      borderRadius: 40,
      paddingVertical: 20,
      paddingHorizontal: 32,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 40,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
  },
  startButtonText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.onPrimary,
      textTransform: 'uppercase',
      letterSpacing: 1,
  },
  arrowIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: 'rgba(255,255,255,0.3)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingRight: 2, // optical adjustment
  },
  historyContainer: {
      marginBottom: 20,
  },
  historyHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 4,
  },
  historyTitle: {
      color: theme.textSecondary,
      fontSize: 14,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 1,
  },
  historyItem: {
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
  },
  historyIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.05)',
      alignItems: 'center',
      justifyContent: 'center',
  },
  historyItemTitle: {
      color: 'white',
      fontWeight: '600',
      fontSize: 16,
  },
  historyItemSub: {
      color: theme.textSecondary,
      fontSize: 13,
      marginTop: 2,
  },
});
