import React from 'react';
import { View, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { theme } from '../theme';

interface ClayContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  depth?: number; // How "popped" it looks
}

export const ClayContainer: React.FC<ClayContainerProps> = ({ 
  children, 
  style, 
  borderRadius = 20,
  depth = 10 
}) => {
  return (
    <View style={[
      styles.container, 
      { 
        borderRadius,
        shadowRadius: depth,
        elevation: depth,
      }, 
      style
    ]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.backgroundStart,
    shadowColor: '#000',
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 0.5,
    // Note: To achieve true claymorphism on Android, we rely on elevation.
    // On iOS, we would add a second negative shadow (white), but React Native's shadow props are single-layer.
    // We simulate the softness with background color and elevation.
  },
});
