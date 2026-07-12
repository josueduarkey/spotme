import { useFocusEffect, useRouter } from 'expo-router';
import { Globe, MapPin, Compass, Landmark, Plus, Crosshair } from 'lucide-react-native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { ActivityPoint, Business, Place } from '../../constants/mock';
import { Colors, Radius, Spacing, Type, Fonts, Peana } from '../../constants/theme';
import { ChipCapa } from '../../components/ChipCapa';
import { IconoActividad, IconoNegocio } from '../../components/iconos';
import { Mountain } from 'lucide-react-native';
import Constants from 'expo-constants';

type Capa3D = 'lugares' | 'negocios' | 'actividad';

// Recuperar API Key activa
const GOOGLE_MAPS_API_KEY =
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey || 'AIzaSyBE5rKSq03ZEN8tlGbSaQhOnGgf6IIEoJ4';

// Centro Histórico de San Salvador — el escaparate principal del gemelo 3D.
// Coordenadas públicas de los hitos; ajustables si el equipo quiere afinarlas.
const CENTRO_HISTORICO = { lat: 13.6989, lng: -89.1914 };
const HITOS_CENTRO = [
  { name: 'Catedral Metropolitana', lat: 13.6994, lng: -89.1912 },
  { name: 'Palacio Nacional', lat: 13.699, lng: -89.1917 },
  { name: 'Plaza Libertad', lat: 13.6975, lng: -89.1897 },
];

/** Aviso cuando el APK instalado no trae el módulo nativo de WebView. */
function Fallback3D() {
  return (
    <View style={styles.fallback}>
      <Globe size={44} color={Colors.acento} strokeWidth={1.8} />
      <Text style={styles.fallbackTitulo}>Vista 3D no disponible en este build</Text>
      <Text style={styles.fallbackTexto}>
        El sobrevuelo 3D usa un módulo nativo (WebView) que no está en el APK instalado. Instala el
        APK más reciente de EAS Build para explorarlo. El resto de la app funciona normal.
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

export default function Gemelo3D() {
  const router = useRouter();
  const webViewRef = useRef<any>(null);
  const [lugares, setLugares] = useState<Place[]>([]);
  const [negocios, setNegocios] = useState<Business[]>([]);
  const [actividad, setActividad] = useState<ActivityPoint[]>([]);
  // Las 3 capas del twin arrancan visibles: la lectura cruzada es el punto.
  const [capasActivas, setCapasActivas] = useState<Set<Capa3D>>(new Set(['lugares', 'negocios', 'actividad']));
  const [cargando, setCargando] = useState(true);

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

  /** Toggle por postMessage: no regenera el HTML, así el globo no se recarga. */
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
    // Comunicar con el WebView para volar al lugar en 3D
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: 'fly_to',
        lat: l.lat,
        lng: l.lng,
      }),
    );
  }

  /** Vuela la cámara 3D al Centro Histórico (nuestro escaparate principal). */
  function irCentroHistorico() {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'fly_centro' }));
  }

  /** Pide a Cesium la coordenada real bajo la mira central del globo 3D. */
  function crearAqui() {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'request_center_coord' }));
  }

  function handleWebViewMessage(event: any) {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'marker_click' && data.id) {
        // Al tocar un pin en el gemelo 3D, abrimos su ficha en React Native
        router.push({
          pathname: '/ficha/[id]',
          params: { id: data.id, tipo: 'lugar' },
        });
      }
      if (data.type === 'business_click' && data.id) {
        router.push({
          pathname: '/ficha/[id]',
          params: { id: data.id, tipo: 'negocio' },
        });
      }
      // Coordenada leída bajo la mira central del gemelo 3D → crear lugar ahí.
      // El puente de lat/lng lo consume crear-lugar.tsx (useLocalSearchParams).
      if (data.type === 'center_coord') {
        router.push({
          pathname: '/crear-lugar',
          params: { lat: String(data.lat), lng: String(data.lng) },
        });
      }
      if (data.type === 'center_coord_fail') {
        Alert.alert(
          'No se pudo leer la coordenada',
          'Acerca un poco la cámara al suelo y vuelve a intentar "Crear aquí".',
        );
      }
    } catch (e) {
      console.warn('WebView Message Error:', e);
    }
  }

  // HTML embebido para CesiumJS + Google Photorealistic 3D Tiles
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
        <link href="https://cesium.com/downloads/cesiumjs/releases/1.110/Build/Cesium/Widgets/widgets.css" rel="stylesheet">
        <script src="https://cesium.com/downloads/cesiumjs/releases/1.110/Build/Cesium/Cesium.js"></script>
        <style>
          html, body, #cesiumContainer {
            width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden;
            background-color: #000;
          }
          #loading {
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            color: #ffffff; font-family: sans-serif; font-size: 14px; pointer-events: none;
            z-index: 10; font-weight: bold; text-shadow: 0px 2px 4px rgba(0,0,0,0.8);
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div id="loading">Renderizando Gemelo Digital 3D (Cesium)...</div>
        <div id="cesiumContainer"></div>
        <script>
          (async () => {
            const API_KEY = "${GOOGLE_MAPS_API_KEY}";
            
            // Inicializar visor Cesium limpio sin barras de controles web
            const viewer = new Cesium.Viewer('cesiumContainer', {
              animation: false,
              baseLayerPicker: false,
              fullscreenButton: false,
              geocoder: false,
              homeButton: false,
              infoBox: false,
              sceneModePicker: false,
              selectionIndicator: false,
              timeline: false,
              navigationHelpButton: false,
              scene3DOnly: true,
            });

            if (viewer.creditContainer) {
              viewer.creditContainer.style.display = 'none';
            }

            // Cargar los 3D Tiles Fotorrealistas de Google Maps Platform
            try {
              const tileset = await Cesium.Cesium3DTileset.fromUrl(
                "https://tile.googleapis.com/v1/3dtiles/root.json?key=" + API_KEY
              );
              viewer.scene.primitives.add(tileset);
            } catch (error) {
              console.error("Error al cargar 3D Tiles:", error);
              const loader = document.getElementById('loading');
              if (loader) loader.innerText = 'No se pudieron cargar los tiles 3D. Revisa conexión o la Map Tiles API.';
            }

            // Ocultar cargador
            setTimeout(() => {
              const loader = document.getElementById('loading');
              if (loader) loader.style.opacity = '0';
            }, 3000);

            // El Centro Histórico es nuestro escaparate: vuelo cinematográfico
            // en perspectiva oblicua sobre la Plaza Cívica (Catedral + Palacio).
            const CENTRO = ${centroJson};
            function volarCentro(animado) {
              const opts = {
                destination: Cesium.Cartesian3.fromDegrees(CENTRO.lng, CENTRO.lat - 0.0035, 430),
                orientation: {
                  heading: Cesium.Math.toRadians(10.0),
                  pitch: Cesium.Math.toRadians(-28.0),
                  roll: 0.0
                }
              };
              if (animado) { opts.duration = 2.5; viewer.camera.flyTo(opts); }
              else { viewer.camera.setView(opts); }
            }
            volarCentro(false);

            // ===== Capas del twin: mismas 3 capas cruzadas que el mapa 2D =====
            // Cada entidad se registra en su capa para poder togglearla sin
            // recargar el globo (mensaje 'toggle_layer' desde React Native).
            const layers = { lugares: [], negocios: [], actividad: [], hitos: [] };

            // Hitos del Centro Histórico (pines dorados, siempre visibles): son
            // el ancla narrativa del escaparate 3D ante el jurado.
            const hitos = ${hitosJson};
            const pinHito = new Cesium.PinBuilder();
            for (const h of hitos) {
              const e = viewer.entities.add({
                id: 'hito-' + h.name,
                position: Cesium.Cartesian3.fromDegrees(h.lng, h.lat, 700),
                billboard: {
                  image: pinHito.fromColor(Cesium.Color.fromCssColorString('#C9A227'), 30).toDataURL(),
                  verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                  heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                },
                label: {
                  text: h.name,
                  font: 'bold 12px sans-serif',
                  fillColor: Cesium.Color.WHITE,
                  outlineColor: Cesium.Color.fromCssColorString('#7A5C00'),
                  outlineWidth: 4,
                  style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                  verticalOrigin: Cesium.VerticalOrigin.TOP,
                  pixelOffset: new Cesium.Cartesian2(0, 6),
                  heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                }
              });
              layers.hitos.push(e);
            }

            // Capa de negocios (pines azules)
            const negocios = ${businessesJson};
            const pinNegocios = new Cesium.PinBuilder();
            for (const n of negocios) {
              const e = viewer.entities.add({
                id: 'biz-' + n.id,
                position: Cesium.Cartesian3.fromDegrees(n.lng, n.lat, 640),
                billboard: {
                  image: pinNegocios.fromColor(Cesium.Color.fromCssColorString('#1A54A6'), 26).toDataURL(),
                  verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                  heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                },
                label: {
                  text: n.name,
                  font: 'bold 10px sans-serif',
                  fillColor: Cesium.Color.WHITE,
                  outlineColor: Cesium.Color.fromCssColorString('#1A54A6'),
                  outlineWidth: 3,
                  style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                  verticalOrigin: Cesium.VerticalOrigin.TOP,
                  pixelOffset: new Cesium.Cartesian2(0, 4),
                  heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                }
              });
              layers.negocios.push(e);
            }

            // Capa de actividad de turistas (círculos naranjas, radio por peso)
            const actividad = ${activityJson};
            for (const a of actividad) {
              const e = viewer.entities.add({
                position: Cesium.Cartesian3.fromDegrees(a.lng, a.lat),
                ellipse: {
                  semiMajorAxis: 400 + a.weight * 160,
                  semiMinorAxis: 400 + a.weight * 160,
                  material: Cesium.Color.fromCssColorString('#E67E22').withAlpha(0.30),
                  outline: true,
                  outlineColor: Cesium.Color.fromCssColorString('#E67E22').withAlpha(0.6),
                  heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
                }
              });
              layers.actividad.push(e);
            }

            // Cargar pines interactivos de los lugares del Twin
            const pinBuilder = new Cesium.PinBuilder();
            const markers = ${placesJson};

            for (const m of markers) {
              let color = Cesium.Color.fromCssColorString('#0E9AA3'); // Turquesa: Oficial o Comunidad Verificado
              if (m.source === 'community' && !m.isVerified) {
                color = Cesium.Color.fromCssColorString('#C75B39'); // Tierra: Nuevo / Sin Verificar
              }
              
              const pin = pinBuilder.fromColor(color, 32).toDataURL();

              const e = viewer.entities.add({
                id: m.id,
                // Elevar un poco los marcadores sobre el relieve 3D
                position: Cesium.Cartesian3.fromDegrees(m.lng, m.lat, m.source === 'official' ? 680 : 660),
                billboard: {
                  image: pin,
                  verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                  heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                },
                label: {
                  text: m.name,
                  font: 'bold 11px sans-serif',
                  fillColor: Cesium.Color.WHITE,
                  outlineColor: Cesium.Color.fromCssColorString('#152A20'),
                  outlineWidth: 3,
                  style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                  verticalOrigin: Cesium.VerticalOrigin.TOP,
                  pixelOffset: new Cesium.Cartesian2(0, 6),
                  heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND
                }
              });
              layers.lugares.push(e);
            }

            // Handler para clicks en marcadores 3D
            const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
            handler.setInputAction((click) => {
              const pickedObject = viewer.scene.pick(click.position);
              if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
                const entityId = pickedObject.id.id;
                if (typeof entityId === 'string' && entityId.startsWith('biz-')) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'business_click', id: entityId.slice(4) }));
                } else if (entityId) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker_click', id: entityId }));
                }
              }
            }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

            // Lee la coordenada real (con relieve) bajo un píxel del globo 3D.
            // Prefiere pickPosition contra los 3D Tiles; cae al elipsoide si el
            // depth-picking no está disponible en este WebView.
            function coordAtPixel(pixel) {
              let cart;
              if (viewer.scene.pickPositionSupported) {
                cart = viewer.scene.pickPosition(pixel);
              }
              if (!Cesium.defined(cart)) {
                cart = viewer.camera.pickEllipsoid(pixel, viewer.scene.globe.ellipsoid);
              }
              if (!Cesium.defined(cart)) return null;
              const c = Cesium.Cartographic.fromCartesian(cart);
              return {
                lat: Cesium.Math.toDegrees(c.latitude),
                lng: Cesium.Math.toDegrees(c.longitude)
              };
            }

            // Handler para mensajes del contenedor móvil (React Native)
            window.addEventListener('message', (event) => {
              try {
                const data = JSON.parse(event.data);
                if (data.type === 'toggle_layer' && layers[data.layer]) {
                  for (const e of layers[data.layer]) e.show = !!data.visible;
                }
                if (data.type === 'fly_centro') {
                  volarCentro(true);
                }
                if (data.type === 'request_center_coord') {
                  const canvas = viewer.scene.canvas;
                  const px = new Cesium.Cartesian2(canvas.clientWidth / 2, canvas.clientHeight / 2);
                  const c = coordAtPixel(px);
                  window.ReactNativeWebView.postMessage(JSON.stringify(
                    c ? { type: 'center_coord', lat: c.lat, lng: c.lng } : { type: 'center_coord_fail' }
                  ));
                }
                if (data.type === 'fly_to') {
                  // Volar al destino en 3D
                  viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(data.lng, data.lat - 0.003, 500),
                    orientation: {
                      heading: Cesium.Math.toRadians(0.0),
                      pitch: Cesium.Math.toRadians(-35.0),
                      roll: 0.0
                    },
                    duration: 2.0
                  });
                }
              } catch (e) {
                console.error(e);
              }
            });
          })();
        </script>
      </body>
      </html>
    `;
  };

  // Memoizado: togglear capas o re-renders no regeneran el HTML (el globo no
  // se recarga); solo cambia si cambian los datos de las capas.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const htmlSource = useMemo(() => ({ html: generateHTML() }), [lugares, negocios, actividad]);

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      {/* Encabezado */}
      <View style={styles.encabezado}>
        <Globe size={20} color={Colors.primario} strokeWidth={2.4} />
        <View>
          <Text style={styles.etiqueta}>Digital Twin Real</Text>
          <Text style={styles.titulo}>El Salvador en 3D Fotorrealista</Text>
        </View>
      </View>

      {/* Selector de capas del twin — el cruce de ≥2 capas también vive en 3D (rúbrica) */}
      <View style={styles.capas3d}>
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
      </View>

      {/* Visor 3D */}
      <View style={styles.visorContainer}>
        {cargando ? (
          <View style={styles.cargando}>
            <ActivityIndicator size="large" color={Colors.primario} />
            <Text style={styles.cargandoTexto}>Consultando Base de Datos...</Text>
          </View>
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

        {/* Mira central + controles: apunta el globo a un punto y crea ahí */}
        {!cargando && WebView && (
          <>
            <View pointerEvents="none" style={styles.miraWrap}>
              <Crosshair size={36} color={Colors.superficie} strokeWidth={2.4} />
            </View>
            <View style={styles.controles3d}>
              <Pressable onPress={irCentroHistorico} style={styles.btnControl}>
                <Landmark size={16} color={Colors.primario} strokeWidth={2.4} />
                <Text style={styles.btnControlTexto}>Centro Histórico</Text>
              </Pressable>
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
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.borde,
    backgroundColor: Colors.superficie,
  },
  etiqueta: { ...Type.etiqueta, fontSize: 10, color: Colors.acento },
  titulo: { ...Type.cuerpoDestacado, fontSize: 16, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
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
  capas3d: {
    flexDirection: 'row',
    gap: Spacing.s,
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.s,
    backgroundColor: Colors.superficie,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.borde,
  },
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
});
