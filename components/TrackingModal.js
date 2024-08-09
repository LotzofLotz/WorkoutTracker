import React, {useState} from 'react';
import {View, TouchableOpacity, Text, Button, Alert} from 'react-native';
import Modal from 'react-native-modal';
import ChartComponent from './ChartComponent';
import RNFS from 'react-native-fs';
import Sound from 'react-native-sound';

const TrackingModal = ({
  trackingModalOpen,
  setTrackingModalOpen,
  isTracking,
  setIsTracking,
  timeElapsed,
  setTimeElapsed,
  predict,
  predLabel,
  predReps,
  setPredLabel,
  setPredReps,
  setRecordedData,
  chartData,
  peaks,
  predictions,
}) => {
  // const Items = Array.from(Array(50).keys());

  const handleStartStop = () => {
    if (isTracking) {
      predict();
      setIsTracking(false);
      setShowButton(false);
    } else {
      setTimeout(() => {
        setIsTracking(true);
      }, 3000);

      countdownSound.play();
    }
  };

  const [showButton, setShowButton] = useState(true);

  const onClose = () => {
    setTrackingModalOpen(false), setIsTracking(false);
    setTimeElapsed(0),
      setPredLabel(''),
      setPredReps(0),
      setRecordedData({
        accX: [],
        accY: [],
        accZ: [],
        gyroX: [],
        gyroY: [],
        gyroZ: [],
      });
  };
  Sound.setCategory('Playback');

  var countdownSound = new Sound(
    'sui_countdown.mp3',
    Sound.MAIN_BUNDLE,
    error => {
      if (error) {
        console.log('failed to load the sound', error);
        return;
      }
    },
  );

  // const class_names = ['PullUp', 'PushUp', 'Squat', 'SitUp'];

  return (
    <Modal // Tracking Modal zum Starten und Stoppen der Datenerfassung
      onBackButtonPress={() => {
        onClose();
        setShowButton(true);
      }}
      style={{alignItems: 'center'}}
      isVisible={trackingModalOpen}
      animationIn="slideInUp"
      backdropColor={'#132224'}
      animationOut="slideOutDown"
      onDismiss={() => {
        onClose();
        setShowButton(true);
      }}
      onRequestClose={() => {
        onClose();
        setShowButton(true);
      }}>
      <View
        style={{
          backgroundColor: 'white',
          margin: '4%',
          padding: '4%',
          borderRadius: 10,
          width: '100%',
          minHeight: '60%',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {showButton ? (
          <TouchableOpacity
            onPress={() => handleStartStop()}
            style={{
              width: 100,
              height: 100,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'red',
              borderRadius: 20,
            }}>
            <Text style={{fontSize: 28, color: 'white'}}>
              {isTracking ? 'STOP' : 'START'}{' '}
            </Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <Text style={{color: 'black'}}>Zeit: {timeElapsed} in Sekunden</Text>
        {!isTracking && timeElapsed != 0 ? (
          <View
            style={{
              flex: 1,
              width: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <View
              style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
              <ChartComponent chartData={chartData} peaks={peaks} />
            </View>
            {/* <Text style={{color: 'black'}}>
              {class_names[0]} :{output[0][0]}
            </Text>
            <Text style={{color: 'black'}}>
              {class_names[1]} :{output[0][1]}
            </Text>
            <Text style={{color: 'black'}}>
              {class_names[2]} :{output[0][2]}
            </Text>
            <Text style={{color: 'black'}}>
              {class_names[3]}:{output[0][3]}
            </Text> */}
            {/* <Text style={{color: 'black', fontSize: 25}}>{output[0][0]}</Text> */}
            {predictions.map((prediction, index) => (
              <Text style={{color: 'black', fontSize: 20}} key={index}>
                {index + 1}. Rep: {prediction.label} mit{' '}
                {(prediction.probability * 100).toFixed(2)}%
              </Text>
            ))}
            <Text style={{color: 'black', fontSize: 25}}>
              LABEL: {predLabel}
            </Text>
            <Text style={{color: 'black', fontSize: 25}}>REPS: {predReps}</Text>
            <View style={{width: 150}}>
              <Button
                title="SAVE"
                onPress={() => {
                  onClose();
                }}
                color="blue"
              />
            </View>
          </View>
        ) : (
          <View />
        )}
      </View>
    </Modal>
  );
};

export default TrackingModal;
