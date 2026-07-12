import { useRouter } from 'expo-router';
import { Building2, Clock, Edit, LogOut, MapPin, Navigation, Phone, Sparkles, Award, FileText, CheckCircle2 } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
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
import { Colors, Fonts, Peana, Radius, Spacing, Type } from '../constants/theme';
import {
  createOrUpdateBusiness,
  getBusinessMetrics,
  getOwnBusiness,
  BusinessMetrics,
} from '../lib/queries/businesses';
import { signOut } from '../lib/queries/auth';
import { Business } from '../constants/mock';

// Carga segura de módulos nativos
let Location: any = null;
try {
  Location = require('expo-location');
} catch (e) {
  console.warn('expo-location no disponible en el cliente nativo actual.');
}

const EL_SALVADOR: Region = {
  latitude: 13.72,
  longitude: -88.9,
  latitudeDelta: 2.1,
  longitudeDelta: 2.4,
};

const CATEGORIAS_NEGOCIO = ['Restaurante', 'Cafetería', 'Hospedaje', 'Artesanías', 'Turismo', 'Comercio'];

export default function BusinessDashboard() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [cargando, setCargando] = useState(true);
  const [negocio, setNegocio] = useState<Business | null>(null);
  const [metricas, setMetricas] = useState<BusinessMetrics | null>(null);
  const [modoFormulario, setModoFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Campos de Formulario
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [horarios, setHorarios] = useState('');
  const [contacto, setContacto] = useState('');
  const [coordenadas, setCoordenadas] = useState({ lat: EL_SALVADOR.latitude, lng: EL_SALVADOR.longitude });
  const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setCargando(true);
    const bus = await getOwnBusiness();
    if (bus) {
      setNegocio(bus);
      setNombre(bus.name);
      setCategoria(bus.category);
      setDescripcion(bus.description);
      setDireccion(bus.address);
      setHorarios(bus.schedule);
      setContacto(bus.contact);
      setCoordenadas({ lat: bus.lat, lng: bus.lng });

      // Cargar Métricas
      const met = await getBusinessMetrics(bus.id);
      setMetricas(met);
    } else {
      setNegocio(null);
    }
    setCargando(false);
  }

  async function usarMiUbicacion() {
    if (!Location) {
      Alert.alert(
        'Módulo no disponible',
        'El GPS no está disponible en este cliente nativo. Mueve el mapa manualmente.'
      );
      return;
    }
    setBuscandoUbicacion(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setBuscandoUbicacion(false);
      Alert.alert('Sin permiso', 'Activa el permiso de ubicación para posicionar tu negocio.');
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setBuscandoUbicacion(false);
    const region = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
    setCoordenadas({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    mapRef.current?.animateToRegion(region, 600);
  }

  async function guardar() {
    if (!nombre.trim() || !categoria || !direccion.trim()) {
      Alert.alert('Faltan campos', 'Por favor completa el nombre, categoría y dirección de tu negocio.');
      return;
    }

    setGuardando(true);
    const { business, error } = await createOrUpdateBusiness({
      name: nombre,
      category: categoria,
      description: descripcion,
      address: direccion,
      schedule: horarios,
      contact: contacto,
      lat: coordenadas.lat,
      lng: coordenadas.lng,
    });
    setGuardando(false);

    if (error || !business) {
      Alert.alert('Error', error ?? 'No se pudo guardar la información.');
      return;
    }

    Alert.alert('¡Éxito!', 'Los datos de tu negocio se han guardado correctamente.');
    setModoFormulario(false);
    cargarDatos();
  }

  async function salir() {
    await signOut();
    router.replace('/auth');
  }

  if (cargando) {
    return (
      <SafeAreaView style={styles.pantallaCargando}>
        <ActivityIndicator size="large" color={Colors.primario} />
        <Text style={styles.cargandoTexto}>Cargando panel comercial...</Text>
      </SafeAreaView>
    );
  }

  // --- MODO FORMULARIO: REGISTRO O EDICIÓN ---
  if (modoFormulario || negocio === null) {
    return (
      <SafeAreaView style={styles.pantalla} edges={['top']}>
        <View style={styles.encabezado}>
          <Building2 size={20} color={Colors.primario} strokeWidth={2.4} />
          <View>
            <Text style={styles.etiqueta}>Registro Comercial</Text>
            <Text style={styles.titulo}>{negocio ? 'Editar Datos Comerciales' : 'Configura tu Negocio'}</Text>
          </View>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
            <Text style={styles.seccionTitulo}>Ubicación Geográfica</Text>
            <Text style={styles.nota}>
              Mueve el mapa para posicionar el pin exactamente donde se encuentra tu negocio físico.
            </Text>

            {/* Selector de Mapa */}
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                initialRegion={{
                  latitude: coordenadas.lat,
                  longitude: coordenadas.lng,
                  latitudeDelta: coordenadas.lat === EL_SALVADOR.latitude ? 2.1 : 0.008,
                  longitudeDelta: coordenadas.lng === EL_SALVADOR.longitude ? 2.4 : 0.008,
                }}
                onRegionChangeComplete={(r) => setCoordenadas({ lat: r.latitude, lng: r.longitude })}>
                <UrlTile
                  urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                  shouldReplaceMapContent={true}
                  maximumZ={19}
                  tileSize={256}
                />
              </MapView>
              <View pointerEvents="none" style={styles.pinCentro}>
                <MapPin size={38} color={Colors.acento} strokeWidth={2} fill={Colors.superficie} />
              </View>
            </View>

            <Pressable onPress={usarMiUbicacion} style={styles.botonUbicacion}>
              <Navigation size={14} color={Colors.primario} strokeWidth={2.4} />
              <Text style={styles.botonUbicacionTexto}>
                {buscandoUbicacion ? 'Ubicando...' : 'Usar mi GPS actual'}
              </Text>
            </Pressable>

            {/* Datos Comerciales */}
            <Text style={[styles.seccionTitulo, { marginTop: Spacing.m }]}>Ficha del Local</Text>
            <Campo etiqueta="Nombre del negocio" placeholder="Ej. Pupusería La Bendición" value={nombre} onChangeText={setNombre} />

            <View style={{ gap: Spacing.xs }}>
              <Text style={styles.labelCategoria}>Categoría de Negocio</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriasFila}>
                {CATEGORIAS_NEGOCIO.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCategoria(c)}
                    style={[styles.categoriaChip, categoria === c && styles.categoriaChipActivo]}>
                    <Text style={[styles.categoriaChipTexto, categoria === c && styles.categoriaChipTextoActivo]}>
                      {c}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <Campo
              etiqueta="Descripción comercial"
              placeholder="Ej. Las mejores pupusas de maíz azul de la zona."
              value={descripcion}
              onChangeText={setDescripcion}
              multiline
              numberOfLines={2}
            />

            <Campo etiqueta="Dirección completa" placeholder="Ej. Frente al Parque Central de Suchitoto" value={direccion} onChangeText={setDireccion} />
            <Campo etiqueta="Horarios de atención" placeholder="Ej. Mié a Dom 11:00 am - 9:00 pm" value={horarios} onChangeText={setHorarios} />
            <Campo etiqueta="Contacto (WhatsApp/Tel)" placeholder="Ej. +503 7123-4567" value={contacto} onChangeText={setContacto} keyboardType="phone-pad" />

            <View style={styles.filaBotones}>
              <Boton titulo="Guardar Datos" onPress={guardar} cargando={guardando} style={{ flex: 2 }} />
              {negocio !== null && (
                <Boton titulo="Cancelar" onPress={() => setModoFormulario(false)} variante="secundario" style={{ flex: 1 }} />
              )}
            </View>

            {negocio === null && (
              <Pressable onPress={salir} style={styles.botonCerrarSesion}>
                <LogOut size={16} color={Colors.textoSuave} />
                <Text style={styles.botonCerrarSesionTexto}>Cerrar Sesión</Text>
              </Pressable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- MODO DASHBOARD: MÉTRICAS Y CONTROL ---
  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      {/* Encabezado */}
      <View style={[styles.encabezado, { justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.s }}>
          <Building2 size={24} color={Colors.primario} />
          <View>
            <Text style={styles.etiqueta}>{negocio.category}</Text>
            <Text style={styles.titulo}>{negocio.name}</Text>
          </View>
        </View>
        <Pressable onPress={() => setModoFormulario(true)} style={styles.botonEdit}>
          <Edit size={16} color={Colors.primario} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.cajaEstadoMapa}>
          <CheckCircle2 size={22} color={Colors.exito} />
          <View style={{ flex: 1 }}>
            <Text style={styles.estadoMapaTitulo}>Negocio Activo en el Mapa</Text>
            <Text style={styles.estadoMapaNota}>Los turistas ya pueden ver tu negocio en sus capas de descubrimiento.</Text>
          </View>
        </View>

        {/* Panel de Métricas */}
        <Text style={styles.seccionTitulo}>Métricas del Gemelo Digital</Text>
        <View style={styles.gridMetricas}>
          <View style={styles.tarjetaMetrica}>
            <Sparkles size={20} color={Colors.primario} />
            <Text style={styles.metricaValor}>{metricas?.totalPhotos ?? 0}</Text>
            <Text style={styles.metricaEtiqueta}>Fotos de Turistas</Text>
            <Text style={styles.metricaNota}>Fotos que usuarios han tomado en tu local.</Text>
          </View>
          <View style={styles.tarjetaMetrica}>
            <Award size={20} color={Colors.acento} />
            <Text style={styles.metricaValor}>{metricas?.activityScore ?? 0}%</Text>
            <Text style={styles.metricaEtiqueta}>Actividad Digital</Text>
            <Text style={styles.metricaNota}>Score de interés e interacciones en la app.</Text>
          </View>
        </View>

        {/* Ficha del Negocio */}
        <Text style={[styles.seccionTitulo, { marginTop: Spacing.m }]}>Ficha Comercial Registrada</Text>
        <View style={styles.fichaDetalle}>
          <Text style={styles.fichaDescripcion}>{negocio.description || 'Sin descripción comercial.'}</Text>
          <View style={styles.filaDetalle}>
            <MapPin size={16} color={Colors.textoSuave} />
            <Text style={styles.detalleTexto}>{negocio.address}</Text>
          </View>
          <View style={styles.filaDetalle}>
            <Clock size={16} color={Colors.textoSuave} />
            <Text style={styles.detalleTexto}>{negocio.schedule || 'Sin horario configurado'}</Text>
          </View>
          <View style={styles.filaDetalle}>
            <Phone size={16} color={Colors.textoSuave} />
            <Text style={styles.detalleTexto}>{negocio.contact || 'Sin número de contacto'}</Text>
          </View>
        </View>

        <Pressable onPress={salir} style={[styles.botonCerrarSesion, { alignSelf: 'center', marginTop: Spacing.xl }]}>
          <LogOut size={16} color={Colors.rojoAnil} />
          <Text style={[styles.botonCerrarSesionTexto, { color: Colors.rojoAnil }]}>Cerrar Sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  pantallaCargando: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.m },
  cargandoTexto: { ...Type.nota, color: Colors.textoSuave },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.borde,
    backgroundColor: Colors.superficie,
  },
  etiqueta: { ...Type.etiqueta, fontSize: 10, color: Colors.acento },
  titulo: { ...Type.cuerpoDestacado, fontSize: 16, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
  contenido: { padding: Spacing.l, gap: Spacing.l },
  seccionTitulo: { ...Type.subtitulo, fontSize: 15, color: Colors.texto, fontFamily: Fonts.display },
  nota: { ...Type.nota, color: Colors.textoSuave },
  mapContainer: {
    height: 180,
    borderRadius: Radius.m,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
  },
  pinCentro: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 34,
  },
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
    paddingVertical: 8,
    marginTop: -Spacing.s,
  },
  botonUbicacionTexto: { ...Type.nota, color: Colors.primario },
  labelCategoria: { ...Type.etiqueta, fontSize: 10, color: Colors.textoSuave },
  categoriasFila: { gap: Spacing.s },
  categoriaChip: {
    backgroundColor: Colors.superficie,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    paddingHorizontal: Spacing.m,
    paddingVertical: 8,
  },
  categoriaChipActivo: {
    backgroundColor: Colors.primario,
    borderColor: Colors.primario,
  },
  categoriaChipTexto: { ...Type.nota, color: Colors.textoSuave },
  categoriaChipTextoActivo: { color: Colors.superficie, fontWeight: 'bold' },
  filaBotones: { flexDirection: 'row', gap: Spacing.m, marginTop: Spacing.m },
  botonCerrarSesion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.m,
  },
  botonCerrarSesionTexto: { ...Type.cuerpoDestacado, fontSize: 14, color: Colors.textoSuave },
  botonEdit: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: Colors.superficie,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cajaEstadoMapa: {
    backgroundColor: Colors.superficie,
    borderWidth: 1.5,
    borderColor: Colors.exito,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: '#25A255',
    borderRadius: Radius.m,
    padding: Spacing.m,
    flexDirection: 'row',
    gap: Spacing.m,
    alignItems: 'center',
  },
  estadoMapaTitulo: { ...Type.cuerpoDestacado, color: Colors.texto },
  estadoMapaNota: { ...Type.nota, fontSize: 12, color: Colors.textoSuave, marginTop: 2 },
  gridMetricas: { flexDirection: 'row', gap: Spacing.m },
  tarjetaMetrica: {
    flex: 1,
    backgroundColor: Colors.superficie,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    borderRadius: Radius.m,
    padding: Spacing.m,
    gap: 6,
  },
  metricaValor: { ...Type.titulo, fontSize: 28, color: Colors.texto, fontFamily: Fonts.display },
  metricaEtiqueta: { ...Type.etiqueta, fontSize: 10, color: Colors.texto },
  metricaNota: { ...Type.nota, fontSize: 11, color: Colors.textoSuave, lineHeight: 15 },
  fichaDetalle: {
    backgroundColor: Colors.superficie,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    borderRadius: Radius.m,
    padding: Spacing.m,
    gap: Spacing.m,
  },
  fichaDescripcion: { ...Type.cuerpo, color: Colors.texto, lineHeight: 22 },
  filaDetalle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s },
  detalleTexto: { ...Type.cuerpo, fontSize: 14, color: Colors.texto },
});
