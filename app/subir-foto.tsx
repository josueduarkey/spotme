import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { ArrowLeft, Camera, ImageIcon, MapPin } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../components/Boton';
import { Colors, Peana, Radius, Spacing, Type } from '../constants/theme';
import { uploadPhoto } from '../lib/queries/uploads';

/**
 * Pantalla 8 — Subir foto a un lugar/negocio existente.
 * Params opcionales (vienen de la ficha): id, tipo ('lugar'|'negocio'),
 * nombre, lat, lng. Sin params, la foto se asocia al lugar más cercano.
 */
export default function SubirFoto() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; tipo?: string; nombre?: string; lat?: string; lng?: string }>();
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);

  const targetType = params.tipo === 'negocio' ? 'business' : params.tipo === 'lugar' ? 'place' : undefined;

  async function tomarFoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sin permiso', 'Activa el permiso de cámara para tomar la foto.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled) setFotoUri(res.assets[0].uri);
  }

  async function elegirDeGaleria() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled) setFotoUri(res.assets[0].uri);
  }

  /** GPS actual; si lo niegan y la ficha pasó coordenadas, usa las del lugar. */
  async function obtenerCoordenadas(): Promise<{ lat: number; lng: number } | null> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    }
    if (params.lat && params.lng) return { lat: Number(params.lat), lng: Number(params.lng) };
    return null;
  }

  async function publicar() {
    if (!fotoUri) return;
    setPublicando(true);
    const coords = await obtenerCoordenadas();
    if (!coords) {
      setPublicando(false);
      Alert.alert('Sin ubicación', 'Activa el permiso de ubicación para geoetiquetar tu foto.');
      return;
    }
    const res = await uploadPhoto(fotoUri, coords.lat, coords.lng, params.id, targetType);
    setPublicando(false);
    if (res.error || !res.upload) {
      Alert.alert('No se pudo publicar', res.error ?? 'Intenta de nuevo.');
      return;
    }
    const destino = params.nombre ?? res.targetName;
    Alert.alert(
      '¡Foto publicada!',
      destino
        ? `Tu foto ya es parte de "${destino}" y alimenta el mapa de actividad.`
        : 'Tu foto ya alimenta el mapa de actividad.',
      [{ text: 'Listo', onPress: () => router.back() }],
    );
  }

  return (
    <SafeAreaView style={styles.pantalla}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.encabezado}>
          <Pressable onPress={() => router.back()} style={styles.botonVolver}>
            <ArrowLeft size={20} color={Colors.texto} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.etiqueta}>Subir foto</Text>
            <Text style={styles.titulo} numberOfLines={2}>
              {params.nombre ?? 'Documenta dónde estás'}
            </Text>
          </View>
        </View>

        {fotoUri ? (
          <View style={styles.previa}>
            <Image source={{ uri: fotoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
          </View>
        ) : (
          <View style={styles.vacio}>
            <Camera size={40} color={Colors.textoSuave} strokeWidth={1.5} />
            <Text style={styles.nota}>
              Tu foto se geoetiqueta automáticamente{params.nombre ? '' : ' y se asocia al lugar más cercano'}.
            </Text>
          </View>
        )}

        <View style={styles.filaFoto}>
          <Pressable onPress={tomarFoto} style={styles.botonFoto}>
            <Camera size={22} color={Colors.primario} strokeWidth={2} />
            <Text style={styles.botonFotoTexto}>Cámara</Text>
          </Pressable>
          <Pressable onPress={elegirDeGaleria} style={styles.botonFoto}>
            <ImageIcon size={22} color={Colors.primario} strokeWidth={2} />
            <Text style={styles.botonFotoTexto}>Galería</Text>
          </Pressable>
        </View>

        <View style={styles.filaUbicacion}>
          <MapPin size={14} color={Colors.acento} />
          <Text style={styles.nota}>Se usará tu ubicación actual al publicar.</Text>
        </View>

        <Boton titulo="Publicar foto" onPress={publicar} cargando={publicando} deshabilitado={!fotoUri} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  contenido: { padding: Spacing.l, gap: Spacing.l },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: Spacing.m },
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
  etiqueta: { ...Type.etiqueta, fontSize: 10, color: Colors.acento },
  titulo: { ...Type.subtitulo, color: Colors.texto },
  previa: {
    height: 280,
    borderRadius: Radius.m,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
  },
  vacio: {
    height: 200,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.m,
    paddingHorizontal: Spacing.xl,
  },
  filaFoto: { flexDirection: 'row', gap: Spacing.m },
  botonFoto: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.s,
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    paddingVertical: Spacing.l,
  },
  botonFotoTexto: { ...Type.cuerpoDestacado, fontSize: 14, color: Colors.primario },
  filaUbicacion: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  nota: { ...Type.nota, color: Colors.textoSuave, textAlign: 'center' },
});
