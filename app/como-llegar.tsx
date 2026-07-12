import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, ExternalLink, LocateFixed, MapPin, Navigation } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Peana, Radius, Spacing, Type } from '../constants/theme';
import { getOSRMRoute } from '../lib/queries/routes';

// Carga segura del módulo nativo (mismo patrón que crear-lugar/subir-foto)
let Location: any = null;
try {
  Location = require('expo-location');
} catch (e) {
  console.warn('expo-location no disponible en el cliente nativo actual.');
}

type Coord = { latitude: number; longitude: number };

/**
 * Cómo llegar — la ruta vive dentro de la app (OSRM), sin saltar a Google Maps.
 * Params: lat/lng del destino + nombre. Traza desde la ubicación del usuario;
 * Google Maps queda solo como opción secundaria para navegación paso a paso.
 */
export default function ComoLlegar() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lat: string; lng: string; nombre?: string }>();
  const destino = { latitude: Number(params.lat), longitude: Number(params.lng) };
  const nombre = params.nombre ?? 'Destino';

  const mapRef = useRef<MapView>(null);
  const [origen, setOrigen] = useState<Coord | null>(null);
  const [geometria, setGeometria] = useState<Coord[]>([]);
  const [distancia, setDistancia] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const [estado, setEstado] = useState<'ubicando' | 'trazando' | 'listo' | 'sin-ubicacion' | 'sin-ruta'>(
    'ubicando',
  );

  useEffect(() => {
    let vivo = true;
    async function trazar() {
      // 1. Ubicación del usuario (si el módulo o el permiso faltan → solo destino)
      if (!Location) {
        if (vivo) setEstado('sin-ubicacion');
        return;
      }
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (vivo) setEstado('sin-ubicacion');
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const o = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        if (!vivo) return;
        setOrigen(o);
        setEstado('trazando');
        // Reencuadre suave para abarcar origen y destino sin remontar el mapa.
        mapRef.current?.animateToRegion(
          {
            latitude: (o.latitude + destino.latitude) / 2,
            longitude: (o.longitude + destino.longitude) / 2,
            latitudeDelta: Math.max(Math.abs(o.latitude - destino.latitude) * 1.6, 0.02),
            longitudeDelta: Math.max(Math.abs(o.longitude - destino.longitude) * 1.6, 0.02),
          },
          800,
        );

        // 2. Ruta vial OSRM origen → destino
        const res = await getOSRMRoute([
          { lat: o.latitude, lng: o.longitude },
          { lat: destino.latitude, lng: destino.longitude },
        ]);
        if (!vivo) return;
        if (res.error || !res.geometry) {
          setEstado('sin-ruta');
          return;
        }
        setGeometria(
          res.geometry.coordinates.map((p: [number, number]) => ({ latitude: p[1], longitude: p[0] })),
        );
        setDistancia(res.distanceKm);
        setDuracion(res.durationMinutes);
        setEstado('listo');
      } catch {
        if (vivo) setEstado('sin-ubicacion');
      }
    }
    trazar();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.lat, params.lng]);

  /** Escape hatch: navegación giro a giro en Google Maps (opcional). */
  function abrirEnGoogleMaps() {
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${destino.latitude},${destino.longitude}`,
    );
  }

  // Arranca centrado en el destino; al llegar la ubicación se reencuadra animado.
  const region = {
    latitude: destino.latitude,
    longitude: destino.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  const horas = Math.floor(duracion / 60);
  const minutos = duracion % 60;
  const duracionTexto = horas > 0 ? `${horas} h ${minutos} min` : `${minutos} min`;

  return (
    <View style={styles.pantalla}>
      <MapView ref={mapRef} style={StyleSheet.absoluteFill} initialRegion={region}>
        <UrlTile
          urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          shouldReplaceMapContent={true}
          maximumZ={19}
          tileSize={256}
        />
        {geometria.length > 0 && (
          <Polyline coordinates={geometria} strokeWidth={5} strokeColor={Colors.primario} />
        )}
        {origen && <Marker coordinate={origen} title="Tu ubicación" pinColor="green" />}
        <Marker coordinate={destino} title={nombre} />
      </MapView>

      {/* Volver */}
      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.superpuesto}>
        <Pressable onPress={() => router.back()} style={styles.volver}>
          <ArrowLeft size={20} color={Colors.texto} />
        </Pressable>
      </SafeAreaView>

      {/* Panel inferior */}
      <SafeAreaView edges={['bottom']} style={styles.panel}>
        <View style={styles.panelContenido}>
          <View style={styles.filaDestino}>
            <MapPin size={16} color={Colors.acento} strokeWidth={2.4} />
            <Text style={styles.destinoNombre} numberOfLines={1}>
              {nombre}
            </Text>
          </View>

          {(estado === 'ubicando' || estado === 'trazando') && (
            <View style={styles.filaEstado}>
              <ActivityIndicator size="small" color={Colors.primario} />
              <Text style={styles.estadoTexto}>
                {estado === 'ubicando' ? 'Obteniendo tu ubicación…' : 'Trazando la ruta vial…'}
              </Text>
            </View>
          )}

          {estado === 'listo' && (
            <View style={styles.stats}>
              <View style={styles.statBox}>
                <Clock size={16} color={Colors.primario} />
                <Text style={styles.statValor}>{duracionTexto}</Text>
              </View>
              <View style={styles.statBox}>
                <Navigation size={16} color={Colors.acento} />
                <Text style={styles.statValor}>{distancia} km</Text>
              </View>
              <View style={styles.statBox}>
                <LocateFixed size={16} color={Colors.exito} />
                <Text style={styles.statValor}>En vivo</Text>
              </View>
            </View>
          )}

          {estado === 'sin-ubicacion' && (
            <Text style={styles.estadoTexto}>
              Sin acceso a tu ubicación: activa el permiso de GPS para trazar la ruta aquí mismo.
            </Text>
          )}
          {estado === 'sin-ruta' && (
            <Text style={styles.estadoTexto}>
              No se encontró una ruta vial hasta este punto. Puedes intentar con Google Maps.
            </Text>
          )}

          <Pressable onPress={abrirEnGoogleMaps} style={styles.botonExterno}>
            <ExternalLink size={14} color={Colors.textoSuave} />
            <Text style={styles.botonExternoTexto}>Navegación paso a paso en Google Maps</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  superpuesto: { position: 'absolute', top: 0, left: 0 },
  volver: {
    marginLeft: Spacing.m,
    marginTop: Spacing.s,
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Colors.superficie,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  panelContenido: {
    margin: Spacing.m,
    backgroundColor: Colors.superficie,
    borderRadius: Radius.l,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.m,
    gap: Spacing.s,
  },
  filaDestino: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  destinoNombre: {
    ...Type.cuerpoDestacado,
    flex: 1,
    fontSize: 16,
    color: Colors.texto,
    fontFamily: Fonts.cuerpoBold,
  },
  filaEstado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s },
  estadoTexto: { ...Type.nota, color: Colors.textoSuave, flex: 1 },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.fondo,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.m,
  },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValor: { ...Type.cuerpoDestacado, fontSize: 14, color: Colors.texto },
  botonExterno: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  botonExternoTexto: { ...Type.nota, fontSize: 12, color: Colors.textoSuave },
});
