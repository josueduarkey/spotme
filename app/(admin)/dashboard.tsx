import { useFocusEffect, useRouter } from 'expo-router';
import { Camera, Landmark, Layers, LogOut, ShieldCheck, Store, Users } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarraApilada, GraficaBarras, GraficaLinea } from '../../components/graficas';
import { CATEGORIAS } from '../../constants/mock';
import { Colors, Fonts, Peana, Radius, Spacing, Type } from '../../constants/theme';
import { AdminMetrics, getAdminMetrics } from '../../lib/queries/admin';
import { signOut } from '../../lib/queries/auth';

/** Dashboard admin — métricas del twin con gráficas (paleta validada). */
export default function AdminDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [metricas, setMetricas] = useState<AdminMetrics | null>(null);

  // Ancho útil dentro de una card: pantalla - padding contenedor - padding card
  const anchoGrafica = width - Spacing.l * 2 - Spacing.m * 2;

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      getAdminMetrics().then((m) => vivo && setMetricas(m));
      return () => {
        vivo = false;
      };
    }, []),
  );

  async function salir() {
    await signOut();
    router.replace('/auth');
  }

  if (!metricas) {
    return (
      <SafeAreaView style={styles.pantallaCargando}>
        <ActivityIndicator size="large" color={Colors.primario} />
        <Text style={styles.cargandoTexto}>Calculando métricas del twin…</Text>
      </SafeAreaView>
    );
  }

  const tiles = [
    { Icono: Users, etiqueta: 'Usuarios', valor: metricas.totalUsuarios, color: Colors.primario },
    { Icono: Landmark, etiqueta: 'Lugares', valor: metricas.totalLugares, color: Colors.acento },
    { Icono: Camera, etiqueta: 'Fotos', valor: metricas.totalFotos, color: Colors.primario },
    { Icono: Store, etiqueta: 'Negocios', valor: metricas.totalNegocios, color: Colors.acento },
  ];

  const datosCategorias = metricas.lugaresPorCategoria.map((c) => ({
    label: CATEGORIAS[c.categoria].etiqueta,
    value: c.total,
  }));

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <View style={styles.encabezado}>
        <View style={styles.tituloFila}>
          <ShieldCheck size={20} color={Colors.acento} strokeWidth={2.4} />
          <View style={{ flex: 1 }}>
            <Text style={styles.etiqueta}>Spotmi · Administración</Text>
            <Text style={styles.titulo}>Dashboard</Text>
          </View>
          <Pressable onPress={salir} style={styles.botonSalir}>
            <LogOut size={18} color={Colors.rojoAnil} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        {/* Tiles de métricas */}
        <View style={styles.grid}>
          {tiles.map((t) => (
            <View key={t.etiqueta} style={styles.tile}>
              <t.Icono size={18} color={t.color} strokeWidth={2.2} />
              <Text style={styles.tileValor}>{t.valor}</Text>
              <Text style={styles.tileEtiqueta}>{t.etiqueta}</Text>
            </View>
          ))}
        </View>

        {/* Gráfica 1 — actividad de la semana */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Fotos subidas · últimos 7 días</Text>
          <GraficaLinea
            datos={metricas.fotosPorDia.map((d) => ({ label: d.label, value: d.count }))}
            width={anchoGrafica}
          />
        </View>

        {/* Gráfica 2 — lugares por categoría */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Lugares por categoría</Text>
          <GraficaBarras datos={datosCategorias} width={anchoGrafica} />
        </View>

        {/* Gráfica 3 — composición del mapa */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Origen del mapa</Text>
          <BarraApilada
            width={anchoGrafica}
            segmentos={[
              { label: 'Oficiales', value: metricas.lugaresOficiales, color: Colors.primario },
              { label: 'Comunidad', value: metricas.lugaresComunidad, color: Colors.acento },
            ]}
          />
          <Text style={styles.cardNota}>
            {metricas.lugaresVerificados} de {metricas.totalLugares} lugares están verificados.
          </Text>
        </View>

        {/* Composición de usuarios */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Tipos de cuenta</Text>
          <BarraApilada
            width={anchoGrafica}
            segmentos={[
              { label: 'Turistas', value: metricas.usuariosTuristas, color: Colors.primario },
              { label: 'Negocios', value: metricas.usuariosNegocios, color: Colors.acento },
            ]}
          />
        </View>

        {/* Inteligencia territorial completa (pantalla 17) */}
        <Pressable onPress={() => router.push('/insights')} style={styles.cardEnlace}>
          <Layers size={18} color={Colors.primario} strokeWidth={2.2} />
          <Text style={styles.cardEnlaceTexto}>Ver inteligencia territorial por departamento</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  pantallaCargando: {
    flex: 1,
    backgroundColor: Colors.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.m,
  },
  cargandoTexto: { ...Type.nota, color: Colors.textoSuave },
  encabezado: {
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.borde,
    backgroundColor: Colors.superficie,
  },
  tituloFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s },
  etiqueta: { ...Type.etiqueta, fontSize: 10, color: Colors.acento },
  titulo: { ...Type.subtitulo, fontSize: 20, color: Colors.texto, fontFamily: Fonts.display },
  botonSalir: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: Colors.fondo,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contenido: { padding: Spacing.l, gap: Spacing.m, paddingBottom: Spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.s },
  tile: {
    flexGrow: 1,
    flexBasis: '46%',
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.m,
    gap: 2,
  },
  tileValor: { fontSize: 26, fontFamily: Fonts.displayBold, color: Colors.texto },
  tileEtiqueta: { ...Type.etiqueta, fontSize: 9, color: Colors.textoSuave },
  card: {
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.m,
    gap: Spacing.m,
  },
  cardTitulo: { ...Type.cuerpoDestacado, fontSize: 14, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
  cardNota: { ...Type.nota, fontSize: 12, color: Colors.textoSuave },
  cardEnlace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s,
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.m,
  },
  cardEnlaceTexto: { ...Type.cuerpoDestacado, fontSize: 13, color: Colors.primario },
});
