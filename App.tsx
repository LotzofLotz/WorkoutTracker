// App.tsx
import React, {useState, useRef, useEffect} from 'react';
import {
  TouchableOpacity,
  SafeAreaView,
  View,
  StyleSheet,
  Text,
  Animated,
  Dimensions,
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
import Sound from 'react-native-sound';

const App = (): React.JSX.Element => {
  const [countdownSound, setCountdownSound] = useState<Sound | null>(null);
  const [trackingModalOpen, setTrackingModalOpen] = useState<boolean>(false);
  //const [isTracking, setIsTracking] = useState<boolean>(false);
  // Flag, um zu verhindern, dass die Animation mehrmals ausgelöst wird
  const [isButtonEnlarged, setIsButtonEnlarged] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [sets, setSets] = useState<WorkoutSet[]>([]); // Zustand für gespeicherte Sets
  const [isProgressModalVisible, setProgressModalVisible] =
    useState<boolean>(false);
  const [isTotalStatsModalVisible, setTotalStatsModalVisible] =
    useState<boolean>(false);
  const {model, isLoading} = useModel();
  const {recordedData, resetRecordedData} = useSensorData(isTracking);
  const {timeElapsed, resetTimeElapsed} = useTimer(isTracking);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
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

  // Animationswerte für Transformationen
  const translateY = useRef(new Animated.Value(0)).current; // Anfangs keine Verschiebung
  const scale = useRef(new Animated.Value(1)).current; // Anfangs keine Skalierung

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
    let timer: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (countdown === 0) {
      // Countdown beendet, Tracking starten
      setIsTracking(true);
      setIsCountingDown(false);
      setCountdown(null);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  useEffect(() => {
    loadSets();
  }, [trackingModalOpen]);

  const animateButton = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    const screenHeight = Dimensions.get('window').height;

    const targetTranslateY = -(screenHeight / 2 - 60);

    Animated.sequence([
      Animated.timing(translateY, {
        toValue: targetTranslateY,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 300 / 110,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsAnimating(false);
      setIsButtonEnlarged(true);
    });
  };

  const animateButtonBack = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsAnimating(false);
      setIsButtonEnlarged(false);
      // Nach der Animation das TrackingModal anzeigen
      setShowResultsModal(true);
    });
  };

  const handleStartStop = () => {
    if (isTracking) {
      // Stopp des Trackings
      console.log('Stopping tracking...');
      setIsTracking(false);
      // Vorhersage starten
      setIsPredicting(true); // Ladeindikator aktivieren
      predictLabel() // Korrekt aufrufen
        .then(() => {
          setIsPredicting(false); // Ladeindikator deaktivieren
          // Animation zurück zur ursprünglichen Position
          animateButtonBack();
        })
        .catch(error => {
          setIsPredicting(false);
          console.error('Fehler bei der Vorhersage:', error);
        });
    } else if (!isCountingDown) {
      // Start des Countdowns
      console.log('Starting countdown and tracking...');
      setIsCountingDown(true);
      setCountdown(3); // Startwert für den Countdown
      // Countdown-Sound abspielen
      countdownSound?.play(success => {
        if (!success) {
          console.log('Sound playback failed');
        }
      });
      // Tracking wird durch den Countdown-Effekt gestartet
    }
  };
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
      label: predLabel,
      repetitions: predReps,
    };
    addSet(newSet);
    resetTimeElapsed();
    setShowResultsModal(false); // Korrekt den richtigen Zustand setzen
    resetRecordedData();
    Toast.show({
      type: 'success',
      text1: 'Glückwunsch!',
      text2: 'Set wurde erfolgreich gespeichert!',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Workout History" />
      <TrackingModal
        isVisible={showResultsModal}
        onClose={() => setShowResultsModal(false)}
        predLabel={predLabel}
        predReps={predReps}
        chartData={chartData}
        peaks={peaks}
        predictions={predictions}
        quality={quality}
        jerk={jerk}
        onSaveAndClose={handleSaveAndClose}
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
        {/* <TouchableOpacity
          style={styles.addButton}
          onPress={() => setTrackingModalOpen(true)}>
          <Icon name="plus" size={54} color="#fff" />
        </TouchableOpacity> */}
        <Animated.View
          style={[
            styles.addButton,
            {
              transform: [{translateY: translateY}, {scale: scale}],
            },
          ]}>
          <TouchableOpacity
            onPress={() => {
              if (!isButtonEnlarged) {
                animateButton();
              } else if (!isCountingDown) {
                handleStartStop();
              }
            }}
            style={styles.addButtonTouchable}
            disabled={isCountingDown}>
            {!isButtonEnlarged ? (
              <Icon name="plus" size={54} color="#fff" />
            ) : isCountingDown ? (
              <Text style={styles.buttonText}>{countdown}</Text>
            ) : (
              <Text style={styles.buttonText}>
                {isTracking ? 'Stop' : 'Start'}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

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
    fontSize: 44,
    color: 'white',
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
  // addButton: {
  //   left: 10,
  //   bottom: 15,
  //   width: 110,
  //   height: 110,
  //   borderRadius: 60,
  //   backgroundColor: '#ff4d4d', // Orange für den + Button
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   // Optional: Schatten für den freiflotierenden Effekt
  //   shadowColor: '#000',
  //   shadowOffset: {width: 0, height: 4},
  //   shadowOpacity: 0.3,
  //   shadowRadius: 4,
  //   elevation: 5,
  //   marginBottom: 30, // Verschiebung nach oben, um den freiflotierenden Effekt zu erzeugen
  // },
  addButton: {
    position: 'absolute',
    bottom: 15, // Positionierung vom unteren Rand
    left: 150, // Positionierung vom linken Rand
    width: 110,
    height: 110,
    borderRadius: 55, // Halbwert der Breite/Höhe für runde Form
    backgroundColor: '#ff4d4d',
    justifyContent: 'center',
    alignItems: 'center',
    // Schatten für den freiflotierenden Effekt
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default App;
