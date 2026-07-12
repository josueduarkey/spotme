import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../components/Boton';
import { MotivoCapas } from '../components/MotivoCapas';
import { Wordmark } from '../components/Wordmark';
import { esAdmin } from '../constants/admins';
import { Colors, Spacing, Type } from '../constants/theme';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

/** Pantalla 1 — Splash / bienvenida. */
export default function Splash() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function verificarSesion() {
      if (!isSupabaseConfigured) {
        setCargando(false);
        return;
      }
      try {
        const supabase = getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Los administradores van directo a su panel (entidad aparte).
          if (esAdmin(session.user.email)) {
            router.replace('/dashboard');
            return;
          }
          // Consultar el perfil de base de datos para saber adónde enrutar
          const { data: profile } = await supabase
            .from('profiles')
            .select('account_type')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profile?.account_type) {
            router.replace(profile.account_type === 'turista' ? '/home' : '/business-dashboard');
            return;
          }
        }
      } catch (e) {
        console.warn('Error en auto-login:', e);
      }
      setCargando(false);
    }

    verificarSesion();
  }, []);

  if (cargando) {
    return (
      <SafeAreaView style={[styles.pantalla, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.amarilloSol} />
      </SafeAreaView>
    );
  }

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
