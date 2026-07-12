import { Heart, MessageCircle, Send } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, Fonts, Peana, Radius, Spacing, Type } from '../constants/theme';
import { addComment, CommentItem, CommentTarget, getComments, toggleReaction } from '../lib/queries/comments';

interface Props {
  targetType: CommentTarget;
  targetId: string;
}

function tiempoRelativo(iso: string): string {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

/**
 * Comentarios de la comunidad — planos (sin respuestas), con reacción de
 * corazón (una por usuario, toggle). Se monta en fichas de lugar/negocio y
 * en el detalle de evento.
 */
export function Comentarios({ targetType, targetId }: Props) {
  const [comentarios, setComentarios] = useState<CommentItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [texto, setTexto] = useState('');
  const [publicando, setPublicando] = useState(false);

  const cargar = useCallback(() => {
    getComments(targetType, targetId).then((cs) => {
      setComentarios(cs);
      setCargando(false);
    });
  }, [targetType, targetId]);

  useEffect(cargar, [cargar]);

  async function publicar() {
    if (!texto.trim()) return;
    setPublicando(true);
    const { error } = await addComment(targetType, targetId, texto);
    setPublicando(false);
    if (error) {
      Alert.alert('No se pudo comentar', error);
      return;
    }
    setTexto('');
    cargar();
  }

  async function reaccionar(c: CommentItem) {
    // Optimista: el corazón responde al instante y el backend concilia.
    setComentarios((prev) =>
      prev.map((x) =>
        x.id === c.id ? { ...x, likedByMe: !x.likedByMe, likes: x.likes + (x.likedByMe ? -1 : 1) } : x,
      ),
    );
    const { error } = await toggleReaction(c.id);
    if (error) {
      Alert.alert('No se pudo reaccionar', error);
      cargar();
    }
  }

  return (
    <View style={styles.seccion}>
      <View style={styles.filaTitulo}>
        <MessageCircle size={15} color={Colors.acento} strokeWidth={2.4} />
        <Text style={styles.titulo}>Comentarios{comentarios.length > 0 ? ` (${comentarios.length})` : ''}</Text>
      </View>

      {/* Escribir */}
      <View style={styles.cajaInput}>
        <TextInput
          style={styles.input}
          placeholder="Comparte tu experiencia..."
          placeholderTextColor={Colors.textoSuave}
          value={texto}
          onChangeText={setTexto}
          multiline
          maxLength={500}
        />
        <Pressable onPress={publicar} disabled={publicando || !texto.trim()} style={styles.botonEnviar} hitSlop={8}>
          {publicando ? (
            <ActivityIndicator size="small" color={Colors.superficie} />
          ) : (
            <Send size={16} color={Colors.superficie} strokeWidth={2.4} />
          )}
        </Pressable>
      </View>

      {cargando ? (
        <ActivityIndicator size="small" color={Colors.primario} style={{ marginVertical: Spacing.m }} />
      ) : comentarios.length === 0 ? (
        <Text style={styles.vacio}>Sé la primera persona en comentar.</Text>
      ) : (
        <View style={{ gap: Spacing.s }}>
          {comentarios.map((c) => (
            <View key={c.id} style={styles.comentario}>
              <View style={styles.comentarioEncabezado}>
                <Text style={styles.autor}>
                  {c.author}
                  {c.mine ? ' (tú)' : ''}
                </Text>
                <Text style={styles.fecha}>{tiempoRelativo(c.createdAt)}</Text>
              </View>
              <Text style={styles.contenido}>{c.content}</Text>
              <Pressable onPress={() => reaccionar(c)} style={styles.filaCorazon} hitSlop={8}>
                <Heart
                  size={15}
                  color={c.likedByMe ? Colors.acento : Colors.textoSuave}
                  fill={c.likedByMe ? Colors.acento : 'transparent'}
                  strokeWidth={2.2}
                />
                {c.likes > 0 && (
                  <Text style={[styles.likes, c.likedByMe && { color: Colors.acento }]}>{c.likes}</Text>
                )}
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  seccion: { gap: Spacing.s, marginTop: Spacing.m },
  filaTitulo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titulo: { ...Type.subtitulo, fontSize: 16, color: Colors.texto },
  cajaInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.s,
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    padding: Spacing.s,
  },
  input: {
    flex: 1,
    ...Type.cuerpo,
    fontSize: 14,
    color: Colors.texto,
    maxHeight: 90,
    paddingHorizontal: Spacing.s,
    paddingVertical: 6,
  },
  botonEnviar: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primario,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vacio: { ...Type.nota, fontSize: 12, color: Colors.textoSuave, marginVertical: Spacing.s },
  comentario: {
    backgroundColor: Colors.superficie,
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.borde,
    borderBottomWidth: Peana.grosor,
    borderBottomColor: Colors.bordeOscuro,
    padding: Spacing.m,
    gap: 4,
  },
  comentarioEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  autor: { ...Type.cuerpoDestacado, fontSize: 13, color: Colors.texto, fontFamily: Fonts.cuerpoBold },
  fecha: { ...Type.nota, fontSize: 11, color: Colors.textoSuave },
  contenido: { ...Type.cuerpo, fontSize: 14, color: Colors.texto },
  filaCorazon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingTop: 2,
  },
  likes: { ...Type.nota, fontSize: 12, color: Colors.textoSuave },
});
