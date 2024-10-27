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
import Colors from './components/colors';
import {BackHandler} from 'react-native';

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
  const [countdown, setCountdown] = useState<number | null>(null);
  const backgroundOpacity = useRef(new Animated.Value(0)).current;

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
  }, [isButtonEnlarged, isAnimating]);

  // Animations values for transformations
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Function to load sets on start
  const loadSets = async () => {
    try {
      const fetchedSets = await getWorkoutSets();
      setSets(fetchedSets);
    } catch (error) {
      console.error('Error loading sets:', error);
    }
  };

  useEffect(() => {
    loadSets();
  }, [showResultsModal]);

  //Countdown effect without displaying 0
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown !== null && countdown > 1) {
      timer = setTimeout(() => {
        setCountdown(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (countdown === 1) {
      // Countdown finished, start tracking
      timer = setTimeout(() => {
        setCountdown(null);
        setIsTracking(true);
        setIsCountingDown(false);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

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

  const animateButtonBack = (callback?: () => void) => {
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
  };

  const handleStartStop = () => {
    console.log('Button pressed, isTracking:', isTracking);
    if (isTracking) {
      // Stop tracking
      console.log('Stopping tracking...');
      setIsTracking(false);
      // Start prediction
      predictLabel()
        .then(() => {
          // Animate back and show results modal
          animateButtonBack(() => setShowResultsModal(true));
        })
        .catch(error => {
          console.error('Error during prediction:', error);
        });
    } else if (!isCountingDown) {
      // Start countdown
      console.log('Starting countdown and tracking...');
      setIsCountingDown(true);
      setCountdown(3); // Start value for the countdown
      // Play countdown sound
      countdownSound?.play(success => {
        if (!success) {
          console.log('Sound playback failed');
        }
      });
      // Tracking is started through the countdown effect
      animateButton();
    }
  };

  // Function to add a new set
  const addSet = async (newSet: WorkoutSet) => {
    try {
      await saveWorkoutSet(newSet);
      setSets(prevSets => [...prevSets, newSet]); // Update the state
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

  // Callback function called by TrackingModal to add a new set
  const handleSaveAndClose = (adjustedReps: number) => {
    const newSet: WorkoutSet = {
      timestamp: new Date().toISOString(),
      label: predLabel,
      repetitions: adjustedReps, // Verwende die angepasste Reps-Zahl
    };
    addSet(newSet);
    resetTimeElapsed();
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
            // onPress={() => animateButtonBack()}
            onPress={() => {
              handleStartStop();
            }}
            activeOpacity={1}
            //pointerEvents="box-only"
          ></TouchableOpacity>
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
          <Icon name="trophy" size={24} color="#fff" />
          <Text style={styles.navButtonText}>Stats</Text>
        </TouchableOpacity>

        {/* Progress Button */}
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => setProgressModalVisible(true)}
          disabled={isButtonEnlarged || isAnimating}>
          <Icon name="bar-chart" size={24} color="#fff" />
          <Text style={styles.navButtonText}>Progress</Text>
        </TouchableOpacity>
      </View>

      {/* Animated Add Workout Button */}
      <Animated.View
        style={[
          styles.addButton,
          {
            transform: [{translateY: translateY}, {scale: scale}],
            zIndex: 4,
          },
        ]}
        pointerEvents={isButtonEnlarged || isAnimating ? 'none' : 'auto'} // Hinzugefügt
      >
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
            <Icon name="plus" size={54} color="#fff" />
          ) : isCountingDown && countdown !== null ? (
            <Text style={styles.buttonText}>{countdown}</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
    position: 'relative',
  },
  mainContent: {
    flex: 1,
    position: 'relative',
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    zIndex: 2,
    elevation: 2,
  },
  fullScreenTouchable: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 50,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1,
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
    position: 'absolute',
    bottom: 10,
    left: Dimensions.get('window').width / 2 - 55,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 2,
  },
  addButtonTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 38,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default App;
