import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { Award, CalendarDays, Camera, Crown, MapPin, Trophy } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Peana, Radius, Spacing, Type } from '../../constants/theme';
import { getLeaderboards, LeaderEntry, Leaderboards, MetricaRanking } from '../../lib/queries/leaderboard';

/** Cuántas filas se muestran por categoría (una sola página, todo visible). */
const TOP_VISIBLE = 5;

const SECCIONES: { id: MetricaRanking; titulo: string; Icono: typeof Trophy; unidad: string; nota: string }[] = [
  { id: 'puntos', titulo: 'Más puntos', Icono: Trophy, unidad: 'pts', nota: 'Fotos +25 · lugares +50 · eventos +40 · retos' },
  { id: 'lugares', titulo: 'Creadores de lugares', Icono: MapPin, unidad: '', nota: 'Lugares nuevos puestos en el mapa' },
  { id: 'eventos', titulo: 'Publicadores de eventos', Icono: CalendarDays, unidad: '', nota: 'Eventos publicados para la comunidad' },
  { id: 'visitas', titulo: 'Exploradores', Icono: Camera, unidad: '', nota: 'Lugares distintos documentados con fotos' },
];

const COLORES_PODIO = ['#C9A227', '#9AA5B1', '#B87346']; // oro, plata, bronce

function Avatar({ entry, tamano }: { entry: LeaderEntry; tamano: number }) {
  if (entry.avatarUrl) {
    return (
      <Image
        source={{ uri: entry.avatarUrl }}
        style={{ width: tamano, height: tamano, borderRadius: tamano / 2 }}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={{
        width: tamano,
        height: tamano,
        borderRadius: tamano / 2,
        backgroundColor: Colors.primario,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={{ fontSize: tamano * 0.42, fontFamily: Fonts.displayBold, color: Colors.superficie }}>
        {entry.name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

/**
 * Tab Ranking — las 4 categorías en UNA sola página (con pocos usuarios,
 * separarlas en tabs dejaba cada vista vacía). Cada card muestra su top 5;
 * el 1er lugar lleva corona y la fila propia va resaltada.
 */
export default function Ranking() {
  const [datos, setDatos] = useState<Leaderboards | null>(null);

  useFocusEffect(
    useCallback(() => {
      getLeaderboards().then(setDatos);
    }, []),
  );

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <View style={styles.encabezado}>
        <Award size={20} color={Colors.amarilloSol} strokeWidth={2.2} />
        <View>
          <Text style={styles.etiqueta}>Comunidad Spotmi</Text>
          <Text style={styles.titulo}>Ranking de exploradores</Text>
        </View>
      </View>

      {!datos ? (
        <View style={styles.cargando}>
          <ActivityIndicator size="large" color={Colors.primario} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
          {SECCIONES.map((s) => {
            const filas = datos[s.id].slice(0, TOP_VISIBLE);
            return (
              <View key={s.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcono}>
                    <s.Icono size={16} color={Colors.primario} strokeWidth={2.2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitulo}>{s.titulo}</Text>
                    <Text style={styles.cardNota}>{s.nota}</Text>
                  </View>
                </View>

                {filas.length === 0 ? (
                  <Text style={styles.vacio}>
                    Nadie puntea aquí todavía — ¡sé quien estrene esta categoría!
                  </Text>
                ) : (
                  <View style={{ gap: 6 }}>
                    {filas.map((e) => (
                      <View key={e.userId} style={[styles.fila, e.esYo && styles.filaYo]}>
                        {e.posicion === 1 ? (
                          <Crown
                            size={16}
                            color={COLORES_PODIO[0]}
                            fill={COLORES_PODIO[0]}
                            strokeWidth={2}
                            style={styles.posicionIcono}
                          />
                        ) : (
                          <Text
                            style={[
                              styles.posicion,
                              e.posicion <= 3 && { color: COLORES_PODIO[e.posicion - 1] },
                            ]}>
                            {e.posicion}
                          </Text>
                        )}
                        <Avatar entry={e} tamano={30} />
                        <Text style={styles.filaNombre} numberOfLines={1}>
                          {e.name}
                          {e.esYo ? ' (tú)' : ''}
                        </Text>
                        <Text style={styles.filaValor}>
                          {e.valor}
                          {s.unidad ? ` ${s.unidad}` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          <Text style={styles.pie}>
            El ranking se calcula con la actividad real del twin: cada lugar, evento o foto que
            publicas te sube en la tabla.
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
    gap: Spacing.s,
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
  },
  etiqueta: { ...Type.etiqueta, fontSize: 10, color: Colors.acento },
  titulo: { ...Type.subtitulo, fontSize: 18, color: Colors.texto, fontFamily: Fonts.display },
  cargando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contenido: { padding: Spacing.l, paddingTop: Spacing.s, gap: Spacing.m, paddingBottom: Spacing.xl },
  card: {
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.m,
    gap: Spacing.s,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s },
  cardIcono: {
    width: 34,
    height: 34,
    borderRadius: Radius.s,
    backgroundColor: Colors.rellenoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitulo: { ...Type.cuerpoDestacado, fontSize: 15, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
  cardNota: { ...Type.nota, fontSize: 11, color: Colors.textoSuave },
  vacio: { ...Type.nota, fontSize: 12, color: Colors.textoSuave, fontStyle: 'italic' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    backgroundColor: Colors.fondo,
    borderRadius: Radius.s,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    paddingHorizontal: Spacing.s,
    paddingVertical: 6,
  },
  filaYo: { borderColor: Colors.primario },
  posicion: {
    ...Type.cuerpoDestacado,
    width: 20,
    fontSize: 13,
    color: Colors.textoSuave,
    textAlign: 'center',
    fontFamily: Fonts.cuerpoBold,
  },
  posicionIcono: { width: 20, textAlign: 'center' },
  filaNombre: { ...Type.cuerpoDestacado, flex: 1, fontSize: 13, color: Colors.texto },
  filaValor: { ...Type.cuerpoDestacado, fontSize: 13, color: Colors.primario, fontFamily: Fonts.cuerpoBold },
  pie: { ...Type.nota, fontSize: 12, color: Colors.textoSuave, fontStyle: 'italic', textAlign: 'center' },
});
