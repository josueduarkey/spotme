import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Colors, Radius, Spacing, Type } from '../constants/theme';

interface Props extends TextInputProps {
  etiqueta: string;
}

export function Campo({ etiqueta, ...inputProps }: Props) {
  const [enfocado, setEnfocado] = useState(false);
  return (
    <View style={styles.contenedor}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>
      <TextInput
        placeholderTextColor={Colors.textoSuave}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        style={[styles.input, enfocado && styles.inputEnfocado]}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: Spacing.s },
  etiqueta: { ...Type.etiqueta, color: Colors.textoSuave },
  input: {
    ...Type.cuerpo,
    backgroundColor: Colors.blanco,
    borderWidth: 1.5,
    borderColor: Colors.madera,
    borderRadius: Radius.s,
    paddingHorizontal: Spacing.m,
    paddingVertical: 14,
    color: Colors.texto,
  },
  inputEnfocado: { borderColor: Colors.turquesa },
});
