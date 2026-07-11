import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Colors, Radius, Spacing, Type } from '../constants/theme';

interface Props {
  etiqueta: string;
  Icono: LucideIcon;
  activa: boolean;
  deshabilitada?: boolean;
  onPress: () => void;
}

/** Chip del selector de capas del mapa (el corazón del digital twin). */
export function ChipCapa({ etiqueta, Icono, activa, deshabilitada, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitada}
      style={[styles.chip, activa && styles.chipActiva, deshabilitada && { opacity: 0.45 }]}>
      <Icono size={14} color={activa ? Colors.textoInvertido : Colors.textoSuave} strokeWidth={2.2} />
      <Text style={[styles.texto, activa && styles.textoActivo]}>{etiqueta}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.superficie,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    paddingHorizontal: Spacing.m,
    paddingVertical: 8,
  },
  chipActiva: { backgroundColor: Colors.tinta, borderColor: Colors.tinta },
  texto: { ...Type.nota, color: Colors.textoSuave },
  textoActivo: { color: Colors.textoInvertido },
});
