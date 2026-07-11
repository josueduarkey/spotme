import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../components/Boton';
import { MotivoCapas } from '../components/MotivoCapas';
import { Wordmark } from '../components/Wordmark';
import { Colors, Spacing, Type } from '../constants/theme';

/** Pantalla 1 — Splash / bienvenida. */
export default function Splash() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.pantalla}>
      <View style={styles.centro}>
        <Animated.View entering={FadeInDown.duration(700)}>
          <MotivoCapas tamano={110} />
        </Animated.View>
        <Animated.View entering={FadeInUp.duration(700).delay(250)} style={styles.marca}>
          <Wordmark tamano={52} claro />
          <Text style={styles.lema}>El Salvador, capa por capa</Text>
        </Animated.View>
        <Animated.Text entering={FadeInUp.duration(700).delay(500)} style={styles.descripcion}>
          Un mapa vivo del país: lugares, negocios locales y la huella real de
          quienes lo recorren.
        </Animated.Text>
      </View>
      <Animated.View entering={FadeInUp.duration(700).delay(700)} style={styles.pie}>
        <Boton titulo="Comenzar" onPress={() => router.push('/auth')} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.tinta },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xl, paddingHorizontal: Spacing.xl },
  marca: { alignItems: 'center', gap: Spacing.s },
  lema: { ...Type.nota, fontSize: 15, color: Colors.amarilloSol, letterSpacing: 0.4 },
  descripcion: {
    ...Type.cuerpo,
    color: Colors.textoInvertido,
    textAlign: 'center',
    opacity: 0.85,
  },
  pie: { paddingHorizontal: Spacing.l, paddingBottom: Spacing.l },
});
