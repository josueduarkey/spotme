import { useRouter } from 'expo-router';
import { ArrowLeft, Compass, MapPin, Navigation } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../components/Boton';
import { Colors, Radius, Spacing, Type, Fonts, Peana } from '../constants/theme';
import { getPlaces } from '../lib/queries/places';
import { Place } from '../constants/mock';

export default function PlanificarRuta() {
  const router = useRouter();
  const [lugares, setLugares] = useState<Place[]>([]);
  const [cargando, setCargando] = useState(true);
  const [origen, setOrigen] = useState<Place | null>(null);
  const [destino, setDestino] = useState<Place | null>(null);
  const [abrirSeleccion, setAbrirSeleccion] = useState<'origen' | 'destino' | null>(null);

  useEffect(() => {
    getPlaces().then((res) => {
      setLugares(res);
      setCargando(false);
    });
  }, []);

  function seleccionar(lugar: Place) {
    if (abrirSeleccion === 'origen') {
      if (destino?.id === lugar.id) {
        Alert.alert('Selección no válida', 'El origen y el destino no pueden ser el mismo lugar.');
        return;
      }
      setOrigen(lugar);
    } else if (abrirSeleccion === 'destino') {
      if (origen?.id === lugar.id) {
        Alert.alert('Selección no válida', 'El origen y el destino no pueden ser el mismo lugar.');
        return;
      }
      setDestino(lugar);
    }
    setAbrirSeleccion(null);
  }

  function generarRuta() {
    if (!origen || !destino) return;
    router.push({
      pathname: '/ruta',
      params: {
        startId: origen.id,
        endId: destino.id,
      },
    });
  }

  if (cargando) {
    return (
      <SafeAreaView style={styles.pantallaCargando}>
        <ActivityIndicator size="large" color={Colors.primario} />
        <Text style={styles.cargandoTexto}>Cargando catálogo de destinos...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <View style={styles.encabezado}>
        <Pressable onPress={() => router.back()} style={styles.botonVolver}>
          <ArrowLeft size={20} color={Colors.texto} />
        </Pressable>
        <View>
          <Text style={styles.etiqueta}>Fase 4 · Planificación</Text>
          <Text style={styles.titulo}>Crear Nueva Ruta</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.cajaInstruccion}>
          <Compass size={24} color={Colors.primario} />
          <Text style={styles.instruccionTexto}>
            Selecciona el punto de partida y tu destino final. El sistema calculará el camino óptimo y te recomendará joyas ocultas para visitar durante el trayecto.
          </Text>
        </View>

        {/* Bloque Selección de Origen */}
        <View style={styles.bloqueSeleccion}>
          <Text style={styles.etiquetaCampo}>Punto de Partida</Text>
          <Pressable
            onPress={() => setAbrirSeleccion('origen')}
            style={({ pressed }) => [styles.selectorBoton, pressed && { opacity: 0.8 }]}>
            <View style={styles.selectorFila}>
              <MapPin size={18} color={origen ? Colors.primario : Colors.textoSuave} />
              <Text style={[styles.selectorBotonTexto, origen && { color: Colors.texto }]}>
                {origen ? origen.name : 'Selecciona un lugar de partida'}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Bloque Selección de Destino */}
        <View style={styles.bloqueSeleccion}>
          <Text style={styles.etiquetaCampo}>Destino Final</Text>
          <Pressable
            onPress={() => setAbrirSeleccion('destino')}
            style={({ pressed }) => [styles.selectorBoton, pressed && { opacity: 0.8 }]}>
            <View style={styles.selectorFila}>
              <MapPin size={18} color={destino ? Colors.acento : Colors.textoSuave} />
              <Text style={[styles.selectorBotonTexto, destino && { color: Colors.texto }]}>
                {destino ? destino.name : 'Selecciona tu destino final'}
              </Text>
            </View>
          </Pressable>
        </View>

        <Boton
          titulo="Planificar e identificar paradas"
          onPress={generarRuta}
          deshabilitado={!origen || !destino}
          variante="primario"
        />
      </ScrollView>

      {/* Modal / Selector de lista simple */}
      {abrirSeleccion !== null && (
        <View style={styles.modalContenedor}>
          <View style={styles.modalFondo} />
          <View style={styles.modalContenido}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>
                {abrirSeleccion === 'origen' ? 'Seleccionar Punto de Partida' : 'Seleccionar Destino Final'}
              </Text>
              <Pressable onPress={() => setAbrirSeleccion(null)}>
                <Text style={styles.modalCerrar}>Cerrar</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.modalLista}>
              {lugares.map((l) => (
                <Pressable key={l.id} onPress={() => seleccionar(l)} style={styles.modalItem}>
                  <MapPin size={16} color={Colors.primario} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemNombre}>{l.name}</Text>
                    <Text style={styles.modalItemDetalle}>
                      {l.department} · {l.source === 'official' ? 'Oficial' : 'Comunidad'}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
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
  titulo: { ...Type.cuerpoDestacado, fontSize: 18, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
  contenido: { padding: Spacing.l, gap: Spacing.l },
  cajaInstruccion: {
    backgroundColor: Colors.rellenoSuave,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderRadius: Radius.m,
    padding: Spacing.m,
    flexDirection: 'row',
    gap: Spacing.m,
    alignItems: 'center',
  },
  instruccionTexto: {
    ...Type.cuerpo,
    fontSize: 13,
    color: Colors.texto,
    flex: 1,
    lineHeight: 18,
  },
  bloqueSeleccion: { gap: Spacing.s },
  etiquetaCampo: { ...Type.etiqueta, color: Colors.textoSuave },
  selectorBoton: {
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    paddingVertical: Spacing.l,
    paddingHorizontal: Spacing.m,
  },
  selectorFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.m },
  selectorBotonTexto: { ...Type.cuerpo, color: Colors.textoSuave, fontSize: 15 },
  modalContenedor: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 99,
  },
  modalFondo: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(21, 42, 32, 0.45)',
  },
  modalContenido: {
    backgroundColor: Colors.superficie,
    borderTopLeftRadius: Radius.l,
    borderTopRightRadius: Radius.l,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    height: '75%',
    padding: Spacing.l,
    gap: Spacing.m,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitulo: { ...Type.subtitulo, color: Colors.texto, fontSize: 16 },
  modalCerrar: { ...Type.cuerpoDestacado, color: Colors.acento, fontSize: 14 },
  modalLista: { flex: 1 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    paddingVertical: Spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borde,
  },
  modalItemNombre: { ...Type.cuerpoDestacado, color: Colors.texto, fontSize: 14 },
  modalItemDetalle: { ...Type.nota, color: Colors.textoSuave },
});
