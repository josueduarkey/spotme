import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EventItem } from '../constants/mock';
import { Colors, Peana, Radius, Spacing, Type } from '../constants/theme';

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

interface Props {
  evento: EventItem;
}

export function TarjetaEvento({ evento }: Props) {
  const fecha = new Date(evento.date);
  return (
    <View style={styles.card}>
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
        <Text style={styles.departamento}>📍 {evento.department}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.m,
    backgroundColor: Colors.blanco,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.madera,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.maderaOscura,
    padding: Spacing.m,
    alignItems: 'center',
  },
  fecha: {
    width: 54,
    height: 60,
    borderRadius: Radius.s,
    backgroundColor: Colors.selva,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fechaDia: { ...Type.subtitulo, fontSize: 22, color: Colors.textoInvertido },
  fechaMes: { ...Type.etiqueta, fontSize: 10, color: Colors.turquesa },
  titulo: { ...Type.cuerpoDestacado, color: Colors.texto },
  descripcion: { ...Type.nota, color: Colors.textoSuave },
  departamento: { ...Type.nota, fontSize: 12, color: Colors.tierra, marginTop: 2 },
});
