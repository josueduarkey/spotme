import { Alert, Linking } from 'react-native';

/**
 * Abre la búsqueda de TikTok con "{termino} El Salvador" ya escrito en la
 * barra. Intenta primero el deep link de la app (snssdk1233:// es el scheme
 * oficial de TikTok global) para que caiga directo en la búsqueda nativa;
 * si la app no está instalada, cae a la web.
 */
export async function buscarEnTikTok(termino: string) {
  const query = encodeURIComponent(`${termino} El Salvador`);
  try {
    await Linking.openURL(`snssdk1233://search?keyword=${query}`);
  } catch {
    try {
      await Linking.openURL(`https://www.tiktok.com/search?q=${query}`);
    } catch {
      Alert.alert('No se pudo abrir TikTok', 'Intenta de nuevo más tarde.');
    }
  }
}
