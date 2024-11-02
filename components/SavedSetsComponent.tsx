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
import ModalHeader from './ModalHeader';
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

  // Group sets by date and exercise
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

  const groupedData = groupSetsByDateAndExercise(sets);

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedData).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  // Handle workout item press
  const handleWorkoutPress = (date: string) => {
    setSelectedDate(date);
    setSelectedExercises(groupedData[date].exercises);
    setModalVisible(true);
  };

  // Close the modal
  const closeModal = () => {
    setModalVisible(false);
    setSelectedDate(null);
    setSelectedExercises([]);
  };

  // Color mapping for specific exercises
  const exerciseColors: {[key: string]: string} = {
    Squat: Colors.teal,
    PushUp: Colors.purple,
    PullUp: Colors.primary,
    SitUp: Colors.secondary,
  };

  // Assign colors to exercises
  const getColor = (label: string) =>
    exerciseColors[label] || Colors.textSecondary;

  // Prepare data for PieChart
  const pieChartData = selectedExercises.map(exercise => ({
    name: exercise.label,
    population: exercise.totalReps,
    color: getColor(exercise.label),
    legendFontColor: Colors.textSecondary,
    legendFontSize: 15,
  }));

  return (
    <View style={styles.container}>
      {sortedDates.length === 0 ? (
        <Text style={styles.emptyText}>No Data recorded</Text>
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

      {/* Modal to display exercise statistics */}
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
        useNativeDriver
        hideModalContentWhileAnimating
        avoidKeyboard>
        <View style={styles.modalContent}>
          <ModalHeader
            title={`Workout ${formatDate(selectedDate || '')}`}
            onClose={closeModal}
          />

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
              width={Dimensions.get('window').width * 0.8}
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
              absolute
              style={styles.pieChart}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Helper function to format date
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
    paddingHorizontal: 10,
    paddingVertical: 10,
    width: '100%',
  },
  dateTitle: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
  },
  exerciseItem: {
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingBottom: 10,
    width: '100%',
  },
  exerciseLabel: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  exerciseSets: {
    color: Colors.primary,
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
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 5,
  },
  modal: {
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
    width: '100%',
  },
  pieChart: {
    marginVertical: 10,
  },
  pieChartContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  totalReps: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  workoutHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workoutItem: {
    borderColor: Colors.secondary,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 10,
    padding: 15,
  },
});

export default SavedSetsComponent;
