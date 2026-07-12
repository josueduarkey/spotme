// Stub web de react-native-maps (sin soporte oficial de web).
// Metro lo sustituye solo cuando platform === 'web' (ver metro.config.js);
// en Android/iOS se sigue usando el módulo nativo real.
const React = require('react');
const { View, Text, StyleSheet } = require('react-native');

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF4F4',
    padding: 24,
  },
  txt: {
    color: '#152A20',
    textAlign: 'center',
    fontSize: 15,
    maxWidth: 320,
  },
});

const MapView = React.forwardRef(function MapView(props, ref) {
  React.useImperativeHandle(ref, () => ({
    animateToRegion: () => {},
    animateCamera: () => {},
    setCamera: () => {},
    fitToCoordinates: () => {},
    getCamera: async () => ({ center: { latitude: 13.7, longitude: -89.2 } }),
  }));
  return React.createElement(
    View,
    { style: [styles.box, props.style] },
    React.createElement(
      Text,
      { style: styles.txt },
      '🗺️ El mapa interactivo está disponible en la app móvil de Spotmi (Android/iOS).'
    )
  );
});

const Empty = () => null;

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = Empty;
module.exports.Polyline = Empty;
module.exports.Polygon = Empty;
module.exports.Circle = Empty;
module.exports.UrlTile = Empty;
module.exports.Callout = Empty;
module.exports.Heatmap = Empty;
module.exports.PROVIDER_GOOGLE = 'google';
module.exports.PROVIDER_DEFAULT = null;
