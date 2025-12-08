import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface LogoProps {
  size?: number;
}

export default function Logo({ size = 80 }: LogoProps) {
  return (
    <View style={styles.logoContainer}>
      <Image
        source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/0a9rzbah1212yq875okwd' }}
        style={[styles.logo, { width: size, height: size }]}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    paddingLeft: 16,
    paddingTop: 8,
  },
  logo: {
    resizeMode: 'contain' as const,
  },
});
