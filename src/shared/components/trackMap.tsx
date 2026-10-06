// Live map of the technician heading to the customer (Apple Maps on iOS, Google Maps on Android).
import React from 'react';
import { Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { C } from './ui';
import { customerSpot, regionFor, routeTo, techPosition, useTick } from '../core/trackRoute';

export function TrackMap({ since, techName, address, height = 220 }: { since: number; techName: string; address: string; height?: number }) {
  const now = useTick();
  const CUSTOMER = React.useMemo(() => customerSpot(address), [address]);
  const ROUTE = React.useMemo(() => routeTo(CUSTOMER), [CUSTOMER]);
  const { bbox: _b, ...region } = regionFor(ROUTE);
  const p = techPosition(now - since, ROUTE);
  return (
    <View style={{ height, borderRadius: 14, overflow: 'hidden', marginVertical: 10, borderWidth: 1, borderColor: C.line }}>
      <MapView style={{ flex: 1 }} initialRegion={region}
        showsPointsOfInterests={false} toolbarEnabled={false} accessibilityLabel={`Map: ${techName} is about ${p.minsLeft} min away`}>
        <Polyline coordinates={ROUTE} strokeColor="#9DB4F5" strokeWidth={5} />
        <Polyline coordinates={p.walked} strokeColor={C.primary} strokeWidth={5} />
        <Marker coordinate={CUSTOMER} title="You" description={address} pinColor="red" />
        <Marker coordinate={p.at} title={techName} description={`About ${p.minsLeft} min away`} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={{ backgroundColor: C.primary, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 2, borderColor: '#fff' }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>🛵 {p.minsLeft} min</Text>
          </View>
        </Marker>
      </MapView>
    </View>
  );
}
