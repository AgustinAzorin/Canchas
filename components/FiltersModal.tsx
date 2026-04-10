import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const FILTER_OPTIONS = [5, 7, 9, 11] as const;

type FiltersModalProps = {
  visible: boolean;
  selectedFilters: number[];
  onClose: () => void;
  onToggleFilter: (value: number) => void;
};

export default function FiltersModal({ visible, selectedFilters, onClose, onToggleFilter }: FiltersModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <View style={styles.sheet}>
          <Text style={styles.kicker}>Filtros</Text>
          <Text style={styles.title}>Elegí formato de cancha</Text>
          <Text style={styles.subtitle}>Mostrá solo los partidos y complejos que calzan con tu equipo.</Text>

          <View style={styles.chipsRow}>
            {FILTER_OPTIONS.map((option) => {
              const selected = selectedFilters.includes(option);

              return (
                <Pressable
                  key={option}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => onToggleFilter(option)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>Futbol {option}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Aplicar filtros</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  chip: {
    minWidth: '47%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: '#17361D',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  chipSelected: {
    backgroundColor: '#FF7043',
    borderColor: '#FF7043',
  },
  chipText: {
    color: '#F5FFF5',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipsRow: {
    marginTop: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  closeButton: {
    marginTop: 16,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#15311A',
    fontSize: 16,
    fontWeight: '900',
  },
  kicker: {
    color: '#FFB199',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(7, 18, 10, 0.56)',
    padding: 16,
  },
  sheet: {
    borderRadius: 28,
    backgroundColor: '#102614',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  subtitle: {
    marginTop: 10,
    color: '#D9E6DA',
    fontSize: 14,
    lineHeight: 22,
  },
  title: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
});