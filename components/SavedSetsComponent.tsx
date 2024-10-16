// components/SavedSetsComponent.tsx
import React, {useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import {WorkoutSet} from '../storageService';
import Modal from 'react-native-modal'; // Importiere react-native-modal
import {PieChart} from 'react-native-chart-kit';

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

  const getColor = (index: number) => {
    const colors = ['#e74c3c', '#f39c12', '#2ecc71', '#9b59b6']; // Rot, Orange, Grün, Violett
    return colors[index % colors.length];
  };

  const pieChartData = selectedExercises.map((exercise, index) => ({
    name: exercise.label,
    population: exercise.totalReps,
    color: getColor(index), // Funktion, um Farben zuzuweisen
    legendFontColor: '#7F7F7F',
    legendFontSize: 15,
  }));

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gespeicherte Workouts</Text>
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
                  <Text style={styles.totalReps}>Gesamt: {totalReps} Reps</Text>
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
        backdropColor="#000"
        backdropOpacity={0.5}
        useNativeDriver={true}
        hideModalContentWhileAnimating={true}
        avoidKeyboard={true}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {selectedDate ? formatDate(selectedDate) : ''}
          </Text>
          <View style={styles.exercisesContainer}>
            {selectedExercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseItem}>
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
          <PieChart
            data={pieChartData}
            width={Dimensions.get('window').width * 0.8} // Breite des Charts
            height={220}
            chartConfig={{
              backgroundColor: '#FFFFFF',
              backgroundGradientFrom: '#FFFFFF',
              backgroundGradientTo: '#FFFFFF',
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute // Zeigt absolute Werte anstelle von Prozenten
          />
          <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
            <Text style={styles.closeButtonText}>Schließen</Text>
          </TouchableOpacity>
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
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
    fontSize: 16,
  },
  workoutItem: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#444',
  },
  totalReps: {
    fontSize: 16,
    color: '#444',
  },
  // Styles für das Modal
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  modalContent: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  exercisesContainer: {
    width: '100%',
    alignItems: 'center',
  },
  exerciseItem: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exerciseLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  exerciseStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  highlightedReps: {
    fontSize: 18, // Größere Schriftgröße für Hervorhebung
    fontWeight: 'bold',
    color: 'black', // Beispiel: Tomatenrot
    marginRight: 5,
  },
  exerciseSets: {
    fontSize: 16,
    color: '#555',
  },
  closeButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 20,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
});

export default SavedSetsComponent;
