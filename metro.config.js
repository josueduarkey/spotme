const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Módulos nativos sin soporte web → stubs solo en el bundle web.
// En Android/iOS se resuelven los módulos reales sin cambios.
const WEB_STUBS = {
  'react-native-maps': path.resolve(__dirname, 'web-stubs/react-native-maps.js'),
  'react-native-webview': path.resolve(__dirname, 'web-stubs/react-native-webview.js'),
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    const stubKey = Object.keys(WEB_STUBS).find(
      (name) => moduleName === name || moduleName.startsWith(name + '/')
    );
    if (stubKey) {
      return { type: 'sourceFile', filePath: WEB_STUBS[stubKey] };
    }
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
