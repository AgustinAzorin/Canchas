import { ActivityIndicator, Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useEffect, useRef } from 'react';

import { useAuth } from '../contexts/AuthContext';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import MapScreen from '../screens/MapScreen';
import SignupScreen from '../screens/SignupScreen';

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  AppTabs: undefined;
};

export type AppTabParamList = {
  Mapa: undefined;
  Club: undefined;
  Torneos: undefined;
  Perfil: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#16361C',
    card: '#112A17',
    text: '#F7F9F7',
    border: 'rgba(255,255,255,0.08)',
    primary: '#FF7043',
    notification: '#FF7043',
  },
};

function LoadingScreen() {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.loadingContainer}>
      <Animated.Text style={[styles.loadingBall, { transform: [{ rotate }] }]}>
        ⚽
      </Animated.Text>
      <Text style={styles.loadingText}>Cargando vestuario</Text>
      <View style={styles.loadingSpinner}>
        <ActivityIndicator color="#FF7043" size="large" />
      </View>
    </View>
  );
}

function PlaceholderTabScreen({ emoji, subtitle, title }: { emoji: string; subtitle: string; title: string }) {
  return (
    <View style={styles.placeholderScreen}>
      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderEmoji}>{emoji}</Text>
        <Text style={styles.placeholderTitle}>{title}</Text>
        <Text style={styles.placeholderSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Mapa"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FF7043',
        tabBarInactiveTintColor: '#D6E4D7',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<keyof AppTabParamList, string> = {
            Mapa: '🗺️',
            Club: '🏟️',
            Torneos: '🏆',
            Perfil: '🧤',
          };

          return <Text style={[styles.tabIcon, { color, opacity: focused ? 1 : 0.76 }]}>{icons[route.name]}</Text>;
        },
        sceneStyle: styles.tabScene,
      })}
    >
      <Tab.Screen name="Mapa" component={MapScreen} />
      <Tab.Screen name="Club" component={HomeScreen} />
      <Tab.Screen name="Torneos">
        {() => (
          <PlaceholderTabScreen
            emoji="🏆"
            title="Torneos en preparación"
            subtitle="Pronto vas a poder seguir fixture, resultados y ligas barriales desde esta pestaña."
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Perfil">
        {() => (
          <PlaceholderTabScreen
            emoji="🧤"
            title="Perfil del jugador"
            subtitle="Acá vas a ver tus equipos, historial, nivel y ajustes personales."
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="AppTabs" component={AppTabs} />
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingBall: {
    fontSize: 64,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16361C',
  },
  loadingSpinner: {
    marginTop: 20,
  },
  loadingText: {
    marginTop: 24,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
  },
  placeholderCard: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#102614',
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 54,
  },
  placeholderScreen: {
    flex: 1,
    backgroundColor: '#16361C',
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderSubtitle: {
    marginTop: 12,
    textAlign: 'center',
    color: '#D6E4D7',
    fontSize: 15,
    lineHeight: 24,
  },
  placeholderTitle: {
    marginTop: 18,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  tabBar: {
    height: 78,
    backgroundColor: '#102614',
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 8,
    paddingBottom: 10,
  },
  tabIcon: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabScene: {
    backgroundColor: '#16361C',
  },
});