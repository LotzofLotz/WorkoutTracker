// components/TrackingModal.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
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
  // quality: number; // Auskommentiert
  // jerk: number;    // Auskommentiert
  onSaveAndClose: (adjustedReps: number) => void;
}

const TrackingModal: React.FC<TrackingModalProps> = ({
  isVisible,
  onClose,
  predLabel,
  predReps,
  chartData,
  peaks,
  predictions,
  // quality,
  // jerk,
  onSaveAndClose,
}) => {
  // Entfernt ungenutzte Variablen
  // const [showButton, setShowButton] = useState<boolean>(true);
  // const [countdownSound, setCountdownSound] = useState<Sound | null>(null);
  const [adjustedReps, setAdjustedReps] = useState<number>(predReps); // Neuer Zustand

  // Entfernt ungenutzte Variable
  // const screenHeight = Dimensions.get('window').height;

  // useEffect(() => {
  //   Sound.setCategory('Playback');

  //   const sound = new Sound('sui_countdown.mp3', Sound.MAIN_BUNDLE, error => {
  //     if (error) {
  //       console.log('Failed to load the sound', error);
  //       return;
  //     }
  //     // setCountdownSound(sound); // Entfernt, da countdownSound nicht verwendet wird
  //   });

  //   return () => {
  //     sound.release();
  //   };
  // }, []);

  // Aktualisiere adjustedReps, wenn predReps sich ändert
  useEffect(() => {
    setAdjustedReps(predReps);
  }, [predReps]);

  // Funktionen zum Anpassen der Reps
  const incrementReps = () => {
    setAdjustedReps(prev => prev + 1);
  };

  const decrementReps = () => {
    setAdjustedReps(prev => (prev > 0 ? prev - 1 : 0));
  };

  const handleSave = () => {
    onSaveAndClose(adjustedReps); // Übergib die angepasste Reps-Zahl
  };

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
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
      avoidKeyboard={true}>
      <View style={styles.modalContent}>
        {/* Modal Header */}
        <ModalHeader title="Result" onClose={onClose} />

        {/* Inhalt des Modals */}
        <ScrollView contentContainerStyle={styles.modalBody}>
          <View style={styles.resultsContainer}>
            <View style={styles.chartContainer}>
              <ChartComponent chartData={chartData} peaks={peaks} />
            </View>
            {predictions.map((prediction, index) => (
              <Text style={styles.predictionText} key={index}>
                {index + 1}. Rep: {prediction.label} {' ('}
                {(prediction.probability * 100).toFixed(2)}%{')'}
              </Text>
            ))}

            {/* Auskommentierte Texte */}
            {/* 
            <Text style={styles.metricText}>
              Quality Correlation: {quality.toFixed(2)}
            </Text>
            <Text style={styles.metricText}>
              Quality Jerk: {jerk.toFixed(2)}
            </Text>
            */}

            <Text style={styles.labelText}>LABEL: </Text>
            <Text style={styles.predLabelText}> {predLabel}</Text>

            {/* Bereich zum Anpassen der Reps */}
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

const styles = StyleSheet.create({
  adjustButton: {
    alignItems: 'center',
    backgroundColor: Colors.primary, // Ersetzt Farbliteral
    borderRadius: 5,
    height: 80,
    justifyContent: 'center',
    padding: 10,
    width: 80,
  },
  adjustButtonText: {
    color: Colors.background, // Ersetzt 'white' mit Colors.background
    fontSize: 44,
    fontWeight: 'bold',
  },
  adjustButtons: {
    alignItems: 'center',
    flexDirection: 'row',
  },

  adjustedReps: {
    color: Colors.textSecondary, // Ersetzt 'black' mit Colors.textSecondary
    fontSize: 44,
    fontWeight: 'bold',
    marginHorizontal: 20,
    minWidth: 50,
    textAlign: 'center',
  },
  // Entfernt ungenutzte buttonText
  // buttonText: {
  //   color: 'white',
  //   fontSize: 54,
  //   fontWeight: 'bold',
  // },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  labelText: {
    color: Colors.textSecondary, // Ersetzt 'black' mit Colors.textSecondary
    fontSize: 24,
    marginTop: 15,
    textAlign: 'center',
    // fontWeight: 'bold',
  },
  // Entfernt ungenutzte metricText
  // metricText: {
  //   color: 'black',
  //   fontSize: 18,
  //   marginTop: 10,
  //   textAlign: 'center',
  // },
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
    backgroundColor: Colors.background, // Ersetzt 'white' mit Colors.background
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    width: '100%',
    // Höhe wird dynamisch gesetzt basierend auf showButton
  },
  predLabelText: {
    color: Colors.primary, // Ersetzt Colors.primary mit einer konsistenten Farbkonstanten
    fontSize: 44,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  predictionText: {
    color: Colors.textSecondary, // Ersetzt 'black' mit Colors.textSecondary
    fontSize: 16,
    marginTop: 5,
    textAlign: 'center',
  },
  repsAdjustContainer: {
    alignItems: 'center',
    marginTop: 15,
  },
  repsLabel: {
    color: Colors.textSecondary, // Ersetzt 'black' mit Colors.textSecondary
    fontSize: 24,
    // fontWeight: 'bold',
    marginRight: 10,
  },
  // Entfernt ungenutzte repsText
  // repsText: {
  //   color: 'black',
  //   fontSize: 24,
  //   marginTop: 5,
  //   textAlign: 'center',
  //   // fontWeight: 'bold',
  // },
  resultsContainer: {
    alignItems: 'center',
    marginTop: 10,
    paddingBottom: 20,
    width: '100%',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: Colors.secondary, // Ersetzt Farbliteral
    borderRadius: 25,
    elevation: 5,
    height: 80,
    justifyContent: 'center',
    shadowColor: Colors.textSecondary, // Ersetzt '#000' mit Colors.textSecondary
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: 200,
  },
  saveButtonContainer: {
    alignSelf: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: Colors.background, // Ersetzt 'white' mit Colors.background
    fontSize: 34,
    fontWeight: 'bold',
  },
  // Entfernt ungenutzte startStopButton
  // startStopButton: {
  //   alignItems: 'center',
  //   backgroundColor: '#ff4d4d',
  //   borderRadius: 200,
  //   height: 350,
  //   justifyContent: 'center',
  //   marginBottom: 20,
  //   width: 350,
  // },
});

export default TrackingModal;
