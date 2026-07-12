import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Type } from '../constants/theme';

interface Props {
  /** Fuentes de imagen (require() locales o { uri } remotas), en el orden de la galería. */
  fotos: any[];
  /** Foto que se tocó para abrir el visor. */
  indiceInicial: number;
  visible: boolean;
  onClose: () => void;
}

/** Visor de fotos a pantalla completa con swipe horizontal entre todas las del lugar. */
export function VisorFotos({ fotos, indiceInicial, visible, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const [indice, setIndice] = useState(indiceInicial);

  useEffect(() => {
    if (visible) setIndice(indiceInicial);
  }, [visible, indiceInicial]);

  if (!visible || fotos.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.fondo}>
        <FlatList
          data={fotos}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          initialScrollIndex={indiceInicial}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndice(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
              <Image source={item} style={{ width, height: height * 0.75 }} contentFit="contain" />
            </View>
          )}
        />
        <SafeAreaView edges={['top']} style={styles.superpuesto} pointerEvents="box-none">
          <Pressable onPress={onClose} style={styles.cerrar} hitSlop={12}>
            <X size={22} color={Colors.superficie} strokeWidth={2.4} />
          </Pressable>
          {fotos.length > 1 && (
            <View style={styles.contador}>
              <Text style={styles.contadorTexto}>
                {indice + 1} / {fotos.length}
              </Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(10,14,12,0.97)' },
  superpuesto: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.m,
    paddingTop: Spacing.s,
  },
  cerrar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contador: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 999,
    paddingHorizontal: Spacing.m,
    paddingVertical: 8,
  },
  contadorTexto: { ...Type.nota, color: Colors.superficie, fontSize: 12 },
});
