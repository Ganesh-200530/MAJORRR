import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface MessageProps {
  text: string;
  isUser: boolean;
  isCrisis?: boolean;
}

export const ChatBubble: React.FC<MessageProps> = ({ text, isUser, isCrisis }) => {
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
    <View style={containerStyle}>
      <Text style={textStyle}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  bubble: {
    padding: 16,
    borderRadius: 24,
    maxWidth: '85%',
    marginVertical: 6,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: theme.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    borderBottomLeftRadius: 4,
  },
  crisisBubble: {
    backgroundColor: 'rgba(248, 113, 113, 0.2)', // Red with transparency
    borderColor: theme.accent,
    borderWidth: 1,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'System', 
  },
  userText: {
    color: theme.onPrimary, // Dark text on green bubble
    fontWeight: '600',
  },
  aiText: {
    color: theme.text, // White text on glass bubble
  },
  crisisText: {
    color: '#fca5a5',
    fontWeight: 'bold',
  },
});
