import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Peana, Radius, Spacing, Type } from '../constants/theme';

interface Props {
  titulo: string;
  descripcion: string;
  emoji: string;
  seleccionada: boolean;
  onPress: () => void;
}

/** Card grande de opción única (ej. tipo de cuenta), con la peana de madera. */
export function TarjetaSeleccion({ titulo, descripcion, emoji, seleccionada, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, seleccionada && styles.cardActiva, pressed && { opacity: 0.9 }]}>
      <View style={[styles.insignia, seleccionada && { backgroundColor: Colors.turquesa }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.descripcion}>{descripcion}</Text>
      </View>
      <View style={[styles.radio, seleccionada && styles.radioActivo]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    backgroundColor: Colors.blanco,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.madera,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.maderaOscura,
    padding: Spacing.m,
  },
  cardActiva: {
    borderColor: Colors.turquesa,
    borderBottomColor: Colors.turquesaOscuro,
  },
  insignia: {
    width: 56,
    height: 56,
    borderRadius: Radius.s,
    backgroundColor: Colors.madera,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 28 },
  titulo: { ...Type.subtitulo, color: Colors.texto },
  descripcion: { ...Type.nota, color: Colors.textoSuave },
  radio: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: Colors.madera,
  },
  radioActivo: { borderColor: Colors.turquesa, backgroundColor: Colors.turquesa },
});
