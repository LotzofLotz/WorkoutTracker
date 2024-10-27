// components/ProgressModal.tsx
import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import Modal from 'react-native-modal';
import {LineChart} from 'react-native-chart-kit';
import ModalHeader from './ModalHeader'; // Dein ModalHeader
import {WorkoutSet} from '../storageService'; // Importiere WorkoutSet-Definition
import Colors from './colors';

interface ProgressModalProps {
  isVisible: boolean;
  onClose: () => void;
  sets: WorkoutSet[]; // Übergibt die gespeicherten Sets
}

const ProgressModal: React.FC<ProgressModalProps> = ({
  isVisible,
  onClose,
  sets,
}) => {
  const [selectedStat, setSelectedStat] = useState<string>('Total'); // State für den aktuell ausgewählten Stat

  // Funktion zur Gruppierung der Sets nach Datum
  const groupSetsByDate = (sets: WorkoutSet[]) => {
    const groups: {[date: string]: WorkoutSet[]} = {};

    sets.forEach(set => {
      const date = new Date(set.timestamp).toLocaleDateString('de-DE'); // Format: TT.MM.JJJJ
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(set);
    });

    return groups;
  };

  // Gruppiere die Sets nach Datum
  const groupedSets = useMemo(() => groupSetsByDate(sets), [sets]);

  // Sortiere die Daten nach Datum (aufsteigend)
  const sortedDates = useMemo(() => {
    return Object.keys(groupedSets).sort((a, b) => {
      const dateA = new Date(a.split('.').reverse().join('-')).getTime();
      const dateB = new Date(b.split('.').reverse().join('-')).getTime();
      return dateA - dateB;
    });
  }, [groupedSets]);

  // Funktion zur Berechnung der Reps pro Tag basierend auf der ausgewählten Übung
  const calculateRepsPerDay = (exercise: string | 'Total') => {
    return sortedDates.map(date => {
      const setsForDate = groupedSets[date];
      if (exercise === 'Total') {
        return setsForDate.reduce((sum, set) => sum + set.repetitions, 0);
      } else {
        // Kein Plural, da Button-Titel jetzt den Set-Labels entsprechen
        return setsForDate
          .filter(set => set.label.toLowerCase() === exercise.toLowerCase())
          .reduce((sum, set) => sum + set.repetitions, 0);
      }
    });
  };

  // Funktion, um die Chart-Daten basierend auf der ausgewählten Übung zu berechnen
  const getChartData = useMemo(() => {
    const data = calculateRepsPerDay(selectedStat);
    console.log(`Selected Stat: ${selectedStat}`, data); // Debugging

    // Labels basierend auf den sortierten Daten
    const labels = sortedDates.map(date => {
      const [day, month, year] = date.split('.');
      return `${day}.${month}`;
    });

    return {
      labels: labels,
      datasets: [
        {
          data: data.length > 0 ? data : [0],
        },
      ],
    };
  }, [selectedStat, groupedSets, sortedDates]);

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection={['down']}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropColor="#000"
      backdropOpacity={0.5}
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
      avoidKeyboard={true}>
      <View style={styles.modalContent}>
        {/* Modal Header */}
        <ModalHeader title="Progress" onClose={onClose} />

        {/* Buttons für die Übungen */}
        <ScrollView horizontal contentContainerStyle={styles.buttonContainer}>
          {['Total', 'PushUp', 'PullUp', 'Squat', 'SitUp'].map(label => (
            <TouchableOpacity
              key={label}
              style={[
                styles.statButton,
                selectedStat === label && styles.selectedButton, // Highlight den ausgewählten Button
              ]}
              onPress={() => setSelectedStat(label)}>
              <Text
                style={[
                  styles.statButtonText,
                  selectedStat === label && styles.selectedButtonText, // Highlight den Text des ausgewählten Buttons
                ]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* LineChart für die ausgewählten Stats */}
        <View style={styles.chartContainer}>
          {sortedDates.length === 0 ? (
            <Text style={styles.noDataText}>Keine Daten verfügbar.</Text>
          ) : (
            <LineChart
              data={getChartData}
              width={Dimensions.get('window').width * 0.9} // 90% der Bildschirmbreite
              height={220}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                decimalPlaces: 0, // keine Nachkommastellen
                color: (opacity = 1) => `rgba(0, 48, 73, ${opacity})`, // #003049 für die Linienfarbe
                fillShadowGradient: '#669bbc',
                fillShadowGradientOpacity: 0.6,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: '#003049', // #003049 für die Punkte
                  fill: '#669bbc', // Optional: Füllfarbe der Punkte
                },
                // Optional: Hintergrund der Grafik anpassen
                // fillShadowGradient: '#669bbc', // Für den Bereich unter der Linie
                // fillShadowGradientOpacity: 0.3,
              }}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    alignItems: 'stretch', // Vollständige Breite
    margin: 0,
  },
  modalContent: {
    width: '100%', // Vollständige Breite
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%', // Höhe anpassen, um genügend Platz für den Inhalt zu bieten
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  statButton: {
    paddingVertical: 10,
    paddingHorizontal: 20, // Mehr Padding für breitere Buttons
    backgroundColor: '#f1f1f1', //fdf0d5
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
    minWidth: 90, // Mindestbreite für die Buttons
  },
  selectedButton: {
    backgroundColor: Colors.secondary, // Farbe für den ausgewählten Button
  },
  statButtonText: {
    fontSize: 14,
    color: '#333',
  },
  selectedButtonText: {
    color: 'white', // Textfarbe für den ausgewählten Button
    fontWeight: 'bold',
  },
  chartContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  noDataText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
});

export default ProgressModal;
