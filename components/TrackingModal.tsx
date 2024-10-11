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
import Sound from 'react-native-sound';

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
  predLabel: string; // Erwartet ein string
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
  onSaveAndClose: () => void; // Callback
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
  onSaveAndClose, // Empfang des Callbacks
}) => {
  const [showButton, setShowButton] = useState<boolean>(true);
  const [countdownSound, setCountdownSound] = useState<Sound | null>(null);

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

  const onClose = () => {
    setTrackingModalOpen(false);
    setIsTracking(false);
    resetTimeElapsed();
    resetRecordedData();
    setShowButton(true);
  };

  const handleSaveAndClose = () => {
    onSaveAndClose();
    resetTimeElapsed();
    setShowButton(true); // Rufe den Callback aus App.tsx auf
    // onClose wird automatisch durch setTrackingModalOpen(false) in App.tsx aufgerufen
  };

  return (
    <Modal
      isVisible={trackingModalOpen}
      onBackButtonPress={onClose}
      onDismiss={onClose}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropColor="#132224"
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
      avoidKeyboard={true}>
      <View style={styles.modalContent}>
        {showButton && (
          <TouchableOpacity
            onPress={handleStartStop}
            style={styles.startStopButton}>
            <Text style={styles.buttonText}>
              {isTracking ? 'STOP' : 'START'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Anzeige der Ergebnisse nach dem Tracking */}
        {!isTracking && timeElapsed !== 0 && (
          <ScrollView contentContainerStyle={styles.resultsContainer}>
            <View style={styles.chartContainer}>
              <ChartComponent chartData={chartData} peaks={peaks} />
            </View>
            {/* Anzeige der Vorhersagen */}
            {predictions.map((prediction, index) => (
              <Text style={styles.predictionText} key={index}>
                {index + 1}. Rep: {prediction.label} mit{' '}
                {(prediction.probability * 100).toFixed(2)}%
              </Text>
            ))}

            {/* Anzeige der Qualitätsmetriken */}
            <Text style={styles.metricText}>
              Quality Correlation: {quality.toFixed(2)}
            </Text>
            <Text style={styles.metricText}>
              Quality Jerk: {jerk.toFixed(2)}
            </Text>

            {/* Anzeige des finalen Labels und der Anzahl der Wiederholungen */}
            <Text style={styles.labelText}>LABEL: {predLabel}</Text>
            <Text style={styles.repsText}>REPS: {predReps}</Text>

            {/* Verbesserter SAVE-Button */}
            <View style={styles.saveButtonContainer}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveAndClose} // Verwende den neuen Handler
              >
                <Text style={styles.saveButtonText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'center', // Vertikale Zentrierung
    alignItems: 'center', // Horizontale Zentrierung
  },
  modalContent: {
    width: '100%',
    backgroundColor: 'white', // Ändere die Farbe nach Bedarf
    borderRadius: 10,
    padding: 5, // Innenabstand für den Inhalt
    margin: 20, // Außenabstand, um das Modal vom Bildschirmrand zu entfernen
    alignSelf: 'center', // Ermöglicht dem Modal, sich an den Inhalt anzupassen
    flex: 0, // Verhindert, dass das Modal den gesamten Platz einnimmt
  },
  startStopButton: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4d4d', // Angepasste Farbe
    borderRadius: 150, // Kreisförmig
    marginBottom: 0, // Abstand zum nächsten Element
  },
  buttonText: {
    fontSize: 34, // Angepasste Schriftgröße
    color: 'white',
    fontWeight: 'bold',
  },
  resultsContainer: {
    width: '100%',
    alignItems: 'center', // Zentriert den Inhalt horizontal
    marginTop: 10,
    paddingBottom: 20, // Optional: fügt unten etwas Abstand hinzu
  },
  chartContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    left: -25,
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
    backgroundColor: '#4CAF50', // Angepasste Farbe
    paddingVertical: 15, // Vertikales Padding
    paddingHorizontal: 40, // Horizontales Padding
    borderRadius: 25, // Abgerundete Ecken
    alignItems: 'center',
    shadowColor: '#000', // Schatten für iOS
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // Schatten für Android
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default TrackingModal;
