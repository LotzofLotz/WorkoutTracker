// hooks/useSensorData.ts
import {useEffect, useState} from 'react';
import {
  accelerometer,
  gyroscope,
  setUpdateIntervalForType,
  SensorTypes,
} from 'react-native-sensors';
import {Subscription} from 'rxjs';
import {map} from 'rxjs/operators';

const useSensorData = (isTracking: boolean) => {
  const [recordedData, setRecordedData] = useState<{
    accX: number[];
    accY: number[];
    accZ: number[];
    gyroX: number[];
    gyroY: number[];
    gyroZ: number[];
  }>({
    accX: [],
    accY: [],
    accZ: [],
    gyroX: [],
    gyroY: [],
    gyroZ: [],
  });
  console.log('recordedData', recordedData);

  // Funktion zum Zurücksetzen der aufgezeichneten Daten
  const resetRecordedData = () => {
    setRecordedData({
      accX: [],
      accY: [],
      accZ: [],
      gyroX: [],
      gyroY: [],
      gyroZ: [],
    });
  };

  useEffect(() => {
    let accelerometerSubscription: Subscription | null = null;
    let gyroscopeSubscription: Subscription | null = null;

    if (isTracking) {
      // Setze Aktualisierungsintervall für Sensoren auf 100ms
      setUpdateIntervalForType(SensorTypes.accelerometer, 100);
      setUpdateIntervalForType(SensorTypes.gyroscope, 100);

      // Abonnieren der Accelerometer-Daten
      accelerometerSubscription = accelerometer
        .pipe(map(({x, y, z}) => ({x, y, z})))
        .subscribe(
          sensorData => {
            setRecordedData(prevState => ({
              ...prevState,
              accX: [...prevState.accX, sensorData.x],
              accY: [...prevState.accY, sensorData.y],
              accZ: [...prevState.accZ, sensorData.z],
            }));
          },
          error => console.log('Accelerometer not available:', error),
        );

      // Abonnieren der Gyroskop-Daten
      gyroscopeSubscription = gyroscope
        .pipe(map(({x, y, z}) => ({x, y, z})))
        .subscribe(
          sensorData => {
            setRecordedData(prevState => ({
              ...prevState,
              gyroX: [...prevState.gyroX, sensorData.x],
              gyroY: [...prevState.gyroY, sensorData.y],
              gyroZ: [...prevState.gyroZ, sensorData.z],
            }));
          },
          error => console.log('Gyroscope not available:', error),
        );
    } else {
      // Wenn das Tracking stoppt, setzen wir die Daten zurück
      //resetRecordedData();
      console.log('never reset');
    }

    // Bereinigen der Abonnements bei Komponentenentfernung oder Statusänderung
    return () => {
      if (accelerometerSubscription) {
        accelerometerSubscription.unsubscribe();
      }
      if (gyroscopeSubscription) {
        gyroscopeSubscription.unsubscribe();
      }
    };
  }, [isTracking]);

  return {recordedData, resetRecordedData};
};

export default useSensorData;
