// components/TrackingModal.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import Modal from 'react-native-modal';
import ChartComponent from './ChartComponent';
import ModalHeader from './ModalHeader';
import Colors from './colors';

interface Prediction {
  label: string;
  probability: number;
}

interface TrackingModalProps {
  isVisible: boolean;
  onClose: () => void;
  predLabel: string;
  predReps: number;
  chartData: number[];
  peaks: number[];
  predictions: Prediction[];
  onSaveAndClose: (adjustedReps: number, selectedLabel: string) => void;
}

const TrackingModal: React.FC<TrackingModalProps> = ({
  isVisible,
  onClose,
  predLabel,
  predReps,
  chartData,
  peaks,
  predictions,
  onSaveAndClose,
}) => {
  const [adjustedReps, setAdjustedReps] = useState<number>(predReps);
  const [selectedLabel, setSelectedLabel] = useState<string>(predLabel);
  const [isLabelModalVisible, setIsLabelModalVisible] =
    useState<boolean>(false);

  // Update adjustedReps and selectedLabel when predReps or predLabel change
  useEffect(() => {
    setAdjustedReps(predReps);
    setSelectedLabel(predLabel);
  }, [predReps, predLabel]);

  useEffect(() => {
    if (isVisible) {
      setAdjustedReps(predReps);
      setSelectedLabel(predLabel);
    }
  }, [isVisible]);

  // Increment reps count
  const incrementReps = () => {
    setAdjustedReps(prev => prev + 1);
  };

  // Decrement reps count
  const decrementReps = () => {
    setAdjustedReps(prev => (prev > 0 ? prev - 1 : 0));
  };

  // Save adjustments and close modal
  const handleSave = () => {
    onSaveAndClose(adjustedReps, selectedLabel);
  };

  const availableLabels = ['Squat', 'PushUp', 'PullUp', 'SitUp'];

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropColor="#132224"
      backdropOpacity={0.5}
      useNativeDriver
      hideModalContentWhileAnimating
      avoidKeyboard>
      <View style={styles.modalContent}>
        <ModalHeader title="Result" onClose={onClose} />

        <ScrollView contentContainerStyle={styles.modalBody}>
          <View style={styles.resultsContainer}>
            <View style={styles.chartContainer}>
              <ChartComponent chartData={chartData} peaks={peaks} />
            </View>
            {predictions.map((prediction, index) => (
              <Text style={styles.predictionText} key={index}>
                {index + 1}. Rep: {prediction.label} (
                {(prediction.probability * 100).toFixed(2)}%)
              </Text>
            ))}

            <View style={styles.labelContainer}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setIsLabelModalVisible(true)}>
                <Text style={styles.dropdownButtonText}>
                  {selectedLabel || 'Select Label'}
                </Text>
              </TouchableOpacity>
            </View>

            <Modal
              isVisible={isLabelModalVisible}
              onBackdropPress={() => setIsLabelModalVisible(false)}
              onBackButtonPress={() => setIsLabelModalVisible(false)}
              style={styles.labelModal}
              animationIn="zoomIn"
              animationOut="zoomOut"
              backdropColor="#000000"
              backdropOpacity={0.5}
              useNativeDriver
              hideModalContentWhileAnimating
              avoidKeyboard>
              <View style={styles.labelModalContent}>
                {availableLabels.map(label => (
                  <TouchableOpacity
                    key={label}
                    style={styles.labelOption}
                    onPress={() => {
                      setSelectedLabel(label);
                      setIsLabelModalVisible(false);
                    }}>
                    <Text style={styles.labelOptionText}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Modal>

            <View style={styles.repsAdjustContainer}>
              <Text style={styles.repsLabel}>REPS:</Text>
              <View style={styles.adjustButtons}>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={decrementReps}>
                  <Text style={styles.adjustButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.adjustedReps}>{adjustedReps}</Text>
                <TouchableOpacity
                  style={styles.adjustButton}
                  onPress={incrementReps}>
                  <Text style={styles.adjustButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.saveButtonContainer}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const {width} = Dimensions.get('window');

const styles = StyleSheet.create({
  adjustButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 5,
    height: 80,
    justifyContent: 'center',
    padding: 10,
    width: 80,
  },
  adjustButtonText: {
    color: Colors.background,
    fontSize: 44,
    fontWeight: 'bold',
  },
  adjustButtons: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  adjustedReps: {
    color: Colors.textSecondary,
    fontSize: 58,
    fontWeight: 'bold',
    marginHorizontal: 20,
    minWidth: 50,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  dropdownButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 100,
    justifyContent: 'center',
    paddingHorizontal: 15,
    width: 300,
  },
  dropdownButtonText: {
    color: Colors.background,
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  labelContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 20,
  },
  labelModal: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelModalContent: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 20,
    width: width * 0.8,
  },
  labelOption: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  labelOptionText: {
    color: Colors.background,
    fontSize: 40,
    fontWeight: 'bold',
  },
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalBody: {
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    width: '100%',
  },
  predictionText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 5,
    textAlign: 'center',
  },
  repsAdjustContainer: {
    alignItems: 'center',
    marginTop: 15,
  },
  repsLabel: {
    color: Colors.textSecondary,
    fontSize: 24,
    marginRight: 10,
  },
  resultsContainer: {
    alignItems: 'center',
    marginTop: 10,
    paddingBottom: 20,
    width: '100%',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: 25,
    elevation: 5,
    height: 80,
    justifyContent: 'center',
    shadowColor: Colors.textSecondary,
    shadowOffset: {height: 2, width: 0},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: 200,
  },
  saveButtonContainer: {
    alignSelf: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: Colors.background,
    fontSize: 34,
    fontWeight: 'bold',
  },
});

export default TrackingModal;
