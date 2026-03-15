import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { theme } from '../theme';

interface Hospital {
  name: string;
  address: string;
  contact: string;
}

interface MessageProps {
  text: string;
  isUser: boolean;
  isCrisis?: boolean;
  isAnxiety?: boolean;
  hospitalData?: Hospital[];
}

export const ChatBubble: React.FC<MessageProps> = ({ text, isUser, isCrisis, isAnxiety, hospitalData }) => {
  const slideAnim = useRef(new Animated.Value(20)).current; 
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, slideAnim]);

  const containerStyle = [
    styles.bubble,
    isUser ? styles.userBubble : styles.aiBubble,
    isCrisis && styles.crisisBubble
  ];

  const textStyle = [
    styles.text,
    isUser ? styles.userText : styles.aiText,
    isCrisis && styles.crisisText
  ];

  return (
    <Animated.View style={[
      styles.outerContainer, 
      isUser ? styles.userRow : styles.aiRow,
      { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
    ]}>
      <View style={containerStyle}>
        <Text style={textStyle}>{text}</Text>
        {isAnxiety && (
           <View style={styles.anxietyContainer}>
               <Text style={styles.anxietyTitle}>Take a moment to center yourself.</Text>
               <View style={styles.anxietyCircleContainer}>
                   <View style={styles.anxietyCircleOuter} />
                   <View style={styles.anxietyCircleInner} />
                   <View style={styles.anxietyCircleCore} />
               </View>
               <Text style={styles.anxietyText}>Breathe in... Breathe out...</Text>
           </View>
        )}
        {isCrisis && hospitalData && hospitalData.length > 0 && (
          <View style={styles.hospitalContainer}>
             <Text style={styles.emergencyTitle}>Emergency Contacts & Facilities:</Text>
             {hospitalData.map((h, i) => (
                 <View key={i} style={styles.hospitalCard}>
                     <Text style={styles.hospitalName}>{h.name}</Text>
                     <Text style={styles.hospitalAddress}>{h.address}</Text>
                     <Text style={styles.hospitalContact}>📞 {h.contact}</Text>
                 </View>
             ))}
          </View>
        )}
      </View>
      
      {/* Meta / Tag under bubble - AI Only */}
      {!isUser && (
        <View style={styles.metaContainer}>
            <Text style={styles.metaText}>🤖 MINDEASE AI</Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    width: '100%',
    marginBottom: 12,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  aiRow: {
    alignItems: 'flex-start',
  },
  bubble: {
    padding: 16,
    borderRadius: 24,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  userBubble: {
    backgroundColor: '#1A1D20', // Matched with web
    borderBottomRightRadius: 8,
  },
  aiBubble: {
    backgroundColor: '#151719', // Matched with web
    borderBottomLeftRadius: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 8,
  },
  metaText: {
    color: '#6b7280', // gray-500
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  crisisBubble: {
    backgroundColor: 'rgba(248, 113, 113, 0.05)', // Softer red
    borderColor: 'rgba(248, 113, 113, 0.3)',
    borderWidth: 1,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: 'System', 
  },
  userText: {
    color: '#f3f4f6', 
    fontWeight: '400',
  },
  aiText: {
    color: '#e5e7eb', 
    fontWeight: '400',
  },
  crisisText: {
    color: '#fca5a5',
    fontWeight: '500',
  },
  hospitalContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 68, 68, 0.3)',
    paddingTop: 12,
  },
  emergencyTitle: {
    color: '#ff8888',
    fontWeight: 'bold',
    fontSize: 13,
    marginBottom: 8,
  },
  hospitalCard: {
    backgroundColor: '#1A1D20',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)', // matched web border-red-500/20
    padding: 12, // matched web p-3
    borderRadius: 12, // matched web rounded-xl
    marginBottom: 8,
  },
  hospitalName: {
    color: '#f3f4f6', // matched web text-gray-100
    fontWeight: 'bold',
    fontSize: 14,
  },
  hospitalAddress: {
    color: '#9ca3af', // matched web text-gray-400
    fontSize: 12,
    marginTop: 4,
  },
  hospitalContact: {
    color: '#2ECC71',
    fontWeight: '600',
    marginTop: 4,
    fontSize: 13,
  },
  anxietyContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#1A1D20',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  anxietyTitle: {
    color: '#93C5FD',
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  anxietyText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 24,
    textAlign: 'center',
  },
  anxietyCircleContainer: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  anxietyCircleOuter: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  anxietyCircleInner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 130, 246, 0.4)',
  },
  anxietyCircleCore: {
    position: 'relative',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#60A5FA',
  }
});
