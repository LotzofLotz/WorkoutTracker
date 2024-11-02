// components/ProgressModal.tsx
import React, {useState, useMemo, useCallback} from 'react';
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
  const groupSetsByDate = useCallback((sets: WorkoutSet[]) => {
    const groups: {[date: string]: WorkoutSet[]} = {};

    sets.forEach(set => {
      const date = new Date(set.timestamp).toLocaleDateString('de-DE'); // Format: TT.MM.JJJJ
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(set);
    });

    return groups;
  }, []);

  // Gruppiere die Sets nach Datum
  const groupedSets = useMemo(
    () => groupSetsByDate(sets),
    [sets, groupSetsByDate],
  );

  // Sortiere die Daten nach Datum (aufsteigend)
  const sortedDates = useMemo(() => {
    return Object.keys(groupedSets).sort((a, b) => {
      const dateA = new Date(a.split('.').reverse().join('-')).getTime();
      const dateB = new Date(b.split('.').reverse().join('-')).getTime();
      return dateA - dateB;
    });
  }, [groupedSets]);

  // Funktion zur Berechnung der Reps pro Tag basierend auf der ausgewählten Übung
  const calculateRepsPerDay = useCallback(
    (exercise: string | 'Total') => {
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
    },
    [groupedSets, sortedDates],
  );

  // Funktion, um die Chart-Daten basierend auf der ausgewählten Übung zu berechnen
  const getChartData = useMemo(() => {
    const data = calculateRepsPerDay(selectedStat);
    console.log(`Selected Stat: ${selectedStat}`, data); // Debugging

    // Labels basierend auf den sortierten Daten
    const labels = sortedDates.map(date => {
      const [day, month] = date.split('.');
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
  }, [selectedStat, calculateRepsPerDay, sortedDates]);

  // Farb-Mapping für spezifische Übungen

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
      backdropColor={Colors.darkBackdrop}
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
            <Text style={styles.noDataText}>No Data recorded</Text>
          ) : (
            <LineChart
              data={getChartData}
              width={Dimensions.get('window').width * 0.9} // 90% der Bildschirmbreite
              height={220}
              chartConfig={{
                backgroundColor: Colors.background,
                backgroundGradientFrom: Colors.background,
                backgroundGradientTo: Colors.background,
                decimalPlaces: 0, // keine Nachkommastellen
                color: (opacity = 1) => `rgba(0, 48, 73, ${opacity})`, // Linienfarbe
                fillShadowGradient: Colors.secondary,
                fillShadowGradientOpacity: 0.6,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: Colors.primary,
                  fill: Colors.secondary,
                },
              }}
              bezier
              style={styles.lineChartStyle}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

// //Hilfsfunktion zur Formatierung von Datum
// const formatDate = (dateString: string) => {
//   const [day, month] = dateString.split('.');
//   return `${day}.${month}`;
// };

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 15,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 20,
    width: '100%',
  },
  lineChartStyle: {
    borderRadius: 16,
    marginVertical: 8,
  },
  modal: {
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: Colors.background, // Ersetzt 'white' mit Colors.background
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',

    paddingBottom: 20,
    width: '100%', // Vollständige Breite
    // Höhe anpassen, um genügend Platz für den Inhalt zu bieten
  },
  noDataText: {
    color: Colors.textSecondary, // Ersetzt '#888' mit Colors.textSecondary
    fontSize: 16,
    textAlign: 'center',
  },
  selectedButton: {
    backgroundColor: Colors.secondary, // Farbe für den ausgewählten Button
  },
  selectedButtonText: {
    color: Colors.background, // Textfarbe für den ausgewählten Button
    fontWeight: 'bold',
  },
  statButton: {
    alignItems: 'center',
    backgroundColor: Colors.border, // Ersetzt '#f1f1f1' mit Colors.border oder einer passenden Farbe
    borderRadius: 10,
    marginHorizontal: 5,
    minWidth: 90,
    paddingHorizontal: 20,

    paddingVertical: 10,
    // Mindestbreite für die Buttons
  },
  statButtonText: {
    color: Colors.textPrimary, // Ersetzt '#333' mit Colors.textPrimary
    fontSize: 14,
  },
});

export default ProgressModal;
