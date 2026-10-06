import { Image } from 'expo-image';
import React from 'react';
import { Text, View } from 'react-native';
import { C } from './ui';

/** RepairHub hexagon mark (house + wrench), from the Figma "Logo Identity" frame. */
export const LogoMark = ({ size = 32 }: { size?: number }) => (
  <Image source={require('../../../assets/mark.png')} style={{ width: size, height: size }} contentFit="contain" accessibilityLabel="RepairHub" />
);

/** Primary horizontal logo: mark + “Repair” (ink) “Hub” (brand blue). */
export const Logo = ({ size = 22, light }: { size?: number; light?: boolean }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.3 }} accessibilityRole="header" accessibilityLabel="RepairHub">
    <LogoMark size={size * 1.35} />
    <Text style={{ fontSize: size, fontWeight: '800', color: light ? '#fff' : C.ink, letterSpacing: -0.3 }}>Repair<Text style={{ color: light ? '#fff' : C.brand }}>Hub</Text></Text>
  </View>
);
