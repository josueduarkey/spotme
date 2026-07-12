import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Boton } from '../components/Boton';
import { Campo } from '../components/Campo';
import { Wordmark } from '../components/Wordmark';
import { Colors, Radius, Spacing, Type } from '../constants/theme';
import { signIn, signUp, signInWithGoogle } from '../lib/queries/auth';

type Modo = 'login' | 'registro';

/** Pantalla 2 — Login / Registro. */
export default function Auth() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esLogin = modo === 'login';

  async function enviar() {
    setCargando(true);
    setError(null);
    const res = esLogin ? await signIn(email, password) : await signUp(nombre, email, password);
    setCargando(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.profile?.accountType) {
      router.replace(res.profile.accountType === 'turista' ? '/home' : '/business-dashboard');
    } else {
      router.push('/account-type');
    }
  }

  async function conectarGoogle() {
    setCargandoGoogle(true);
    setError(null);
    const res = await signInWithGoogle();
    setCargandoGoogle(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.profile?.accountType) {
      router.replace(res.profile.accountType === 'turista' ? '/home' : '/business-dashboard');
    } else {
      router.push('/account-type');
    }
  }

  return (
    <SafeAreaView style={styles.pantalla}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
          <View style={styles.encabezado}>
            <Wordmark tamano={36} />
            <Text style={styles.titulo}>
              {esLogin ? 'Qué bueno verte de nuevo' : 'Empieza a recorrer el mapa'}
            </Text>
          </View>

          <View style={styles.selector}>
            {(['login', 'registro'] as Modo[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setModo(m);
                  setError(null);
                }}
                style={[styles.pestana, modo === m && styles.pestanaActiva]}>
                <Text style={[styles.pestanaTexto, modo === m && styles.pestanaTextoActivo]}>
                  {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.formulario}>
            {!esLogin && (
              <Campo
                etiqueta="Nombre"
                placeholder="Tu nombre completo"
                value={nombre}
                onChangeText={setNombre}
                autoCapitalize="words"
              />
            )}
            <Campo
              etiqueta="Correo"
              placeholder="tu@correo.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Campo
              etiqueta="Contraseña"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Boton
              titulo={esLogin ? 'Entrar' : 'Crear mi cuenta'}
              onPress={enviar}
              cargando={cargando}
              style={{ marginTop: Spacing.s }}
            />

            <View style={styles.divisorContenedor}>
              <View style={styles.lineaDivisor} />
              <Text style={styles.textoDivisor}>o bien</Text>
              <View style={styles.lineaDivisor} />
            </View>

            <Boton
              titulo="Continuar con Google"
              onPress={conectarGoogle}
              cargando={cargandoGoogle}
              variante="secundario"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.fondo },
  contenido: { padding: Spacing.l, gap: Spacing.l, flexGrow: 1 },
  encabezado: { gap: Spacing.m, marginTop: Spacing.l },
  titulo: { ...Type.titulo, color: Colors.texto },
  selector: {
    flexDirection: 'row',
    backgroundColor: Colors.borde,
    borderRadius: Radius.pill,
    padding: 4,
  },
  pestana: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  pestanaActiva: { backgroundColor: Colors.superficie },
  pestanaTexto: { ...Type.cuerpoDestacado, fontSize: 15, color: Colors.textoSuave },
  pestanaTextoActivo: { color: Colors.primario },
  formulario: { gap: Spacing.m },
  error: { ...Type.nota, color: Colors.error },
  divisorContenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    marginVertical: Spacing.s,
  },
  lineaDivisor: {
    flex: 1,
    height: 1.5,
    backgroundColor: Colors.borde,
  },
  textoDivisor: {
    ...Type.nota,
    color: Colors.textoSuave,
    fontSize: 12,
  },
});
