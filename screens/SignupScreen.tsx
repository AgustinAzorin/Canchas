import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';

import { useAuth } from '../contexts/AuthContext';
import type { RootStackParamList } from '../navigation';

type Props = StackScreenProps<RootStackParamList, 'Signup'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const nextErrors: typeof errors = {};

    if (fullName.trim() && fullName.trim().length < 3) {
      nextErrors.fullName = 'Si vas a cargar nombre, que tenga al menos 3 caracteres.';
    }

    if (!email.trim()) {
      nextErrors.email = 'Necesitamos un email para armar tu ficha.';
    } else if (!EMAIL_PATTERN.test(email.trim())) {
      nextErrors.email = 'Email invalido.';
    }

    if (!password) {
      nextErrors.password = 'Defini una contrasena.';
    } else if (password.length < 6) {
      nextErrors.password = 'La contrasena debe tener al menos 6 caracteres.';
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Las contrasenas no coinciden.';
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
      setMessage(null);
      await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
      setMessage('Revisa tu correo para confirmar tu cuenta. Despues volve para entrar al partido.');
      setPassword('');
      setConfirmPassword('');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'No se pudo crear la cuenta.';
      setErrors({ general: text });
    } finally {
      setIsSubmitting(false);
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
            <Text style={styles.emoji}>🥅</Text>
            <Text style={styles.title}>Armá tu equipo</Text>
            <Text style={styles.description}>
              Registrate y recibi el mail de confirmacion para empezar a jugar.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>👤 Nombre completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Tu nombre o apodo"
                placeholderTextColor="#6B7280"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
              {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
            </View>

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
              <Text style={styles.label}>🔐 Contrasena</Text>
              <TextInput
                style={styles.input}
                placeholder="Minimo 6 caracteres"
                placeholderTextColor="#6B7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
              />
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>✅ Confirmar contrasena</Text>
              <TextInput
                style={styles.input}
                placeholder="Repeti la contrasena"
                placeholderTextColor="#6B7280"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
              />
              {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
            </View>

            {errors.general ? <Text style={styles.messageText}>{errors.general}</Text> : null}
            {message ? <Text style={styles.successText}>{message}</Text> : null}

            <Pressable
              style={[styles.button, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>
                {isSubmitting ? 'Creando cuenta...' : 'CREAR CUENTA'}
              </Text>
            </Pressable>

            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={styles.inlineText}>
                Ya tengo equipo, <Text style={styles.inlineTextHighlight}>quiero entrar</Text>
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
    top: 80,
    width: 288,
    height: 288,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  backdropCircleRight: {
    position: 'absolute',
    right: '-15%',
    bottom: 64,
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
  successText: {
    color: '#C9F7CE',
    fontSize: 14,
    marginBottom: 8,
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