import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, BadgeCheck, Clock, ExternalLink, MapPin, Phone, Sparkles } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../../components/Boton';
import { ICONO_CATEGORIA, IconoNegocio } from '../../components/iconos';
import { IconoTikTok } from '../../components/IconoTikTok';
import { VisorFotos } from '../../components/VisorFotos';
import { getFotoLugar, getFotosLugar } from '../../constants/fotosLugares';
import { Business, CATEGORIAS, esComunidad, Place } from '../../constants/mock';
import { Colors, Fonts, Peana, Radius, Spacing, Type } from '../../constants/theme';
import { getBusinessById } from '../../lib/queries/businesses';
import { confirmPlace, getPlaceById } from '../../lib/queries/places';
import { getPhotosFor } from '../../lib/queries/uploads';

/** Pantalla 7 — Ficha de lugar o negocio. Param `tipo`: 'lugar' | 'negocio'. */
export default function Ficha() {
  const router = useRouter();
  const { id, tipo } = useLocalSearchParams<{ id: string; tipo: string }>();
  const esNegocio = tipo === 'negocio';
  const [lugar, setLugar] = useState<Place | null>(null);
  const [negocio, setNegocio] = useState<Business | null>(null);
  const [fotos, setFotos] = useState<string[]>([]);
  const [confirmando, setConfirmando] = useState(false);
  const [yaConfirmo, setYaConfirmo] = useState(false);
  const [fotoAbierta, setFotoAbierta] = useState<number | null>(null);

  useEffect(() => {
    if (esNegocio) getBusinessById(id).then(setNegocio);
    else getPlaceById(id).then(setLugar);
  }, [id, esNegocio]);

  // La galería se refresca al volver de la pantalla de subir foto.
  useFocusEffect(
    useCallback(() => {
      getPhotosFor(esNegocio ? 'business' : 'place', id).then(setFotos);
    }, [id, esNegocio]),
  );

  const item = esNegocio ? negocio : lugar;
  if (!item) return <View style={styles.pantalla} />;

  const comunidad = !esNegocio && lugar ? esComunidad(lugar) : false;
  const verificado = lugar?.isVerified === true;
  const confirmaciones = lugar?.verificationCount ?? 0;

  const IconoPortada = esNegocio ? IconoNegocio : ICONO_CATEGORIA[(item as Place).category];
  const etiqueta = esNegocio
    ? (item as Business).category
    : CATEGORIAS[(item as Place).category].etiqueta;
  const subtitulo = esNegocio ? (item as Business).address : `Departamento de ${(item as Place).department}`;
  // Portada: cover de Supabase → foto local curada (Top 5) → ícono de categoría.
  const portadaUrl = !esNegocio ? (item as Place).coverImageUrl : null;
  const fotoLocal = !esNegocio ? getFotoLugar(item.name) : null;
  const fuentePortada = portadaUrl ? { uri: portadaUrl } : fotoLocal;
  const fotosCuradas = !esNegocio ? getFotosLugar(item.name) : [];

  // Todas las fotos del lugar, en el mismo orden en que se muestran, para que
  // tocar cualquiera (portada, curadas o de la comunidad) abra el visor de
  // pantalla completa en el índice correcto.
  const galeriaCompleta = [
    ...(portadaUrl ? [{ uri: portadaUrl }] : []),
    ...fotosCuradas,
    ...fotos.map((url) => ({ uri: url })),
  ];
  const offsetCuradas = portadaUrl ? 1 : 0;
  const offsetComunidad = offsetCuradas + fotosCuradas.length;

  function verEnTikTok() {
    const query = encodeURIComponent(`${item!.name} El Salvador`);
    Linking.openURL(`https://www.tiktok.com/search?q=${query}`).catch(() =>
      Alert.alert('No se pudo abrir TikTok', 'Intenta de nuevo más tarde.'),
    );
  }

  function comoLlegar() {
    // La ruta se traza dentro de la app (OSRM); Google Maps queda como
    // opción secundaria dentro de esa pantalla.
    router.push({
      pathname: '/como-llegar',
      params: { lat: String(item!.lat), lng: String(item!.lng), nombre: item!.name },
    });
  }

  function subirFoto() {
    router.push({
      pathname: '/subir-foto',
      params: {
        id: item!.id,
        tipo: esNegocio ? 'negocio' : 'lugar',
        nombre: item!.name,
        lat: String(item!.lat),
        lng: String(item!.lng),
      },
    });
  }

  async function confirmarQueExiste() {
    if (!lugar) return;
    setConfirmando(true);
    const res = await confirmPlace(lugar.id);
    setConfirmando(false);
    if (res.error) {
      Alert.alert('No se pudo confirmar', res.error);
      return;
    }
    setYaConfirmo(true);
    setLugar({ ...lugar, verificationCount: res.verificationCount, isVerified: res.isVerified });
    if (res.isVerified) {
      Alert.alert('¡Lugar verificado!', 'Con tu confirmación, la comunidad validó que este lugar existe.');
    }
  }

  return (
    <View style={styles.pantalla}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.xl }}>
        {fuentePortada ? (
          <Pressable onPress={() => setFotoAbierta(0)}>
            <Image source={fuentePortada} style={styles.portadaFoto} contentFit="cover" />
          </Pressable>
        ) : (
          <View style={styles.portada}>
            <IconoPortada size={72} color={Colors.primario} strokeWidth={1.5} />
            <Text style={styles.portadaNota}>
              {esNegocio ? 'Fotos del negocio · Fase 3' : 'Aún sin fotos de la comunidad'}
            </Text>
          </View>
        )}

        <View style={styles.cuerpo}>
          <View style={styles.filaEtiquetas}>
            <Text style={styles.categoria}>{etiqueta}</Text>
            {comunidad && !verificado && (
              <View style={styles.badgeNuevo}>
                <Sparkles size={12} color={Colors.superficie} strokeWidth={2.4} />
                <Text style={styles.badgeNuevoTexto}>Nuevo · sin verificar</Text>
              </View>
            )}
            {comunidad && verificado && (
              <View style={styles.badgeVerificado}>
                <BadgeCheck size={13} color={Colors.superficie} strokeWidth={2.4} />
                <Text style={styles.badgeNuevoTexto}>Verificado por la comunidad</Text>
              </View>
            )}
          </View>
          <Text style={styles.nombre}>{item.name}</Text>
          <View style={styles.filaSubtitulo}>
            <MapPin size={14} color={Colors.textoSuave} />
            <Text style={styles.subtitulo}>{subtitulo}</Text>
          </View>
          <Text style={styles.descripcion}>{item.description}</Text>

          {(fotosCuradas.length > 0 || fotos.length > 0) && (
            <View style={{ gap: Spacing.s, marginTop: Spacing.s }}>
              <Text style={styles.galeriaTitulo}>Fotos de la comunidad</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.s }}>
                {fotosCuradas.map((f, i) => (
                  <Pressable key={`curada-${i}`} onPress={() => setFotoAbierta(offsetCuradas + i)}>
                    <Image source={f} style={styles.galeriaFoto} contentFit="cover" />
                  </Pressable>
                ))}
                {fotos.map((url, i) => (
                  <Pressable key={url} onPress={() => setFotoAbierta(offsetComunidad + i)}>
                    <Image source={{ uri: url }} style={styles.galeriaFoto} contentFit="cover" />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {esNegocio && (
            <View style={styles.datos}>
              <View style={styles.dato}>
                <Clock size={16} color={Colors.primario} />
                <Text style={styles.datoTexto}>{(item as Business).schedule}</Text>
              </View>
              <View style={styles.dato}>
                <Phone size={16} color={Colors.primario} />
                <Text style={styles.datoTexto}>{(item as Business).contact}</Text>
              </View>
            </View>
          )}

          {comunidad && !verificado && (
            <View style={styles.cajaConfirmar}>
              <Text style={styles.confirmarTitulo}>¿Estuviste aquí?</Text>
              <Text style={styles.confirmarNota}>
                {confirmaciones} de 3 confirmaciones para que la comunidad lo verifique.
              </Text>
              <Boton
                titulo={yaConfirmo ? 'Gracias por confirmar' : 'Confirmar que existe'}
                onPress={confirmarQueExiste}
                cargando={confirmando}
                deshabilitado={yaConfirmo}
              />
            </View>
          )}

          <Pressable onPress={verEnTikTok} style={styles.cajaTiktok}>
            <View style={styles.tiktokIcono}>
              <IconoTikTok size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tiktokTitulo}>Ver en TikTok</Text>
              <Text style={styles.tiktokNota} numberOfLines={1}>
                Videos de otros viajeros en &quot;{item.name}&quot;
              </Text>
            </View>
            <ExternalLink size={18} color={Colors.textoSuave} />
          </Pressable>

          <View style={styles.acciones}>
            <Boton titulo="Cómo llegar" onPress={comoLlegar} variante={comunidad && !verificado ? 'secundario' : 'primario'} />
            <Boton titulo="Subir foto" variante="secundario" onPress={subirFoto} />
          </View>
        </View>
      </ScrollView>

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.superpuesto}>
        <Pressable onPress={() => router.back()} style={styles.volver}>
          <ArrowLeft size={20} color={Colors.texto} />
        </Pressable>
      </SafeAreaView>

      <VisorFotos
        fotos={galeriaCompleta}
        indiceInicial={fotoAbierta ?? 0}
        visible={fotoAbierta !== null}
        onClose={() => setFotoAbierta(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  portada: {
    height: 240,
    backgroundColor: Colors.rellenoSuave,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s,
  },
  portadaFoto: { height: 280, width: '100%' },
  portadaNota: { ...Type.nota, fontSize: 11, color: Colors.textoSuave },
  cuerpo: { padding: Spacing.l, gap: Spacing.s },
  filaEtiquetas: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s, flexWrap: 'wrap' },
  categoria: { ...Type.etiqueta, color: Colors.acento },
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
  badgeNuevoTexto: {
    ...Type.etiqueta,
    fontSize: 10,
    letterSpacing: 0.6,
    color: Colors.superficie,
  },
  nombre: { ...Type.titulo, color: Colors.texto },
  filaSubtitulo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  subtitulo: { ...Type.nota, color: Colors.textoSuave },
  descripcion: { ...Type.cuerpo, color: Colors.texto, marginTop: Spacing.s },
  galeriaTitulo: { ...Type.etiqueta, color: Colors.textoSuave },
  galeriaFoto: {
    width: 120,
    height: 120,
    borderRadius: Radius.s,
    borderWidth: 1.5,
    borderColor: Colors.borde,
  },
  datos: {
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.m,
    gap: Spacing.s,
    marginTop: Spacing.s,
  },
  dato: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s },
  datoTexto: { ...Type.cuerpo, fontSize: 15, color: Colors.texto },
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
  acciones: { gap: Spacing.m, marginTop: Spacing.l },
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
