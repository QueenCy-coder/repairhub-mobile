// Web: OpenStreetMap embed (react-native-maps has no web support). The marker sits on the technician's current position.
import React from 'react';
import { Text, View } from 'react-native';
import { C } from './ui';
import { customerSpot, regionFor, routeTo, techPosition, useTick } from '../core/trackRoute';

export function TrackMap({ since, techName, address, height = 220 }: { since: number; techName: string; address: string; height?: number }) {
  const now = useTick(15000);
  const route = React.useMemo(() => routeTo(customerSpot(address)), [address]);
  const p = techPosition(now - since, route);
  const bbox = regionFor(route).bbox.map(n => n.toFixed(4)).join('%2C');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${p.at.latitude.toFixed(5)}%2C${p.at.longitude.toFixed(5)}`;
  return (
    <View style={{ height, borderRadius: 14, overflow: 'hidden', marginVertical: 10, borderWidth: 1, borderColor: C.line }}>
      {React.createElement('iframe', { src, title: `Map: ${techName} is about ${p.minsLeft} min away`, style: { border: 0, width: '100%', height: '100%' }, loading: 'lazy' })}
      <View style={{ position: 'absolute', left: 10, top: 10, backgroundColor: C.primary, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 }}>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>🛵 {techName.split(' ')[0]} · about {p.minsLeft} min away</Text>
      </View>
    </View>
  );
}
