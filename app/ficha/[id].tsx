import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Clock, MapPin, Phone } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../../components/Boton';
import { ICONO_CATEGORIA, IconoNegocio } from '../../components/iconos';
import { Business, CATEGORIAS, Place } from '../../constants/mock';
import { Colors, Peana, Radius, Spacing, Type } from '../../constants/theme';
import { getBusinessById } from '../../lib/queries/businesses';
import { getPlaceById } from '../../lib/queries/places';

/** Pantalla 7 — Ficha de lugar o negocio. Param `tipo`: 'lugar' | 'negocio'. */
export default function Ficha() {
  const router = useRouter();
  const { id, tipo } = useLocalSearchParams<{ id: string; tipo: string }>();
  const esNegocio = tipo === 'negocio';
  const [lugar, setLugar] = useState<Place | null>(null);
  const [negocio, setNegocio] = useState<Business | null>(null);

  useEffect(() => {
    if (esNegocio) getBusinessById(id).then(setNegocio);
    else getPlaceById(id).then(setLugar);
  }, [id, esNegocio]);

  const item = esNegocio ? negocio : lugar;
  if (!item) return <View style={styles.pantalla} />;

  const IconoPortada = esNegocio ? IconoNegocio : ICONO_CATEGORIA[(item as Place).category];
  const etiqueta = esNegocio
    ? (item as Business).category
    : CATEGORIAS[(item as Place).category].etiqueta;
  const subtitulo = esNegocio ? (item as Business).address : `Departamento de ${(item as Place).department}`;

  function comoLlegar() {
    // Deep link universal a Google Maps con las coordenadas del destino
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${item!.lat},${item!.lng}`);
  }

  function subirFoto() {
    Alert.alert('Muy pronto', 'Subir fotos se habilita en la Fase 3.');
  }

  return (
    <View style={styles.pantalla}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
        <View style={styles.portada}>
          <IconoPortada size={72} color={Colors.primario} strokeWidth={1.5} />
          <Text style={styles.portadaNota}>
            {esNegocio ? 'Fotos del negocio · Fase 3' : 'Foto del lugar · la genera Cuenta B (Fase 2)'}
          </Text>
        </View>

        <View style={styles.cuerpo}>
          <Text style={styles.categoria}>{etiqueta}</Text>
          <Text style={styles.nombre}>{item.name}</Text>
          <View style={styles.filaSubtitulo}>
            <MapPin size={14} color={Colors.textoSuave} />
            <Text style={styles.subtitulo}>{subtitulo}</Text>
          </View>
          <Text style={styles.descripcion}>{item.description}</Text>

          {esNegocio && (
            <View style={styles.datos}>
              <View style={styles.dato}>
                <Clock size={16} color={Colors.primario} />
                <Text style={styles.datoTexto}>{(item as Business).schedule}</Text>
              </View>
              <View style={styles.dato}>
                <Phone size={16} color={Colors.primario} />
                <Text style={styles.datoTexto}>{(item as Business).contact}</Text>
              </View>
            </View>
          )}

          <View style={styles.acciones}>
            <Boton titulo="Cómo llegar" onPress={comoLlegar} />
            <Boton titulo="Subir foto" variante="secundario" onPress={subirFoto} />
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.superpuesto}>
        <Pressable onPress={() => router.back()} style={styles.volver}>
          <ArrowLeft size={20} color={Colors.texto} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  portada: {
    height: 240,
    backgroundColor: Colors.rellenoSuave,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s,
  },
  portadaNota: { ...Type.nota, fontSize: 11, color: Colors.textoSuave },
  cuerpo: { padding: Spacing.l, gap: Spacing.s },
  categoria: { ...Type.etiqueta, color: Colors.acento },
  nombre: { ...Type.titulo, color: Colors.texto },
  filaSubtitulo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subtitulo: { ...Type.nota, color: Colors.textoSuave },
  descripcion: { ...Type.cuerpo, color: Colors.texto, marginTop: Spacing.s },
  datos: {
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.m,
    gap: Spacing.s,
    marginTop: Spacing.s,
  },
  dato: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s },
  datoTexto: { ...Type.cuerpo, fontSize: 15, color: Colors.texto },
  acciones: { gap: Spacing.m, marginTop: Spacing.l },
  superpuesto: { position: 'absolute', top: 0, left: 0 },
  volver: {
    marginLeft: Spacing.m,
    marginTop: Spacing.s,
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Colors.superficie,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
