import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Colors, Peana, Radius, Spacing, Type } from '../constants/theme';

interface Props {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'fantasma';
  cargando?: boolean;
  deshabilitado?: boolean;
  style?: ViewStyle;
}

export function Boton({ titulo, onPress, variante = 'primario', cargando, deshabilitado, style }: Props) {
  const esPrimario = variante === 'primario';
  const esFantasma = variante === 'fantasma';
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado || cargando}
      style={({ pressed }) => [
        styles.base,
        esPrimario && styles.primario,
        variante === 'secundario' && styles.secundario,
        esFantasma && styles.fantasma,
        pressed && { transform: [{ translateY: 2 }], borderBottomWidth: esFantasma ? 0 : 2 },
        (deshabilitado || cargando) && { opacity: 0.6 },
        style,
      ]}>
      {cargando ? (
        <ActivityIndicator color={esPrimario ? Colors.blanco : Colors.turquesaOscuro} />
      ) : (
        <Text
          style={[
            styles.texto,
            { color: esPrimario ? Colors.blanco : esFantasma ? Colors.textoSuave : Colors.turquesaOscuro },
          ]}>
          {titulo}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: Radius.m,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.l,
  },
  // La sombra inferior sólida es la "peana" del sistema: los botones se
  // asientan sobre una base, como los dioramas del mapa.
  primario: {
    backgroundColor: Colors.turquesa,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.turquesaOscuro,
  },
  secundario: {
    backgroundColor: Colors.blanco,
    borderWidth: 1.5,
    borderColor: Colors.madera,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.maderaOscura,
  },
  fantasma: { backgroundColor: 'transparent', minHeight: 44 },
  texto: { ...Type.cuerpoDestacado, fontSize: 17 },
});
