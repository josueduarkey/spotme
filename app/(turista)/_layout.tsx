import { Tabs } from 'expo-router';
import { House, Map as MapIcon, User } from 'lucide-react-native';
import React from 'react';
import { Colors, Fonts } from '../../constants/theme';

export default function TuristaLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primario,
        tabBarInactiveTintColor: Colors.textoSuave,
        tabBarLabelStyle: { fontFamily: Fonts.cuerpoSemiBold, fontSize: 12 },
        tabBarStyle: {
          backgroundColor: Colors.superficie,
          borderTopColor: Colors.borde,
          borderTopWidth: 1.5,
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <House size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color }) => <MapIcon size={22} color={color} strokeWidth={2.2} />,
        }}
      />
      {/* El gemelo 3D ya no es tab: vive dentro del tab Mapa (switch 2D/3D) */}
      <Tabs.Screen name="gemelo-3d" options={{ href: null }} />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <User size={22} color={color} strokeWidth={2.2} />,
        }}
      />
    </Tabs>
  );
}
