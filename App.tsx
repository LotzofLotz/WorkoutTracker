import React, {useState} from 'react';
import {TouchableOpacity, SafeAreaView, StyleSheet, Text} from 'react-native';
import TrackingModal from './components/TrackingModal';
import useSensorData from './hooks/useSensorData';
import useTimer from './hooks/useTimer';
import useModel from './hooks/useModel';
import usePrediction from './hooks/usePrediction';

const App = (): React.JSX.Element => {
  const [trackingModalOpen, setTrackingModalOpen] = useState<boolean>(false);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const {model, isLoading} = useModel();
  const {recordedData, resetRecordedData} = useSensorData(isTracking);
  const {timeElapsed, resetTimeElapsed} = useTimer(isTracking);
  const {
    predictLabel,
    predReps,
    predLabel,
    peaks,
    chartData,
    quality,
    jerk,
    emailData,
    predictions,
  } = usePrediction({model, recordedData});

  return (
    <SafeAreaView style={styles.container}>
      <TrackingModal
        trackingModalOpen={trackingModalOpen}
        setTrackingModalOpen={setTrackingModalOpen}
        isTracking={isTracking}
        setIsTracking={setIsTracking}
        timeElapsed={timeElapsed}
        resetTimeElapsed={resetTimeElapsed}
        recordedData={recordedData}
        resetRecordedData={resetRecordedData}
        //handleEmail={handleEmail}
        predict={predictLabel}
        isLoading={isLoading}
        predLabel={predLabel}
        predReps={predReps}
        chartData={chartData}
        peaks={peaks}
        predictions={predictions}
        quality={quality}
        jerk={jerk}
        //emailData={emailData}
        //isLoading={isLoading}
      />
      <TouchableOpacity
        onPress={() => setTrackingModalOpen(true)}
        style={styles.floatingButton}>
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// Stylesheet zur Gestaltung der Komponenten
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center', // Zentriere Inhalte vertikal
    alignItems: 'center', // Zentriere Inhalte horizontal
  },
  floatingButton: {
    position: 'absolute',
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#03A9F4',
    borderRadius: 38, // Halbe Breite/Höhe für kreisförmigen Button
    elevation: 8, // Schatten für Android
    shadowColor: '#000', // Schattenfarbe für iOS
    shadowOpacity: 0.25, // Schattenopacity für iOS
    shadowRadius: 3.84, // Schattenradius für iOS
  },
  floatingButtonText: {
    fontSize: 50,
    color: 'white',
    lineHeight: 50, // Vertikale Zentrierung des Textes
  },
});

export default App;
