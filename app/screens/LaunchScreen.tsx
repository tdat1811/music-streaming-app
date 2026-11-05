import React from 'react';
import {
  View,
  Text,
  Image,
  ImageBackground,
  TouchableOpacity,
  StyleSheet,
  } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IMAGES } from '../../src/constants/images';
import { COLORS } from '../../src/constants/theme';

interface LaunchScreenProps {
  onNavigateToSignUp?: () => void;
  onNavigateToLogin?: () => void;
}

export const LaunchScreen: React.FC<LaunchScreenProps> = ({
  onNavigateToSignUp,
  onNavigateToLogin,
}) => {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ImageBackground
        source={IMAGES.launchBg}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Top Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={IMAGES.soundwaveWhite}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Centered Title */}
          <View style={styles.centerContainer}>
            <Text style={styles.titleText}>Your music</Text>
            <Text style={styles.titleText}>Your</Text>
            <Text style={styles.titleText}>artists</Text>
          </View>

          {/* Bottom Action Buttons */}
          <View style={styles.bottomContainer}>
            <TouchableOpacity
              style={styles.createAccountButton}
              onPress={onNavigateToSignUp}
              activeOpacity={0.85}
            >
              <Text style={styles.createAccountText}>Create an account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={onNavigateToLogin}
              activeOpacity={0.85}
            >
              <Text style={styles.loginText}>I already have an account</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoImage: {
    width: 60,
    height: 48,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 'auto',
  },
  titleText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 48,
  },
  bottomContainer: {
    width: '100%',
    gap: 14,
    marginBottom: 10,
  },
  createAccountButton: {
    backgroundColor: '#121316',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createAccountText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loginButton: {
    backgroundColor: '#E5F9FA',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#10C7D5',
    fontSize: 16,
    fontWeight: '700',
  },
});
