// Welcome and "I need a repair / I'm a technician" role choice.
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Logo } from '../../shared/components/logo';
import { Btn, Muted, Screen, Title, Bold, C, Card, FadeIn, Link, Row } from '../../shared/components/ui';
import { Account, IMG } from '../../shared/core/data';
import { useStore } from '../../shared/core/store';
import Ionicons from '@expo/vector-icons/Ionicons';

export function Onboarding() {
  return (
      <Screen>
        <View style={{ alignItems: 'center', paddingTop: 20 }}>
          <Logo size={30} />
          <Title style={{ marginTop: 28, textAlign: 'center', fontSize: 20 }}>Trusted repair services,{'\n'}just a few taps away.</Title>
          <Muted style={{ textAlign: 'center', fontSize: 14, lineHeight: 20, marginTop: 4 }}>Get verified technicians, compare quotes, track repairs and enjoy peace of mind with warranty.</Muted>
          <Image source={IMG.mechanic} style={{ width: 250, height: 243, marginVertical: 22 }} contentFit="contain" accessibilityLabel="Technician holding a wrench" />
        </View>
        <Btn title="Create Account" onPress={() => router.push({ pathname: '/role', params: { mode: 'signup' } })} />
        <Btn title="Log In" variant="sec" onPress={() => router.push({ pathname: '/role', params: { mode: 'login' } })} />
      </Screen>
  );
}

/* Role picker (Figma: Technician Onboarding / Welcome to RepairHub) */

export function RolePicker() {
  const { set } = useStore();
  // Same choice for both paths: pick who you are, then create that account or log in to it.
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'signup' | 'login'>(params.mode === 'login' ? 'login' : 'signup');
  const pick = (r: 'customer' | 'technician') => { set({ signupRole: r, authMode: mode }); router.push(mode === 'login' ? '/login' : '/signup'); };
  // Figma "Welcome to RepairHub": illustrated cards, icon chip beside the title, round arrow button.
  const RoleCard = ({ title, sub, art, icon, iconColor, bg, onPress }: { title: string; sub: string; art: number; icon: React.ComponentProps<typeof Ionicons>['name']; iconColor: string; bg: string; onPress: () => void }) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}. ${sub}`}
      style={({ pressed }) => ({ backgroundColor: bg, borderRadius: 20, overflow: 'hidden', marginBottom: 18, flexDirection: 'row', minHeight: 158, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
      <Image source={art} style={{ width: '42%', alignSelf: 'stretch' }} contentFit="cover" contentPosition="bottom left" accessibilityIgnoresInvertColors />
      <View style={{ flex: 1, paddingTop: 16, paddingRight: 14, paddingBottom: 14, paddingLeft: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#DCE8FD', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={16} color={iconColor} /></View>
          <Text style={{ flex: 1, fontSize: 17, fontWeight: '700', color: C.ink }}>{title}</Text>
        </View>
        <Text style={{ fontSize: 14, lineHeight: 20, color: '#3D4350', marginTop: 8 }}>{sub}</Text>
        <View style={{ flex: 1 }} />
        <View style={{ alignSelf: 'flex-end', width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="arrow-forward" size={20} color="#fff" /></View>
      </View>
    </Pressable>
  );
  return (
    <Screen title="">
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Logo size={30} />
        <Text style={{ marginTop: 20, fontSize: 27, fontWeight: '800', color: C.ink, textAlign: 'center' }}>{mode === 'login' ? 'Welcome back' : 'Welcome to RepairHub'}</Text>
        <Text style={{ marginTop: 10, fontSize: 16, fontWeight: '500', color: '#3D4350', textAlign: 'center' }}>{mode === 'login' ? 'Which account are you logging in to?' : 'How would you like to use the app?'}</Text>
        <Muted style={{ textAlign: 'center', marginTop: 12, fontSize: 13, lineHeight: 19, paddingHorizontal: 16 }}>{mode === 'login' ? 'Choose customer or technician to continue.' : 'Choose the option that best describes you so we can set up the right experience.'}</Muted>
      </View>
      <FadeIn delay={80}><RoleCard title="I need a repair" sub="Find trusted technicians for your devices and home repairs" art={IMG.roleCustomerArt} icon="person-outline" iconColor={C.primary} bg="#F0F6FE" onPress={() => pick('customer')} /></FadeIn>
      <FadeIn delay={180}><RoleCard title="I’m a technician" sub="Find repair jobs, send quotes and manage your services." art={IMG.roleTechArt} icon="build-outline" iconColor="#F79009" bg="#FEFBED" onPress={() => pick('technician')} /></FadeIn>
      <View style={{ marginTop: 28, marginBottom: 12 }}>
      <Text style={{ textAlign: 'center', fontSize: 15, color: '#3D4350', paddingVertical: 4 }}>
        {mode === 'login' ? 'Don’t have an account? ' : 'Already have an account? '}
        <Text style={{ color: C.primary, fontWeight: '600' }} onPress={() => setMode(mode === 'login' ? 'signup' : 'login')} accessibilityRole="link">{mode === 'login' ? 'Create one' : 'Log in'}</Text>
      </Text>
      </View>
    </Screen>
  );
}

/* Create account (Figma) — phone + OTP per PRD FR-1 (no password / social login in v1) */
