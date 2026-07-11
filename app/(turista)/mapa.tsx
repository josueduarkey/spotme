import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipCapa } from '../../components/ChipCapa';
import { MarcadorMapa } from '../../components/MarcadorMapa';
import { ActivityPoint, Business, CATEGORIAS, Place } from '../../constants/mock';
import { Colors, Spacing } from '../../constants/theme';
import { getActivityPoints } from '../../lib/queries/activity';
import { getBusinesses } from '../../lib/queries/businesses';
import { getPlaces } from '../../lib/queries/places';

/** Región inicial: El Salvador completo. */
const EL_SALVADOR = {
  latitude: 13.72,
  longitude: -88.9,
  latitudeDelta: 2.1,
  longitudeDelta: 2.4,
};

type Capa = 'lugares' | 'negocios' | 'actividad' | 'eventos' | 'retos';

const CAPAS: { id: Capa; etiqueta: string; emoji: string; disponible: boolean }[] = [
  { id: 'lugares', etiqueta: 'Lugares', emoji: '⛰️', disponible: true },
  { id: 'negocios', etiqueta: 'Negocios', emoji: '🏪', disponible: true },
  { id: 'actividad', etiqueta: 'Actividad', emoji: '📸', disponible: true },
  { id: 'eventos', etiqueta: 'Eventos', emoji: '🎉', disponible: false }, // Fase 5
  { id: 'retos', etiqueta: 'Retos', emoji: '♻️', disponible: false }, // Fase 5
];

/** Pantalla 6 — Mapa full con selector de capas (el corazón del digital twin). */
export default function Mapa() {
  const router = useRouter();
  const [capasActivas, setCapasActivas] = useState<Set<Capa>>(new Set(['lugares']));
  const [lugares, setLugares] = useState<Place[]>([]);
  const [negocios, setNegocios] = useState<Business[]>([]);
  const [actividad, setActividad] = useState<ActivityPoint[]>([]);

  useEffect(() => {
    getPlaces().then(setLugares);
    getBusinesses().then(setNegocios);
    getActivityPoints().then(setActividad);
  }, []);

  function alternarCapa(capa: Capa) {
    setCapasActivas((prev) => {
      const s = new Set(prev);
      if (s.has(capa)) s.delete(capa);
      else s.add(capa);
      return s;
    });
  }

  return (
    <View style={styles.pantalla}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={EL_SALVADOR}>
        {capasActivas.has('lugares') &&
          lugares.map((l) => (
            <Marker
              key={l.id}
              coordinate={{ latitude: l.lat, longitude: l.lng }}
              onPress={() => router.push({ pathname: '/ficha/[id]', params: { id: l.id, tipo: 'lugar' } })}>
              <MarcadorMapa emoji={CATEGORIAS[l.category].emoji} tipo="lugar" />
            </Marker>
          ))}

        {capasActivas.has('negocios') &&
          negocios.map((n) => (
            <Marker
              key={n.id}
              coordinate={{ latitude: n.lat, longitude: n.lng }}
              onPress={() => router.push({ pathname: '/ficha/[id]', params: { id: n.id, tipo: 'negocio' } })}>
              <MarcadorMapa emoji="🏪" tipo="negocio" />
            </Marker>
          ))}

        {capasActivas.has('actividad') &&
          actividad.map((a) => (
            <Circle
              key={a.id}
              center={{ latitude: a.lat, longitude: a.lng }}
              radius={1200 + a.weight * 450}
              fillColor="rgba(199, 91, 57, 0.28)"
              strokeColor="rgba(199, 91, 57, 0.5)"
              strokeWidth={1}
            />
          ))}
      </MapView>

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.superpuesto}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selector}>
          {CAPAS.map((c) => (
            <ChipCapa
              key={c.id}
              etiqueta={c.etiqueta}
              emoji={c.emoji}
              activa={capasActivas.has(c.id)}
              deshabilitada={!c.disponible}
              onPress={() => alternarCapa(c.id)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.crema },
  superpuesto: { position: 'absolute', top: 0, left: 0, right: 0 },
  selector: {
    gap: Spacing.s,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
  },
});
