import 'leaflet/dist/leaflet.css';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';

import FiltersModal from '../components/FiltersModal';
import { getCanchasCercanas, type CanchaCercana } from '../lib/supabase';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type MapTarget = Coordinates & {
  zoom: number;
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

const DEFAULT_COORDS: Coordinates = {
  latitude: -34.6037,
  longitude: -58.3816,
};

const SOCCER_FILTERS = ['leisure=pitch', 'sport=soccer'];

function MapViewportController({ target }: { target: MapTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) {
      return;
    }

    map.flyTo([target.latitude, target.longitude], target.zoom, {
      duration: 1.1,
    });
  }, [map, target]);

  return null;
}

export default function MapScreen() {
  const [selectedFilters, setSelectedFilters] = useState<number[]>([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);
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

  const flyToCoordinate = useCallback((coords: Coordinates, zoom = 13.8) => {
    setLocation(coords);
    setMapTarget({
      ...coords,
      zoom,
    });
  }, []);

  const loadCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        setLocationError('Sin permiso del navegador no podemos ubicarte. Igual podes buscar una zona manualmente.');
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
    setMapTarget({
      ...DEFAULT_COORDS,
      zoom: 11,
    });

    void loadCurrentLocation();
  }, [loadCurrentLocation]);

  useEffect(() => {
    if (!location) {
      setCanchas([]);
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
      <View style={styles.headerCard}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>Vista web</Text>
          <Text style={styles.title}>El mapa tambien puede vivir en navegador</Text>
          <Text style={styles.subtitle}>
            En web usamos OpenStreetMap con Leaflet. En iOS y Android se mantiene Mapbox nativo. No era imposible: solo estaba
            faltando una implementacion web real.
          </Text>
        </View>

        <Pressable style={styles.filterButton} onPress={() => setFiltersVisible(true)}>
          <Text style={styles.filterButtonIcon}>☰</Text>
          <Text style={styles.filterButtonText}>Filtros</Text>
        </Pressable>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>Buscar canchas, barrios o complejos</Text>
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Ej: Palermo, futbol 7, sintetico"
            placeholderTextColor="#5A6E5D"
            autoCorrect={false}
            autoCapitalize="none"
          />

          {isSearching ? (
            <View style={styles.searchStateRow}>
              <ActivityIndicator color="#FF7043" size="small" />
              <Text style={styles.searchStateText}>Buscando zonas y canchas...</Text>
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

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Estado</Text>
          <Text style={styles.infoBody}>Radio: 5 km</Text>
          <Text style={styles.infoBody}>Filtros: {activeFiltersLabel}</Text>
          <Text style={styles.infoBody}>Proveedor web: OpenStreetMap</Text>
          <Pressable style={styles.secondaryButton} onPress={() => void loadCurrentLocation()}>
            <Text style={styles.secondaryButtonText}>{isLocating ? 'Ubicando...' : 'Mi ubicacion'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.mapCard}>
        <MapContainer
          center={[DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude]}
          zoom={11}
          scrollWheelZoom
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewportController target={mapTarget} />

          {location ? (
            <CircleMarker
              center={[location.latitude, location.longitude]}
              radius={10}
              pathOptions={{ color: '#0E5A3A', fillColor: '#34D399', fillOpacity: 1, weight: 3 }}
            >
              <Popup>Tu ubicacion actual</Popup>
            </CircleMarker>
          ) : null}

          {canchas.map((cancha) => {
            const selected = selectedCanchaId === cancha.id;

            return (
              <CircleMarker
                key={cancha.id}
                center={[cancha.lat, cancha.lng]}
                radius={selected ? 12 : 10}
                pathOptions={{
                  color: selected ? '#102614' : '#FF7043',
                  fillColor: selected ? '#FF7043' : '#FFE1D6',
                  fillOpacity: 1,
                  weight: 3,
                }}
                eventHandlers={{
                  click: () => setSelectedCanchaId(cancha.id),
                }}
              >
                <Popup>
                  <Text>{cancha.nombre ?? 'Cancha sin nombre'}</Text>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Hecho por futboleros para futboleros</Text>
            <Text style={styles.summaryCount}>{isLoadingCanchas ? 'Cargando...' : `${canchas.length} canchas`}</Text>
          </View>
          <Text style={styles.summarySubtitle}>Explora canchas cercanas desde web o celular sin cambiar de flujo.</Text>

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
              Hace click en un marcador o busca una zona. Si el navegador bloquea geolocalizacion, el mapa igual queda usable.
            </Text>
          )}
        </View>

        <View style={styles.listCard}>
          <Text style={styles.listTitle}>Canchas cercanas</Text>
          {canchas.map((cancha) => {
            const selected = selectedCanchaId === cancha.id;

            return (
              <Pressable key={cancha.id} style={styles.canchaRow} onPress={() => setSelectedCanchaId(cancha.id)}>
                <View style={styles.canchaCopy}>
                  <Text style={[styles.canchaName, selected && styles.canchaNameSelected]}>{cancha.nombre ?? 'Cancha sin nombre'}</Text>
                  <Text style={styles.canchaMetaText}>
                    Futbol {cancha.tipo_cancha ?? '?'}
                    {cancha.direccion ? ` · ${cancha.direccion}` : ''}
                  </Text>
                </View>
                <Text style={styles.canchaDistance}>{Math.round(cancha.distancia_m)} m</Text>
              </Pressable>
            );
          })}

          {!isLoadingCanchas && canchas.length === 0 ? (
            <Text style={styles.emptyText}>Todavia no hay canchas para esa zona o falta elegir ubicacion.</Text>
          ) : null}
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

  if (label.includes('futbol') || label.includes('soccer') || label.includes('cancha')) {
    score += 2;
  }

  return score;
}

const styles = StyleSheet.create({
  bottomRow: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  canchaCopy: {
    flex: 1,
    paddingRight: 12,
  },
  canchaDistance: {
    color: '#FF7043',
    fontSize: 13,
    fontWeight: '800',
  },
  canchaMetaText: {
    marginTop: 4,
    color: '#BFD3C2',
    fontSize: 13,
  },
  canchaName: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  canchaNameSelected: {
    color: '#FFB199',
  },
  canchaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  controlsRow: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'stretch',
    gap: 14,
  },
  emptyText: {
    marginTop: 12,
    color: '#DCE8DD',
    fontSize: 14,
  },
  filterButton: {
    width: 112,
    borderRadius: 24,
    backgroundColor: '#102614',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterButtonIcon: {
    color: '#FF7043',
    fontSize: 18,
    fontWeight: '800',
  },
  filterButtonText: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  headerCard: {
    borderRadius: 28,
    backgroundColor: '#102614',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 24,
    paddingVertical: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  headerCopy: {
    flex: 1,
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
  infoBody: {
    marginTop: 6,
    color: '#DCE8DD',
    fontSize: 14,
    lineHeight: 20,
  },
  infoCard: {
    minWidth: 240,
    flexGrow: 1,
    borderRadius: 24,
    backgroundColor: '#1B5221',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  inlineError: {
    marginTop: 10,
    color: '#FFB199',
    fontSize: 13,
    lineHeight: 18,
  },
  kicker: {
    color: '#FFB199',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  listCard: {
    flexBasis: 320,
    flexGrow: 1,
    borderRadius: 28,
    backgroundColor: '#102614',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  listTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  mapCard: {
    marginTop: 18,
    height: 460,
    overflow: 'hidden',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  screen: {
    flex: 1,
    backgroundColor: '#16361C',
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  searchCard: {
    minWidth: 320,
    flexGrow: 2,
    flexBasis: 480,
    borderRadius: 24,
    backgroundColor: '#F7FBF7',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchInput: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D4E0D5',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#17361D',
    fontSize: 15,
  },
  searchLabel: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  searchResultItem: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E7EFE8',
  },
  searchResultsList: {
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  searchResultSubtitle: {
    marginTop: 2,
    color: '#5D715E',
    fontSize: 13,
    lineHeight: 18,
  },
  searchResultTitle: {
    color: '#16361C',
    fontSize: 15,
    fontWeight: '800',
  },
  searchStateRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchStateText: {
    color: '#406545',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: '#102614',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 12,
    color: '#DCE8DD',
    fontSize: 15,
    lineHeight: 24,
  },
  summaryBody: {
    marginTop: 16,
    color: '#DCE8DD',
    fontSize: 14,
    lineHeight: 22,
  },
  summaryCard: {
    flexBasis: 380,
    flexGrow: 1.4,
    borderRadius: 28,
    backgroundColor: '#102614',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  summaryCount: {
    color: '#FFB199',
    fontSize: 13,
    fontWeight: '800',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summarySubtitle: {
    marginTop: 8,
    color: '#DCE8DD',
    fontSize: 14,
    lineHeight: 21,
  },
  summaryTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  title: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 38,
  },
});
