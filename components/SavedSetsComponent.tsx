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
    Squat: Colors.red, // Rot
    PushUp: Colors.red2, // Orange
    PullUp: Colors.primary, // Grün
    SitUp: Colors.secondary, // Violett
  };

  // Hilfsfunktion, um Farben zuzuweisen
  const getColor = (label: string) => {
    return exerciseColors[label] || '#34495e'; // Fallback-Farbe (dunkelgrau)
  };

  // Daten für den PieChart vorbereiten ohne Legendeigenschaften
  const pieChartData = selectedExercises.map((exercise, index) => ({
    name: exercise.label,
    population: exercise.totalReps,
    color: getColor(exercise.label),
    legendFontColor: 'black',
    legendFontSize: 15,
  }));

  return (
    <View style={styles.container}>
      {/* <Text style={styles.title}>Gespeicherte Workouts</Text> */}
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
        backdropColor="#000"
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
          <View style={{alignItems: 'center'}}>
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
              //absolute // Zeigt absolute Werte anstelle von Prozenten
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
    fontWeight: 'bold',
    fontSize: 18,
    color: '#444',
  },
  // Styles für das Modal
  modal: {
    justifyContent: 'flex-end',
    alignItems: 'stretch', // Ändere dies zu 'stretch', um die volle Breite zu nutzen
    margin: 0,
  },
  modalContent: {
    width: '100%', // Stelle sicher, dass es 100% Breite hat
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%', // Höhe anpassen, um genügend Platz für den Inhalt zu bieten
  },
  exercisesContainer: {
    padding: 20,
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
    color: 'black', // Rot für Hervorhebung
    marginRight: 5,
  },
  exerciseSets: {
    fontSize: 16,
    color: '#555',
  },
});

export default SavedSetsComponent;
