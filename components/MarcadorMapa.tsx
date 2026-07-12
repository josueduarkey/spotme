import { Check, LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { getDioramaSource } from '../constants/dioramas';
import { Colors, Fonts, Radius } from '../constants/theme';

interface Props {
  Icono?: LucideIcon;
  emoji?: string;
  nombreLugar?: string;
  departamento?: string;
  mapIconUrl?: string | null;
  /** 'lugar' = borde azul océano; 'negocio' = naranja sol */
  tipo: 'lugar' | 'negocio';
  /** Pivote Fase 3: lugar creado por la comunidad (pin = foto, no diorama). */
  comunidad?: boolean;
  /** Solo aplica si comunidad: true al llegar a 3 confirmaciones. */
  verificado?: boolean;
  /** Foto del creador, usada como thumbnail del pin de comunidad. */
  fotoUrl?: string | null;
}

/**
 * Marcador custom: mini "peana" circular, eco de los dioramas.
 * - Oficial: diorama local (por nombre/departamento) → URL remota → ícono.
 * - Comunidad: foto del creador como thumbnail con borde primario delgado;
 *   badge "Nuevo" (acento) mientras no esté verificado, check primario al
 *   llegar a 3 confirmaciones (sección 6.2 del CLAUDE.md).
 */
export function MarcadorMapa({ Icono, emoji, nombreLugar, departamento, mapIconUrl, tipo, comunidad, verificado, fotoUrl }: Props) {
  const borde = tipo === 'lugar' ? Colors.primario : Colors.acento;
  const localDiorama = !comunidad && nombreLugar ? getDioramaSource(nombreLugar, departamento || '') : null;

  return (
    <View style={styles.contenedor}>
      <View style={[styles.peana, { borderColor: borde }, comunidad && styles.peanaComunidad]}>
        {comunidad && fotoUrl ? (
          <Image source={{ uri: fotoUrl }} style={styles.imagen} contentFit="cover" />
        ) : localDiorama ? (
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

      {comunidad && !verificado && (
        <View style={styles.badgeNuevo}>
          <Text style={styles.badgeNuevoTexto}>Nuevo</Text>
        </View>
      )}
      {comunidad && verificado && (
        <View style={styles.badgeCheck}>
          <Check size={10} color={Colors.superficie} strokeWidth={3.5} />
        </View>
      )}
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
  // Comunidad: borde delgado primario (la foto es la protagonista)
  peanaComunidad: { borderWidth: 1.5, borderColor: Colors.primario },
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
  badgeNuevo: {
    position: 'absolute',
    top: -6,
    right: -14,
    backgroundColor: Colors.acento,
    borderRadius: Radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeNuevoTexto: {
    fontFamily: Fonts.cuerpoBold,
    fontSize: 8,
    color: Colors.superficie,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badgeCheck: {
    position: 'absolute',
    top: -4,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primario,
    borderWidth: 1.5,
    borderColor: Colors.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
