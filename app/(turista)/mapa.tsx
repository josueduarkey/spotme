import { useFocusEffect, useRouter } from 'expo-router';
import { LucideIcon, Mountain, Plus, Users, Globe } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, UrlTile } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChipCapa } from '../../components/ChipCapa';
import { ICONO_CATEGORIA, IconoActividad, IconoEventos, IconoNegocio, IconoRetos } from '../../components/iconos';
import { MarcadorMapa } from '../../components/MarcadorMapa';
import { ActivityPoint, Business, esComunidad, Place } from '../../constants/mock';
import { Colors, Peana, Radius, Spacing } from '../../constants/theme';
import { getActivityPoints } from '../../lib/queries/activity';
import { getBusinesses } from '../../lib/queries/businesses';
import { getPlaces } from '../../lib/queries/places';
import Gemelo3D from './gemelo-3d';

/** Región inicial: El Salvador completo. */
const EL_SALVADOR = {
  latitude: 13.72,
  longitude: -88.9,
  latitudeDelta: 2.1,
  longitudeDelta: 2.4,
};

type Capa = 'oficiales' | 'comunidad' | 'negocios' | 'actividad' | 'eventos' | 'retos';

const CAPAS: { id: Capa; etiqueta: string; Icono: LucideIcon; disponible: boolean }[] = [
  { id: 'oficiales', etiqueta: 'Oficiales', Icono: Mountain, disponible: true },
  { id: 'comunidad', etiqueta: 'Comunidad', Icono: Users, disponible: true },
  { id: 'negocios', etiqueta: 'Negocios', Icono: IconoNegocio, disponible: true },
  { id: 'actividad', etiqueta: 'Actividad', Icono: IconoActividad, disponible: true },
  { id: 'eventos', etiqueta: 'Eventos', Icono: IconoEventos, disponible: false }, // Fase 5
  { id: 'retos', etiqueta: 'Retos', Icono: IconoRetos, disponible: false }, // Fase 5
];

/** Pantalla 6 — Mapa full con selector de capas (el corazón del digital twin). */
export default function Mapa() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [mapa3D, setMapa3D] = useState(false);
  const [capasActivas, setCapasActivas] = useState<Set<Capa>>(new Set(['oficiales', 'comunidad']));
  const [lugares, setLugares] = useState<Place[]>([]);
  const [negocios, setNegocios] = useState<Business[]>([]);
  const [actividad, setActividad] = useState<ActivityPoint[]>([]);

  // Recarga al volver (ej. después de crear un lugar nuevo en 7b).
  useFocusEffect(
    useCallback(() => {
      getPlaces().then(setLugares);
      getBusinesses().then(setNegocios);
      getActivityPoints().then(setActividad);
    }, []),
  );

  function alternarCapa(capa: Capa) {
    setCapasActivas((prev) => {
      const s = new Set(prev);
      if (s.has(capa)) s.delete(capa);
      else s.add(capa);
      return s;
    });
  }

  const oficiales = lugares.filter((l) => !esComunidad(l));
  const comunidad = lugares.filter(esComunidad);

  // Vista 3D: el gemelo Mapbox (edificios 3D + terreno) reemplaza toda la
  // pantalla; su botón "Ver en 2D" regresa aquí. Un solo tab, dos modos.
  if (mapa3D) {
    return <Gemelo3D onVolver2D={() => setMapa3D(false)} />;
  }

  return (
    <View style={styles.pantalla}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={EL_SALVADOR}>
        <UrlTile
          urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          shouldReplaceMapContent={true}
          maximumZ={19}
          tileSize={256}
        />
        {capasActivas.has('oficiales') &&
          oficiales.map((l) => (
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

        {capasActivas.has('comunidad') &&
          comunidad.map((l) => (
            <Marker
              key={l.id}
              coordinate={{ latitude: l.lat, longitude: l.lng }}
              onPress={() => router.push({ pathname: '/ficha/[id]', params: { id: l.id, tipo: 'lugar' } })}>
              <MarcadorMapa
                Icono={ICONO_CATEGORIA[l.category]}
                tipo="lugar"
                comunidad
                verificado={l.isVerified === true}
                fotoUrl={l.coverImageUrl}
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

      {/* Switch a la vista 3D (gemelo Mapbox: edificios 3D + terreno) */}
      <Pressable
        onPress={() => setMapa3D(true)}
        style={({ pressed }) => [
          styles.boton3D,
          pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2 },
        ]}>
        <Globe size={22} color={Colors.superficie} strokeWidth={2.4} />
        <Text style={styles.boton3DTexto}>3D</Text>
      </Pressable>

      {/* FAB: crear lugar nuevo (pivote Fase 3) */}
      <Pressable
        onPress={() => router.push('/crear-lugar')}
        style={({ pressed }) => [styles.fab, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2 }]}>
        <Plus size={26} color={Colors.superficie} strokeWidth={2.6} />
      </Pressable>
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
  boton3D: {
    position: 'absolute',
    right: Spacing.l,
    bottom: Spacing.l + 72, // Colocado justo arriba del FAB "+"
    width: 58,
    height: 58,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primario,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.primarioOscuro,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  boton3DTexto: {
    fontSize: 9,
    color: Colors.superficie,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: Spacing.l,
    bottom: Spacing.l,
    width: 58,
    height: 58,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primario,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.primarioOscuro,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
