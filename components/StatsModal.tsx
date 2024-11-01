// components/StatsModal.tsx
import React from 'react';
import {View, Text, StyleSheet, Dimensions, ScrollView} from 'react-native';
import Modal from 'react-native-modal';
import {PieChart} from 'react-native-chart-kit';
import ModalHeader from './ModalHeader';
import Colors from './colors';

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
    Squat: Colors.teal,
    PushUp: Colors.purple,
    PullUp: Colors.primary,
    SitUp: Colors.secondary,
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
    legendFontColor: Colors.textSecondary,
    legendFontSize: 15,
  }));

  return (
    <Modal
      isVisible={isVisible}
      onBackButtonPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropColor={Colors.darkBackdrop}
      backdropOpacity={0.5}
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
      avoidKeyboard={true}
      propagateSwipe={true}>
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
            style={styles.pieChart}
          />
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  exerciseItem: {
    alignItems: 'center',
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    width: '100%',
  },
  exerciseLabel: {
    color: Colors.textPrimary,
    fontSize: 18, // Größere Schriftgröße
    fontWeight: 'bold',
  },
  exerciseStatsContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  highlightedReps: {
    color: Colors.textSecondary,
    fontSize: 18, // Größere Schriftgröße für Hervorhebung
    fontWeight: 'bold',
    marginRight: 5,
  },
  modal: {
    justifyContent: 'flex-end', // Modal am unteren Rand anzeigen
    margin: 0,
  },
  modalBody: {
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
    // paddingHorizontal: 20,
    // paddingTop: 20,
    width: '100%',
  },
  pieChart: {
    marginVertical: 10,
  },
});

export default StatsModal;
