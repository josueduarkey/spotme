import { useFocusEffect, useRouter } from 'expo-router';
import { Globe, MapPin, Compass, Landmark, Plus, Crosshair, Search, Map as MapaIcono } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Carga segura del módulo nativo de WebView. El require con string literal deja
// que Metro lo empaquete igual que un import; el try/catch impide que un APK
// viejo —compilado antes de incluir react-native-webview— tumbe TODA la app al
// evaluar el bundle (por eso dejaba de hacer reload). Si el módulo no está,
// WebView queda null y el tab 3D muestra un aviso; el resto de la app sigue viva.
let WebView: any = null;
try {
  WebView = require('react-native-webview').WebView;
} catch {
  WebView = null;
}
import { getPlaces } from '../../lib/queries/places';
import { getBusinesses } from '../../lib/queries/businesses';
import { getActivityPoints } from '../../lib/queries/activity';
import { searchPlaces } from '../../lib/queries/search';
import { ActivityPoint, Business, Place } from '../../constants/mock';
import { Colors, Radius, Spacing, Type, Fonts, Peana } from '../../constants/theme';
import { ChipCapa } from '../../components/ChipCapa';
import { IconoActividad, IconoNegocio } from '../../components/iconos';
import { Mountain } from 'lucide-react-native';

type Capa3D = 'lugares' | 'negocios' | 'actividad';

// Migración Cesium → Mapbox GL JS (decisión del usuario 2026-07-12): mismo
// WebView (JS puro, sin rebuild, sin @rnmapbox/maps nativo), pero el globo
// ahora es Mapbox Standard v3 — edificios 3D, terreno con relieve y niebla.
// Requiere token público (pk.) gratuito: account.mapbox.com → Access tokens.
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

// Centro Histórico de San Salvador — el escaparate principal del gemelo 3D.
// Coordenadas oficiales del equipo (13°41′51″ N, 89°11′25″ O).
const CENTRO_HISTORICO = { lat: 13.697497, lng: -89.190313 };
const HITOS_CENTRO = [
  { name: 'Catedral Metropolitana', lat: 13.6994, lng: -89.1912 },
  { name: 'Palacio Nacional', lat: 13.699, lng: -89.1917 },
  { name: 'Plaza Libertad', lat: 13.6975, lng: -89.1897 },
];

// Destinos destacados fijos al inicio de "Volar a un Destino" — los íconos
// del país que mejor lucen en 3D. El Centro Histórico usa su vuelo
// cinematográfico propio (fly_centro); los demás, fly_to normal.
const DESTINOS_DESTACADOS = [
  { name: 'Centro Histórico', lat: CENTRO_HISTORICO.lat, lng: CENTRO_HISTORICO.lng, esCentro: true },
  { name: 'Playa El Tunco', lat: 13.4933, lng: -89.3805, esCentro: false },
  { name: 'Divino Salvador del Mundo', lat: 13.7013, lng: -89.2247, esCentro: false },
];

/** Aviso cuando el APK instalado no trae el módulo nativo de WebView. */
function Fallback3D({ mensaje }: { mensaje?: string }) {
  return (
    <View style={styles.fallback}>
      <Globe size={44} color={Colors.acento} strokeWidth={1.8} />
      <Text style={styles.fallbackTitulo}>Vista 3D no disponible</Text>
      <Text style={styles.fallbackTexto}>
        {mensaje ??
          'El sobrevuelo 3D usa un módulo nativo (WebView) que no está en el APK instalado. Instala el APK más reciente de EAS Build. El resto de la app funciona normal.'}
      </Text>
    </View>
  );
}

/**
 * Atrapa el fallo de montaje del WebView nativo en un APK desactualizado, para
 * que nunca tumbe toda la pantalla: cae al aviso y el resto sigue funcionando.
 */
class WebViewErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('WebView 3D no pudo montarse:', error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

/**
 * Gemelo 3D (Mapbox Standard). Se usa embebido dentro del tab "Mapa" — el
 * switch 2D/3D vive ahí; `onVolver2D` muestra el botón de regreso a 2D.
 * Los edificios 3D son parte integral de la vista (sin toggle).
 */
export default function Gemelo3D({ onVolver2D }: { onVolver2D?: () => void }) {
  const router = useRouter();
  const webViewRef = useRef<any>(null);
  const [lugares, setLugares] = useState<Place[]>([]);
  const [negocios, setNegocios] = useState<Business[]>([]);
  const [actividad, setActividad] = useState<ActivityPoint[]>([]);
  // Las 3 capas del twin arrancan visibles: la lectura cruzada es el punto.
  const [capasActivas, setCapasActivas] = useState<Set<Capa3D>>(new Set(['lugares', 'negocios', 'actividad']));
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getPlaces(), getBusinesses(), getActivityPoints()]).then(([ls, ns, acts]) => {
        setLugares(ls);
        setNegocios(ns);
        setActividad(acts);
        setCargando(false);
      });
    }, []),
  );

  /** Toggle por postMessage: no regenera el HTML, así el mapa no se recarga. */
  function alternarCapa(capa: Capa3D) {
    setCapasActivas((prev) => {
      const s = new Set(prev);
      const visible = !s.has(capa);
      if (visible) s.add(capa);
      else s.delete(capa);
      webViewRef.current?.postMessage(JSON.stringify({ type: 'toggle_layer', layer: capa, visible }));
      return s;
    });
  }

  function centrarLugar(l: Place) {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'fly_to', lat: l.lat, lng: l.lng }));
  }

  /** Vuela la cámara 3D al Centro Histórico (nuestro escaparate principal). */
  function irCentroHistorico() {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'fly_centro' }));
  }

  /** Busca un lugar (catálogo real de Google/Nominatim) y vuela ahí en 3D. */
  async function buscarLugar() {
    const q = busqueda.trim();
    if (!q) return;
    setBuscando(true);
    const resultados = await searchPlaces(q);
    setBuscando(false);
    const primero = resultados[0];
    if (!primero) {
      Alert.alert('Sin resultados', `No se encontró "${q}" en El Salvador.`);
      return;
    }
    webViewRef.current?.postMessage(JSON.stringify({ type: 'fly_to', lat: primero.lat, lng: primero.lng }));
  }

  /** Pide al mapa la coordenada bajo la mira central. */
  function crearAqui() {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'request_center_coord' }));
  }

  function handleWebViewMessage(event: any) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'marker_click' && data.id) {
        router.push({ pathname: '/ficha/[id]', params: { id: data.id, tipo: 'lugar' } });
      }
      if (data.type === 'business_click' && data.id) {
        router.push({ pathname: '/ficha/[id]', params: { id: data.id, tipo: 'negocio' } });
      }
      // Coordenada bajo la mira central → crear lugar ahí (puente a crear-lugar).
      if (data.type === 'center_coord') {
        router.push({ pathname: '/crear-lugar', params: { lat: String(data.lat), lng: String(data.lng) } });
      }
    } catch (e) {
      console.warn('WebView Message Error:', e);
    }
  }

  // HTML embebido: Mapbox GL JS v3 con estilo Standard (edificios 3D + terreno)
  const generateHTML = () => {
    const placesJson = JSON.stringify(
      lugares.map((l) => ({
        id: l.id,
        name: l.name,
        lat: l.lat,
        lng: l.lng,
        source: l.source,
        isVerified: l.isVerified,
      })),
    );
    const businessesJson = JSON.stringify(
      negocios.map((n) => ({ id: n.id, name: n.name, lat: n.lat, lng: n.lng })),
    );
    const activityJson = JSON.stringify(
      actividad.map((a) => ({ lat: a.lat, lng: a.lng, weight: a.weight })),
    );
    const hitosJson = JSON.stringify(HITOS_CENTRO);
    const centroJson = JSON.stringify(CENTRO_HISTORICO);

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no">
        <title>Gemelo 3D El Salvador</title>
        <link href="https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.css" rel="stylesheet">
        <script src="https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.js"></script>
        <style>
          html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; background: #0b1512; }
          #loading {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            color: #fff; font-family: sans-serif; font-size: 14px; font-weight: bold;
            text-shadow: 0 2px 4px rgba(0,0,0,.8); z-index: 10; pointer-events: none; text-align: center;
            transition: opacity .4s;
          }
          .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { opacity: .35; }
          .marker-wrap { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
          .pin {
            width: 16px; height: 16px; border-radius: 50%;
            border: 2.5px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,.45);
          }
          .marker-label {
            margin-top: 3px; font: bold 11px sans-serif; color: #fff; white-space: nowrap;
            text-shadow: 0 1px 3px rgba(0,0,0,.9), 0 0 6px rgba(0,0,0,.6);
            max-width: 140px; overflow: hidden; text-overflow: ellipsis;
          }
        </style>
      </head>
      <body>
        <div id="loading">Renderizando Gemelo Digital 3D…</div>
        <div id="map"></div>
        <script>
          mapboxgl.accessToken = "${MAPBOX_TOKEN}";
          const CENTRO = ${centroJson};

          const map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/standard',
            center: [CENTRO.lng, CENTRO.lat],
            zoom: 16.2,
            pitch: 62,
            bearing: -17,
            antialias: true,
            attributionControl: false
          });

          map.on('load', () => {
            const loader = document.getElementById('loading');
            if (loader) loader.style.opacity = '0';
          });
          map.on('error', (e) => {
            const loader = document.getElementById('loading');
            if (loader && e && e.error && /access token|401|403/i.test(String(e.error.message))) {
              loader.innerText = 'Token de Mapbox inválido o vencido. Revisa EXPO_PUBLIC_MAPBOX_TOKEN.';
              loader.style.opacity = '1';
            }
          });

          // Terreno con relieve real (los volcanes se levantan de verdad) + el
          // estilo Standard ya trae edificios 3D y niebla atmosférica.
          map.on('style.load', () => {
            // Edificios 3D SIEMPRE activos: son parte integral de la vista 3D.
            try { map.setConfigProperty('basemap', 'show3dObjects', true); } catch (e) {}
            map.addSource('mapbox-dem', {
              type: 'raster-dem',
              url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
              tileSize: 512,
              maxzoom: 14
            });
            map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.35 });

            // Capa de actividad de turistas (círculos naranjas por peso)
            const actividad = ${activityJson};
            map.addSource('actividad', {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: actividad.map(a => ({
                  type: 'Feature',
                  geometry: { type: 'Point', coordinates: [a.lng, a.lat] },
                  properties: { weight: a.weight }
                }))
              }
            });
            map.addLayer({
              id: 'actividad-circulos',
              type: 'circle',
              source: 'actividad',
              paint: {
                'circle-radius': ['+', 12, ['*', ['get', 'weight'], 2.5]],
                'circle-color': '#E67E22',
                'circle-opacity': 0.3,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#E67E22',
                'circle-stroke-opacity': 0.6
              }
            });
            aplicarVisibilidadActividad();
          });

          // ===== Capas de marcadores (mismas 3 capas cruzadas que el mapa 2D) =====
          const layers = { lugares: [], negocios: [] };
          let actividadVisible = ${capasActivas.has('actividad') ? 'true' : 'false'};

          function crearMarcador(lng, lat, color, nombre, onClick) {
            const wrap = document.createElement('div');
            wrap.className = 'marker-wrap';
            const pin = document.createElement('div');
            pin.className = 'pin';
            pin.style.background = color;
            const label = document.createElement('div');
            label.className = 'marker-label';
            label.textContent = nombre;
            wrap.appendChild(pin);
            wrap.appendChild(label);
            if (onClick) wrap.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
            const marker = new mapboxgl.Marker({ element: wrap, anchor: 'bottom' })
              .setLngLat([lng, lat])
              .addTo(map);
            return { marker, wrap };
          }

          // Hitos dorados del Centro Histórico (ancla narrativa, siempre visibles)
          for (const h of ${hitosJson}) {
            crearMarcador(h.lng, h.lat, '#C9A227', h.name, null);
          }

          // Lugares del twin: turquesa (oficial/verificado) vs tierra (nuevo)
          for (const m of ${placesJson}) {
            const color = (m.source === 'community' && !m.isVerified) ? '#C75B39' : '#0E9AA3';
            const { wrap } = crearMarcador(m.lng, m.lat, color, m.name, () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker_click', id: m.id }));
            });
            layers.lugares.push(wrap);
          }

          // Negocios (azul)
          for (const n of ${businessesJson}) {
            const { wrap } = crearMarcador(n.lng, n.lat, '#1A54A6', n.name, () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'business_click', id: n.id }));
            });
            layers.negocios.push(wrap);
          }

          function aplicarVisibilidadActividad() {
            if (map.getLayer('actividad-circulos')) {
              map.setLayoutProperty('actividad-circulos', 'visibility', actividadVisible ? 'visible' : 'none');
            }
          }

          function volarCentro() {
            map.flyTo({ center: [CENTRO.lng, CENTRO.lat], zoom: 16.5, pitch: 65, bearing: -17, duration: 2500 });
          }

          // Handler de mensajes desde React Native.
          // OJO: en Android el WebView entrega postMessage en 'document', en iOS
          // en 'window' — escuchar en los dos o los botones mueren en Android.
          const onNativeMessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'toggle_layer') {
                if (data.layer === 'actividad') {
                  actividadVisible = !!data.visible;
                  aplicarVisibilidadActividad();
                } else if (layers[data.layer]) {
                  for (const el of layers[data.layer]) el.style.display = data.visible ? 'flex' : 'none';
                }
              }
              if (data.type === 'fly_centro') volarCentro();
              if (data.type === 'fly_to') {
                map.flyTo({ center: [data.lng, data.lat], zoom: 13.8, pitch: 58, bearing: 0, duration: 2000 });
              }
              if (data.type === 'request_center_coord') {
                const c = map.getCenter();
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'center_coord', lat: c.lat, lng: c.lng }));
              }
            } catch (e) {
              console.error(e);
            }
          };
          window.addEventListener('message', onNativeMessage);
          document.addEventListener('message', onNativeMessage);
        </script>
      </body>
      </html>
    `;
  };

  // Memoizado: togglear capas o re-renders no regeneran el HTML (el mapa no
  // se recarga); solo cambia si cambian los datos de las capas.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const htmlSource = useMemo(() => ({ html: generateHTML() }), [lugares, negocios, actividad]);

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      {/* Buscador — vuela la cámara 3D al lugar encontrado (Google/Nominatim) */}
      <View style={styles.buscador}>
        <Search size={16} color={Colors.textoSuave} strokeWidth={2.2} />
        <TextInput
          style={styles.buscadorInput}
          placeholder="Buscar un lugar en El Salvador..."
          placeholderTextColor={Colors.textoSuave}
          value={busqueda}
          onChangeText={setBusqueda}
          onSubmitEditing={buscarLugar}
          returnKeyType="search"
        />
        {buscando && <ActivityIndicator size="small" color={Colors.primario} />}
      </View>

      {/* Selector de capas del twin — el cruce de ≥2 capas también vive en 3D (rúbrica) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.capas3dWrap}
        contentContainerStyle={styles.capas3d}>
        <ChipCapa
          etiqueta="Lugares"
          Icono={Mountain}
          activa={capasActivas.has('lugares')}
          onPress={() => alternarCapa('lugares')}
        />
        <ChipCapa
          etiqueta="Negocios"
          Icono={IconoNegocio}
          activa={capasActivas.has('negocios')}
          onPress={() => alternarCapa('negocios')}
        />
        <ChipCapa
          etiqueta="Actividad"
          Icono={IconoActividad}
          activa={capasActivas.has('actividad')}
          onPress={() => alternarCapa('actividad')}
        />
      </ScrollView>

      {/* Visor 3D */}
      <View style={styles.visorContainer}>
        {cargando ? (
          <View style={styles.cargando}>
            <ActivityIndicator size="large" color={Colors.primario} />
            <Text style={styles.cargandoTexto}>Consultando Base de Datos...</Text>
          </View>
        ) : !MAPBOX_TOKEN ? (
          <Fallback3D mensaje="Falta el token público de Mapbox. Crea uno gratis en account.mapbox.com → Access tokens y agrégalo al .env como EXPO_PUBLIC_MAPBOX_TOKEN (empieza con pk.). Luego reinicia Metro." />
        ) : !WebView ? (
          <Fallback3D />
        ) : (
          <WebViewErrorBoundary fallback={<Fallback3D />}>
            <WebView
              ref={webViewRef}
              originWhitelist={['*']}
              source={htmlSource}
              style={styles.webView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onMessage={handleWebViewMessage}
            />
          </WebViewErrorBoundary>
        )}

        {/* Mira central + controles: apunta el mapa a un punto y crea ahí */}
        {!cargando && WebView && !!MAPBOX_TOKEN && (
          <>
            <View pointerEvents="none" style={styles.miraWrap}>
              <Crosshair size={36} color={Colors.superficie} strokeWidth={2.4} />
            </View>
            <View style={styles.controles3d}>
              {onVolver2D && (
                <Pressable onPress={onVolver2D} style={styles.btnControl}>
                  <MapaIcono size={16} color={Colors.primario} strokeWidth={2.4} />
                  <Text style={styles.btnControlTexto}>Ver en 2D</Text>
                </Pressable>
              )}
              <Pressable onPress={crearAqui} style={[styles.btnControl, styles.btnCrear]}>
                <Plus size={16} color={Colors.superficie} strokeWidth={2.8} />
                <Text style={[styles.btnControlTexto, { color: Colors.superficie }]}>Crear aquí</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Lista de Lugares Rápida abajo */}
      {!cargando && (
        <View style={styles.panelControl}>
          <View style={styles.panelTituloFila}>
            <Compass size={14} color={Colors.acento} />
            <Text style={styles.panelTitulo}>Volar a un Destino</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listaLugares}>
            {DESTINOS_DESTACADOS.map((d) => (
              <Pressable
                key={`destacado-${d.name}`}
                onPress={() =>
                  d.esCentro
                    ? irCentroHistorico()
                    : webViewRef.current?.postMessage(JSON.stringify({ type: 'fly_to', lat: d.lat, lng: d.lng }))
                }
                style={({ pressed }) => [
                  styles.tarjetaLugar,
                  styles.tarjetaDestacada,
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}>
                <Landmark size={12} color={Colors.amarilloSol} strokeWidth={2.4} />
                <Text style={styles.tarjetaLugarTexto} numberOfLines={1}>
                  {d.name}
                </Text>
              </Pressable>
            ))}
            {lugares.map((l) => (
              <Pressable
                key={l.id}
                onPress={() => centrarLugar(l)}
                style={({ pressed }) => [styles.tarjetaLugar, pressed && { transform: [{ scale: 0.96 }] }]}>
                <MapPin size={12} color={l.source === 'official' ? Colors.primario : Colors.acento} />
                <Text style={styles.tarjetaLugarTexto} numberOfLines={1}>
                  {l.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  visorContainer: { flex: 1, backgroundColor: '#000' },
  webView: { flex: 1 },
  miraWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.85,
  },
  controles3d: {
    position: 'absolute',
    right: Spacing.m,
    bottom: Spacing.m,
    gap: Spacing.s,
    alignItems: 'flex-end',
  },
  btnControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.superficie,
    paddingHorizontal: Spacing.m,
    paddingVertical: 10,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
  },
  btnCrear: {
    backgroundColor: Colors.primario,
    borderColor: Colors.primario,
    borderBottomColor: Colors.bordeOscuro,
  },
  btnControlTexto: {
    ...Type.cuerpoDestacado,
    fontSize: 13,
    color: Colors.texto,
    fontFamily: Fonts.cuerpoBold,
  },
  capas3dWrap: {
    flexGrow: 0,
    backgroundColor: Colors.superficie,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.borde,
  },
  capas3d: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.s,
  },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    marginHorizontal: Spacing.l,
    marginTop: Spacing.s,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.m,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.fondo,
    borderWidth: 1.5,
    borderColor: Colors.borde,
  },
  buscadorInput: { flex: 1, ...Type.cuerpo, fontSize: 14, color: Colors.texto, padding: 0 },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.m,
    padding: Spacing.l,
    backgroundColor: '#000',
  },
  fallbackTitulo: {
    ...Type.cuerpoDestacado,
    color: '#fff',
    textAlign: 'center',
    fontFamily: Fonts.cuerpoBold,
  },
  fallbackTexto: { ...Type.nota, color: '#B9C2CC', textAlign: 'center', lineHeight: 20 },
  cargando: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.m },
  cargandoTexto: { ...Type.nota, color: Colors.textoSuave },
  panelControl: {
    backgroundColor: Colors.superficie,
    paddingVertical: Spacing.m,
    borderTopWidth: 1.5,
    borderTopColor: Colors.borde,
    gap: Spacing.s,
  },
  panelTituloFila: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.l },
  panelTitulo: { ...Type.etiqueta, color: Colors.textoSuave },
  listaLugares: { gap: Spacing.s, paddingHorizontal: Spacing.l },
  tarjetaLugar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.fondo,
    paddingHorizontal: Spacing.m,
    paddingVertical: 10,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    maxWidth: 200,
  },
  tarjetaLugarTexto: {
    ...Type.cuerpoDestacado,
    fontSize: 13,
    color: Colors.texto,
  },
  tarjetaDestacada: {
    backgroundColor: Colors.superficie,
    borderColor: Colors.amarilloSol,
  },
});
