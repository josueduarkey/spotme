import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, CalendarDays, Camera, ImageIcon, LocateFixed, MapPin, X } from 'lucide-react-native';
import React, { useMemo, useRef, useState } from 'react';
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
import { Colors, Peana, Radius, Spacing, Type } from '../constants/theme';
import { createEvent } from '../lib/queries/events';

// Carga segura de módulos nativos (mismo patrón que crear-lugar)
let ImagePicker: any = null;
let Location: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  ImagePicker = null;
}
try {
  Location = require('expo-location');
} catch {
  Location = null;
}

const EL_SALVADOR: Region = {
  latitude: 13.72,
  longitude: -88.9,
  latitudeDelta: 2.1,
  longitudeDelta: 2.4,
};

const HORAS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '19:00', '20:00'];
const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

type Paso = 1 | 2 | 3;

/**
 * Crear evento nuevo — pivote Fase 6: la comunidad también construye la capa
 * de eventos del twin. Mismo flujo de 3 pasos sin fricción que crear-lugar:
 * pin en el mapa → fecha y hora → nombre/descripción/foto y publicar.
 * Se publica como evento "Nuevo · sin verificar" hasta 3 confirmaciones.
 */
export default function CrearEvento() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [paso, setPaso] = useState<Paso>(1);
  const [coordenadas, setCoordenadas] = useState({ lat: EL_SALVADOR.latitude, lng: EL_SALVADOR.longitude });
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
  const [diaSel, setDiaSel] = useState<string | null>(null); // ISO yyyy-mm-dd
  const [horaSel, setHoraSel] = useState<string>('10:00');
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [publicando, setPublicando] = useState(false);

  // Próximos 30 días como chips — cero dependencias nativas de date-picker.
  const dias = useMemo(() => {
    const hoy = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1 + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { iso, etiqueta: `${DIAS_SEMANA[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}` };
    });
  }, []);

  async function usarMiUbicacion() {
    if (!Location) {
      Alert.alert('Módulo no disponible', 'El GPS requiere el Build de Desarrollo; mueve el mapa manualmente.');
      return;
    }
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
    if (!ImagePicker) {
      Alert.alert('Cámara no disponible', 'El módulo de cámara requiere el Build de Desarrollo.');
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Sin permiso', 'Activa el permiso de cámara para tomar la foto.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled) setFotoUri(res.assets[0].uri);
  }

  async function elegirDeGaleria() {
    if (!ImagePicker) {
      Alert.alert('Galería no disponible', 'El acceso a imágenes requiere el Build de Desarrollo.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled) setFotoUri(res.assets[0].uri);
  }

  async function publicar() {
    if (!titulo.trim() || !diaSel) return;
    setPublicando(true);
    const { event, error } = await createEvent({
      title: titulo,
      description: descripcion,
      date: new Date(`${diaSel}T${horaSel}:00`).toISOString(),
      lat: coordenadas.lat,
      lng: coordenadas.lng,
      photoUri: fotoUri,
    });
    setPublicando(false);
    if (error || !event) {
      Alert.alert('No se pudo publicar', error ?? 'Intenta de nuevo.');
      return;
    }
    Alert.alert(
      '¡Evento publicado!',
      `"${event.title}" ya aparece en los eventos próximos. Cuando 3 personas confirmen que es real, quedará verificado.`,
      [{ text: 'Listo', onPress: () => router.back() }],
    );
  }

  return (
    <View style={styles.pantalla}>
      {/* Paso 1 — Ubicación, mismo patrón de pin central que crear-lugar */}
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
              <Text style={styles.pasoEtiqueta}>Paso 1 de 3 · Evento nuevo</Text>
              <Text style={styles.pasoTitulo}>¿Dónde será el evento?</Text>
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
                  <Text style={styles.pasoEtiqueta}>Paso {paso} de 3 · Evento nuevo</Text>
                  <Text style={styles.pasoTitulo}>{paso === 2 ? '¿Cuándo es?' : 'Cuéntanos del evento'}</Text>
                </View>
              </View>

              {paso === 2 && (
                <View style={{ gap: Spacing.m }}>
                  <View style={styles.filaSeccion}>
                    <CalendarDays size={15} color={Colors.acento} strokeWidth={2.4} />
                    <Text style={styles.etiquetaCampo}>Fecha (próximos 30 días)</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.s }}>
                    {dias.map((d) => (
                      <Pressable
                        key={d.iso}
                        onPress={() => setDiaSel(d.iso)}
                        style={[styles.chipFecha, diaSel === d.iso && styles.chipFechaActiva]}>
                        <Text style={[styles.chipFechaTexto, diaSel === d.iso && styles.chipFechaTextoActivo]}>
                          {d.etiqueta}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                  <Text style={styles.etiquetaCampo}>Hora</Text>
                  <View style={styles.filaHoras}>
                    {HORAS.map((h) => (
                      <Pressable
                        key={h}
                        onPress={() => setHoraSel(h)}
                        style={[styles.chipFecha, horaSel === h && styles.chipFechaActiva]}>
                        <Text style={[styles.chipFechaTexto, horaSel === h && styles.chipFechaTextoActivo]}>{h}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Boton titulo="Continuar" onPress={() => setPaso(3)} deshabilitado={!diaSel} />
                </View>
              )}

              {paso === 3 && (
                <View style={{ gap: Spacing.m }}>
                  <Campo
                    etiqueta="Nombre del evento"
                    placeholder="Ej. Feria gastronómica de…"
                    value={titulo}
                    onChangeText={setTitulo}
                    autoCapitalize="words"
                  />
                  <Campo
                    etiqueta="Descripción corta"
                    placeholder="¿Qué habrá? ¿Quién lo organiza? (opcional)"
                    value={descripcion}
                    onChangeText={setDescripcion}
                    multiline
                    numberOfLines={3}
                  />
                  {fotoUri && (
                    <View style={styles.previa}>
                      <Image source={{ uri: fotoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
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
                  <Boton
                    titulo="Publicar evento"
                    onPress={publicar}
                    cargando={publicando}
                    deshabilitado={!titulo.trim() || !diaSel}
                  />
                  <Text style={styles.nota}>
                    La foto es opcional. Se publica de inmediato como evento de la comunidad, marcado
                    "Nuevo" hasta que 3 personas confirmen que es real.
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
    paddingBottom: 36,
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
  filaSeccion: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipFecha: {
    backgroundColor: Colors.superficie,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    paddingHorizontal: Spacing.m,
    paddingVertical: 8,
  },
  chipFechaActiva: { backgroundColor: Colors.tinta, borderColor: Colors.tinta },
  chipFechaTexto: { ...Type.nota, color: Colors.textoSuave },
  chipFechaTextoActivo: { color: Colors.textoInvertido },
  filaHoras: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.s },
  previa: {
    height: 180,
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
  nota: { ...Type.nota, color: Colors.textoSuave },
});
