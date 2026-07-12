import { Redirect, Tabs } from 'expo-router';
import { FileText, LayoutDashboard, Users } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { esAdmin } from '../../constants/admins';
import { Colors, Fonts, Spacing, Type } from '../../constants/theme';
import { getCurrentProfile } from '../../lib/queries/auth';

/**
 * Área de administración — entidad separada del turista/negocio.
 * El gate vive en el layout: si el correo no está en la allowlist,
 * se redirige fuera; ninguna pantalla hija se monta.
 */
export default function AdminLayout() {
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'denegado'>('cargando');

  useEffect(() => {
    getCurrentProfile().then((p) => setEstado(esAdmin(p?.email) ? 'ok' : 'denegado'));
  }, []);

  if (estado === 'cargando') {
    return (
      <View style={styles.cargando}>
        <ActivityIndicator size="large" color={Colors.primario} />
        <Text style={styles.cargandoTexto}>Verificando acceso de administrador…</Text>
      </View>
    );
  }

  if (estado === 'denegado') return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.acento,
        tabBarInactiveTintColor: Colors.textoSuave,
        tabBarLabelStyle: { fontFamily: Fonts.cuerpoSemiBold, fontSize: 12 },
        tabBarStyle: {
          backgroundColor: Colors.superficie,
          borderTopColor: Colors.borde,
          borderTopWidth: 1.5,
        },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="reportes"
        options={{
          title: 'Reportes',
          tabBarIcon: ({ color }) => <FileText size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="usuarios"
        options={{
          title: 'Usuarios',
          tabBarIcon: ({ color }) => <Users size={22} color={color} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  cargando: {
    flex: 1,
    backgroundColor: Colors.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.m,
  },
  cargandoTexto: { ...Type.nota, color: Colors.textoSuave },
});
