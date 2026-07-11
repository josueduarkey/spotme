import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { getDioramaSource } from '../constants/dioramas';
import { Colors, Radius } from '../constants/theme';

interface Props {
  Icono?: LucideIcon;
  emoji?: string;
  nombreLugar?: string;
  departamento?: string;
  mapIconUrl?: string | null;
  /** 'lugar' = borde azul océano; 'negocio' = naranja sol */
  tipo: 'lugar' | 'negocio';
}

/**
 * Marcador custom: mini "peana" circular con ícono, eco de los dioramas.
 * Resuelve primero el diorama localmente por nombre de lugar/departamento;
 * si no, usa el enlace remoto o el ícono/emoji de respaldo.
 */
export function MarcadorMapa({ Icono, emoji, nombreLugar, departamento, mapIconUrl, tipo }: Props) {
  const borde = tipo === 'lugar' ? Colors.primario : Colors.acento;
  const localDiorama = nombreLugar ? getDioramaSource(nombreLugar, departamento || '') : null;

  return (
    <View style={styles.contenedor}>
      <View style={[styles.peana, { borderColor: borde }]}>
        {localDiorama ? (
          <Image source={localDiorama} style={styles.imagen} contentFit="contain" />
        ) : mapIconUrl ? (
          <Image source={{ uri: mapIconUrl }} style={styles.imagen} contentFit="contain" />
        ) : Icono ? (
          <Icono size={18} color={borde} strokeWidth={2.4} />
        ) : emoji ? (
          <Text style={styles.emoji}>{emoji}</Text>
        ) : null}
      </View>
      <View style={[styles.pua, { borderTopColor: borde }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { alignItems: 'center' },
  peana: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    borderWidth: 2.5,
    backgroundColor: Colors.superficie,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagen: {
    width: '100%',
    height: '100%',
  },
  emoji: {
    fontSize: 18,
  },
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
