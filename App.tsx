// App.tsx
import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  TouchableOpacity,
  SafeAreaView,
  View,
  StyleSheet,
  Text,
  Animated,
  Dimensions,
  BackHandler,
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
import Colors from './components/colors';

const App = (): React.JSX.Element => {
  const [countdownSound, setCountdownSound] = useState<Sound | null>(null);
  const [showResultsModal, setShowResultsModal] = useState<boolean>(false);
  const [isButtonEnlarged, setIsButtonEnlarged] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [sets, setSets] = useState<WorkoutSet[]>([]);
  const [isProgressModalVisible, setProgressModalVisible] =
    useState<boolean>(false);
  const [isTotalStatsModalVisible, setTotalStatsModalVisible] =
    useState<boolean>(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState<number | string | null>(null);
  const [trackingStartTime, setTrackingStartTime] = useState<number | null>(
    null,
  ); // Neue State-Variable
  const [canStop, setCanStop] = useState(false); // Neue State-Variable
  const backgroundOpacity = useRef(new Animated.Value(0)).current;

  const {model} = useModel();
  const {recordedData, resetRecordedData} = useSensorData(isTracking);
  useTimer(isTracking);
  const {
    predictLabel,
    predReps,
    predLabel,
    peaks,
    chartData,
    quality,
    jerk,
    predictions,
  } = usePrediction({model, recordedData});

  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Funktion zum Laden der Sets beim Start
  const loadSets = async () => {
    try {
      const fetchedSets = await getWorkoutSets();
      setSets(fetchedSets);
    } catch (error) {
      console.error('Error loading sets:', error);
    }
  };
  useEffect(() => {
    Sound.setCategory('Playback', true);

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

  useEffect(() => {
    loadSets();
  }, [showResultsModal]);

  // Countdown Effekt ohne Anzeige von 0
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCountingDown && countdown !== null) {
      if (typeof countdown === 'number' && countdown > 1) {
        // Countdown läuft: 3, 2, 1
        timer = setTimeout(() => {
          setCountdown(countdown - 1);
        }, 1000);
      } else if (countdown === 1) {
        // Countdown erreicht 1, nächsten Tick wird "GO"
        timer = setTimeout(() => {
          setCountdown('GO');
          // Optional: Spiel einen Sound ab oder gib visuelles Feedback
        }, 1000);
      } else if (countdown === 'GO') {
        // Zeige "GO" für eine Sekunde, dann starte das Tracking
        timer = setTimeout(() => {
          setCountdown(null);
          setIsCountingDown(false);
          setIsTracking(true);
          setTrackingStartTime(Date.now());
          // Setze einen Timer, um das Stoppen nach 3 Sekunden zu erlauben
          setTimeout(() => {
            setCanStop(true);
          }, 3000);
          // Optional: Zeige eine Toast-Nachricht für "GO"
          Toast.show({
            type: 'success',
            text1: 'GO',
            text2: 'Tracking gestartet!',
          });
        }, 1000);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isCountingDown, countdown]);

  // Definition von animateButtonBack mit useCallback
  const animateButtonBack = useCallback(
    (callback?: () => void) => {
      if (isAnimating) return;
      setIsAnimating(true);

      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(backgroundOpacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsAnimating(false);
        setIsButtonEnlarged(false);
        if (callback) {
          callback();
        }
      });
    },
    [isAnimating, backgroundOpacity, scale, translateY],
  );

  // Hinzufügen von animateButtonBack zu useEffect-Abhängigkeiten
  useEffect(() => {
    const backAction = () => {
      if (isButtonEnlarged || isAnimating) {
        // Rücksetz-Animation ausführen
        animateButtonBack();
        // Standardverhalten des Back-Buttons verhindern
        return true;
      }
      // Standardverhalten zulassen (z.B. App schließen)
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    // Bereinige den Event Listener beim Unmount
    return () => backHandler.remove();
  }, [isButtonEnlarged, isAnimating, animateButtonBack]);

  const animateButton = () => {
    if (isAnimating) return;
    setIsAnimating(true);

    const screenHeight = Dimensions.get('window').height;
    const targetTranslateY = -(screenHeight / 2 - 60);

    Animated.parallel([
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
      ]),
      Animated.timing(backgroundOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsAnimating(false);
      setIsButtonEnlarged(true);
    });
  };

  const handleStartStop = () => {
    console.log('Button pressed, isTracking:', isTracking);
    if (isTracking) {
      if (canStop) {
        // Stoppe das Tracking
        console.log('Stopping tracking...');
        setIsTracking(false);
        setTrackingStartTime(null);
        setCanStop(false);
        // Starte die Vorhersage
        predictLabel()
          .then(() => {
            // Animate back and show results modal
            animateButtonBack(() => setShowResultsModal(true));
          })
          .catch(error => {
            console.error('Error during prediction:', error);
          });
      } else {
        // Kann das Tracking noch nicht stoppen
        const remainingTime = Math.ceil(
          (3000 - (Date.now() - (trackingStartTime || 0))) / 1000,
        );
        Toast.show({
          type: 'info',
          text1: 'Bitte warte',
          text2: `Warte noch ${remainingTime} Sekunden, bevor du das Tracking stoppst.`,
        });
      }
    } else if (!isCountingDown) {
      // Starte den Countdown und das Tracking
      console.log('Starting countdown and tracking...');
      setIsCountingDown(true);
      setCountdown(3); // Startwert für das Countdown
      // Spiele den Countdown-Sound ab
      countdownSound?.play(success => {
        if (!success) {
          console.log('Sound playback failed');
        }
      });
      // Animieren des Buttons
      animateButton();
    }
  };

  // Funktion zum Hinzufügen eines neuen Sets
  const addSet = async (newSet: WorkoutSet) => {
    try {
      await saveWorkoutSet(newSet);
      setSets(prevSets => [...prevSets, newSet]); // Aktualisiere den State
      console.log('SET ADDED');
      Toast.show({
        type: 'success',
        text1: 'Congratulations!',
        text2: 'Set was saved successfully!',
      });
    } catch (error) {
      console.error('Error saving the set:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'An error occurred while saving the set.',
      });
    }
  };

  // Callback-Funktion, die von TrackingModal aufgerufen wird, um ein neues Set hinzuzufügen
  const handleSaveAndClose = (adjustedReps: number, selectedLabel: string) => {
    const newSet: WorkoutSet = {
      timestamp: new Date().toISOString(),
      label: selectedLabel, // Verwende das ausgewählte Label
      repetitions: adjustedReps, // Verwende die angepasste Reps-Zahl
    };
    addSet(newSet);
    setShowResultsModal(false);
    resetRecordedData();
    Toast.show({
      type: 'success',
      text1: 'Congratulations!',
      text2: 'Set was saved successfully!',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header title="Workout History" />

      {/* Background Dimming Overlay */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.backgroundOverlay,
          {
            opacity: backgroundOpacity,
          },
        ]}>
        {isButtonEnlarged || isAnimating ? (
          <TouchableOpacity
            style={styles.fullScreenTouchable}
            onPress={() => {
              handleStartStop();
            }}
            activeOpacity={1}></TouchableOpacity>
        ) : null}
      </Animated.View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Modals and other main components */}
        <TrackingModal
          isVisible={showResultsModal}
          onClose={() => setShowResultsModal(false)}
          predLabel={predLabel}
          predReps={predReps}
          chartData={chartData}
          peaks={peaks}
          predictions={predictions}
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

        {/* Display of saved sets */}
        <SavedSetsComponent sets={sets} />
      </View>

      {/* Navbar */}
      <View style={styles.navBar}>
        {/* Stats Button */}
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setTotalStatsModalVisible(true)}
          disabled={isButtonEnlarged || isAnimating}>
          <Icon name="trophy" size={24} color={Colors.background} />
          <Text style={styles.navButtonText}>Stats</Text>
        </TouchableOpacity>

        {/* Progress Button */}
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setProgressModalVisible(true)}
          disabled={isButtonEnlarged || isAnimating}>
          <Icon name="bar-chart" size={24} color={Colors.background} />
          <Text style={styles.navButtonText}>Progress</Text>
        </TouchableOpacity>
      </View>

      {/* Animated Add Workout Button */}
      <Animated.View
        style={[
          styles.addButton,
          styles.addButtonAnimated, // Zugefügter Style für zIndex
          {
            transform: [{translateY: translateY}, {scale: scale}],
          },
        ]}
        pointerEvents={isButtonEnlarged || isAnimating ? 'none' : 'auto'}>
        <TouchableOpacity
          onPress={() => {
            if (!isButtonEnlarged) {
              animateButton();
            } else {
              handleStartStop();
            }
          }}
          style={styles.addButtonTouchable}
          disabled={isCountingDown && !isTracking}>
          {!isButtonEnlarged ? (
            <Icon name="plus" size={54} color={Colors.background} />
          ) : isCountingDown && countdown !== null ? (
            <Text style={styles.buttonText}>
              {typeof countdown === 'number' ? countdown : countdown}
            </Text>
          ) : isTracking ? (
            <Text style={styles.buttonText}>{canStop ? 'Stop' : 'GO'}</Text>
          ) : (
            <Text style={styles.buttonText}>
              {isTracking ? 'Stop' : 'Start'}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Toast Messages */}
      <Toast />
    </SafeAreaView>
  );
};

// Stylesheet for styling components
const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    backgroundColor: Colors.red,
    borderRadius: 55,
    bottom: 10,
    elevation: 5,
    height: 110,
    justifyContent: 'center',
    left: Dimensions.get('window').width / 2 - 55,
    position: 'absolute',
    shadowColor: Colors.textSecondary, // Replaced '#000' with Colors.textSecondary
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    width: 110,
    zIndex: 2, // Initial zIndex
  },
  addButtonAnimated: {
    zIndex: 4, // Moved from inline style to StyleSheet
  },
  addButtonTouchable: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  backgroundOverlay: {
    backgroundColor: Colors.textSecondary, // Replaced 'black' with Colors.textSecondary
    bottom: 0,
    elevation: 2,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 2,
  },
  buttonText: {
    color: Colors.background, // Replaced 'white' with Colors.background
    fontSize: 38,
    fontWeight: 'bold',
  },
  container: {
    backgroundColor: Colors.background, // Replaced '#fff' with Colors.background
    flex: 1,
    position: 'relative',
  },
  fullScreenTouchable: {
    flex: 1,
    height: '100%',
    width: '100%',
  },
  mainContent: {
    flex: 1,
    position: 'relative',
  },
  navBar: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    bottom: 0,
    elevation: 5,
    flexDirection: 'row',
    height: 60,
    justifyContent: 'space-between',
    left: 0,
    paddingHorizontal: 50,
    position: 'absolute',
    right: 0,
    shadowColor: Colors.textSecondary, // Replaced '#000' with Colors.textSecondary
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 1,
  },
  navButton: {
    alignItems: 'center',
  },
  navButtonText: {
    color: Colors.background, // Replaced '#fff' with Colors.background
    fontSize: 12,
    marginTop: 4,
  },
  // pieChart: {
  //   marginVertical: 10,
  // },
});

export default App;
