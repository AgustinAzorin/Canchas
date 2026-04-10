import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo cerrar la sesion.';
      Alert.alert('Error', message);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <View>
          <Text style={styles.badge}>Scout-tracker</Text>
          <Text style={styles.title}>Bienvenido al tercer tiempo</Text>
          <Text style={styles.subtitle}>¡Bienvenido, {user?.email ?? 'jugador'}!</Text>
          <Text style={styles.body}>
            Tu stack de autenticacion ya esta conectado con Supabase y persiste la sesion con AsyncStorage.
          </Text>
        </View>

        <Pressable style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>CERRAR SESION</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    color: '#FFB199',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  body: {
    marginTop: 8,
    color: '#B6CDB9',
    fontSize: 14,
    lineHeight: 24,
  },
  button: {
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: '#FF7043',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  card: {
    flex: 1,
    justifyContent: 'space-between',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#102614',
    paddingHorizontal: 24,
    paddingVertical: 32,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  screen: {
    flex: 1,
    backgroundColor: '#16361C',
    paddingHorizontal: 24,
    paddingVertical: 64,
  },
  subtitle: {
    marginTop: 16,
    color: '#E8F1E9',
    fontSize: 16,
    lineHeight: 28,
  },
  title: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 42,
  },
});