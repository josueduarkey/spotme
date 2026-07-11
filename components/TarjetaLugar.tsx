import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORIAS, Place } from '../constants/mock';
import { Colors, Peana, Radius, Spacing, Type } from '../constants/theme';

interface Props {
  lugar: Place;
  onPress: () => void;
}

/** Card horizontal para el Top 5 del Home, con peana de madera. */
export function TarjetaLugar({ lugar, onPress }: Props) {
  const cat = CATEGORIAS[lugar.category];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.portada}>
        <Text style={styles.portadaEmoji}>{cat.emoji}</Text>
      </View>
      <View style={styles.cuerpo}>
        <Text style={styles.categoria}>{cat.etiqueta}</Text>
        <Text style={styles.nombre} numberOfLines={2}>
          {lugar.name}
        </Text>
        <Text style={styles.departamento}>📍 {lugar.department}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 200,
    backgroundColor: Colors.blanco,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.madera,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.maderaOscura,
    overflow: 'hidden',
  },
  portada: {
    height: 96,
    backgroundColor: Colors.madera,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portadaEmoji: { fontSize: 40 },
  cuerpo: { padding: Spacing.m, gap: 4 },
  categoria: { ...Type.etiqueta, color: Colors.tierra },
  nombre: { ...Type.subtitulo, fontSize: 17, lineHeight: 22, color: Colors.texto },
  departamento: { ...Type.nota, color: Colors.textoSuave },
});
