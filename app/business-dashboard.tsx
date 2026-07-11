import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotivoCapas } from '../components/MotivoCapas';
import { Colors, Spacing, Type } from '../constants/theme';

/** Pantalla 15 — Dashboard de negocio. Stub: se construye en la Fase 4. */
export default function BusinessDashboard() {
  return (
    <SafeAreaView style={styles.pantalla}>
      <View style={styles.contenido}>
        <MotivoCapas tamano={80} />
        <Text style={styles.titulo}>Dashboard de negocio</Text>
        <Text style={styles.nota}>
          Se construye en la Fase 4: onboarding del negocio, ubicación en el mapa
          y métricas simples.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  contenido: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.m, padding: Spacing.xl },
  titulo: { ...Type.titulo, color: Colors.texto },
  nota: { ...Type.cuerpo, color: Colors.textoSuave, textAlign: 'center' },
});
