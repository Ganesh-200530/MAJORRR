import React from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface GlassContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
}

export const GlassContainer: React.FC<GlassContainerProps> = ({ 
  children, 
  style, 
  borderRadius = 24,
}) => {
  return (
    <View style={[
      styles.container, 
      { 
        borderRadius,
      }, 
      style
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.surfaceBorder,
    // Add subtle shadow? In dark mode, shadows are tricky, usually prefer glow or just contrast
  },
});
