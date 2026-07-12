import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, BadgeCheck, CalendarDays, Camera, ExternalLink, MapPin, Sparkles } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../../components/Boton';
import { Comentarios } from '../../components/Comentarios';
import { IconoTikTok } from '../../components/IconoTikTok';
import { getFotosEvento } from '../../constants/fotosEventos';
import { EventItem } from '../../constants/mock';
import { Colors, Fonts, Peana, Radius, Spacing, Type } from '../../constants/theme';
import { confirmEvent, getEventById } from '../../lib/queries/events';
import { buscarEnTikTok } from '../../lib/tiktok';

/**
 * Pantalla 13 (detalle) — Ficha de evento: cuándo es, cómo se ha vivido en
 * ediciones anteriores (galería local) y su ubicación exacta en el mapa,
 * con la ruta integrada en la app.
 */
export default function DetalleEvento() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [evento, setEvento] = useState<EventItem | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [yaConfirmo, setYaConfirmo] = useState(false);

  useEffect(() => {
    getEventById(id).then(setEvento);
  }, [id]);

  if (!evento) return <View style={styles.pantalla} />;

  const comunidad = evento.source === 'community';
  const verificado = evento.isVerified === true;
  const confirmaciones = evento.verificationCount ?? 0;

  async function confirmarEvento() {
    if (!evento) return;
    setConfirmando(true);
    const res = await confirmEvent(evento.id);
    setConfirmando(false);
    if (res.error) {
      Alert.alert('No se pudo confirmar', res.error);
      return;
    }
    setYaConfirmo(true);
    setEvento({ ...evento, verificationCount: res.verificationCount, isVerified: res.isVerified });
    if (res.isVerified) {
      Alert.alert('¡Evento verificado!', 'Con tu confirmación, la comunidad validó que este evento es real.');
    }
  }

  const fotos = getFotosEvento(evento.title);
  const fecha = new Date(evento.date);
  const fechaLarga = fecha.toLocaleDateString('es-SV', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const hora = fecha.toLocaleTimeString('es-SV', { hour: 'numeric', minute: '2-digit' });
  const tieneUbicacion = evento.lat !== 0 || evento.lng !== 0;

  function comoLlegar() {
    router.push({
      pathname: '/como-llegar',
      params: { lat: String(evento!.lat), lng: String(evento!.lng), nombre: evento!.title },
    });
  }

  return (
    <View style={styles.pantalla}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
        {/* Portada: foto del creador (comunidad) → galería local → bloque de fecha */}
        {evento.coverImageUrl ? (
          <Image source={{ uri: evento.coverImageUrl }} style={styles.portada} contentFit="cover" />
        ) : fotos.length > 0 ? (
          <Image source={fotos[0]} style={styles.portada} contentFit="cover" />
        ) : (
          <View style={styles.portadaFecha}>
            <CalendarDays size={54} color={Colors.amarilloSol} strokeWidth={1.6} />
            <Text style={styles.portadaFechaTexto}>{fecha.getDate()}</Text>
            <Text style={styles.portadaFechaMes}>
              {fecha.toLocaleDateString('es-SV', { month: 'long' }).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={styles.cuerpo}>
          <View style={styles.filaEtiquetas}>
            <Text style={styles.categoria}>Evento · {evento.department}</Text>
            {comunidad && !verificado && (
              <View style={styles.badgeNuevo}>
                <Sparkles size={12} color={Colors.superficie} strokeWidth={2.4} />
                <Text style={styles.badgeTexto}>Nuevo · sin verificar</Text>
              </View>
            )}
            {comunidad && verificado && (
              <View style={styles.badgeVerificado}>
                <BadgeCheck size={13} color={Colors.superficie} strokeWidth={2.4} />
                <Text style={styles.badgeTexto}>Verificado por la comunidad</Text>
              </View>
            )}
          </View>
          <Text style={styles.titulo}>{evento.title}</Text>

          {/* Cuándo */}
          <View style={styles.filaDato}>
            <CalendarDays size={16} color={Colors.primario} strokeWidth={2.2} />
            <Text style={styles.datoTexto}>
              {fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1)} · {hora}
            </Text>
          </View>

          <Text style={styles.descripcion}>{evento.description}</Text>

          {/* Así se ha vivido — ediciones anteriores */}
          {fotos.length > 0 && (
            <View style={{ gap: Spacing.s, marginTop: Spacing.m }}>
              <View style={styles.seccionFila}>
                <Camera size={15} color={Colors.acento} strokeWidth={2.4} />
                <Text style={styles.seccionTitulo}>Así se ha vivido</Text>
              </View>
              <Text style={styles.seccionNota}>Fotos de ediciones anteriores del evento.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.s }}>
                {fotos.map((f, i) => (
                  <Image key={i} source={f} style={styles.fotoGaleria} contentFit="cover" />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Confianza comunitaria: mismo modelo que los lugares */}
          {comunidad && !verificado && (
            <View style={styles.cajaConfirmar}>
              <Text style={styles.confirmarTitulo}>¿Este evento es real?</Text>
              <Text style={styles.confirmarNota}>
                {confirmaciones} de 3 confirmaciones para que la comunidad lo verifique.
              </Text>
              <Boton
                titulo={yaConfirmo ? 'Gracias por confirmar' : 'Confirmar que es real'}
                onPress={confirmarEvento}
                cargando={confirmando}
                deshabilitado={yaConfirmo}
              />
            </View>
          )}

          {/* Ediciones pasadas del evento en TikTok */}
          <Pressable onPress={() => buscarEnTikTok(evento.title)} style={styles.cajaTiktok}>
            <View style={styles.tiktokIcono}>
              <IconoTikTok size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tiktokTitulo}>Ver en TikTok</Text>
              <Text style={styles.tiktokNota} numberOfLines={1}>
                Videos de ediciones pasadas de &quot;{evento.title}&quot;
              </Text>
            </View>
            <ExternalLink size={18} color={Colors.textoSuave} />
          </Pressable>

          {/* Ubicación exacta */}
          {tieneUbicacion && (
            <View style={{ gap: Spacing.s, marginTop: Spacing.m }}>
              <View style={styles.seccionFila}>
                <MapPin size={15} color={Colors.acento} strokeWidth={2.4} />
                <Text style={styles.seccionTitulo}>Ubicación exacta</Text>
              </View>
              <View style={styles.mapa}>
                <MapView
                  style={StyleSheet.absoluteFill}
                  initialRegion={{
                    latitude: evento.lat,
                    longitude: evento.lng,
                    latitudeDelta: 0.012,
                    longitudeDelta: 0.012,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  toolbarEnabled={false}>
                  <UrlTile
                    urlTemplate="https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
                    shouldReplaceMapContent={true}
                    maximumZ={19}
                    tileSize={256}
                  />
                  <Marker coordinate={{ latitude: evento.lat, longitude: evento.lng }} title={evento.title} />
                </MapView>
                {/* El tap en cualquier parte del mini-mapa abre la ruta */}
                <Pressable style={StyleSheet.absoluteFill} onPress={comoLlegar} />
              </View>
              <Text style={styles.coordenadas}>
                {evento.lat.toFixed(5)}, {evento.lng.toFixed(5)}
              </Text>
              <Boton titulo="Cómo llegar" onPress={comoLlegar} />
            </View>
          )}

          <Comentarios targetType="event" targetId={evento.id} />
        </View>
      </ScrollView>

      {/* Volver */}
      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.superpuesto}>
        <Pressable onPress={() => router.back()} style={styles.volver}>
          <ArrowLeft size={20} color={Colors.texto} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  portada: { height: 240, width: '100%' },
  portadaFecha: {
    height: 200,
    backgroundColor: Colors.tinta,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  portadaFechaTexto: { fontSize: 44, fontFamily: Fonts.displayBold, color: Colors.textoInvertido },
  portadaFechaMes: { ...Type.etiqueta, color: Colors.amarilloSol },
  cuerpo: { padding: Spacing.l, gap: Spacing.s },
  categoria: { ...Type.etiqueta, color: Colors.acento },
  filaEtiquetas: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s, flexWrap: 'wrap' },
  badgeNuevo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.acento,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.s,
    paddingVertical: 3,
  },
  badgeVerificado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primario,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.s,
    paddingVertical: 3,
  },
  badgeTexto: { ...Type.etiqueta, fontSize: 10, letterSpacing: 0.6, color: Colors.superficie },
  cajaConfirmar: {
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.acento,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.acento,
    padding: Spacing.m,
    gap: Spacing.s,
    marginTop: Spacing.m,
  },
  confirmarTitulo: { ...Type.subtitulo, fontSize: 18, color: Colors.texto },
  confirmarNota: { ...Type.nota, color: Colors.textoSuave },
  titulo: { ...Type.titulo, color: Colors.texto },
  filaDato: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s, marginTop: 2 },
  datoTexto: { ...Type.cuerpoDestacado, fontSize: 14, color: Colors.texto },
  descripcion: { ...Type.cuerpo, color: Colors.texto, marginTop: Spacing.s },
  seccionFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  seccionTitulo: { ...Type.subtitulo, fontSize: 16, color: Colors.texto },
  seccionNota: { ...Type.nota, fontSize: 12, color: Colors.textoSuave, marginTop: -4 },
  fotoGaleria: {
    width: 190,
    height: 140,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
  },
  mapa: {
    height: 180,
    borderRadius: Radius.m,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
  },
  coordenadas: { ...Type.nota, fontSize: 11, color: Colors.textoSuave, textAlign: 'center' },
  cajaTiktok: {
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
    marginTop: Spacing.m,
  },
  tiktokIcono: {
    width: 44,
    height: 44,
    borderRadius: Radius.s,
    backgroundColor: Colors.superficie,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiktokTitulo: { ...Type.cuerpoDestacado, fontSize: 15, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
  tiktokNota: { ...Type.nota, fontSize: 12, color: Colors.textoSuave, marginTop: 2 },
  superpuesto: { position: 'absolute', top: 0, left: 0 },
  volver: {
    marginLeft: Spacing.m,
    marginTop: Spacing.s,
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: Colors.superficie,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
