import { FileSpreadsheet, FileText, Share2, Users } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, Peana, Radius, Spacing, Type } from '../../constants/theme';
import {
  construirCsvCategorias,
  construirCsvUsuarios,
  construirReporteGeneral,
  getAdminMetrics,
  getAdminUsers,
} from '../../lib/queries/admin';

type TipoReporte = 'general' | 'categorias' | 'usuarios';

interface DefReporte {
  tipo: TipoReporte;
  Icono: typeof FileText;
  titulo: string;
  descripcion: string;
}

const REPORTES: DefReporte[] = [
  {
    tipo: 'general',
    Icono: FileText,
    titulo: 'Reporte general',
    descripcion: 'Resumen ejecutivo del twin: usuarios, lugares, fotos y negocios, listo para WhatsApp o correo.',
  },
  {
    tipo: 'categorias',
    Icono: FileSpreadsheet,
    titulo: 'Lugares por categoría (CSV)',
    descripcion: 'Conteo de lugares registrados por categoría, en formato CSV para Excel/Sheets.',
  },
  {
    tipo: 'usuarios',
    Icono: Users,
    titulo: 'Usuarios (CSV)',
    descripcion: 'Listado de cuentas con tipo, puntos y fecha de registro, en formato CSV.',
  },
];

/** Reportes admin — genera el contenido con datos vivos y abre el Share nativo. */
export default function AdminReportes() {
  const [generando, setGenerando] = useState<TipoReporte | null>(null);

  async function generar(tipo: TipoReporte) {
    setGenerando(tipo);
    try {
      let contenido = '';
      let titulo = '';
      if (tipo === 'general') {
        contenido = construirReporteGeneral(await getAdminMetrics());
        titulo = 'Spotmi — Reporte general';
      } else if (tipo === 'categorias') {
        contenido = construirCsvCategorias(await getAdminMetrics());
        titulo = 'Spotmi — Lugares por categoría (CSV)';
      } else {
        contenido = construirCsvUsuarios(await getAdminUsers());
        titulo = 'Spotmi — Usuarios (CSV)';
      }
      await Share.share({ message: contenido, title: titulo });
    } catch (e: any) {
      Alert.alert('No se pudo generar', e?.message ?? 'Intenta de nuevo.');
    } finally {
      setGenerando(null);
    }
  }

  return (
    <SafeAreaView style={styles.pantalla} edges={['top']}>
      <View style={styles.encabezado}>
        <Text style={styles.etiqueta}>Spotmi · Administración</Text>
        <Text style={styles.titulo}>Reportes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.contenido} showsVerticalScrollIndicator={false}>
        <Text style={styles.nota}>
          Los reportes se generan al momento con los datos vivos del twin y se comparten con la hoja
          nativa del sistema (WhatsApp, correo, guardar en archivos…).
        </Text>

        {REPORTES.map((r) => (
          <View key={r.tipo} style={styles.card}>
            <View style={styles.cardFila}>
              <View style={styles.icono}>
                <r.Icono size={20} color={Colors.primario} strokeWidth={2} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.cardTitulo}>{r.titulo}</Text>
                <Text style={styles.cardDescripcion}>{r.descripcion}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => generar(r.tipo)}
              disabled={generando !== null}
              style={({ pressed }) => [
                styles.botonGenerar,
                (pressed || generando === r.tipo) && { opacity: 0.85 },
                generando !== null && generando !== r.tipo && { opacity: 0.5 },
              ]}>
              <Share2 size={15} color={Colors.superficie} strokeWidth={2.4} />
              <Text style={styles.botonGenerarTexto}>
                {generando === r.tipo ? 'Generando…' : 'Generar y compartir'}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
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
  },
  etiqueta: { ...Type.etiqueta, fontSize: 10, color: Colors.acento },
  titulo: { ...Type.subtitulo, fontSize: 20, color: Colors.texto, fontFamily: Fonts.display },
  contenido: { padding: Spacing.l, gap: Spacing.m, paddingBottom: Spacing.xl },
  nota: { ...Type.nota, color: Colors.textoSuave },
  card: {
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.m,
    gap: Spacing.m,
  },
  cardFila: { flexDirection: 'row', gap: Spacing.m },
  icono: {
    width: 42,
    height: 42,
    borderRadius: Radius.s,
    backgroundColor: Colors.rellenoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitulo: { ...Type.cuerpoDestacado, fontSize: 15, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
  cardDescripcion: { ...Type.nota, fontSize: 12, color: Colors.textoSuave, lineHeight: 17 },
  botonGenerar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primario,
    borderRadius: Radius.s,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.primarioOscuro,
    paddingVertical: 10,
  },
  botonGenerarTexto: { ...Type.cuerpoDestacado, fontSize: 13, color: Colors.superficie },
});
