import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts } from '../constants/theme';

interface Props {
  tamano?: number;
  claro?: boolean; // sobre fondo oscuro
}

/** Wordmark "spotmi" con punto-pin naranja sol sobre la i. */
export function Wordmark({ tamano = 44, claro = false }: Props) {
  const color = claro ? Colors.textoInvertido : Colors.tinta;
  return (
    <View style={styles.fila}>
      <Text style={[styles.texto, { fontSize: tamano, color }]}>spotm</Text>
      <View style={styles.i}>
        <View style={[styles.punto, { width: tamano * 0.18, height: tamano * 0.18 }]} />
        <Text style={[styles.texto, { fontSize: tamano, color }]}>ı</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-end' },
  texto: { fontFamily: Fonts.displayBold, includeFontPadding: false },
  i: { alignItems: 'center' },
  punto: {
    backgroundColor: Colors.naranjaSol,
    borderRadius: 999,
    marginBottom: 2,
  },
});
