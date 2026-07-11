import { useRouter } from 'expo-router';
import { LucideIcon, Mountain } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipCapa } from '../../components/ChipCapa';
import { ICONO_CATEGORIA, IconoActividad, IconoEventos, IconoNegocio, IconoRetos } from '../../components/iconos';
import { MarcadorMapa } from '../../components/MarcadorMapa';
import { ActivityPoint, Business, Place } from '../../constants/mock';
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

const CAPAS: { id: Capa; etiqueta: string; Icono: LucideIcon; disponible: boolean }[] = [
  { id: 'lugares', etiqueta: 'Lugares', Icono: Mountain, disponible: true },
  { id: 'negocios', etiqueta: 'Negocios', Icono: IconoNegocio, disponible: true },
  { id: 'actividad', etiqueta: 'Actividad', Icono: IconoActividad, disponible: true },
  { id: 'eventos', etiqueta: 'Eventos', Icono: IconoEventos, disponible: false }, // Fase 5
  { id: 'retos', etiqueta: 'Retos', Icono: IconoRetos, disponible: false }, // Fase 5
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
              <MarcadorMapa
                Icono={ICONO_CATEGORIA[l.category]}
                nombreLugar={l.name}
                departamento={l.department}
                mapIconUrl={l.mapIconUrl}
                tipo="lugar"
              />
            </Marker>
          ))}

        {capasActivas.has('negocios') &&
          negocios.map((n) => (
            <Marker
              key={n.id}
              coordinate={{ latitude: n.lat, longitude: n.lng }}
              onPress={() => router.push({ pathname: '/ficha/[id]', params: { id: n.id, tipo: 'negocio' } })}>
              <MarcadorMapa Icono={IconoNegocio} tipo="negocio" />
            </Marker>
          ))}

        {capasActivas.has('actividad') &&
          actividad.map((a) => (
            <Circle
              key={a.id}
              center={{ latitude: a.lat, longitude: a.lng }}
              radius={1200 + a.weight * 450}
              fillColor="rgba(230, 126, 34, 0.28)"
              strokeColor="rgba(230, 126, 34, 0.5)"
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
              Icono={c.Icono}
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
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  superpuesto: { position: 'absolute', top: 0, left: 0, right: 0 },
  selector: {
    gap: Spacing.s,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
  },
});
