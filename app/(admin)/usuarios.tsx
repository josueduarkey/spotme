import { useFocusEffect } from 'expo-router';
import { Store, Trophy, User } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Peana, Radius, Spacing, Type } from '../../constants/theme';
import { AdminUser, getAdminUsers } from '../../lib/queries/admin';

/** Usuarios admin — todas las cuentas del twin, ordenadas por puntos. */
export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<AdminUser[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      let vivo = true;
      getAdminUsers().then((u) => vivo && setUsuarios(u));
      return () => {
        vivo = false;
      };
    }, []),
  );

  function fechaCorta(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-SV', { day: 'numeric', month: 'short' });
  }

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <View style={styles.encabezado}>
        <Text style={styles.etiqueta}>Spotmi · Administración</Text>
        <Text style={styles.titulo}>Usuarios</Text>
        {usuarios && (
          <Text style={styles.subtitulo}>
            {usuarios.length} {usuarios.length === 1 ? 'cuenta registrada' : 'cuentas registradas'}
          </Text>
        )}
      </View>

      {!usuarios ? (
        <View style={styles.cargando}>
          <ActivityIndicator size="large" color={Colors.primario} />
        </View>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const negocio = item.accountType === 'negocio';
            const Icono = negocio ? Store : User;
            return (
              <View style={styles.fila}>
                <View style={[styles.avatar, negocio && { backgroundColor: Colors.acento }]}>
                  <Icono size={18} color={Colors.superficie} strokeWidth={2.2} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.nombre} numberOfLines={1}>
                    {item.fullName}
                  </Text>
                  <Text style={styles.detalle}>
                    {negocio ? 'Negocio' : item.accountType === 'turista' ? 'Turista' : 'Sin tipo'} · desde{' '}
                    {fechaCorta(item.createdAt)}
                  </Text>
                </View>
                <View style={styles.puntos}>
                  <Trophy size={13} color={Colors.amarilloSol} strokeWidth={2.2} />
                  <Text style={styles.puntosTexto}>{item.points}</Text>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  encabezado: {
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.borde,
    backgroundColor: Colors.superficie,
    gap: 2,
  },
  etiqueta: { ...Type.etiqueta, fontSize: 10, color: Colors.acento },
  titulo: { ...Type.subtitulo, fontSize: 20, color: Colors.texto, fontFamily: Fonts.display },
  subtitulo: { ...Type.nota, fontSize: 12, color: Colors.textoSuave },
  cargando: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lista: { padding: Spacing.l, gap: Spacing.s, paddingBottom: Spacing.xl },
  fila: {
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
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nombre: { ...Type.cuerpoDestacado, fontSize: 15, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
  detalle: { ...Type.nota, fontSize: 12, color: Colors.textoSuave },
  puntos: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  puntosTexto: { ...Type.cuerpoDestacado, fontSize: 14, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
});
