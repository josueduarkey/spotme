import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  BadgeCheck,
  Bus,
  CalendarDays,
  Check,
  HandCoins,
  Landmark,
  MapPin,
  MessageCircle,
  Minus,
  Plus,
  UserRound,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../components/Boton';
import { Colors, Fonts, Peana, Radius, Spacing, Type } from '../constants/theme';
import { getAventuraActual } from '../lib/aventuraActual';
import { calcularPrecio, mensajeReserva, WHATSAPP_RESERVAS } from '../lib/experiencia';
import { savePlannedRoute } from '../lib/queries/routes';

const INCLUYE = [
  { Icono: UserRound, texto: 'Guía local verificado durante todo el recorrido' },
  { Icono: Bus, texto: 'Transporte entre cada parada del itinerario' },
  { Icono: Landmark, texto: 'Entradas a los lugares del roadmap' },
  { Icono: MessageCircle, texto: 'Soporte por WhatsApp antes y durante el viaje' },
];

/**
 * Reservar experiencia — la aventura generada se convierte en un paquete
 * todo-arreglado: el turista (local o extranjero) paga y solo llega a
 * disfrutar. La solicitud sale por WhatsApp al equipo de guías y el
 * itinerario queda guardado en su cuenta.
 */
export default function Reservar() {
  const router = useRouter();
  const aventura = getAventuraActual();
  const [personas, setPersonas] = useState(2);
  const [enviando, setEnviando] = useState(false);
  const [solicitado, setSolicitado] = useState(false);

  const precio = useMemo(
    () => (aventura ? calcularPrecio(aventura, personas) : null),
    [aventura, personas],
  );

  // Solo se llega aquí desde la aventura generada; si no hay, regresamos.
  if (!aventura || !precio || aventura.dias.length === 0) {
    return (
      <SafeAreaView style={styles.pantallaVacia}>
        <Text style={styles.vacioTexto}>Primero genera tu aventura para poder reservarla.</Text>
        <Boton titulo="Armar mi aventura" onPress={() => router.replace('/aventura')} />
      </SafeAreaView>
    );
  }

  async function solicitarReserva() {
    if (!aventura || !precio) return;
    setEnviando(true);

    // 1. El itinerario queda guardado en la cuenta del turista.
    const placeIds = aventura.dias.flatMap((d) => d.lugares.map((l) => l.id));
    const minutos = aventura.dias.length * 8 * 60; // jornadas de ~8h
    await savePlannedRoute(placeIds, precio.totalGrupo, minutos).catch(() => null);

    // 2. La solicitud viaja por WhatsApp al equipo de guías.
    const url = `https://wa.me/${WHATSAPP_RESERVAS}?text=${encodeURIComponent(mensajeReserva(aventura, precio))}`;
    const puedeAbrir = await Linking.canOpenURL(url).catch(() => false);
    setEnviando(false);
    setSolicitado(true);

    if (puedeAbrir) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        'Solicitud registrada',
        'Guardamos tu itinerario. Instala WhatsApp para enviar la solicitud al equipo de guías, o contáctanos desde tu perfil.',
      );
    }
  }

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <View style={styles.encabezado}>
        <Pressable onPress={() => router.back()} style={styles.botonVolver}>
          <ArrowLeft size={20} color={Colors.texto} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.etiqueta}>Experiencia guiada</Text>
          <Text style={styles.titulo}>Reservar mi aventura</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        {/* Resumen del paquete */}
        <View style={styles.tarjetaPaquete}>
          <View style={styles.filaPaquete}>
            <MapPin size={15} color={Colors.amarilloSol} strokeWidth={2.4} />
            <Text style={styles.paqueteZona}>{aventura.zonas.join(' → ')}</Text>
          </View>
          <View style={styles.filaPaquete}>
            <CalendarDays size={14} color={Colors.azulLago} strokeWidth={2.2} />
            <Text style={styles.paqueteDetalle}>
              {precio.dias} {precio.dias === 1 ? 'día' : 'días'} ·{' '}
              {aventura.dias.reduce((s, d) => s + d.lugares.length, 0)} lugares
            </Text>
          </View>
          {aventura.dias.map((d) => (
            <Text key={d.dia} style={styles.paqueteDia} numberOfLines={2}>
              Día {d.dia} · {d.titulo}: {d.lugares.map((l) => l.name).join(' → ')}
            </Text>
          ))}
        </View>

        {/* ¿Cuántos viajan? */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>¿Cuántos viajan?</Text>
          <View style={styles.selectorPersonas}>
            <Pressable
              onPress={() => setPersonas((p) => Math.max(1, p - 1))}
              style={[styles.botonPersona, personas === 1 && { opacity: 0.4 }]}>
              <Minus size={18} color={Colors.primario} strokeWidth={2.6} />
            </Pressable>
            <View style={styles.personasValor}>
              <UserRound size={18} color={Colors.texto} strokeWidth={2.2} />
              <Text style={styles.personasTexto}>
                {personas} {personas === 1 ? 'persona' : 'personas'}
              </Text>
            </View>
            <Pressable
              onPress={() => setPersonas((p) => Math.min(8, p + 1))}
              style={[styles.botonPersona, personas === 8 && { opacity: 0.4 }]}>
              <Plus size={18} color={Colors.primario} strokeWidth={2.6} />
            </Pressable>
          </View>
        </View>

        {/* Desglose de precio */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Tu experiencia, todo arreglado</Text>
          <View style={styles.filaPrecio}>
            <Text style={styles.precioConcepto}>Entradas + transporte</Text>
            <Text style={styles.precioValor}>${precio.basePorPersona}</Text>
          </View>
          <View style={styles.filaPrecio}>
            <Text style={styles.precioConcepto}>Guía local (compartido)</Text>
            <Text style={styles.precioValor}>${precio.guiaPorPersona}</Text>
          </View>
          <View style={styles.filaPrecio}>
            <Text style={styles.precioConcepto}>Servicio Spotmi</Text>
            <Text style={styles.precioValor}>${precio.servicioPorPersona}</Text>
          </View>
          <View style={styles.separador} />
          <View style={styles.filaPrecio}>
            <Text style={styles.precioTotalEtiqueta}>Por persona</Text>
            <Text style={styles.precioTotal}>${precio.totalPorPersona} USD</Text>
          </View>
          <View style={styles.filaPrecio}>
            <Text style={styles.precioConcepto}>
              Total grupo ({personas} {personas === 1 ? 'persona' : 'personas'})
            </Text>
            <Text style={styles.precioValorDestacado}>${precio.totalGrupo} USD</Text>
          </View>
        </View>

        {/* Qué incluye */}
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>¿Qué incluye?</Text>
          {INCLUYE.map((i) => (
            <View key={i.texto} style={styles.filaIncluye}>
              <View style={styles.incluyeIcono}>
                <i.Icono size={15} color={Colors.primario} strokeWidth={2.2} />
              </View>
              <Text style={styles.incluyeTexto}>{i.texto}</Text>
            </View>
          ))}
        </View>

        {/* Acción */}
        {solicitado ? (
          <View style={styles.cajaExito}>
            <BadgeCheck size={22} color={Colors.exito} strokeWidth={2.2} />
            <Text style={styles.exitoTexto}>
              ¡Solicitud enviada! Tu itinerario quedó guardado y el equipo de guías te confirmará por
              WhatsApp.
            </Text>
          </View>
        ) : (
          <>
            <Boton
              titulo={enviando ? 'Enviando solicitud…' : `Solicitar reserva · $${precio.totalGrupo} USD`}
              onPress={solicitarReserva}
              cargando={enviando}
            />
            <View style={styles.filaNota}>
              <HandCoins size={13} color={Colors.textoSuave} />
              <Text style={styles.nota}>
                Sin cobro ahora: pagas al confirmar disponibilidad con tu guía local.
              </Text>
            </View>
          </>
        )}

        <View style={styles.filaNota}>
          <Check size={13} color={Colors.exito} />
          <Text style={styles.nota}>
            Cada reserva apoya a guías y negocios locales de la zona que visitas.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  pantallaVacia: {
    flex: 1,
    backgroundColor: Colors.fondo,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.l,
    padding: Spacing.xl,
  },
  vacioTexto: { ...Type.cuerpo, color: Colors.textoSuave, textAlign: 'center' },
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
  contenido: { padding: Spacing.l, gap: Spacing.m, paddingBottom: Spacing.xl },
  tarjetaPaquete: {
    backgroundColor: Colors.tinta,
    borderRadius: Radius.m,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.tintaOscura,
    padding: Spacing.m,
    gap: 6,
  },
  filaPaquete: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  paqueteZona: { ...Type.cuerpoDestacado, fontSize: 17, color: Colors.superficie, fontFamily: Fonts.cuerpoBold },
  paqueteDetalle: { ...Type.nota, fontSize: 12, color: Colors.azulLago },
  paqueteDia: { ...Type.nota, fontSize: 12, color: Colors.blancoPapel, opacity: 0.85 },
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
  cardTitulo: { ...Type.cuerpoDestacado, fontSize: 15, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
  selectorPersonas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  botonPersona: {
    width: 44,
    height: 44,
    borderRadius: Radius.s,
    backgroundColor: Colors.fondo,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personasValor: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  personasTexto: { ...Type.cuerpoDestacado, fontSize: 16, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
  filaPrecio: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  precioConcepto: { ...Type.nota, fontSize: 13, color: Colors.textoSuave },
  precioValor: { ...Type.cuerpoDestacado, fontSize: 14, color: Colors.texto },
  precioValorDestacado: { ...Type.cuerpoDestacado, fontSize: 14, color: Colors.acento, fontFamily: Fonts.cuerpoBold },
  separador: { height: 1.5, backgroundColor: Colors.borde, marginVertical: 2 },
  precioTotalEtiqueta: { ...Type.cuerpoDestacado, fontSize: 15, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
  precioTotal: { fontSize: 22, fontFamily: Fonts.displayBold, color: Colors.primario },
  filaIncluye: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s },
  incluyeIcono: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.rellenoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incluyeTexto: { ...Type.nota, fontSize: 13, color: Colors.texto, flex: 1 },
  cajaExito: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.exito,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.exito,
    padding: Spacing.m,
  },
  exitoTexto: { ...Type.nota, fontSize: 13, color: Colors.texto, flex: 1, lineHeight: 19 },
  filaNota: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  nota: { ...Type.nota, fontSize: 12, color: Colors.textoSuave, textAlign: 'center' },
});
