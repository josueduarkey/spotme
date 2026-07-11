import { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Peana, Radius, Spacing, Type } from '../constants/theme';

interface Props {
  titulo: string;
  descripcion: string;
  Icono: LucideIcon;
  seleccionada: boolean;
  onPress: () => void;
}

/** Card grande de opción única (ej. tipo de cuenta), con la peana. */
export function TarjetaSeleccion({ titulo, descripcion, Icono, seleccionada, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, seleccionada && styles.cardActiva, pressed && { opacity: 0.9 }]}>
      <View style={[styles.insignia, seleccionada && { backgroundColor: Colors.primario }]}>
        <Icono size={26} color={seleccionada ? Colors.superficie : Colors.primario} strokeWidth={2.2} />
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
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.m,
  },
  cardActiva: {
    borderColor: Colors.primario,
    borderBottomColor: Colors.primarioOscuro,
  },
  insignia: {
    width: 56,
    height: 56,
    borderRadius: Radius.s,
    backgroundColor: Colors.rellenoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { ...Type.subtitulo, color: Colors.texto },
  descripcion: { ...Type.nota, color: Colors.textoSuave },
  radio: {
    width: 22,
    height: 22,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: Colors.borde,
  },
  radioActivo: { borderColor: Colors.primario, backgroundColor: Colors.primario },
});
