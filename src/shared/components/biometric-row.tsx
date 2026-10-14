// Profile row for "Log in with Face ID / fingerprint": shown only when it is turned on for this account; tap to turn it off.
import React from 'react';
import { Alert, View } from 'react-native';
import { useStore } from '../core/store';
import { biometricKind, forgetLogin, savedLogin } from '../core/native';
import { Card, IconTile, Muted, Row, T } from './ui';

export function BiometricRow() {
  const { s, toast } = useStore();
  const role = s.api?.role;
  const [state, setState] = React.useState<{ kind: string } | null>(null);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!role) return;
      const [kind, saved] = await Promise.all([biometricKind(), savedLogin(role)]);
      if (alive) setState(kind && saved ? { kind } : null);
    })();
    return () => { alive = false; };
  }, [role]);
  if (!role || !state) return null;
  const off = () => Alert.alert(`Turn off ${state.kind} log-in?`, 'Your saved login is removed from this phone. You can turn it on again the next time you log in with your password.', [
    { text: 'Keep it on', style: 'cancel' },
    { text: 'Turn off', style: 'destructive', onPress: async () => { await forgetLogin(role); setState(null); toast(`${state.kind} log-in turned off`); } },
  ]);
  return (
    <Card onPress={off} style={{ paddingVertical: 12 }}>
      <Row><Row style={{ justifyContent: 'flex-start', gap: 12, flex: 1 }}><IconTile glyph="🔐" size={38} /><View style={{ flex: 1 }}><T style={{ fontSize: 15, fontWeight: '600' }}>{state.kind} log-in</T><Muted style={{ fontSize: 12 }}>On · tap to turn off</Muted></View></Row></Row>
    </Card>
  );
}
