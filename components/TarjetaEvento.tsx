import { ChevronRight, MapPin } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { EventItem } from '../constants/mock';
import { Colors, Peana, Radius, Spacing, Type } from '../constants/theme';

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

interface Props {
  evento: EventItem;
  /** Abre el detalle del evento (fotos de otros años + ubicación exacta). */
  onPress?: () => void;
}

export function TarjetaEvento({ evento, onPress }: Props) {
  const fecha = new Date(evento.date);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.fecha}>
        <Text style={styles.fechaDia}>{fecha.getDate()}</Text>
        <Text style={styles.fechaMes}>{MESES[fecha.getMonth()]}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.titulo} numberOfLines={1}>
          {evento.title}
        </Text>
        <Text style={styles.descripcion} numberOfLines={2}>
          {evento.description}
        </Text>
        <View style={styles.fila}>
          <MapPin size={12} color={Colors.acento} />
          <Text style={styles.departamento}>{evento.department}</Text>
        </View>
      </View>
      {onPress && <ChevronRight size={18} color={Colors.textoSuave} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.m,
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.m,
    alignItems: 'center',
  },
  fecha: {
    width: 54,
    height: 60,
    borderRadius: Radius.s,
    backgroundColor: Colors.tinta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fechaDia: { ...Type.subtitulo, fontSize: 22, color: Colors.textoInvertido },
  fechaMes: { ...Type.etiqueta, fontSize: 10, color: Colors.amarilloSol },
  titulo: { ...Type.cuerpoDestacado, color: Colors.texto },
  descripcion: { ...Type.nota, color: Colors.textoSuave },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  departamento: { ...Type.nota, fontSize: 12, color: Colors.acento },
});
