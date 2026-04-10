import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Camera, MapView, PointAnnotation, setAccessToken } from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import FiltersModal from '../components/FiltersModal';
import { getCanchasCercanas, type CanchaCercana } from '../lib/supabase';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  class?: string;
  type?: string;
  extratags?: {
    sport?: string;
    [key: string]: string | undefined;
  };
};

const MAPBOX_PUBLIC_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
const MAPBOX_STREETS_STYLE = 'mapbox://styles/mapbox/streets-v8';
const SOCCER_FILTERS = ['leisure=pitch', 'sport=soccer'];

if (MAPBOX_PUBLIC_TOKEN) {
  setAccessToken(MAPBOX_PUBLIC_TOKEN);
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<any>(null);
  const [selectedFilters, setSelectedFilters] = useState<number[]>([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [selectedCanchaId, setSelectedCanchaId] = useState<string | null>(null);
  const [canchas, setCanchas] = useState<CanchaCercana[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingCanchas, setIsLoadingCanchas] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);

  const selectedCancha = useMemo(
    () => canchas.find((cancha) => cancha.id === selectedCanchaId) ?? null,
    [canchas, selectedCanchaId],
  );

  const activeFiltersLabel = useMemo(() => {
    if (selectedFilters.length === 0) {
      return 'Todas las canchas';
    }

    return selectedFilters.map((value) => `F${value}`).join(' · ');
  }, [selectedFilters]);

  const flyToCoordinate = useCallback((coords: Coordinates, zoomLevel = 13.8) => {
    setLocation(coords);

    cameraRef.current?.setCamera?.({
      centerCoordinate: [coords.longitude, coords.latitude],
      zoomLevel,
      animationDuration: 1100,
      animationMode: 'flyTo',
    });
  }, []);

  const loadCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setLocationError('Sin permiso de ubicacion no podemos mostrarte las canchas cerca tuyo.');
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      flyToCoordinate({
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos obtener tu ubicacion.';
      setLocationError(message);
    } finally {
      setIsLocating(false);
    }
  }, [flyToCoordinate]);

  useEffect(() => {
    void loadCurrentLocation();
  }, [loadCurrentLocation]);

  useEffect(() => {
    if (!location) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      setIsLoadingCanchas(true);
      setBackendError(null);

      try {
        const result = await getCanchasCercanas({
          lat: location.latitude,
          lng: location.longitude,
          radiusM: 5000,
          tipos: selectedFilters,
        });

        if (!cancelled) {
          setCanchas(result);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'No pudimos cargar las canchas cercanas.';
          setBackendError(message);
          setCanchas([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCanchas(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [location, selectedFilters]);

  useEffect(() => {
    if (searchText.trim().length < 2) {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    let cancelled = false;

    const timeout = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('format', 'jsonv2');
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('extratags', '1');
        url.searchParams.set('limit', '6');
        url.searchParams.set('q', `${searchText} cancha futbol ${SOCCER_FILTERS.join(' ')}`);

        const response = await fetch(url.toString(), {
          headers: {
            'Accept-Language': 'es',
          },
        });

        if (!response.ok) {
          throw new Error('Nominatim no devolvio resultados validos.');
        }

        const payload = (await response.json()) as NominatimResult[];
        const sorted = [...payload].sort((left, right) => scoreSuggestion(right) - scoreSuggestion(left));

        if (!cancelled) {
          setSearchResults(sorted);
        }
      } catch (error) {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : 'No pudimos buscar canchas en el mapa.';
          setSearchError(message);
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [searchText]);

  const handleSelectSuggestion = useCallback(
    (item: NominatimResult) => {
      setSearchText(item.display_name.split(',')[0] ?? item.display_name);
      setSearchResults([]);
      flyToCoordinate(
        {
          latitude: Number(item.lat),
          longitude: Number(item.lon),
        },
        14.6,
      );
    },
    [flyToCoordinate],
  );

  const toggleFilter = useCallback((value: number) => {
    setSelectedFilters((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value].sort((a, b) => a - b),
    );
  }, []);

  return (
    <View style={styles.screen}>
      <MapView style={StyleSheet.absoluteFillObject} styleURL={MAPBOX_STREETS_STYLE} logoEnabled compassEnabled>
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: location ? [location.longitude, location.latitude] : [-58.3816, -34.6037],
            zoomLevel: location ? 13.5 : 11,
          }}
        />

        {location ? (
          <PointAnnotation id="user-location" coordinate={[location.longitude, location.latitude]}>
            <View style={styles.userMarkerOuter}>
              <View style={styles.userMarkerInner} />
            </View>
          </PointAnnotation>
        ) : null}

        {canchas.map((cancha) => (
          <PointAnnotation
            key={cancha.id}
            id={cancha.id}
            coordinate={[cancha.lng, cancha.lat]}
            onSelected={() => setSelectedCanchaId(cancha.id)}
          >
            <View style={[styles.marker, selectedCanchaId === cancha.id && styles.markerActive]}>
              <Text style={styles.markerText}>{cancha.tipo_cancha ?? '⚽'}</Text>
            </View>
          </PointAnnotation>
        ))}
      </MapView>

      <View pointerEvents="box-none" style={[styles.topOverlay, { paddingTop: insets.top + 10 }]}>
        <View style={styles.searchCard}>
          <Text style={styles.searchKicker}>Mapa</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar canchas, barrios o complejos"
            placeholderTextColor="#5D715E"
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
            autoCapitalize="none"
          />

          {isSearching ? (
            <View style={styles.searchStateRow}>
              <ActivityIndicator color="#FF7043" size="small" />
              <Text style={styles.searchStateText}>Buscando con Nominatim...</Text>
            </View>
          ) : null}

          {searchError ? <Text style={styles.inlineError}>{searchError}</Text> : null}

          {searchResults.length > 0 ? (
            <View style={styles.searchResultsList}>
              {searchResults.map((item) => (
                <Pressable key={String(item.place_id)} style={styles.searchResultItem} onPress={() => handleSelectSuggestion(item)}>
                  <Text style={styles.searchResultTitle}>{item.display_name.split(',')[0]}</Text>
                  <Text numberOfLines={2} style={styles.searchResultSubtitle}>
                    {item.display_name}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <Pressable style={styles.filterButton} onPress={() => setFiltersVisible(true)}>
          <Text style={styles.filterButtonIcon}>☰</Text>
          <Text style={styles.filterButtonText}>Filtros</Text>
        </Pressable>
      </View>

      <View pointerEvents="box-none" style={styles.bottomOverlay}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Hecho por futboleros para futboleros</Text>
            <Text style={styles.summaryCount}>{isLoadingCanchas ? 'Cargando...' : `${canchas.length} canchas`}</Text>
          </View>
          <Text style={styles.summarySubtitle}>Radio: 5 km · {activeFiltersLabel}</Text>

          {MAPBOX_PUBLIC_TOKEN ? null : <Text style={styles.inlineError}>Falta `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` en tu `.env`.</Text>}
          {locationError ? <Text style={styles.inlineError}>{locationError}</Text> : null}
          {backendError ? <Text style={styles.inlineError}>{backendError}</Text> : null}

          {selectedCancha ? (
            <View style={styles.highlightCard}>
              <Text style={styles.highlightTitle}>{selectedCancha.nombre ?? 'Cancha sin nombre'}</Text>
              <Text style={styles.highlightMeta}>
                Futbol {selectedCancha.tipo_cancha ?? '?'} · {Math.round(selectedCancha.distancia_m)} m
              </Text>
              {selectedCancha.direccion ? <Text style={styles.highlightBody}>{selectedCancha.direccion}</Text> : null}
            </View>
          ) : (
            <Text style={styles.summaryBody}>
              Tocá un marcador para ver detalles. Si elegís una cancha desde el buscador, el mapa vuela a esa zona.
            </Text>
          )}

          <View style={styles.actionsRow}>
            <Pressable style={styles.secondaryButton} onPress={() => void loadCurrentLocation()}>
              <Text style={styles.secondaryButtonText}>{isLocating ? 'Ubicando...' : 'Mi ubicacion'}</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={() => setFiltersVisible(true)}>
              <Text style={styles.primaryButtonText}>Tipos de cancha</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <FiltersModal
        visible={filtersVisible}
        selectedFilters={selectedFilters}
        onClose={() => setFiltersVisible(false)}
        onToggleFilter={toggleFilter}
      />
    </View>
  );
}

function scoreSuggestion(item: NominatimResult) {
  let score = 0;
  const label = item.display_name.toLowerCase();

  if (item.class === 'leisure' && item.type === 'pitch') {
    score += 3;
  }

  if (item.extratags?.sport === 'soccer') {
    score += 4;
  }

  if (label.includes('futbol') || label.includes('fútbol') || label.includes('soccer') || label.includes('cancha')) {
    score += 2;
  }

  return score;
}

const styles = StyleSheet.create({
  actionsRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  bottomOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
  },
  filterButton: {
    width: 102,
    height: 66,
    borderRadius: 22,
    backgroundColor: '#102614',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  filterButtonIcon: {
    color: '#FF7043',
    fontSize: 18,
    fontWeight: '800',
  },
  filterButtonText: {
    marginTop: 4,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  highlightBody: {
    marginTop: 8,
    color: '#DDE9DE',
    fontSize: 14,
    lineHeight: 20,
  },
  highlightCard: {
    marginTop: 14,
    borderRadius: 18,
    backgroundColor: '#17361D',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  highlightMeta: {
    marginTop: 4,
    color: '#FFB199',
    fontSize: 13,
    fontWeight: '700',
  },
  highlightTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  inlineError: {
    marginTop: 10,
    color: '#FFB199',
    fontSize: 13,
    lineHeight: 18,
  },
  marker: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#FF7043',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  markerActive: {
    transform: [{ scale: 1.08 }],
    backgroundColor: '#FF7043',
  },
  markerText: {
    color: '#16361C',
    fontSize: 13,
    fontWeight: '900',
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#FF7043',
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  screen: {
    flex: 1,
    backgroundColor: '#16361C',
  },
  searchCard: {
    width: '70%',
    maxWidth: 360,
    borderRadius: 24,
    backgroundColor: 'rgba(245,255,245,0.96)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,38,20,0.08)',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  searchInput: {
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D2DFD4',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#16361C',
    fontSize: 15,
  },
  searchKicker: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  searchResultItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E7EFE8',
  },
  searchResultsList: {
    marginTop: 10,
    maxHeight: 220,
  },
  searchResultSubtitle: {
    marginTop: 4,
    color: '#4B5F4D',
    fontSize: 12,
    lineHeight: 18,
  },
  searchResultTitle: {
    color: '#16361C',
    fontSize: 14,
    fontWeight: '800',
  },
  searchStateRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchStateText: {
    color: '#315535',
    fontSize: 12,
    fontWeight: '600',
  },
  secondaryButton: {
    minWidth: 128,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#1D4E24',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  summaryBody: {
    marginTop: 14,
    color: '#DCE8DD',
    fontSize: 14,
    lineHeight: 22,
  },
  summaryCard: {
    borderRadius: 24,
    backgroundColor: 'rgba(16,38,20,0.95)',
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryCount: {
    color: '#FFB199',
    fontSize: 13,
    fontWeight: '800',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  summarySubtitle: {
    marginTop: 6,
    color: '#BFD3C2',
    fontSize: 13,
  },
  summaryTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  topOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#FF7043',
  },
  userMarkerOuter: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
});
