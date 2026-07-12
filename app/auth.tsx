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
import Svg, { Path } from 'react-native-svg';
import { Boton } from '../components/Boton';
import { Campo } from '../components/Campo';
import { Wordmark } from '../components/Wordmark';
import { Colors, Radius, Spacing, Type } from '../constants/theme';
import { signIn, signUp, signInWithGoogle } from '../lib/queries/auth';

type Modo = 'login' | 'registro';

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#EA4335"
        d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 14.99.75 12 .75c-4.63 0-8.6 2.67-10.49 6.56l4.1 3.18C6.58 7.37 9.07 5.04 12 5.04z"
      />
      <Path
        fill="#4285F4"
        d="M23.49 12.27c0-.81-.07-1.6-.2-2.3H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2 3.7-4.99 3.7-8.68z"
      />
      <Path
        fill="#FBBC05"
        d="M5.61 14.61c-.24-.73-.38-1.5-.38-2.3s.14-1.57.38-2.3L1.51 6.83C.55 8.79 0 10.96 0 13.25s.55 4.46 1.51 6.42l4.1-3.06z"
      />
      <Path
        fill="#34A853"
        d="M12 23.25c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.89c-1.03.69-2.35 1.1-4.23 1.1-3.24 0-5.99-2.19-6.97-5.13l-4.1 3.17c2.04 4.07 6.27 6.76 11.07 6.76z"
      />
    </Svg>
  );
}

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
              icono={<GoogleIcon size={18} />}
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
