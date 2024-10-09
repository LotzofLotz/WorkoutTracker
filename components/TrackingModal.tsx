import React, {useState, useEffect} from 'react';
import {View, TouchableOpacity, Text, Button, StyleSheet} from 'react-native';
import Modal from 'react-native-modal';
import ChartComponent from './ChartComponent';
import Sound from 'react-native-sound';
import {ScrollView} from 'react-native';

// Typendefinition für Vorhersagen des Modells
interface Prediction {
  label: string;
  probability: number;
}

// Typendefinition für Email-Daten
interface EmailData {
  rawX: number[];
  rawY: number[];
  rawZ: number[];
  smoothedX: number[];
  smoothedY: number[];
  smoothedZ: number[];
  normalizedX: number[];
  normalizedY: number[];
  normalizedZ: number[];
  pca: number[];
  peaks: number[];
  label: string;
}

// Props-Typendefinition für die TrackingModal-Komponente
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
  // emailData: EmailData | null;
  recordedData: {
    accX: number[];
    accY: number[];
    accZ: number[];
    gyroX: number[];
    gyroY: number[];
    gyroZ: number[];
  };
  resetRecordedData: () => void;
}

const TrackingModal: React.FC<TrackingModalProps> = ({
  trackingModalOpen,
  setTrackingModalOpen,
  isTracking,
  setIsTracking,
  timeElapsed,
  resetTimeElapsed,
  predict,
  isLoading, //unused, vllt noch implementieren (ladeindikator)
  predLabel,
  predReps,
  // setPredLabel,
  // setPredReps,
  resetRecordedData,
  chartData,
  peaks,
  predictions,
  quality,
  jerk,
  //emailData,
  //handleEmail,
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
    resetRecordedData();
    setShowButton(true);
  };

  return (
    <Modal
      isVisible={trackingModalOpen}
      onBackButtonPress={onClose}
      onDismiss={onClose}
      // onRequestClose={onClose}
      style={styles.modal}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      backdropColor="#132224">
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
        {/* <Text style={styles.timeText}>Zeit: {timeElapsed} Sekunden</Text> */}

        {/* Anzeige der Ergebnisse nach dem Tracking */}
        {!isTracking && timeElapsed !== 0 && (
          <ScrollView contentContainerStyle={styles.resultsContainer}>
            <Text style={styles.timeText}>Zeit: {timeElapsed} Sekunden</Text>
            <ChartComponent chartData={chartData} peaks={peaks} />

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

            {/* Button zum Speichern der Daten via E-Mail */}
            <View style={styles.saveButtonContainer}>
              <Button
                title="SAVE"
                onPress={() => {
                  //handleEmail(emailData);
                  onClose();
                }}
                color="blue"
              />
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: '4%',
    padding: '4%',
    borderRadius: 10,
    width: '100%',
    minHeight: '60%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startStopButton: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'red',
    borderRadius: 20,
  },
  buttonText: {
    fontSize: 38,
    color: 'white',
  },
  timeText: {
    color: 'black',
    marginTop: 20,
    fontSize: 18,
  },
  resultsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    paddingBottom: 20, // Optional: fügt unten etwas Abstand hinzu
  },
  predictionText: {
    color: 'black',
    fontSize: 16, // Verkleinerte Schriftgröße
    marginTop: 5, // Reduzierter Abstand zwischen den Vorhersagen
    textAlign: 'center',
  },
  metricText: {
    color: 'black',
    fontSize: 18, // Schriftgröße für Qualitätsmetriken
    marginTop: 10,
    textAlign: 'center',
  },
  labelText: {
    color: 'black',
    fontSize: 28, // Größere Schriftgröße für das Label
    marginTop: 15,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  repsText: {
    color: 'black',
    fontSize: 28, // Größere Schriftgröße für die Repetitionen
    marginTop: 5,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  saveButtonContainer: {
    width: 150,
    marginTop: 20,
  },
});

export default TrackingModal;
