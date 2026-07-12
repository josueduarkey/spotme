import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, BadgeCheck, Landmark, ShieldCheck, Users } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ICONO_CATEGORIA } from '../components/iconos';
import { esAdmin } from '../constants/admins';
import { CATEGORIAS, Categoria, esComunidad, estaVerificado, Place } from '../constants/mock';
import { Colors, Fonts, Peana, Radius, Spacing, Type } from '../constants/theme';
import { getCurrentProfile } from '../lib/queries/auth';
import { getPlaces } from '../lib/queries/places';

interface StatCategoria {
  categoria: Categoria;
  total: number;
  oficiales: number;
  comunidad: number;
  verificados: number;
}

/**
 * Panel de administración — solo correos en constants/admins.ts.
 * Muestra los datos de las categorías de los lugares registrados:
 * cuántos hay por categoría, cuántos son oficiales vs. comunidad y
 * cuántos ya están verificados.
 */
export default function Admin() {
  const router = useRouter();
  const [autorizado, setAutorizado] = useState<boolean | null>(null);
  const [stats, setStats] = useState<StatCategoria[]>([]);
  const [totalLugares, setTotalLugares] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      async function cargar() {
        const perfil = await getCurrentProfile();
        if (!vivo) return;
        if (!esAdmin(perfil?.email)) {
          setAutorizado(false);
          return;
        }
        setAutorizado(true);

        const lugares = await getPlaces();
        if (!vivo) return;
        setTotalLugares(lugares.length);
        setStats(agruparPorCategoria(lugares));
      }
      cargar();
      return () => {
        vivo = false;
      };
    }, []),
  );

  function agruparPorCategoria(lugares: Place[]): StatCategoria[] {
    const mapa = new Map<Categoria, StatCategoria>();
    for (const cat of Object.keys(CATEGORIAS) as Categoria[]) {
      mapa.set(cat, { categoria: cat, total: 0, oficiales: 0, comunidad: 0, verificados: 0 });
    }
    for (const l of lugares) {
      const s = mapa.get(l.category);
      if (!s) continue; // categoría desconocida: no rompe el panel
      s.total += 1;
      if (esComunidad(l)) s.comunidad += 1;
      else s.oficiales += 1;
      if (estaVerificado(l)) s.verificados += 1;
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  }

  // Cargando (verificando identidad)
  if (autorizado === null) {
    return (
      <SafeAreaView style={styles.pantallaCentrada}>
        <ActivityIndicator size="large" color={Colors.primario} />
        <Text style={styles.notaCentrada}>Verificando acceso…</Text>
      </SafeAreaView>
    );
  }

  // Acceso restringido
  if (!autorizado) {
    return (
      <SafeAreaView style={styles.pantallaCentrada}>
        <ShieldCheck size={44} color={Colors.textoSuave} strokeWidth={1.6} />
        <Text style={styles.restringidoTitulo}>Acceso restringido</Text>
        <Text style={styles.notaCentrada}>
          Este panel es solo para administradores de Spotmi.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.botonVolverCentrado}>
          <ArrowLeft size={16} color={Colors.primario} />
          <Text style={styles.botonVolverTexto}>Volver</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const maxTotal = Math.max(1, ...stats.map((s) => s.total));

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <View style={styles.encabezado}>
        <Pressable onPress={() => router.back()} style={styles.botonVolver}>
          <ArrowLeft size={20} color={Colors.texto} />
        </Pressable>
        <View>
          <Text style={styles.etiqueta}>Panel de administración</Text>
          <Text style={styles.titulo}>Lugares por categoría</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        {/* Resumen general */}
        <View style={styles.tarjetaResumen}>
          <Landmark size={22} color={Colors.superficie} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <Text style={styles.resumenValor}>{totalLugares} lugares registrados</Text>
            <Text style={styles.resumenNota}>
              en el gemelo digital, entre oficiales y comunidad
            </Text>
          </View>
        </View>

        {/* Desglose por categoría */}
        {stats.map((s) => {
          const Icono = ICONO_CATEGORIA[s.categoria];
          return (
            <View key={s.categoria} style={styles.tarjetaCategoria}>
              <View style={styles.filaCategoria}>
                <View style={styles.iconoCategoria}>
                  <Icono size={18} color={Colors.primario} strokeWidth={2} />
                </View>
                <Text style={styles.nombreCategoria}>{CATEGORIAS[s.categoria].etiqueta}</Text>
                <Text style={styles.totalCategoria}>{s.total}</Text>
              </View>
              <View style={styles.barraFondo}>
                <View style={[styles.barraLlena, { width: `${(s.total / maxTotal) * 100}%` }]} />
              </View>
              <View style={styles.filaDetalle}>
                <View style={styles.detalle}>
                  <Landmark size={12} color={Colors.primario} />
                  <Text style={styles.detalleTexto}>{s.oficiales} oficiales</Text>
                </View>
                <View style={styles.detalle}>
                  <Users size={12} color={Colors.acento} />
                  <Text style={styles.detalleTexto}>{s.comunidad} comunidad</Text>
                </View>
                <View style={styles.detalle}>
                  <BadgeCheck size={12} color={Colors.exito} />
                  <Text style={styles.detalleTexto}>{s.verificados} verificados</Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  pantallaCentrada: {
    flex: 1,
    backgroundColor: Colors.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.m,
    padding: Spacing.l,
  },
  notaCentrada: { ...Type.nota, color: Colors.textoSuave, textAlign: 'center' },
  restringidoTitulo: { ...Type.subtitulo, color: Colors.texto },
  botonVolverCentrado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.m,
  },
  botonVolverTexto: { ...Type.cuerpoDestacado, fontSize: 14, color: Colors.primario },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.borde,
    backgroundColor: Colors.superficie,
  },
  botonVolver: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.borde,
  },
  etiqueta: { ...Type.etiqueta, fontSize: 10, color: Colors.acento },
  titulo: { ...Type.subtitulo, fontSize: 18, color: Colors.texto, fontFamily: Fonts.display },
  contenido: { padding: Spacing.l, gap: Spacing.m, paddingBottom: Spacing.xl },
  tarjetaResumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    backgroundColor: Colors.tinta,
    borderRadius: Radius.m,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.tintaOscura,
    padding: Spacing.m,
  },
  resumenValor: {
    fontSize: 18,
    fontFamily: Fonts.displayBold,
    color: Colors.superficie,
  },
  resumenNota: { ...Type.nota, fontSize: 12, color: Colors.azulLago },
  tarjetaCategoria: {
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.m,
    gap: Spacing.s,
  },
  filaCategoria: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s },
  iconoCategoria: {
    width: 34,
    height: 34,
    borderRadius: Radius.s,
    backgroundColor: Colors.rellenoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombreCategoria: {
    ...Type.cuerpoDestacado,
    flex: 1,
    fontSize: 15,
    color: Colors.texto,
    fontFamily: Fonts.cuerpoBold,
  },
  totalCategoria: {
    fontSize: 20,
    fontFamily: Fonts.displayBold,
    color: Colors.primario,
  },
  barraFondo: {
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.rellenoSuave,
    overflow: 'hidden',
  },
  barraLlena: {
    height: '100%',
    borderRadius: Radius.pill,
    backgroundColor: Colors.primario,
  },
  filaDetalle: { flexDirection: 'row', gap: Spacing.m, flexWrap: 'wrap' },
  detalle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detalleTexto: { ...Type.nota, fontSize: 12, color: Colors.textoSuave },
});
