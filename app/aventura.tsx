import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  CalendarDays,
  Compass,
  DollarSign,
  Map as MapIcon,
  MapPin,
  RefreshCcw,
  Route as RouteIcon,
  Sparkles,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../components/Boton';
import { ChipCapa } from '../components/ChipCapa';
import { ICONO_CATEGORIA } from '../components/iconos';
import { getDioramaSource } from '../constants/dioramas';
import { getFotoLugar } from '../constants/fotosLugares';
import { CATEGORIAS, Categoria, Place } from '../constants/mock';
import { Colors, Fonts, Peana, Radius, Spacing, Type } from '../constants/theme';
import { DiaAventura, generarAventura } from '../lib/queries/routes';

/** Opciones de tiempo — lenguaje de viajero, no de formulario. */
const OPCIONES_DIAS = [
  { dias: 1, titulo: 'Escapada', nota: '1 día' },
  { dias: 3, titulo: 'Fin de semana', nota: '2-3 días' },
  { dias: 5, titulo: 'Una semana', nota: '4-7 días' },
  { dias: 7, titulo: 'Sin prisa', nota: '7+ días' },
];

/** Miniatura del lugar: foto curada → cover → diorama → ícono de categoría. */
function MiniaturaLugar({ lugar }: { lugar: Place }) {
  const foto = getFotoLugar(lugar.name) ?? (lugar.coverImageUrl ? { uri: lugar.coverImageUrl } : null);
  const diorama = foto ? null : getDioramaSource(lugar.name, lugar.department);
  const Icono = ICONO_CATEGORIA[lugar.category];
  return (
    <View style={styles.miniatura}>
      {foto || diorama ? (
        <Image source={foto ?? diorama} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Icono size={18} color={Colors.primario} strokeWidth={2} />
      )}
    </View>
  );
}

/**
 * Mi aventura — el roadmap del viaje en 2 preguntas.
 * El turista dice qué le gusta y cuánto tiempo tiene; Spotmi arma un
 * itinerario día a día con lugares reales agrupados por cercanía, con
 * presupuesto estimado y la ruta de cada día lista para trazarse.
 */
export default function Aventura() {
  const router = useRouter();
  const [intereses, setIntereses] = useState<Set<Categoria>>(new Set());
  const [dias, setDias] = useState<number>(3);
  const [generando, setGenerando] = useState(false);
  const [itinerario, setItinerario] = useState<DiaAventura[] | null>(null);

  function alternarInteres(c: Categoria) {
    setIntereses((prev) => {
      const s = new Set(prev);
      if (s.has(c)) s.delete(c);
      else s.add(c);
      return s;
    });
  }

  async function generar() {
    setGenerando(true);
    const res = await generarAventura([...intereses], dias);
    setGenerando(false);
    setItinerario(res);
  }

  function trazarDia(d: DiaAventura) {
    const ids = d.lugares.map((l) => l.id);
    router.push({
      pathname: '/ruta',
      params: {
        startId: ids[0],
        endId: ids[ids.length - 1],
        ...(ids.length > 2 ? { stopIds: ids.slice(1, -1).join(',') } : {}),
      },
    });
  }

  const presupuestoTotal = itinerario?.reduce((s, d) => s + d.presupuesto, 0) ?? 0;
  const totalLugares = itinerario?.reduce((s, d) => s + d.lugares.length, 0) ?? 0;

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <View style={styles.encabezado}>
        <Pressable onPress={() => router.back()} style={styles.botonVolver}>
          <ArrowLeft size={20} color={Colors.texto} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.etiqueta}>Tu viaje, a tu medida</Text>
          <Text style={styles.titulo}>Mi aventura</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        {!itinerario ? (
          <>
            {/* Pregunta 1 — intereses */}
            <View style={{ gap: Spacing.s }}>
              <Text style={styles.pregunta}>¿Qué te mueve?</Text>
              <Text style={styles.preguntaNota}>Elige uno o varios — tu aventura se arma con esto.</Text>
              <View style={styles.chips}>
                {(Object.keys(CATEGORIAS) as Categoria[]).map((c) => (
                  <ChipCapa
                    key={c}
                    etiqueta={CATEGORIAS[c].etiqueta}
                    Icono={ICONO_CATEGORIA[c]}
                    activa={intereses.has(c)}
                    onPress={() => alternarInteres(c)}
                  />
                ))}
              </View>
            </View>

            {/* Pregunta 2 — tiempo */}
            <View style={{ gap: Spacing.s }}>
              <Text style={styles.pregunta}>¿Cuánto tiempo tienes?</Text>
              <View style={styles.opcionesDias}>
                {OPCIONES_DIAS.map((o) => {
                  const activa = dias === o.dias;
                  return (
                    <Pressable
                      key={o.dias}
                      onPress={() => setDias(o.dias)}
                      style={[styles.opcionDia, activa && styles.opcionDiaActiva]}>
                      <CalendarDays size={16} color={activa ? Colors.superficie : Colors.primario} strokeWidth={2.2} />
                      <Text style={[styles.opcionDiaTitulo, activa && { color: Colors.superficie }]}>{o.titulo}</Text>
                      <Text style={[styles.opcionDiaNota, activa && { color: Colors.azulLago }]}>{o.nota}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Boton
              titulo={generando ? 'Armando tu aventura…' : 'Generar mi aventura'}
              onPress={generar}
              cargando={generando}
              deshabilitado={intereses.size === 0}
            />
            {intereses.size === 0 && (
              <Text style={styles.ayuda}>Elige al menos un interés para empezar.</Text>
            )}

            {/* Opción manual */}
            <Pressable onPress={() => router.push('/planificar-ruta')} style={styles.enlaceManual}>
              <MapIcon size={14} color={Colors.textoSuave} />
              <Text style={styles.enlaceManualTexto}>Prefiero elegir los lugares yo en el mapa</Text>
            </Pressable>
          </>
        ) : (
          <>
            {/* Resumen del roadmap */}
            <View style={styles.resumen}>
              <Sparkles size={18} color={Colors.amarilloSol} strokeWidth={2.2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.resumenTitulo}>
                  {itinerario.length} {itinerario.length === 1 ? 'día' : 'días'} · {totalLugares} lugares
                </Text>
                <Text style={styles.resumenNota}>Presupuesto estimado: ~${presupuestoTotal} USD</Text>
              </View>
              <Pressable onPress={() => setItinerario(null)} style={styles.botonRegenerar}>
                <RefreshCcw size={16} color={Colors.primario} strokeWidth={2.2} />
              </Pressable>
            </View>

            {/* Días */}
            {itinerario.map((d) => (
              <View key={d.dia} style={styles.cardDia}>
                <View style={styles.cardDiaHeader}>
                  <View style={styles.numeroDia}>
                    <Text style={styles.numeroDiaTexto}>{d.dia}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.diaEtiqueta}>Día {d.dia}</Text>
                    <Text style={styles.diaTitulo}>{d.titulo}</Text>
                  </View>
                  <View style={styles.diaDatos}>
                    <View style={styles.diaDato}>
                      <DollarSign size={12} color={Colors.acento} />
                      <Text style={styles.diaDatoTexto}>${d.presupuesto}</Text>
                    </View>
                    {d.distanciaKm > 0 && (
                      <View style={styles.diaDato}>
                        <Compass size={12} color={Colors.primario} />
                        <Text style={styles.diaDatoTexto}>{d.distanciaKm} km</Text>
                      </View>
                    )}
                  </View>
                </View>

                {d.lugares.map((l) => (
                  <Pressable
                    key={l.id}
                    onPress={() => router.push({ pathname: '/ficha/[id]', params: { id: l.id, tipo: 'lugar' } })}
                    style={({ pressed }) => [styles.filaLugar, pressed && { opacity: 0.85 }]}>
                    <MiniaturaLugar lugar={l} />
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={styles.lugarNombre} numberOfLines={1}>
                        {l.name}
                      </Text>
                      <View style={styles.lugarFila}>
                        <MapPin size={11} color={Colors.textoSuave} />
                        <Text style={styles.lugarDetalle}>
                          {l.department} · {CATEGORIAS[l.category].etiqueta}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}

                {d.lugares.length >= 2 && (
                  <Pressable onPress={() => trazarDia(d)} style={styles.botonTrazar}>
                    <RouteIcon size={15} color={Colors.superficie} strokeWidth={2.4} />
                    <Text style={styles.botonTrazarTexto}>Trazar ruta del día {d.dia}</Text>
                  </Pressable>
                )}
              </View>
            ))}

            <Text style={styles.pie}>
              Los días se arman agrupando lugares cercanos entre sí, para que pases el tiempo
              descubriendo — no manejando.
            </Text>
          </>
        )}
      </ScrollView>
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
  titulo: { ...Type.subtitulo, fontSize: 20, color: Colors.texto, fontFamily: Fonts.display },
  contenido: { padding: Spacing.l, gap: Spacing.l, paddingBottom: Spacing.xl },
  pregunta: { ...Type.subtitulo, fontSize: 17, color: Colors.texto },
  preguntaNota: { ...Type.nota, color: Colors.textoSuave, marginTop: -4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.s },
  opcionesDias: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.s },
  opcionDia: {
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
  opcionDiaActiva: {
    backgroundColor: Colors.primario,
    borderColor: Colors.primario,
    borderBottomColor: Colors.primarioOscuro,
  },
  opcionDiaTitulo: { ...Type.cuerpoDestacado, fontSize: 14, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
  opcionDiaNota: { ...Type.nota, fontSize: 11, color: Colors.textoSuave },
  ayuda: { ...Type.nota, fontSize: 12, color: Colors.textoSuave, textAlign: 'center', marginTop: -Spacing.s },
  enlaceManual: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.s,
  },
  enlaceManualTexto: { ...Type.nota, fontSize: 13, color: Colors.textoSuave, textDecorationLine: 'underline' },
  resumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    backgroundColor: Colors.tinta,
    borderRadius: Radius.m,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.tintaOscura,
    padding: Spacing.m,
  },
  resumenTitulo: { ...Type.cuerpoDestacado, fontSize: 16, color: Colors.superficie, fontFamily: Fonts.cuerpoBold },
  resumenNota: { ...Type.nota, fontSize: 12, color: Colors.azulLago },
  botonRegenerar: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: Colors.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDia: {
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.m,
    gap: Spacing.s,
  },
  cardDiaHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s },
  numeroDia: {
    width: 34,
    height: 34,
    borderRadius: Radius.s,
    backgroundColor: Colors.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroDiaTexto: { fontSize: 16, fontFamily: Fonts.displayBold, color: Colors.superficie },
  diaEtiqueta: { ...Type.etiqueta, fontSize: 9, color: Colors.acento },
  diaTitulo: { ...Type.cuerpoDestacado, fontSize: 15, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
  diaDatos: { gap: 2, alignItems: 'flex-end' },
  diaDato: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  diaDatoTexto: { ...Type.cuerpoDestacado, fontSize: 12, color: Colors.texto },
  filaLugar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    backgroundColor: Colors.fondo,
    borderRadius: Radius.s,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    padding: Spacing.s,
  },
  miniatura: {
    width: 42,
    height: 42,
    borderRadius: Radius.s,
    backgroundColor: Colors.rellenoSuave,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lugarNombre: { ...Type.cuerpoDestacado, fontSize: 13.5, color: Colors.texto },
  lugarFila: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  lugarDetalle: { ...Type.nota, fontSize: 11, color: Colors.textoSuave },
  botonTrazar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primario,
    borderRadius: Radius.s,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.primarioOscuro,
    paddingVertical: 10,
    marginTop: 2,
  },
  botonTrazarTexto: { ...Type.cuerpoDestacado, fontSize: 13, color: Colors.superficie },
  pie: { ...Type.nota, fontSize: 12, color: Colors.textoSuave, fontStyle: 'italic', textAlign: 'center' },
});
