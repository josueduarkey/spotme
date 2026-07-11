import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';
import { Colors, Fonts } from '../../constants/theme';

export default function TuristaLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.turquesaOscuro,
        tabBarInactiveTintColor: Colors.textoSuave,
        tabBarLabelStyle: { fontFamily: Fonts.cuerpoSemiBold, fontSize: 12 },
        tabBarStyle: {
          backgroundColor: Colors.blanco,
          borderTopColor: Colors.madera,
          borderTopWidth: 1.5,
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>🗺️</Text>,
        }}
      />
    </Tabs>
  );
}
