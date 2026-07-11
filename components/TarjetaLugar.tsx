import { MapPin } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORIAS, Place } from '../constants/mock';
import { Colors, Peana, Radius, Spacing, Type } from '../constants/theme';
import { ICONO_CATEGORIA } from './iconos';

interface Props {
  lugar: Place;
  onPress: () => void;
}

/** Card horizontal para el Top 5 del Home, con peana. */
export function TarjetaLugar({ lugar, onPress }: Props) {
  const Icono = ICONO_CATEGORIA[lugar.category];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.portada}>
        <Icono size={40} color={Colors.primario} strokeWidth={1.8} />
      </View>
      <View style={styles.cuerpo}>
        <Text style={styles.categoria}>{CATEGORIAS[lugar.category].etiqueta}</Text>
        <Text style={styles.nombre} numberOfLines={2}>
          {lugar.name}
        </Text>
        <View style={styles.fila}>
          <MapPin size={13} color={Colors.textoSuave} />
          <Text style={styles.departamento}>{lugar.department}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    overflow: 'hidden',
  },
  portada: {
    height: 96,
    backgroundColor: Colors.rellenoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuerpo: { padding: Spacing.m, gap: 4 },
  categoria: { ...Type.etiqueta, color: Colors.acento },
  nombre: { ...Type.subtitulo, fontSize: 17, lineHeight: 22, color: Colors.texto },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  departamento: { ...Type.nota, color: Colors.textoSuave },
});
