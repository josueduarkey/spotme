import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotivoCapas } from '../components/MotivoCapas';
import { Colors, Spacing, Type } from '../constants/theme';

/** Pantalla 5 — Home turista. Stub: se construye en la Fase 2. */
export default function Home() {
  return (
    <SafeAreaView style={styles.pantalla}>
      <View style={styles.contenido}>
        <MotivoCapas tamano={80} />
        <Text style={styles.titulo}>Home del turista</Text>
        <Text style={styles.nota}>
          Se construye en la Fase 2: Top 5 lugares, eventos próximos y acceso al
          mapa por capas.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.crema },
  contenido: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.m, padding: Spacing.xl },
  titulo: { ...Type.titulo, color: Colors.texto },
  nota: { ...Type.cuerpo, color: Colors.textoSuave, textAlign: 'center' },
});
