import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Region, UrlTile } from 'react-native-maps';

// Carga segura del WebView (mismo patrón que gemelo-3d).
let WebView: any = null;
try {
  WebView = require('react-native-webview').WebView;
} catch {
  WebView = null;
}

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || '';

export interface MapaPickerRef {
  /** Vuela el mapa a una coordenada (ej. "usar mi ubicación"). */
  flyTo: (lat: number, lng: number, zoom?: number) => void;
}

interface Props {
  initialLat: number;
  initialLng: number;
  /** Zoom Mapbox inicial (7.4 ≈ todo El Salvador, 15 ≈ nivel calle). */
  initialZoom?: number;
  /** El centro del mapa cambió (el pin fijo del centro apunta aquí). */
  onCenterChange: (lat: number, lng: number) => void;
}

/**
 * Selector de punto sobre Mapbox GL JS (estilo Standard, mismo look del tab
 * "3D Real") para las pantallas de crear lugar/evento: el pin vive fijo al
 * centro en React Native y este mapa reporta su centro en cada movimiento.
 * Sin token de Mapbox o sin WebView, cae al MapView clásico (Carto) para que
 * el flujo de creación nunca se rompa.
 */
export const MapaPickerMapbox = forwardRef<MapaPickerRef, Props>(function MapaPickerMapbox(
  { initialLat, initialLng, initialZoom = 7.4, onCenterChange },
  ref,
) {
  const webViewRef = useRef<any>(null);
  const nativeMapRef = useRef<MapView>(null);
  const usaMapbox = !!MAPBOX_TOKEN && !!WebView;

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, zoom = 15.5) => {
      if (usaMapbox) {
        webViewRef.current?.postMessage(JSON.stringify({ type: 'fly_to', lat, lng, zoom }));
      } else {
        nativeMapRef.current?.animateToRegion(
          { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 },
          600,
        );
      }
    },
  }));

  const html = useMemo(
    () => `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
        <link href="https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.css" rel="stylesheet">
        <script src="https://api.mapbox.com/mapbox-gl-js/v3.7.0/mapbox-gl.js"></script>
        <style>
          html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
          .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib { opacity: .35; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          mapboxgl.accessToken = "${MAPBOX_TOKEN}";
          const map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/standard',
            center: [${initialLng}, ${initialLat}],
            zoom: ${initialZoom},
            pitch: 0,
            attributionControl: false
          });
          // Sin rotación ni pitch: elegir un punto pide precisión, no drama.
          map.dragRotate.disable();
          map.touchZoomRotate.disableRotation();
          map.touchPitch.disable();

          function reportarCentro() {
            const c = map.getCenter();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'center', lat: c.lat, lng: c.lng }));
          }
          map.on('moveend', reportarCentro);
          map.on('load', reportarCentro);

          const onNativeMessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              if (data.type === 'fly_to') {
                map.flyTo({ center: [data.lng, data.lat], zoom: data.zoom || 15.5, duration: 800 });
              }
            } catch (e) {}
          };
          window.addEventListener('message', onNativeMessage);
          document.addEventListener('message', onNativeMessage);
        </script>
      </body>
      </html>
    `,
    // El HTML solo depende de los valores iniciales: se genera una vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (usaMapbox) {
    return (
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={StyleSheet.absoluteFill}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(event: any) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'center') onCenterChange(data.lat, data.lng);
          } catch {
            /* mensaje no-JSON: ignorar */
          }
        }}
      />
    );
  }

  // Fallback: MapView clásico (idéntico al flujo original pre-Mapbox).
  const region: Region = {
    latitude: initialLat,
    longitude: initialLng,
    latitudeDelta: initialZoom >= 12 ? 0.02 : 2.1,
    longitudeDelta: initialZoom >= 12 ? 0.02 : 2.4,
  };
  return (
    <MapView
      ref={nativeMapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={region}
      onRegionChangeComplete={(r) => onCenterChange(r.latitude, r.longitude)}>
      <UrlTile
        urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
        shouldReplaceMapContent={true}
        maximumZ={19}
        tileSize={256}
      />
    </MapView>
  );
});
