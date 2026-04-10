import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';

import { useAuth } from '../contexts/AuthContext';
import type { RootStackParamList } from '../navigation';

type Props = StackScreenProps<RootStackParamList, 'Login'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }: Props) {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canResetPassword = useMemo(() => EMAIL_PATTERN.test(email.trim()), [email]);

  const validate = () => {
    const nextErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      nextErrors.email = 'Entrá con un email valido.';
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = 'Ese email no parece estar en juego.';
    }

    if (!password) {
      nextErrors.password = 'La contrasena no puede quedar vacia.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});
      await signIn({
        email: email.trim(),
        password,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos meterte en la cancha.';
      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!canResetPassword) {
      setErrors((current) => ({
        ...current,
        email: 'Escribi un email valido para recuperar la contrasena.',
      }));
      return;
    }

    try {
      await resetPassword(email.trim());
      Alert.alert('Recuperacion enviada', 'Te mandamos un email para resetear la contrasena.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo enviar el email de recuperacion.';
      Alert.alert('Error', message);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.backdrop}>
        <View style={styles.backdropField} />
        <View style={styles.backdropBorder} />
        <View style={styles.backdropCircleLeft} />
        <View style={styles.backdropCircleRight} />
      </View>

      <View style={styles.centered}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.emoji}>⚽</Text>
            <Text style={styles.title}>
              Hecho por futboleros{`\n`}para futboleros
            </Text>
            <Text style={styles.description}>
              Entrá a tu equipo, organizá partidos y no pierdas ni una convocatoria.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>📧 Email</Text>
              <TextInput
                style={styles.input}
                placeholder="nombre@club.com"
                placeholderTextColor="#6B7280"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>🔒 Contrasena</Text>
              <TextInput
                style={styles.input}
                placeholder="Tu clave del vestuario"
                placeholderTextColor="#6B7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
              />
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            {errors.general ? <Text style={styles.messageText}>{errors.general}</Text> : null}

            <Pressable
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>
                {isSubmitting ? 'Entrando...' : 'ENTRAR A LA CANCHA'}
              </Text>
            </Pressable>

            <Pressable onPress={handleResetPassword}>
              <Text style={styles.secondaryLink}>¿Olvidaste la contrasena?</Text>
            </Pressable>

            <Pressable onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.inlineText}>
                ¿No tenes equipo? <Text style={styles.inlineTextHighlight}>Registrate</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2,
    pointerEvents: 'none',
  },
  backdropBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  backdropCircleLeft: {
    position: 'absolute',
    left: '-20%',
    top: 64,
    width: 288,
    height: 288,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backdropCircleRight: {
    position: 'absolute',
    right: '-15%',
    bottom: 96,
    width: 256,
    height: 256,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,112,67,0.2)',
  },
  backdropField: {
    flex: 1,
    backgroundColor: '#2E7D32',
  },
  button: {
    marginTop: 8,
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: '#FF7043',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(16,38,20,0.9)',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
  },
  description: {
    marginTop: 12,
    textAlign: 'center',
    color: '#DDE9DE',
    fontSize: 14,
    lineHeight: 24,
  },
  emoji: {
    fontSize: 64,
  },
  errorText: {
    marginTop: 8,
    color: '#FFB199',
    fontSize: 14,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  form: {
    marginTop: 32,
  },
  header: {
    alignItems: 'center',
  },
  inlineText: {
    textAlign: 'center',
    color: '#DDE9DE',
    fontSize: 14,
  },
  inlineTextHighlight: {
    color: '#FF7043',
    fontWeight: '900',
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#132016',
    fontSize: 16,
  },
  label: {
    marginBottom: 8,
    color: '#EAF5EA',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  messageText: {
    color: '#FFB199',
    fontSize: 14,
    marginBottom: 8,
  },
  screen: {
    flex: 1,
    backgroundColor: '#16361C',
    paddingHorizontal: 24,
    paddingVertical: 56,
  },
  secondaryLink: {
    textAlign: 'center',
    color: '#EAF5EA',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    marginTop: 16,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});