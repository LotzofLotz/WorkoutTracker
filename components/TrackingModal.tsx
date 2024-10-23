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
import Sound from 'react-native-sound';
import ModalHeader from './ModalHeader'; // Importiere ModalHeader

interface Prediction {
  label: string;
  probability: number;
}

interface TrackingModalProps {
  trackingModalOpen: boolean;
  setTrackingModalOpen: (open: boolean) => void;
  isTracking: boolean;
  setIsTracking: (tracking: boolean) => void;
  timeElapsed: number;
  resetTimeElapsed: () => void;
  predict: () => Promise<void>;
  isLoading: boolean;
  predLabel: string;
  predReps: number;
  chartData: number[];
  peaks: number[];
  predictions: Prediction[];
  quality: number;
  jerk: number;
  recordedData: {
    accX: number[];
    accY: number[];
    accZ: number[];
    gyroX: number[];
    gyroY: number[];
    gyroZ: number[];
  };
  resetRecordedData: () => void;
  onSaveAndClose: () => void;
}

const TrackingModal: React.FC<TrackingModalProps> = ({
  trackingModalOpen,
  setTrackingModalOpen,
  isTracking,
  setIsTracking,
  timeElapsed,
  resetTimeElapsed,
  predict,
  isLoading,
  predLabel,
  predReps,
  resetRecordedData,
  chartData,
  peaks,
  predictions,
  quality,
  jerk,
  onSaveAndClose,
}) => {
  const [showButton, setShowButton] = useState<boolean>(true);
  const [countdownSound, setCountdownSound] = useState<Sound | null>(null);

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

  const handleStartStop = () => {
    if (isTracking) {
      predict();
      setIsTracking(false);
      setShowButton(false);
    } else {
      setTimeout(() => {
        setIsTracking(true);
      }, 3000);

      countdownSound?.play(success => {
        if (!success) {
          console.log('Sound playback failed');
        }
      });
    }
  };

  const closeModal = () => {
    setTrackingModalOpen(false);
    setIsTracking(false);
    resetTimeElapsed();
    resetRecordedData();
    setShowButton(true);
  };

  const handleSaveAndClose = () => {
    onSaveAndClose();
    resetTimeElapsed();
    setShowButton(true);
  };

  return (
    <Modal
      isVisible={trackingModalOpen}
      onBackdropPress={closeModal}
      onBackButtonPress={closeModal}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropColor="#132224"
      backdropOpacity={0.5}
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
      avoidKeyboard={true}>
      <View
        style={[
          styles.modalContent,
          {height: showButton ? screenHeight * 0.8 : 'auto'}, // Dynamische Höhe
        ]}>
        {/* Modal Header */}
        <ModalHeader title="Tracking" onClose={closeModal} />

        {/* Inhalt des Modals */}
        <ScrollView contentContainerStyle={styles.modalBody}>
          {showButton && (
            <TouchableOpacity
              onPress={handleStartStop}
              style={styles.startStopButton}>
              <Text style={styles.buttonText}>
                {isTracking ? 'STOP' : 'START'}
              </Text>
            </TouchableOpacity>
          )}

          {!isTracking && timeElapsed !== 0 && (
            <View style={styles.resultsContainer}>
              <View style={styles.chartContainer}>
                <ChartComponent chartData={chartData} peaks={peaks} />
              </View>
              {predictions.map((prediction, index) => (
                <Text style={styles.predictionText} key={index}>
                  {index + 1}. Rep: {prediction.label} mit{' '}
                  {(prediction.probability * 100).toFixed(2)}%
                </Text>
              ))}

              <Text style={styles.metricText}>
                Quality Correlation: {quality.toFixed(2)}
              </Text>
              <Text style={styles.metricText}>
                Quality Jerk: {jerk.toFixed(2)}
              </Text>

              <Text style={styles.labelText}>LABEL: {predLabel}</Text>
              <Text style={styles.repsText}>REPS: {predReps}</Text>

              <View style={styles.saveButtonContainer}>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveAndClose}>
                  <Text style={styles.saveButtonText}>SAVE</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    fontSize: 28,
    marginTop: 15,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  repsText: {
    color: 'black',
    fontSize: 28,
    marginTop: 5,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  saveButtonContainer: {
    alignSelf: 'center',
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TrackingModal;
