import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { ArrowLeft, Camera, ImageIcon, LocateFixed, MapPin, X } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Region, UrlTile } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../components/Boton';
import { Campo } from '../components/Campo';
import { ChipCapa } from '../components/ChipCapa';
import { ICONO_CATEGORIA } from '../components/iconos';
import { Categoria, CATEGORIAS } from '../constants/mock';
import { Colors, Peana, Radius, Spacing, Type } from '../constants/theme';
import { createPlace } from '../lib/queries/places';

/** Región inicial: El Salvador completo. */
const EL_SALVADOR: Region = {
  latitude: 13.72,
  longitude: -88.9,
  latitudeDelta: 2.1,
  longitudeDelta: 2.4,
};

type Paso = 1 | 2 | 3;

/**
 * Pantalla 7b — Crear lugar nuevo (pivote Fase 3).
 * 3 pasos sin fricción: soltar el pin → foto obligatoria → nombre y publicar.
 */
export default function CrearLugar() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [paso, setPaso] = useState<Paso>(1);
  const [coordenadas, setCoordenadas] = useState({ lat: EL_SALVADOR.latitude, lng: EL_SALVADOR.longitude });
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const [publicando, setPublicando] = useState(false);

  async function usarMiUbicacion() {
    setBuscandoUbicacion(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setBuscandoUbicacion(false);
      Alert.alert('Sin permiso', 'Activa el permiso de ubicación para usar tu posición actual.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setBuscandoUbicacion(false);
    mapRef.current?.animateToRegion(
      { latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 },
      600,
    );
  }

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

  async function publicar() {
    if (!nombre.trim() || !categoria || !fotoUri) return;
    setPublicando(true);
    const { place, error } = await createPlace({
      name: nombre,
      category: categoria,
      description: descripcion,
      lat: coordenadas.lat,
      lng: coordenadas.lng,
      photoUri: fotoUri,
    });
    setPublicando(false);
    if (error || !place) {
      Alert.alert('No se pudo publicar', error ?? 'Intenta de nuevo.');
      return;
    }
    Alert.alert(
      '¡Lugar publicado!',
      `"${place.name}" ya está en el mapa como lugar nuevo. Cuando 3 personas confirmen que existe, quedará verificado.`,
      [{ text: 'Ver en el mapa', onPress: () => router.back() }],
    );
  }

  return (
    <View style={styles.pantalla}>
      {/* Paso 1 — Ubicación: el mapa queda montado debajo de los pasos 2-3 */}
      <View style={StyleSheet.absoluteFill}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={EL_SALVADOR}
          onRegionChangeComplete={(r) => setCoordenadas({ lat: r.latitude, lng: r.longitude })}>
          <UrlTile
            urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
            shouldReplaceMapContent={true}
            maximumZ={19}
            tileSize={256}
          />
        </MapView>
        {/* Pin fijo al centro: mover el mapa = mover el pin */}
        <View pointerEvents="none" style={styles.pinCentro}>
          <MapPin size={40} color={Colors.rojoAnil} strokeWidth={2.2} fill={Colors.superficie} />
        </View>
      </View>

      {paso === 1 && (
        <SafeAreaView pointerEvents="box-none" style={styles.capaPaso1}>
          <View style={styles.encabezadoFlotante}>
            <Pressable onPress={() => router.back()} style={styles.botonCerrar}>
              <X size={20} color={Colors.texto} />
            </Pressable>
            <View style={styles.tituloFlotante}>
              <Text style={styles.pasoEtiqueta}>Paso 1 de 3</Text>
              <Text style={styles.pasoTitulo}>Mueve el mapa hasta el lugar</Text>
            </View>
          </View>
          <View style={styles.piePaso1}>
            <Pressable onPress={usarMiUbicacion} style={styles.botonUbicacion}>
              <LocateFixed size={16} color={Colors.primario} strokeWidth={2.4} />
              <Text style={styles.botonUbicacionTexto}>
                {buscandoUbicacion ? 'Buscando…' : 'Usar mi ubicación'}
              </Text>
            </Pressable>
            <Boton titulo="El pin está en el lugar" onPress={() => setPaso(2)} />
          </View>
        </SafeAreaView>
      )}

      {paso !== 1 && (
        <SafeAreaView style={styles.hoja}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.hojaContenido} keyboardShouldPersistTaps="handled">
              <View style={styles.encabezadoHoja}>
                <Pressable onPress={() => setPaso((paso - 1) as Paso)} style={styles.botonCerrar}>
                  <ArrowLeft size={20} color={Colors.texto} />
                </Pressable>
                <View>
                  <Text style={styles.pasoEtiqueta}>Paso {paso} de 3</Text>
                  <Text style={styles.pasoTitulo}>
                    {paso === 2 ? 'Una foto del lugar' : 'Cuéntanos qué es'}
                  </Text>
                </View>
              </View>

              {paso === 2 && (
                <View style={{ gap: Spacing.m }}>
                  {fotoUri ? (
                    <View style={styles.previa}>
                      <Image source={{ uri: fotoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    </View>
                  ) : (
                    <Text style={styles.nota}>
                      La foto es obligatoria: es lo que verán los demás en el pin del mapa.
                    </Text>
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
                  <Boton titulo="Continuar" onPress={() => setPaso(3)} deshabilitado={!fotoUri} />
                </View>
              )}

              {paso === 3 && (
                <View style={{ gap: Spacing.m }}>
                  <Campo
                    etiqueta="Nombre del lugar"
                    placeholder="Ej. Cascada escondida de…"
                    value={nombre}
                    onChangeText={setNombre}
                    autoCapitalize="words"
                  />
                  <View style={{ gap: Spacing.s }}>
                    <Text style={styles.etiquetaCampo}>Categoría</Text>
                    <View style={styles.filaCategorias}>
                      {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => (
                        <ChipCapa
                          key={c}
                          etiqueta={CATEGORIAS[c].etiqueta}
                          Icono={ICONO_CATEGORIA[c]}
                          activa={categoria === c}
                          onPress={() => setCategoria(c)}
                        />
                      ))}
                    </View>
                  </View>
                  <Campo
                    etiqueta="Descripción corta"
                    placeholder="¿Qué lo hace especial? (opcional)"
                    value={descripcion}
                    onChangeText={setDescripcion}
                    multiline
                    numberOfLines={3}
                  />
                  <Boton
                    titulo="Publicar lugar"
                    onPress={publicar}
                    cargando={publicando}
                    deshabilitado={!nombre.trim() || !categoria}
                  />
                  <Text style={styles.nota}>
                    Se publica de inmediato como lugar de la comunidad, marcado "Nuevo" hasta que
                    3 personas confirmen que existe.
                  </Text>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  pinCentro: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 36, // la punta del pin cae en el centro real
  },
  capaPaso1: { flex: 1, justifyContent: 'space-between' },
  encabezadoFlotante: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    margin: Spacing.m,
  },
  tituloFlotante: {
    flex: 1,
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
  },
  botonCerrar: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Colors.superficie,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pasoEtiqueta: { ...Type.etiqueta, fontSize: 10, color: Colors.acento },
  pasoTitulo: { ...Type.cuerpoDestacado, color: Colors.texto },
  piePaso1: { padding: Spacing.l, gap: Spacing.m },
  botonUbicacion: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.superficie,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    paddingHorizontal: Spacing.m,
    paddingVertical: 10,
  },
  botonUbicacionTexto: { ...Type.nota, color: Colors.primario },
  hoja: { flex: 1, backgroundColor: Colors.fondo },
  hojaContenido: { padding: Spacing.l, gap: Spacing.l },
  encabezadoHoja: { flexDirection: 'row', alignItems: 'center', gap: Spacing.m },
  previa: {
    height: 220,
    borderRadius: Radius.m,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
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
  etiquetaCampo: { ...Type.etiqueta, color: Colors.textoSuave },
  filaCategorias: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.s },
  nota: { ...Type.nota, color: Colors.textoSuave },
});
