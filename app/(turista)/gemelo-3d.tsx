import { useFocusEffect, useRouter } from 'expo-router';
import { Globe, MapPin, Compass } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { Place } from '../../constants/mock';
import { Colors, Radius, Spacing, Type, Fonts, Peana } from '../../constants/theme';
import Constants from 'expo-constants';

// Recuperar API Key activa
const GOOGLE_MAPS_API_KEY =
  Constants.expoConfig?.android?.config?.googleMaps?.apiKey || 'AIzaSyBE5rKSq03ZEN8tlGbSaQhOnGgf6IIEoJ4';

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
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      getPlaces().then((res) => {
        setLugares(res);
        setCargando(false);
      });
    }, []),
  );

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

            // Vista inicial en perspectiva aérea del Divino Salvador del Mundo
            viewer.camera.setView({
              destination: Cesium.Cartesian3.fromDegrees(-89.2247, 13.6953, 580),
              orientation: {
                heading: Cesium.Math.toRadians(0.0),
                pitch: Cesium.Math.toRadians(-35.0),
                roll: 0.0
              }
            });

            // Cargar pines interactivos de los lugares del Twin
            const pinBuilder = new Cesium.PinBuilder();
            const markers = ${placesJson};
            
            for (const m of markers) {
              let color = Cesium.Color.fromCssColorString('#0E9AA3'); // Turquesa: Oficial o Comunidad Verificado
              if (m.source === 'community' && !m.isVerified) {
                color = Cesium.Color.fromCssColorString('#C75B39'); // Tierra: Nuevo / Sin Verificar
              }
              
              const pin = pinBuilder.fromColor(color, 32).toDataURL();
              
              viewer.entities.add({
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
            }

            // Handler para clicks en marcadores 3D
            const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
            handler.setInputAction((click) => {
              const pickedObject = viewer.scene.pick(click.position);
              if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
                const entityId = pickedObject.id.id;
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'marker_click', id: entityId }));
              }
            }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

            // Handler para mensajes del contenedor móvil (React Native)
            window.addEventListener('message', (event) => {
              try {
                const data = JSON.parse(event.data);
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
              source={{ html: generateHTML() }}
              style={styles.webView}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onMessage={handleWebViewMessage}
            />
          </WebViewErrorBoundary>
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
