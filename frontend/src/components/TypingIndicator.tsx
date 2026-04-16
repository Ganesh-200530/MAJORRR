import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { theme } from '../theme';

export const TypingIndicator = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            delay: delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animateDot(dot1, 0);
    animateDot(dot2, 200);
    animateDot(dot3, 400);
  }, [dot1, dot2, dot3]);

  const translateY1 = dot1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  const translateY2 = dot2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  const translateY3 = dot3.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -5],
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, { transform: [{ translateY: translateY1 }] }]} />
      <Animated.View style={[styles.dot, { transform: [{ translateY: translateY2 }] }]} />
      <Animated.View style={[styles.dot, { transform: [{ translateY: translateY3 }] }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignSelf: 'flex-start',
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    marginLeft: 16,
    marginBottom: 20,
    width: 60,
    justifyContent: 'space-between',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
});
