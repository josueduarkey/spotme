import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../constants/theme';

interface Props {
  tamano?: number;
}

/**
 * Motivo visual del digital twin: tres capas de mapa apiladas en isométrico
 * (rombos), en los colores de la paleta. Se usa en el splash y como sello.
 */
export function MotivoCapas({ tamano = 96 }: Props) {
  const capa = {
    width: tamano,
    height: tamano * 0.52,
    borderRadius: tamano * 0.12,
    transform: [{ rotateX: '55deg' }, { rotateZ: '45deg' }],
  } as const;
  const paso = tamano * 0.24;
  return (
    <View style={{ width: tamano * 1.3, height: tamano * 0.9 + paso * 2, alignItems: 'center', justifyContent: 'center' }}>
      <View style={[styles.capa, capa, { backgroundColor: Colors.amarilloSol, top: paso * 2 }]} />
      <View style={[styles.capa, capa, { backgroundColor: Colors.naranjaSol, top: paso }]} />
      <View style={[styles.capa, capa, { backgroundColor: Colors.azulLago, top: 0 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  capa: { position: 'absolute' },
});
