import { useRouter } from 'expo-router';
import { Backpack, Store } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../components/Boton';
import { TarjetaSeleccion } from '../components/TarjetaSeleccion';
import { AccountType, MOCK_PROFILE } from '../constants/mock';
import { Colors, Spacing, Type } from '../constants/theme';
import { setAccountType } from '../lib/queries/auth';

/** Pantalla 3 — Selección de tipo de cuenta. */
export default function SeleccionCuenta() {
  const router = useRouter();
  const [tipo, setTipo] = useState<AccountType | null>(null);
  const [cargando, setCargando] = useState(false);

  async function continuar() {
    if (!tipo) return;
    setCargando(true);
    await setAccountType(MOCK_PROFILE.id, tipo);
    setCargando(false);
    router.replace(tipo === 'turista' ? '/home' : '/business-dashboard');
  }

  return (
    <SafeAreaView style={styles.pantalla}>
      <View style={styles.contenido}>
        <View style={{ gap: Spacing.s }}>
          <Text style={styles.etiqueta}>Un último paso</Text>
          <Text style={styles.titulo}>¿Cómo vas a usar Spotmi?</Text>
        </View>

        <View style={{ gap: Spacing.m }}>
          <TarjetaSeleccion
            Icono={Backpack}
            titulo="Soy turista"
            descripcion="Descubre lugares, sube fotos, planifica rutas y gana recompensas."
            seleccionada={tipo === 'turista'}
            onPress={() => setTipo('turista')}
          />
          <TarjetaSeleccion
            Icono={Store}
            titulo="Tengo un negocio"
            descripcion="Pon tu local en el mapa y deja que los turistas te descubran."
            seleccionada={tipo === 'negocio'}
            onPress={() => setTipo('negocio')}
          />
        </View>

        <View style={{ flex: 1 }} />
        <Boton titulo="Continuar" onPress={continuar} deshabilitado={!tipo} cargando={cargando} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  contenido: { flex: 1, padding: Spacing.l, gap: Spacing.xl },
  etiqueta: { ...Type.etiqueta, color: Colors.acento },
  titulo: { ...Type.titulo, color: Colors.texto },
});
