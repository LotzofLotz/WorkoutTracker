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
import Sound from 'react-native-sound';
import ModalHeader from './ModalHeader'; // Importiere ModalHeader
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
  quality: number;
  jerk: number;
  onSaveAndClose: (adjustedReps: number) => void; // Ändere die Signatur
}

const TrackingModal: React.FC<TrackingModalProps> = ({
  isVisible,
  onClose,
  predLabel,
  predReps,
  chartData,
  peaks,
  predictions,
  quality,
  jerk,
  onSaveAndClose,
}) => {
  const [showButton, setShowButton] = useState<boolean>(true);
  const [countdownSound, setCountdownSound] = useState<Sound | null>(null);
  const [adjustedReps, setAdjustedReps] = useState<number>(predReps); // Neuer Zustand

  const screenHeight = Dimensions.get('window').height; // Ermittelt die Höhe des Bildschirms

  useEffect(() => {
    Sound.setCategory('Playback');

    const sound = new Sound('sui_countdown.mp3', Sound.MAIN_BUNDLE, error => {
      if (error) {
        console.log('Failed to load the sound', error);
        return;
      }
      setCountdownSound(sound);
    });

    return () => {
      sound.release();
    };
  }, []);

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

            {/* <Text style={styles.metricText}>
              Quality Correlation: {quality.toFixed(2)}
            </Text>
            <Text style={styles.metricText}>
              Quality Jerk: {jerk.toFixed(2)}
            </Text> */}

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
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  modalContent: {
    width: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    alignItems: 'center',
    // Höhe wird dynamisch gesetzt basierend auf showButton
  },
  modalBody: {
    padding: 20,
    alignItems: 'center',
  },

  repsAdjustContainer: {
    // flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  repsLabel: {
    color: 'black',
    fontSize: 24,
    // fontWeight: 'bold',
    marginRight: 10,
  },
  adjustButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adjustButton: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    height: 80,
    width: 80,
    padding: 10,
    borderRadius: 5,
  },
  adjustButtonText: {
    fontSize: 44,
    fontWeight: 'bold',
    color: 'white',
  },
  adjustedReps: {
    fontSize: 44,
    fontWeight: 'bold',
    color: 'black',
    marginHorizontal: 20,
    minWidth: 50,
    textAlign: 'center',
  },
  startStopButton: {
    width: 350,
    height: 350,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4d4d',
    borderRadius: 200,
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 54,
    color: 'white',
    fontWeight: 'bold',
  },
  resultsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    paddingBottom: 20,
  },
  chartContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  predictionText: {
    color: 'black',
    fontSize: 16,
    marginTop: 5,
    textAlign: 'center',
  },
  metricText: {
    color: 'black',
    fontSize: 18,
    marginTop: 10,
    textAlign: 'center',
  },
  labelText: {
    color: 'black',
    fontSize: 24,
    marginTop: 15,
    textAlign: 'center',
    // fontWeight: 'bold',
  },
  predLabelText: {
    color: Colors.primary,
    fontSize: 44,
    marginTop: 10,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  repsText: {
    color: 'black',
    fontSize: 24,
    marginTop: 5,
    textAlign: 'center',
    // fontWeight: 'bold',
  },
  saveButtonContainer: {
    alignSelf: 'center',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    //paddingVertical: 15,
    //paddingHorizontal: 40,
    height: 80,
    width: 200,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 34,
    fontWeight: 'bold',
  },
});

export default TrackingModal;
