// App.tsx
import React, {useState, useEffect} from 'react';
import {
  TouchableOpacity,
  SafeAreaView,
  View,
  StyleSheet,
  Text,
} from 'react-native';
import TrackingModal from './components/TrackingModal';
import SavedSetsComponent from './components/SavedSetsComponent';
import useSensorData from './hooks/useSensorData';
import useTimer from './hooks/useTimer';
import useModel from './hooks/useModel';
import usePrediction from './hooks/usePrediction';
import {saveWorkoutSet, getWorkoutSets, WorkoutSet} from './storageService';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/FontAwesome';
import ProgressModal from './components/ProgressModal';
import StatsModal from './components/StatsModal';
import Header from './components/Header';

const App = (): React.JSX.Element => {
  const [trackingModalOpen, setTrackingModalOpen] = useState<boolean>(false);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [sets, setSets] = useState<WorkoutSet[]>([]); // Zustand für gespeicherte Sets
  const [isProgressModalVisible, setProgressModalVisible] =
    useState<boolean>(false);
  const [isTotalStatsModalVisible, setTotalStatsModalVisible] =
    useState<boolean>(false);
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
      <Header title="Workout History" />
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
      <ProgressModal
        isVisible={isProgressModalVisible}
        onClose={() => setProgressModalVisible(false)}
        sets={sets}
      />
      <StatsModal
        isVisible={isTotalStatsModalVisible}
        onClose={() => setTotalStatsModalVisible(false)}
        sets={sets}
      />

      {/* Anzeige der gespeicherten Sets */}
      <SavedSetsComponent sets={sets} />

      {/* Floating Button zum Öffnen des Modals */}
      {/* <TouchableOpacity
        onPress={openModal} // Verwenden Sie die neue openModal-Funktion
        style={styles.floatingButton}>
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity> */}

      <View style={styles.navBar}>
        {/* Stats Button */}
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setTotalStatsModalVisible(true)}>
          <Icon name="trophy" size={24} color="#fff" />
          <Text style={styles.navButtonText}>Stats</Text>
        </TouchableOpacity>

        {/* Add Workout Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setTrackingModalOpen(true)}>
          <Icon name="plus" size={54} color="#fff" />
        </TouchableOpacity>

        {/* Progress Button */}
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setProgressModalVisible(true)}>
          <Icon name="bar-chart" size={24} color="#fff" />
          <Text style={styles.navButtonText}>Progress</Text>
        </TouchableOpacity>
      </View>

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
  historyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    flex: 0.48, // Etwa die Hälfte des verfügbaren Platzes
    backgroundColor: '#2196F3', // Gleiche Farbe wie der Schließen-Button
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },

  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    // Optional: Schatten für eine bessere Sichtbarkeit
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  navButton: {
    alignItems: 'center',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  addButton: {
    left: 10,
    bottom: 15,
    width: 110,
    height: 110,
    borderRadius: 60,
    backgroundColor: '#ff4d4d', // Orange für den + Button
    justifyContent: 'center',
    alignItems: 'center',
    // Optional: Schatten für den freiflotierenden Effekt
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 30, // Verschiebung nach oben, um den freiflotierenden Effekt zu erzeugen
  },
});

export default App;
