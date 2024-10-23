// components/StatsModal.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import Modal from 'react-native-modal';
import {PieChart} from 'react-native-chart-kit';
import ModalHeader from './ModalHeader';

interface WorkoutSet {
  timestamp: string;
  label: string;
  repetitions: number;
}

interface StatsModalProps {
  isVisible: boolean;
  onClose: () => void;
  sets: WorkoutSet[];
}

interface ExerciseStats {
  label: string;
  totalReps: number;
}

const StatsModal: React.FC<StatsModalProps> = ({isVisible, onClose, sets}) => {
  // Gruppiere die Sets nach Übung und berechne die Gesamtwiederholungen
  const calculateTotalReps = (sets: WorkoutSet[]): ExerciseStats[] => {
    const statsMap: {[key: string]: number} = {};

    sets.forEach(set => {
      if (statsMap[set.label]) {
        statsMap[set.label] += set.repetitions;
      } else {
        statsMap[set.label] = set.repetitions;
      }
    });

    // Wandelt das Objekt in ein Array um
    const statsArray: ExerciseStats[] = Object.keys(statsMap).map(key => ({
      label: key,
      totalReps: statsMap[key],
    }));

    return statsArray;
  };

  const totalRepsPerExercise = calculateTotalReps(sets);

  // Farb-Mapping für spezifische Übungen
  const exerciseColors: {[key: string]: string} = {
    Squat: '#e74c3c', // Rot
    PushUp: '#f39c12', // Orange
    PullUp: '#2ecc71', // Grün
    SitUp: '#9b59b6', // Violett
  };

  // Hilfsfunktion, um Farben zuzuweisen
  const getColor = (label: string) => {
    return exerciseColors[label] || '#34495e'; // Fallback-Farbe (dunkelgrau)
  };

  // Daten für den PieChart vorbereiten
  const pieChartData = totalRepsPerExercise.map(exercise => ({
    name: exercise.label,
    population: exercise.totalReps,
    color: getColor(exercise.label),
    legendFontColor: '#7F7F7F',
    legendFontSize: 15,
  }));

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
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
        <ModalHeader title="Stats" onClose={onClose} />

        {/* Inhalt des Modals */}
        <ScrollView contentContainerStyle={styles.modalBody}>
          {/* Liste der Übungen mit Gesamtwiederholungen */}
          {totalRepsPerExercise.map((exercise, index) => (
            <View key={index} style={styles.exerciseItem}>
              <Text style={styles.exerciseLabel}>{exercise.label}</Text>

              <View style={styles.exerciseStatsContainer}>
                <Text style={styles.highlightedReps}>
                  {exercise.totalReps} Reps
                </Text>
              </View>
            </View>
          ))}

          {/* PieChart */}
          <PieChart
            data={pieChartData}
            width={Dimensions.get('window').width * 0.8}
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
            absolute
            style={{marginVertical: 10}}
          />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end', // Modal am unteren Rand anzeigen
    margin: 0,
  },
  modalContent: {
    width: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    // Höhe anpassen, um genügend Platz für den Inhalt zu bieten
    maxHeight: '80%',
  },
  modalBody: {
    padding: 20,
    alignItems: 'center',
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
  },
  exerciseLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseLabel: {
    fontSize: 18, // Größere Schriftgröße
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
});

export default StatsModal;
