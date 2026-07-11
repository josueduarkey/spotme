import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Colors, Radius, Spacing, Type } from '../constants/theme';

interface Props {
  etiqueta: string;
  emoji: string;
  activa: boolean;
  deshabilitada?: boolean;
  onPress: () => void;
}

/** Chip del selector de capas del mapa (el corazón del digital twin). */
export function ChipCapa({ etiqueta, emoji, activa, deshabilitada, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitada}
      style={[styles.chip, activa && styles.chipActiva, deshabilitada && { opacity: 0.45 }]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.texto, activa && styles.textoActivo]}>{etiqueta}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.blanco,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.madera,
    paddingHorizontal: Spacing.m,
    paddingVertical: 8,
  },
  chipActiva: { backgroundColor: Colors.selva, borderColor: Colors.selva },
  emoji: { fontSize: 14 },
  texto: { ...Type.nota, color: Colors.textoSuave },
  textoActivo: { color: Colors.textoInvertido },
});
