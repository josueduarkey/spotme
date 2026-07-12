import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, DollarSign, MapPin, Navigation, Plus, Save, Trash } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../components/Boton';
import { Colors, Radius, Spacing, Type, Fonts, Peana } from '../constants/theme';
import { getPlaceById } from '../lib/queries/places';
import { COSTO_CATEGORIA, getOSRMRoute, recommendPlacesAlongRoute, savePlannedRoute } from '../lib/queries/routes';
import { Place } from '../constants/mock';

export default function Ruta() {
  const router = useRouter();
  // stopIds (CSV opcional): paradas intermedias precargadas — lo usa "Mi aventura"
  const params = useLocalSearchParams<{ startId: string; endId: string; stopIds?: string }>();

  const [cargando, setCargando] = useState(true);
  const [origen, setOrigen] = useState<Place | null>(null);
  const [destino, setDestino] = useState<Place | null>(null);
  const [paradas, setParadas] = useState<Place[]>([]); // Paradas intermedias agregadas
  const [rutaGeometria, setRutaGeometria] = useState<{ latitude: number; longitude: number }[]>([]);
  const [distancia, setDistancia] = useState(0);
  const [duracion, setDuracion] = useState(0);
  const [recomendados, setRecomendados] = useState<Place[]>([]);
  const [guardando, setGuardando] = useState(false);

  // 1. Cargar origen y destino al iniciar
  useEffect(() => {
    async function inicializar() {
      if (!params.startId || !params.endId) return;
      const [start, end] = await Promise.all([getPlaceById(params.startId), getPlaceById(params.endId)]);
      if (start && end) {
        setOrigen(start);
        setDestino(end);
      }
      // Paradas intermedias precargadas (itinerario de "Mi aventura")
      if (params.stopIds) {
        const ids = params.stopIds.split(',').filter(Boolean);
        const stops = await Promise.all(ids.map((id) => getPlaceById(id)));
        setParadas(stops.filter((s): s is Place => s !== null));
      }
    }
    inicializar();
  }, [params.startId, params.endId, params.stopIds]);

  // 2. Recalcular la ruta vial de OSRM y actualizar las recomendaciones cada vez que cambien las paradas
  useEffect(() => {
    async function recalcularRuta() {
      if (!origen || !destino) return;
      setCargando(true);

      // Paradas totales ordenadas: Origen -> Intermedias -> Destino
      const trayecto = [origen, ...paradas, destino];
      const coordenadas = trayecto.map((p) => ({ lat: p.lat, lng: p.lng }));

      // Consultar ruta vial OSRM
      const res = await getOSRMRoute(coordenadas);
      if (res.error || !res.geometry) {
        setCargando(false);
        Alert.alert('Error de Ruta', res.error ?? 'No se pudo trazar la ruta vial.');
        return;
      }

      // Mapear geometría GeoJSON LineString [lng, lat] a Coordenadas {latitude, longitude}
      const coords = res.geometry.coordinates.map((point: [number, number]) => ({
        latitude: point[1],
        longitude: point[0],
      }));

      setRutaGeometria(coords);
      setDistancia(res.distanceKm);
      setDuracion(res.durationMinutes);

      // Calcular recomendaciones en el camino (excluyendo los que ya están en la ruta)
      const activosIds = trayecto.map((p) => p.id);
      const recs = await recommendPlacesAlongRoute(origen.lat, origen.lng, destino.lat, destino.lng, activosIds);
      setRecomendados(recs);
      setCargando(false);
    }

    recalcularRuta();
  }, [origen, destino, paradas]);

  // Agregar una recomendación como parada intermedia
  function agregarParada(lugar: Place) {
    setParadas((prev) => [...prev, lugar]);
  }

  // Quitar una parada intermedia
  function quitarParada(lugarId: string) {
    setParadas((prev) => prev.filter((p) => p.id !== lugarId));
  }

  // "3 h 20 min" legible en vez de "200 min"
  function formatoDuracion(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h} h ${m} min` : `${h} h`;
  }

  // Presupuesto estimado: combustible ($0.15/km) + costo por destino
  function calcularPresupuesto(): number {
    const costoCombustible = distancia * 0.15;
    const trayecto = [origen, ...paradas, destino].filter(Boolean) as Place[];
    const costoLugares = trayecto.reduce((sum, p) => sum + (COSTO_CATEGORIA[p.category] ?? 5), 0);
    return Math.ceil(costoCombustible + costoLugares);
  }

  // Guardar itinerario en Supabase
  async function guardarItinerario() {
    if (!origen || !destino) return;
    setGuardando(true);
    const placeIds = [origen.id, ...paradas.map((p) => p.id), destino.id];
    const { success, error } = await savePlannedRoute(placeIds, calcularPresupuesto(), duracion);
    setGuardando(false);

    if (error) {
      Alert.alert('Error', error);
      return;
    }

    Alert.alert('¡Itinerario Guardado!', 'Puedes revisar tu ruta planificada en tu perfil en cualquier momento.', [
      { text: 'Ir a Inicio', onPress: () => router.navigate('/(turista)/home') },
    ]);
  }

  // Iniciar navegación en mapas externos (Google Maps con waypoints)
  function iniciarNavegacion() {
    if (!origen || !destino) return;
    const waypoints = paradas.map((p) => `${p.lat},${p.lng}`).join('|');
    const url = waypoints
      ? `https://www.google.com/maps/dir/?api=1&origin=${origen.lat},${origen.lng}&destination=${destino.lat},${destino.lng}&waypoints=${waypoints}`
      : `https://www.google.com/maps/dir/?api=1&origin=${origen.lat},${origen.lng}&destination=${destino.lat},${destino.lng}`;

    Alert.alert('Navegación Externa', '¿Deseas abrir la ruta paso a paso en Google Maps?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Abrir Maps', onPress: () => Linking.openURL(url) },
    ]);
  }

  if (!origen || !destino) {
    return <View style={styles.pantallaCargando} />;
  }

  return (
    <View style={styles.pantalla}>
      {/* Vista de Mapa en la Mitad Superior */}
      <View style={styles.contenedorMapa}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: (origen.lat + destino.lat) / 2,
            longitude: (origen.lng + destino.lng) / 2,
            latitudeDelta: Math.abs(origen.lat - destino.lat) * 1.5 || 0.1,
            longitudeDelta: Math.abs(origen.lng - destino.lng) * 1.5 || 0.1,
          }}>
          <UrlTile
            urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
            shouldReplaceMapContent={true}
            maximumZ={19}
            tileSize={256}
          />
          {/* Trazado Vial */}
          {rutaGeometria.length > 0 && (
            <Polyline coordinates={rutaGeometria} strokeWidth={4} strokeColor={Colors.primario} />
          )}

          {/* Marcadores */}
          <Marker coordinate={{ latitude: origen.lat, longitude: origen.lng }} title={`Partida: ${origen.name}`} pinColor="green" />
          <Marker coordinate={{ latitude: destino.lat, longitude: destino.lng }} title={`Destino: ${destino.name}`} pinColor="red" />
          {paradas.map((p, i) => (
            <Marker key={p.id} coordinate={{ latitude: p.lat, longitude: p.lng }} title={`Parada ${i + 1}: ${p.name}`} pinColor="orange" />
          ))}
        </MapView>

        {/* Botón Volver Flotante */}
        <SafeAreaView edges={['top']} style={styles.volverContenedor}>
          <Pressable onPress={() => router.back()} style={styles.botonVolver}>
            <ArrowLeft size={20} color={Colors.texto} />
          </Pressable>
        </SafeAreaView>

        {/* Indicador de Cargando superpuesto en el mapa */}
        {cargando && (
          <View style={styles.cargandoMapa}>
            <ActivityIndicator size="small" color={Colors.primario} />
            <Text style={styles.cargandoMapaTexto}>Trazando ruta vial óptima...</Text>
          </View>
        )}
      </View>

      {/* Panel de Estadísticas y Controles en la Mitad Inferior */}
      <View style={styles.tarjetaFicha}>
        {/* Estadísticas Básicas: 3 columnas iguales, valores centrados que no se
            desbordan aunque crezcan ($137, 4 h 10 min) */}
        <View style={styles.stats}>
          <View style={styles.statBox}>
            <Clock size={16} color={Colors.primario} strokeWidth={2.2} />
            <Text style={styles.statValor} numberOfLines={1} adjustsFontSizeToFit>
              {formatoDuracion(duracion)}
            </Text>
            <Text style={styles.statEtiqueta}>Duración</Text>
          </View>
          <View style={styles.statSeparador} />
          <View style={styles.statBox}>
            <DollarSign size={16} color={Colors.acento} strokeWidth={2.2} />
            <Text style={styles.statValor} numberOfLines={1} adjustsFontSizeToFit>
              ${calcularPresupuesto()}
            </Text>
            <Text style={styles.statEtiqueta}>Presupuesto USD</Text>
          </View>
          <View style={styles.statSeparador} />
          <View style={styles.statBox}>
            <MapPin size={16} color={Colors.primario} strokeWidth={2.2} />
            <Text style={styles.statValor} numberOfLines={1} adjustsFontSizeToFit>
              {distancia} km
            </Text>
            <Text style={styles.statEtiqueta}>Distancia</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollSecciones}
          contentContainerStyle={{ paddingBottom: Spacing.s }}
          showsVerticalScrollIndicator={false}>
          {/* Paradas Planificadas */}
          <View style={styles.seccion}>
            <Text style={styles.seccionTitulo}>Itinerario del Viaje</Text>
            <View style={styles.lineaTiempo}>
              {/* Origen */}
              <View style={styles.lineaItem}>
                <View style={[styles.puntoLinea, { backgroundColor: 'green' }]} />
                <Text style={styles.nombrePunto} numberOfLines={1}>
                  {origen.name}
                </Text>
              </View>

              {/* Paradas Intermedias */}
              {paradas.map((p) => (
                <View key={p.id} style={styles.lineaItem}>
                  <View style={[styles.puntoLinea, { backgroundColor: 'orange' }]} />
                  <Text style={styles.nombrePunto} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Pressable onPress={() => quitarParada(p.id)} style={styles.eliminarParada}>
                    <Trash size={12} color={Colors.rojoAnil} />
                  </Pressable>
                </View>
              ))}

              {/* Destino */}
              <View style={styles.lineaItem}>
                <View style={[styles.puntoLinea, { backgroundColor: 'red' }]} />
                <Text style={styles.nombrePunto} numberOfLines={1}>
                  {destino.name}
                </Text>
              </View>
            </View>
          </View>

          {/* Recomendaciones en el camino */}
          {recomendados.length > 0 && (
            <View style={styles.seccion}>
              <Text style={styles.seccionTitulo}>Joyas Ocultas en tu Camino</Text>
              <Text style={styles.seccionSubtitulo}>Sitios de interés a menos de 8 km del trayecto:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listaRecomendados}>
                {recomendados.map((l) => (
                  <View key={l.id} style={styles.tarjetaRecomendado}>
                    <Text style={styles.nombreRecomendado} numberOfLines={1}>
                      {l.name}
                    </Text>
                    <Text style={styles.categoriaRecomendado}>{l.department}</Text>
                    <Pressable onPress={() => agregarParada(l)} style={styles.botonAgregarRecomendado}>
                      <Plus size={12} color={Colors.superficie} />
                      <Text style={styles.botonAgregarRecomendadoTexto}>Añadir Parada</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>

        {/* Acciones principales */}
        <View style={styles.acciones}>
          <Boton titulo="Iniciar navegación" onPress={iniciarNavegacion} />
          <Boton titulo="Guardar Itinerario" onPress={guardarItinerario} variante="secundario" cargando={guardando} />
        </View>
      </View>
    </View>
  );
}

// Para usar Linking y abrir Google Maps
import { Linking } from 'react-native';

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  pantallaCargando: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.fondo },
  contenedorMapa: { flex: 1, minHeight: '38%' },
  volverContenedor: { position: 'absolute', top: 0, left: Spacing.m },
  botonVolver: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Colors.superficie,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cargandoMapa: {
    position: 'absolute',
    bottom: Spacing.m,
    alignSelf: 'center',
    backgroundColor: 'rgba(21, 42, 32, 0.85)',
    paddingHorizontal: Spacing.m,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cargandoMapaTexto: { ...Type.nota, color: Colors.superficie, fontSize: 11 },
  tarjetaFicha: {
    flex: 1.5,
    backgroundColor: Colors.superficie,
    borderTopLeftRadius: Radius.l,
    borderTopRightRadius: Radius.l,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    padding: Spacing.l,
    gap: Spacing.m,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: Colors.fondo,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    paddingVertical: Spacing.m,
    paddingHorizontal: Spacing.s,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 3 },
  statSeparador: { width: 1.5, backgroundColor: Colors.borde, marginVertical: 2 },
  statEtiqueta: { ...Type.nota, fontSize: 10, color: Colors.textoSuave, textAlign: 'center' },
  statValor: {
    ...Type.cuerpoDestacado,
    fontSize: 16,
    color: Colors.texto,
    fontFamily: Fonts.cuerpoBold,
    textAlign: 'center',
  },
  scrollSecciones: { flex: 1 },
  seccion: { gap: Spacing.s, marginBottom: Spacing.l },
  seccionTitulo: { ...Type.subtitulo, fontSize: 15, color: Colors.texto },
  seccionSubtitulo: { ...Type.nota, color: Colors.textoSuave },
  lineaTiempo: { gap: Spacing.s, paddingLeft: Spacing.s },
  lineaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.m },
  puntoLinea: { width: 10, height: 10, borderRadius: 5 },
  nombrePunto: { ...Type.cuerpo, fontSize: 14, color: Colors.texto, flex: 1 },
  eliminarParada: { padding: 4 },
  listaRecomendados: { gap: Spacing.s },
  tarjetaRecomendado: {
    backgroundColor: Colors.fondo,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    padding: Spacing.m,
    width: 160,
    gap: 4,
  },
  nombreRecomendado: { ...Type.cuerpoDestacado, fontSize: 12, color: Colors.texto },
  categoriaRecomendado: { ...Type.nota, fontSize: 10, color: Colors.textoSuave },
  botonAgregarRecomendado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.primario,
    borderRadius: Radius.s,
    paddingVertical: 5,
    marginTop: 4,
  },
  botonAgregarRecomendadoTexto: { ...Type.etiqueta, fontSize: 10, color: Colors.superficie },
  acciones: { gap: Spacing.s, marginTop: Spacing.s },
});
