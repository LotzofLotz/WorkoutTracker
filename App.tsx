// App.tsx
import React, {useState, useEffect} from 'react';
import {TouchableOpacity, SafeAreaView, StyleSheet, Text} from 'react-native';
import TrackingModal from './components/TrackingModal';
import SavedSetsComponent from './components/SavedSetsComponent';
import useSensorData from './hooks/useSensorData';
import useTimer from './hooks/useTimer';
import useModel from './hooks/useModel';
import usePrediction from './hooks/usePrediction';
import {saveWorkoutSet, getWorkoutSets, WorkoutSet} from './storageService';
import Toast from 'react-native-toast-message';

const App = (): React.JSX.Element => {
  const [trackingModalOpen, setTrackingModalOpen] = useState<boolean>(false);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [sets, setSets] = useState<WorkoutSet[]>([]); // Zustand für gespeicherte Sets

  const {model, isLoading} = useModel();
  const {recordedData, resetRecordedData} = useSensorData(isTracking);
  const {timeElapsed, resetTimeElapsed} = useTimer(isTracking);
  const {
    predictLabel, // Funktion
    predReps, // Zahl
    predLabel, // String
    peaks,
    chartData,
    quality,
    jerk,
    predictions,
  } = usePrediction({model, recordedData});

  // Funktion zum Laden der Sets beim Start
  const loadSets = async () => {
    try {
      const fetchedSets = await getWorkoutSets();
      setSets(fetchedSets);
    } catch (error) {
      console.error('Fehler beim Laden der Sets:', error);
    }
  };

  useEffect(() => {
    loadSets();
  }, [trackingModalOpen]);

  // Funktion zum Hinzufügen eines neuen Sets
  const addSet = async (newSet: WorkoutSet) => {
    try {
      await saveWorkoutSet(newSet);
      setSets(prevSets => [...prevSets, newSet]); // Aktualisiere den Zustand
      console.log('SET ADDED');
      Toast.show({
        type: 'success',
        text1: 'Glückwunsch!',
        text2: 'Set wurde erfolgreich gespeichert!',
      });
    } catch (error) {
      console.error('Fehler beim Speichern des Sets:', error);
      Toast.show({
        type: 'error',
        text1: 'Fehler',
        text2: 'Beim Speichern des Sets ist ein Fehler aufgetreten.',
      });
    }
  };

  // Callback-Funktion, die von TrackingModal aufgerufen wird, um ein neues Set hinzuzufügen
  const handleSaveAndClose = () => {
    const newSet: WorkoutSet = {
      timestamp: new Date().toISOString(),
      label: predLabel, // Korrigierte Zuweisung
      repetitions: predReps,
    };
    addSet(newSet);
    resetTimeElapsed();
    setTrackingModalOpen(false);
  };

  // Funktion zum Öffnen des Modals
  const openModal = () => {
    setTrackingModalOpen(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Tracking Modal */}
      <TrackingModal
        trackingModalOpen={trackingModalOpen}
        setTrackingModalOpen={setTrackingModalOpen}
        isTracking={isTracking}
        setIsTracking={setIsTracking}
        timeElapsed={timeElapsed}
        resetTimeElapsed={resetTimeElapsed}
        recordedData={recordedData}
        resetRecordedData={resetRecordedData}
        predict={predictLabel} // Funktion weitergeben
        isLoading={isLoading}
        predLabel={predLabel} // String weitergeben
        predReps={predReps}
        chartData={chartData}
        peaks={peaks}
        predictions={predictions}
        quality={quality}
        jerk={jerk}
        onSaveAndClose={handleSaveAndClose} // Übergabe des Callbacks
      />

      {/* Anzeige der gespeicherten Sets */}
      <SavedSetsComponent
        sets={sets}
        // onWorkoutPress={date => {
        //   // Hier kannst du definieren, was beim Klick auf ein Workout passieren soll
        //   console.log('Workout am Datum angeklickt:', date);
        //   // Zum Beispiel Navigation zu einer Detailansicht
        // }}
      />

      {/* Floating Button zum Öffnen des Modals */}
      <TouchableOpacity
        onPress={openModal} // Verwenden Sie die neue openModal-Funktion
        style={styles.floatingButton}>
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      {/* Toast-Nachrichten */}
      <Toast />
    </SafeAreaView>
  );
};

// Stylesheet zur Gestaltung der Komponenten
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Hintergrundfarbe der App
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
