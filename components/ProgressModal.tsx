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
import ModalHeader from './ModalHeader';
import {WorkoutSet} from '../storageService';
import Colors from './colors';

interface ProgressModalProps {
  isVisible: boolean;
  onClose: () => void;
  sets: WorkoutSet[];
}

const ProgressModal: React.FC<ProgressModalProps> = ({
  isVisible,
  onClose,
  sets,
}) => {
  const [selectedStat, setSelectedStat] = useState<string>('Total');

  // Group sets by date
  const groupSetsByDate = useCallback((sets: WorkoutSet[]) => {
    const groups: {[date: string]: WorkoutSet[]} = {};

    sets.forEach(set => {
      const date = new Date(set.timestamp).toLocaleDateString('de-DE'); // Format: DD.MM.YYYY
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(set);
    });

    return groups;
  }, []);

  const groupedSets = useMemo(
    () => groupSetsByDate(sets),
    [sets, groupSetsByDate],
  );

  // Sort dates in ascending order
  const sortedDates = useMemo(() => {
    return Object.keys(groupedSets).sort((a, b) => {
      const dateA = new Date(a.split('.').reverse().join('-')).getTime();
      const dateB = new Date(b.split('.').reverse().join('-')).getTime();
      return dateA - dateB;
    });
  }, [groupedSets]);

  // Calculate reps per day based on selected stat
  const calculateRepsPerDay = useCallback(
    (exercise: string | 'Total') => {
      return sortedDates.map(date => {
        const setsForDate = groupedSets[date];
        if (exercise === 'Total') {
          return setsForDate.reduce((sum, set) => sum + set.repetitions, 0);
        } else {
          return setsForDate
            .filter(set => set.label.toLowerCase() === exercise.toLowerCase())
            .reduce((sum, set) => sum + set.repetitions, 0);
        }
      });
    },
    [groupedSets, sortedDates],
  );

  // Prepare chart data based on selected stat
  const getChartData = useMemo(() => {
    const data = calculateRepsPerDay(selectedStat);

    // Determine step for labels to avoid overlap
    const maxLabels = 10; // Maximum number of labels to display
    const totalLabels = sortedDates.length;
    const step =
      totalLabels > maxLabels ? Math.ceil(totalLabels / maxLabels) : 1;

    // Labels based on sorted dates with step
    const labels = sortedDates.map((date, index) => {
      const [day, month] = date.split('.');
      return index % step === 0 ? `${day}.${month}` : '';
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
      useNativeDriver
      hideModalContentWhileAnimating
      avoidKeyboard>
      <View style={styles.modalContent}>
        <ModalHeader title="Progress" onClose={onClose} />

        {/* Stat Selection Buttons */}
        <ScrollView horizontal contentContainerStyle={styles.buttonContainer}>
          {['Total', 'PushUp', 'PullUp', 'Squat', 'SitUp'].map(label => (
            <TouchableOpacity
              key={label}
              style={[
                styles.statButton,
                selectedStat === label && styles.selectedButton,
              ]}
              onPress={() => setSelectedStat(label)}>
              <Text
                style={[
                  styles.statButtonText,
                  selectedStat === label && styles.selectedButtonText,
                ]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* LineChart for Selected Stat */}
        <View style={styles.chartContainer}>
          {sortedDates.length === 0 ? (
            <Text style={styles.noDataText}>No Data recorded</Text>
          ) : (
            <LineChart
              data={getChartData}
              width={Dimensions.get('window').width * 0.9}
              height={220}
              chartConfig={{
                backgroundColor: Colors.background,
                backgroundGradientFrom: Colors.background,
                backgroundGradientTo: Colors.background,
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 48, 73, ${opacity})`,
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

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 25,
  },
  chartContainer: {
    alignItems: 'center',
    marginTop: 20,
    right: 15,
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
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
    width: '100%',
  },
  noDataText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  selectedButton: {
    backgroundColor: Colors.secondary,
  },
  selectedButtonText: {
    color: Colors.background,
    fontWeight: 'bold',
  },
  statButton: {
    alignItems: 'center',
    backgroundColor: Colors.border,
    borderRadius: 10,
    marginHorizontal: 5,
    minWidth: 90,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  statButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
  },
});

export default ProgressModal;
