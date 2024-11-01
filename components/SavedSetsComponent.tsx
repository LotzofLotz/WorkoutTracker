// components/SavedSetsComponent.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {WorkoutSet} from '../storageService';
import Modal from 'react-native-modal';
import {PieChart} from 'react-native-chart-kit';
import ModalHeader from './ModalHeader'; // Importiere ModalHeader
import Colors from './colors';

interface SavedSetsComponentProps {
  sets: WorkoutSet[];
}

interface ExerciseSummary {
  label: string;
  totalReps: number;
  numberOfSets: number;
}

const SavedSetsComponent: React.FC<SavedSetsComponentProps> = ({sets}) => {
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<ExerciseSummary[]>(
    [],
  );

  // Funktion zum Gruppieren der Sets nach Datum und Übung
  const groupSetsByDateAndExercise = (sets: WorkoutSet[]) => {
    const groups: {
      [date: string]: {exercises: ExerciseSummary[]; totalReps: number};
    } = {};

    sets.forEach(set => {
      const date = new Date(set.timestamp).toISOString().split('T')[0];

      if (!groups[date]) {
        groups[date] = {exercises: [], totalReps: 0};
      }

      groups[date].totalReps += set.repetitions;

      const exerciseIndex = groups[date].exercises.findIndex(
        ex => ex.label === set.label,
      );

      if (exerciseIndex > -1) {
        groups[date].exercises[exerciseIndex].totalReps += set.repetitions;
        groups[date].exercises[exerciseIndex].numberOfSets += 1;
      } else {
        groups[date].exercises.push({
          label: set.label,
          totalReps: set.repetitions,
          numberOfSets: 1,
        });
      }
    });

    return groups;
  };

  // Gruppiere die Sets nach Datum und Übung
  const groupedData = groupSetsByDateAndExercise(sets);

  // Array der Datumswerte sortieren
  const sortedDates = Object.keys(groupedData).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  // Funktion beim Klicken auf ein Workout
  const handleWorkoutPress = (date: string) => {
    setSelectedDate(date);
    setSelectedExercises(groupedData[date].exercises);
    setModalVisible(true);
  };

  // Funktion zum Schließen des Modals
  const closeModal = () => {
    setModalVisible(false);
    setSelectedDate(null);
    setSelectedExercises([]);
  };

  // Farb-Mapping für spezifische Übungen
  const exerciseColors: {[key: string]: string} = {
    Squat: Colors.teal,
    PushUp: Colors.purple,
    PullUp: Colors.primary,
    SitUp: Colors.secondary,
  };

  // Hilfsfunktion, um Farben zuzuweisen
  const getColor = (label: string) => {
    return exerciseColors[label] || Colors.textSecondary; // Ersetzt '#34495e' mit Colors.textSecondary
  };

  // Daten für den PieChart vorbereiten ohne Legendeigenschaften
  const pieChartData = selectedExercises.map(exercise => ({
    name: exercise.label,
    population: exercise.totalReps,
    color: getColor(exercise.label),
    legendFontColor: Colors.textSecondary, // Ersetzt 'black' mit Colors.textSecondary
    legendFontSize: 15,
  }));

  return (
    <View style={styles.container}>
      {/* Entfernt ungenutzte title */}
      {sortedDates.length === 0 ? (
        <Text style={styles.emptyText}>Keine Workouts gespeichert.</Text>
      ) : (
        <FlatList
          data={sortedDates}
          keyExtractor={date => date}
          renderItem={({item: date}) => {
            const {totalReps} = groupedData[date];

            return (
              <TouchableOpacity
                style={styles.workoutItem}
                onPress={() => handleWorkoutPress(date)}>
                <View style={styles.workoutHeader}>
                  <Text style={styles.dateTitle}>{formatDate(date)}</Text>
                  <Text style={styles.totalReps}>Total: {totalReps} Reps</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Modal zur Anzeige der Übungsstatistiken */}
      <Modal
        isVisible={modalVisible}
        onBackdropPress={closeModal}
        onBackButtonPress={closeModal}
        style={styles.modal}
        animationIn="slideInUp"
        animationOut="slideOutDown"
        onSwipeComplete={closeModal}
        swipeDirection="down"
        backdropColor={Colors.darkBackdrop}
        backdropOpacity={0.5}
        useNativeDriver={true}
        hideModalContentWhileAnimating={true}
        avoidKeyboard={true}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <ModalHeader
            title={`Workout ${formatDate(selectedDate || '')}`}
            onClose={closeModal}
          />

          {/* Inhalt des Modals */}
          <View style={styles.exercisesContainer}>
            {selectedExercises.map(exercise => (
              <View key={exercise.label} style={styles.exerciseItem}>
                <Text style={styles.exerciseLabel}>{exercise.label}</Text>
                <View style={styles.exerciseStatsContainer}>
                  <Text style={styles.highlightedReps}>
                    {exercise.totalReps} Reps
                  </Text>
                  <Text style={styles.exerciseSets}>
                    in {exercise.numberOfSets} Sets
                  </Text>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.pieChartContainer}>
            <PieChart
              data={pieChartData}
              width={Dimensions.get('window').width * 0.8} // Breite des Charts
              height={220}
              chartConfig={{
                backgroundColor: Colors.background,
                backgroundGradientFrom: Colors.background,
                backgroundGradientTo: Colors.background,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              // absolute // Zeigt absolute Werte anstelle von Prozenten
            />
          </View>
          {/* Optional: Weitere Inhalte können hier hinzugefügt werden */}
        </View>
      </Modal>
    </View>
  );
};

// Hilfsfunktion zur Formatierung von Datum
const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  return new Date(dateString).toLocaleDateString('de-DE', options);
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    width: '100%',
  },
  dateTitle: {
    color: Colors.textSecondary, // Ersetzt '#444' mit Colors.textSecondary
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    color: Colors.textSecondary, // Ersetzt '#888' mit Colors.textSecondary
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  exerciseItem: {
    borderBottomColor: Colors.border, // Ersetzt '#eee' mit Colors.border
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 10,
    width: '100%',
  },

  exerciseLabel: {
    color: Colors.textPrimary, // Ersetzt '#333' mit Colors.textPrimary
    fontSize: 18,
    fontWeight: 'bold',
  },
  exerciseSets: {
    color: Colors.textSecondary, // Ersetzt '#555' mit Colors.textSecondary
    fontSize: 16,
  },
  exerciseStatsContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },

  exercisesContainer: {
    alignItems: 'center',
    padding: 20,
  },

  highlightedReps: {
    color: Colors.textSecondary, // Ersetzt 'black' mit Colors.textSecondary
    fontSize: 18, // Größere Schriftgröße für Hervorhebung
    fontWeight: 'bold',
    marginRight: 5,
  },

  // Styles für das Modal
  modal: {
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    margin: 0,
  },

  modalContent: {
    backgroundColor: Colors.background,
    // Stelle sicher, dass es 100% Breite hat
    // Ersetzt 'white' mit Colors.background
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,

    // Höhe anpassen, um genügend Platz für den Inhalt zu bieten
    width: '100%',
  },
  pieChartContainer: {
    alignItems: 'center', // Ersetzt Inline-Style { alignItems: 'center' }
    marginVertical: 10,
  },
  totalReps: {
    color: Colors.textSecondary, // Ersetzt '#444' mit Colors.textSecondary
    fontSize: 18,
    fontWeight: 'bold',
  },

  workoutHeader: {
    alignItems: 'center', // Sollte vor justifyContent stehen
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workoutItem: {
    borderColor: Colors.border, // Ersetzt '#ccc' mit Colors.border
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 15,
  },
});

export default SavedSetsComponent;
