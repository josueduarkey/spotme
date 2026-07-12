// Stub web de react-native-webview. En web el contenido embebido (Mapbox 3D)
// se sustituye por un aviso; el módulo nativo real solo corre en Android/iOS.
const React = require('react');
const { View, Text, StyleSheet } = require('react-native');

const styles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#152A20',
    padding: 24,
  },
  txt: {
    color: '#F4EFE6',
    textAlign: 'center',
    fontSize: 15,
    maxWidth: 320,
  },
});

function WebView(props) {
  return React.createElement(
    View,
    { style: [styles.box, props.style] },
    React.createElement(
      Text,
      { style: styles.txt },
      '🌎 El sobrevuelo 3D está disponible en la app móvil de Spotmi (Android/iOS).'
    )
  );
}

module.exports = { WebView, default: WebView };
