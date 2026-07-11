import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius } from '../constants/theme';

interface Props {
  emoji: string;
  /** 'lugar' = peana madera con borde turquesa; 'negocio' = tierra */
  tipo: 'lugar' | 'negocio';
}

/**
 * Marcador custom: mini "peana" circular con emoji, eco de los dioramas.
 * Cuando Cuenta B genere los dioramas (places.map_icon_url), el emoji se
 * sustituye por la imagen manteniendo la misma base.
 */
export function MarcadorMapa({ emoji, tipo }: Props) {
  const borde = tipo === 'lugar' ? Colors.turquesa : Colors.tierra;
  return (
    <View style={styles.contenedor}>
      <View style={[styles.peana, { borderColor: borde }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={[styles.pua, { borderTopColor: borde }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center' },
  peana: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    borderWidth: 2.5,
    backgroundColor: Colors.crema,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 19 },
  pua: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});
