import { useFocusEffect, useRouter } from 'expo-router';
import { Award, CheckCircle, Compass, LogOut, MapPin, Camera, User, Trophy, BookOpen, Layers, ChevronRight, ShieldCheck } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Peana, Radius, Spacing, Type } from '../../constants/theme';
import { getTouristStats, getUserChallenges, TouristStats, UserChallengeInfo } from '../../lib/queries/profile';
import { esAdmin } from '../../constants/admins';
import { getCurrentProfile, signOut } from '../../lib/queries/auth';
import { MockProfile, MOCK_PROFILE } from '../../constants/mock';

export default function Perfil() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [perfil, setPerfil] = useState<MockProfile | null>(null);
  const [stats, setStats] = useState<TouristStats | null>(null);
  const [retos, setRetos] = useState<UserChallengeInfo[]>([]);

  useFocusEffect(
    useCallback(() => {
      async function cargarDatos() {
        const [prof, st, rt] = await Promise.all([
          getCurrentProfile(),
          getTouristStats(),
          getUserChallenges(),
        ]);
        setPerfil(prof);
        setStats(st);
        setRetos(rt);
        setCargando(false);
      }
      cargarDatos();
    }, []),
  );

  async function salir() {
    await signOut();
    router.replace('/auth');
  }

  if (cargando || !stats) {
    return (
      <SafeAreaView style={styles.pantallaCargando}>
        <ActivityIndicator size="large" color={Colors.primario} />
        <Text style={styles.cargandoTexto}>Cargando tu perfil de explorador...</Text>
      </SafeAreaView>
    );
  }

  const userProfile = perfil || MOCK_PROFILE;
  const inicial = userProfile.fullName.charAt(0).toUpperCase();

  // Rangos de nivel basados en puntos
  const getNivel = (pts: number) => {
    if (pts >= 400) return { nombre: 'Gran Cartógrafo 🗺️', rango: 'Nivel 3' };
    if (pts >= 150) return { nombre: 'Explorador 🎒', rango: 'Nivel 2' };
    return { nombre: 'Turista Semilla 🌱', rango: 'Nivel 1' };
  };

  const nivelInfo = getNivel(stats.points);

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        
        {/* Bloque Encabezado Perfil */}
        <View style={styles.tarjetaUsuario}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTexto}>{inicial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nombreUsuario}>{userProfile.fullName}</Text>
            <Text style={styles.correoUsuario}>{userProfile.email}</Text>
            <View style={styles.nivelBadge}>
              <Text style={styles.nivelRango}>{nivelInfo.rango}</Text>
              <Text style={styles.nivelNombre}> · {nivelInfo.nombre}</Text>
            </View>
          </View>
        </View>

        {/* Puntos de Recompensa */}
        <View style={styles.tarjetaPuntos}>
          <View style={{ gap: 4 }}>
            <Text style={styles.puntosEtiqueta}>Puntos Acumulados</Text>
            <Text style={styles.puntosValor}>{stats.points} pts</Text>
          </View>
          <Trophy size={36} color={Colors.amarilloSol} strokeWidth={1.8} />
        </View>

        {/* Panel de administración — visible solo para correos de constants/admins.ts */}
        {esAdmin(userProfile.email) && (
          <Pressable onPress={() => router.push('/admin')} style={styles.tarjetaInsight}>
            <View style={[styles.insightIcono, { backgroundColor: Colors.acento }]}>
              <ShieldCheck size={20} color={Colors.superficie} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.insightTitulo}>Panel de administración</Text>
              <Text style={styles.insightSubtitulo}>Datos por categoría de los lugares registrados</Text>
            </View>
            <ChevronRight size={20} color={Colors.textoSuave} />
          </Pressable>
        )}

        {/* Acceso al panel de inteligencia territorial (pantalla 17) */}
        <Pressable onPress={() => router.push('/insights')} style={styles.tarjetaInsight}>
          <View style={styles.insightIcono}>
            <Layers size={20} color={Colors.superficie} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitulo}>Inteligencia Territorial</Text>
            <Text style={styles.insightSubtitulo}>Dónde crece el twin y hay oportunidad real</Text>
          </View>
          <ChevronRight size={20} color={Colors.textoSuave} />
        </Pressable>

        {/* Grid de Estadísticas Territoriales */}
        <Text style={styles.seccionTitulo}>Tu Huella en el Gemelo Digital</Text>
        <View style={styles.gridStats}>
          <View style={styles.tarjetaStat}>
            <Compass size={20} color={Colors.primario} />
            <Text style={styles.statValor}>{stats.uniqueDepartmentsCount} / 14</Text>
            <Text style={styles.statEtiqueta}>Departamentos</Text>
            <Text style={styles.statNota}>Zonas físicas visitadas.</Text>
          </View>
          <View style={styles.tarjetaStat}>
            <MapPin size={20} color={Colors.acento} />
            <Text style={styles.statValor}>{stats.placesCreatedCount}</Text>
            <Text style={styles.statEtiqueta}>Lugares Creados</Text>
            <Text style={styles.statNota}>Puntos añadidos al Twin.</Text>
          </View>
          <View style={styles.tarjetaStat}>
            <Camera size={20} color={Colors.primario} />
            <Text style={styles.statValor}>{stats.totalPhotosCount}</Text>
            <Text style={styles.statEtiqueta}>Fotos UGC</Text>
            <Text style={styles.statNota}>Fotos subidas al mapa.</Text>
          </View>
        </View>

        {/* Insignias de Logro Desbloqueadas */}
        <Text style={styles.seccionTitulo}>Insignias y Logros</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filaInsignias}>
          {/* Fotógrafo de Oro */}
          <View style={[styles.insigniaBox, stats.totalPhotosCount === 0 && styles.insigniaBoxBloqueada]}>
            <Award size={26} color={stats.totalPhotosCount > 0 ? Colors.amarilloSol : Colors.textoSuave} />
            <Text style={styles.insigniaTitulo}>Fotógrafo</Text>
            <Text style={styles.insigniaSubtitulo}>{stats.totalPhotosCount > 0 ? 'Desbloqueado' : 'Sube 1 foto'}</Text>
          </View>

          {/* Mapeador Fundador */}
          <View style={[styles.insigniaBox, stats.placesCreatedCount === 0 && styles.insigniaBoxBloqueada]}>
            <Award size={26} color={stats.placesCreatedCount > 0 ? Colors.acento : Colors.textoSuave} />
            <Text style={styles.insigniaTitulo}>Fundador</Text>
            <Text style={styles.insigniaSubtitulo}>{stats.placesCreatedCount > 0 ? 'Desbloqueado' : 'Crea 1 lugar'}</Text>
          </View>

          {/* Viajero de Departamentos */}
          <View style={[styles.insigniaBox, stats.uniqueDepartmentsCount < 3 && styles.insigniaBoxBloqueada]}>
            <Award size={26} color={stats.uniqueDepartmentsCount >= 3 ? Colors.primario : Colors.textoSuave} />
            <Text style={styles.insigniaTitulo}>Nómada</Text>
            <Text style={styles.insigniaSubtitulo}>{stats.uniqueDepartmentsCount >= 3 ? 'Desbloqueado' : '3 Deptos'}</Text>
          </View>
        </ScrollView>

        {/* Lista de Retos */}
        <Text style={styles.seccionTitulo}>Retos de la Comunidad</Text>
        <View style={styles.listaRetos}>
          {retos.map((r) => {
            const completado = r.status === 'completed';
            return (
              <View key={r.id} style={[styles.tarjetaReto, completado && styles.tarjetaRetoCompletado]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.retoTitulo, completado && styles.retoTituloCompletado]}>
                      {r.title}
                    </Text>
                    {completado && <CheckCircle size={14} color={Colors.exito} />}
                  </View>
                  <Text style={styles.retoDescripcion}>{r.description}</Text>
                  <Text style={styles.retoPuntos}>Recompensa: +{r.pointsReward} pts</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Acción Cerrar Sesión */}
        <Pressable onPress={salir} style={styles.botonCerrarSesion}>
          <LogOut size={16} color={Colors.rojoAnil} />
          <Text style={styles.botonCerrarSesionTexto}>Cerrar Sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  pantallaCargando: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.m },
  cargandoTexto: { ...Type.nota, color: Colors.textoSuave },
  contenido: { padding: Spacing.l, gap: Spacing.l, paddingBottom: Spacing.xl },
  tarjetaUsuario: {
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
  avatar: {
    width: 60,
    height: 60,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: {
    fontSize: 24,
    fontFamily: Fonts.displayBold,
    color: Colors.superficie,
  },
  nombreUsuario: {
    ...Type.cuerpoDestacado,
    fontSize: 18,
    color: Colors.texto,
    fontFamily: Fonts.cuerpoBold,
  },
  correoUsuario: {
    ...Type.nota,
    color: Colors.textoSuave,
    marginTop: 2,
  },
  nivelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  nivelRango: {
    ...Type.etiqueta,
    fontSize: 9,
    color: Colors.acento,
  },
  nivelNombre: {
    ...Type.nota,
    fontSize: 11,
    color: Colors.textoSuave,
  },
  tarjetaPuntos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.tinta,
    borderRadius: Radius.m,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.tintaOscura,
    padding: Spacing.m,
  },
  puntosEtiqueta: {
    ...Type.etiqueta,
    fontSize: 10,
    color: Colors.azulLago,
  },
  puntosValor: {
    fontSize: 24,
    fontFamily: Fonts.displayBold,
    color: Colors.superficie,
    marginTop: 4,
  },
  seccionTitulo: {
    ...Type.subtitulo,
    fontSize: 15,
    color: Colors.texto,
    fontFamily: Fonts.display,
    marginTop: Spacing.s,
  },
  tarjetaInsight: {
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
  insightIcono: {
    width: 44,
    height: 44,
    borderRadius: Radius.s,
    backgroundColor: Colors.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitulo: {
    ...Type.cuerpoDestacado,
    fontSize: 15,
    color: Colors.texto,
    fontFamily: Fonts.cuerpoBold,
  },
  insightSubtitulo: {
    ...Type.nota,
    fontSize: 12,
    color: Colors.textoSuave,
    marginTop: 2,
  },
  gridStats: {
    flexDirection: 'row',
    gap: Spacing.s,
  },
  tarjetaStat: {
    flex: 1,
    backgroundColor: Colors.superficie,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    borderRadius: Radius.m,
    padding: Spacing.s,
    alignItems: 'center',
    gap: 4,
  },
  statValor: {
    fontSize: 18,
    fontFamily: Fonts.displayBold,
    color: Colors.texto,
    marginTop: 2,
  },
  statEtiqueta: {
    ...Type.etiqueta,
    fontSize: 8,
    color: Colors.texto,
    textAlign: 'center',
  },
  statNota: {
    ...Type.nota,
    fontSize: 9,
    color: Colors.textoSuave,
    textAlign: 'center',
    lineHeight: 12,
  },
  filaInsignias: {
    gap: Spacing.s,
  },
  insigniaBox: {
    backgroundColor: Colors.superficie,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    borderRadius: Radius.m,
    padding: Spacing.m,
    alignItems: 'center',
    width: 110,
    gap: 4,
  },
  insigniaBoxBloqueada: {
    opacity: 0.45,
    backgroundColor: Colors.rellenoSuave,
  },
  insigniaTitulo: {
    ...Type.cuerpoDestacado,
    fontSize: 12,
    color: Colors.texto,
  },
  insigniaSubtitulo: {
    ...Type.nota,
    fontSize: 9,
    color: Colors.textoSuave,
  },
  listaRetos: {
    gap: Spacing.s,
  },
  tarjetaReto: {
    backgroundColor: Colors.superficie,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    borderRadius: Radius.m,
    padding: Spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tarjetaRetoCompletado: {
    borderColor: Colors.exito,
    borderBottomColor: '#25A255',
  },
  retoTitulo: {
    ...Type.cuerpoDestacado,
    fontSize: 14,
    color: Colors.texto,
  },
  retoTituloCompletado: {
    color: Colors.textoSuave,
    textDecorationLine: 'line-through',
  },
  retoDescripcion: {
    ...Type.nota,
    fontSize: 12,
    color: Colors.textoSuave,
  },
  retoPuntos: {
    ...Type.etiqueta,
    fontSize: 9,
    color: Colors.primario,
    marginTop: 2,
  },
  botonCerrarSesion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Spacing.l,
    alignSelf: 'center',
  },
  botonCerrarSesionTexto: {
    ...Type.cuerpoDestacado,
    fontSize: 14,
    color: Colors.rojoAnil,
  },
});
