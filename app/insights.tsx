import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, TrendingUp, Camera, MapPin, Store, Lightbulb, Map as MapIcon, Users, Moon } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Peana, Radius, Spacing, Type } from '../constants/theme';
import { getTerritorialInsight, TerritorialInsight } from '../lib/queries/insights';

/**
 * Pantalla 17 — Panel de inteligencia territorial.
 * Cruza actividad de turistas (fotos) × lugares de comunidad × negocios por
 * departamento y muestra un insight calculado con datos reales del twin.
 * Es la pantalla que demuestra ante el jurado que el gemelo genera valor.
 */
export default function Insights() {
  const router = useRouter();
  const [data, setData] = useState<TerritorialInsight | null>(null);
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      getTerritorialInsight().then((d) => {
        if (vivo) {
          setData(d);
          setCargando(false);
        }
      });
      return () => {
        vivo = false;
      };
    }, []),
  );

  // Normalizador de barras: proporcional al departamento con más actividad.
  const maxPhotos = Math.max(1, ...(data?.stats ?? []).map((s) => s.photos));

  // Insights clave en lenguaje plano, derivados de las mismas stats vivas.
  const stats = data?.stats ?? [];
  const totalComunidad = stats.reduce((s, d) => s + d.communityPlaces, 0);
  const totalLugares = stats.reduce((s, d) => s + d.communityPlaces + d.officialPlaces, 0);
  const deptosConActividad = stats.filter((d) => d.photos > 0).length;
  const deptosDormidos = stats.filter((d) => d.photos === 0 && d.communityPlaces + d.officialPlaces > 0).length;
  const pctComunidad = totalLugares > 0 ? Math.round((totalComunidad / totalLugares) * 100) : 0;

  const insightsClave = [
    {
      Icono: MapIcon,
      titulo: `${deptosConActividad} de 14 departamentos con turistas activos`,
      detalle: 'Departamentos donde ya se subieron fotos: ahí está pasando el turismo hoy.',
    },
    {
      Icono: Users,
      titulo: `${totalComunidad} lugares nacieron de la comunidad (${pctComunidad}% del mapa)`,
      detalle: 'Destinos que el catálogo oficial no tenía y los propios turistas agregaron.',
    },
    {
      Icono: Moon,
      titulo: `${deptosDormidos} departamentos con lugares pero sin fotos aún`,
      detalle: 'Hay qué visitar, pero nadie lo está documentando: turismo potencial dormido.',
    },
  ];

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <View style={styles.encabezado}>
        <Pressable onPress={() => router.back()} style={styles.botonVolver}>
          <ArrowLeft size={20} color={Colors.texto} />
        </Pressable>
        <View>
          <Text style={styles.etiqueta}>Gemelo Digital · Datos vivos</Text>
          <Text style={styles.titulo}>Inteligencia Territorial</Text>
        </View>
      </View>

      {cargando || !data ? (
        <View style={styles.cargando}>
          <ActivityIndicator size="large" color={Colors.primario} />
          <Text style={styles.cargandoTexto}>Cruzando capas del territorio…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
          {/* Insight principal (oportunidad) */}
          <View style={styles.tarjetaInsight}>
            <View style={styles.insightHeader}>
              <Lightbulb size={18} color={Colors.amarilloSol} strokeWidth={2.2} />
              <Text style={styles.insightEtiqueta}>Oportunidad detectada</Text>
            </View>
            <Text style={styles.insightFrase}>{data.sentence}</Text>
          </View>

          {/* Insight secundario (actividad) */}
          <View style={styles.tarjetaActividad}>
            <TrendingUp size={18} color={Colors.primario} strokeWidth={2.2} />
            <Text style={styles.actividadFrase}>{data.activitySentence}</Text>
          </View>

          {/* Insights clave en lenguaje plano */}
          <Text style={styles.seccionTitulo}>Insights clave</Text>
          <View style={{ gap: Spacing.s }}>
            {insightsClave.map((ins) => (
              <View key={ins.titulo} style={styles.tarjetaClave}>
                <View style={styles.claveIcono}>
                  <ins.Icono size={18} color={Colors.primario} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.claveTitulo}>{ins.titulo}</Text>
                  <Text style={styles.claveDetalle}>{ins.detalle}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Cruce de capas por departamento */}
          <Text style={styles.seccionTitulo}>Detalle por departamento</Text>
          <Text style={styles.explicacionBarras}>
            La barra mide la demanda: cuántas fotos han subido los turistas ahí (más larga = más
            visitas reales). Abajo de cada barra: fotos, lugares creados por la comunidad y negocios
            registrados. Si hay demanda y pocos negocios, aparece la etiqueta "Oportunidad".
          </Text>
          <View style={styles.leyenda}>
            <View style={styles.leyendaItem}>
              <Camera size={12} color={Colors.primario} />
              <Text style={styles.leyendaTexto}>Fotos de turistas</Text>
            </View>
            <View style={styles.leyendaItem}>
              <MapPin size={12} color={Colors.acento} />
              <Text style={styles.leyendaTexto}>Lugares comunidad</Text>
            </View>
            <View style={styles.leyendaItem}>
              <Store size={12} color={Colors.textoSuave} />
              <Text style={styles.leyendaTexto}>Negocios</Text>
            </View>
          </View>

          <View style={styles.listaDeptos}>
            {data.stats.map((s) => {
              // Señal de oportunidad: hay demanda (fotos/lugares) y poca oferta.
              const oportunidad = s.businesses <= 1 && (s.photos > 0 || s.communityPlaces > 0);
              return (
                <View key={s.department} style={styles.filaDepto}>
                  <View style={styles.deptoHeader}>
                    <Text style={styles.deptoNombre} numberOfLines={1}>
                      {s.department}
                    </Text>
                    {oportunidad && (
                      <View style={styles.badgeOportunidad}>
                        <Text style={styles.badgeOportunidadTexto}>Oportunidad</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.barraFondo}>
                    <View
                      style={[styles.barraLlena, { width: `${(s.photos / maxPhotos) * 100}%` }]}
                    />
                  </View>
                  <View style={styles.metricasFila}>
                    <View style={styles.metrica}>
                      <Camera size={12} color={Colors.primario} />
                      <Text style={styles.metricaTexto}>{s.photos}</Text>
                    </View>
                    <View style={styles.metrica}>
                      <MapPin size={12} color={Colors.acento} />
                      <Text style={styles.metricaTexto}>{s.communityPlaces}</Text>
                    </View>
                    <View style={styles.metrica}>
                      <Store size={12} color={s.businesses === 0 ? Colors.rojoAnil : Colors.textoSuave} />
                      <Text
                        style={[styles.metricaTexto, s.businesses === 0 && { color: Colors.rojoAnil }]}>
                        {s.businesses}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.pie}>
            Cada dato viene del comportamiento real de la comunidad en el mapa: fotos subidas, lugares
            creados y negocios registrados. El gemelo no simula — refleja el territorio vivo.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
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
  cargando: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.m },
  cargandoTexto: { ...Type.nota, color: Colors.textoSuave },
  contenido: { padding: Spacing.l, gap: Spacing.l, paddingBottom: Spacing.xl },
  tarjetaInsight: {
    backgroundColor: Colors.tinta,
    borderRadius: Radius.m,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.tintaOscura,
    padding: Spacing.l,
    gap: Spacing.s,
  },
  insightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  insightEtiqueta: { ...Type.etiqueta, fontSize: 10, color: Colors.amarilloSol },
  insightFrase: {
    ...Type.subtitulo,
    fontSize: 19,
    lineHeight: 27,
    color: Colors.superficie,
    fontFamily: Fonts.display,
  },
  tarjetaActividad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.m,
  },
  actividadFrase: { ...Type.cuerpoDestacado, flex: 1, fontSize: 14, color: Colors.texto },
  seccionTitulo: {
    ...Type.subtitulo,
    fontSize: 15,
    color: Colors.texto,
    fontFamily: Fonts.display,
    marginTop: Spacing.s,
  },
  tarjetaClave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.m,
  },
  claveIcono: {
    width: 40,
    height: 40,
    borderRadius: Radius.s,
    backgroundColor: Colors.rellenoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claveTitulo: { ...Type.cuerpoDestacado, fontSize: 14, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
  claveDetalle: { ...Type.nota, fontSize: 12, color: Colors.textoSuave, lineHeight: 16 },
  explicacionBarras: {
    ...Type.nota,
    fontSize: 12,
    color: Colors.textoSuave,
    lineHeight: 17,
    marginTop: -Spacing.s,
  },
  leyenda: { flexDirection: 'row', gap: Spacing.m, marginTop: -Spacing.s },
  leyendaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leyendaTexto: { ...Type.nota, fontSize: 11, color: Colors.textoSuave },
  listaDeptos: { gap: Spacing.s },
  filaDepto: {
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.m,
    gap: Spacing.s,
  },
  deptoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.s },
  deptoNombre: { ...Type.cuerpoDestacado, flex: 1, fontSize: 14, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
  badgeOportunidad: {
    backgroundColor: Colors.acento,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.s,
    paddingVertical: 3,
  },
  badgeOportunidadTexto: {
    ...Type.etiqueta,
    fontSize: 8,
    color: Colors.superficie,
    letterSpacing: 0.6,
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
  metricasFila: { flexDirection: 'row', gap: Spacing.l },
  metrica: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricaTexto: { ...Type.cuerpoDestacado, fontSize: 13, color: Colors.texto },
  pie: {
    ...Type.nota,
    fontSize: 12,
    color: Colors.textoSuave,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
