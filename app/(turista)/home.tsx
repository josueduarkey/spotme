import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { Navigation } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TarjetaEvento } from '../../components/TarjetaEvento';
import { TarjetaLugar } from '../../components/TarjetaLugar';
import { EventItem, MOCK_PROFILE, MockProfile, Place } from '../../constants/mock';
import { Colors, Peana, Radius, Spacing, Type } from '../../constants/theme';
import { getCurrentProfile } from '../../lib/queries/auth';
import { getUpcomingEvents } from '../../lib/queries/events';
import { getTopPlaces } from '../../lib/queries/places';

/** Pantalla 5 — Home turista: CTA al mapa, Top 5 lugares, eventos próximos. */
export default function Home() {
  const router = useRouter();
  const [lugares, setLugares] = useState<Place[]>([]);
  const [eventos, setEventos] = useState<EventItem[]>([]);
  const [perfil, setPerfil] = useState<MockProfile | null>(null);

  useEffect(() => {
    getTopPlaces(5).then(setLugares);
    getUpcomingEvents().then(setEventos);
    getCurrentProfile().then(setPerfil);
  }, []);

  const nombreCorto = (perfil?.fullName || MOCK_PROFILE.fullName).split(' ')[0];

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <View style={styles.encabezado}>
          <Text style={styles.saludo}>Hola, {nombreCorto}</Text>
          <Text style={styles.pregunta}>¿Qué rincón del país descubrimos hoy?</Text>
        </View>

        <Pressable onPress={() => router.push('/mapa')} style={({ pressed }) => [styles.ctaMapa, pressed && { opacity: 0.92 }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.ctaEtiqueta}>El Salvador en miniatura</Text>
            <Text style={styles.ctaTituloMapa}>Ver el mapa</Text>
          </View>
          <ExpoImage
            source={require('../../assets/diorama-sv.png')}
            style={styles.ctaDiorama}
            contentFit="contain"
          />
        </Pressable>

        <Pressable onPress={() => router.push('/aventura')} style={({ pressed }) => [styles.ctaRuta, pressed && { opacity: 0.92 }]}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.ctaTitulo}>Arma tu aventura</Text>
            <Text style={styles.ctaNotaRuta}>
              Dinos qué te gusta y cuántos días tienes: te damos el roadmap de tu viaje.
            </Text>
          </View>
          <View style={styles.iconoViaje}>
            <Navigation size={26} color={Colors.superficie} strokeWidth={2.4} />
          </View>
        </Pressable>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Top 5 lugares</Text>
          <FlatList
            horizontal
            data={lugares}
            keyExtractor={(l) => l.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Spacing.m, paddingRight: Spacing.l }}
            renderItem={({ item }) => (
              <TarjetaLugar lugar={item} onPress={() => router.push({ pathname: '/ficha/[id]', params: { id: item.id, tipo: 'lugar' } })} />
            )}
          />
        </View>

        <View style={[styles.seccion, { paddingBottom: Spacing.xl }]}>
          <Text style={styles.seccionTitulo}>Eventos próximos</Text>
          <View style={{ gap: Spacing.m, paddingRight: Spacing.l }}>
            {eventos.map((e) => (
              <TarjetaEvento
                key={e.id}
                evento={e}
                onPress={() => router.push({ pathname: '/evento/[id]', params: { id: e.id } })}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  contenido: { gap: Spacing.l, paddingTop: Spacing.m },
  encabezado: { paddingHorizontal: Spacing.l, gap: 4 },
  saludo: { ...Type.nota, fontSize: 15, color: Colors.textoSuave },
  pregunta: { ...Type.titulo, color: Colors.texto },
  ctaMapa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    marginHorizontal: Spacing.l,
    backgroundColor: Colors.superficie,
    borderRadius: Radius.l,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.l,
    minHeight: 150,
  },
  ctaRuta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    marginHorizontal: Spacing.l,
    backgroundColor: Colors.acento,
    borderRadius: Radius.l,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: '#C05C14',
    padding: Spacing.l,
    marginTop: -Spacing.s,
  },
  ctaEtiqueta: { ...Type.etiqueta, fontSize: 10, color: Colors.acento },
  ctaTitulo: { ...Type.subtitulo, color: Colors.textoInvertido },
  ctaTituloMapa: { ...Type.titulo, fontSize: 28, color: Colors.texto },
  ctaDiorama: { width: 175, height: 117 },
  ctaNotaRuta: { ...Type.nota, color: Colors.fondo },
  iconoViaje: {
    width: 48,
    height: 48,
    borderRadius: Radius.m,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  seccion: { gap: Spacing.m, paddingLeft: Spacing.l },
  seccionTitulo: { ...Type.subtitulo, color: Colors.texto, paddingRight: Spacing.l },
});
