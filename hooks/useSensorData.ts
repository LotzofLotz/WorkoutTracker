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

  // Reset the recorded sensor data
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
      // Set sensor update intervals to 100ms
      setUpdateIntervalForType(SensorTypes.accelerometer, 100);
      setUpdateIntervalForType(SensorTypes.gyroscope, 100);

      // Subscribe to accelerometer data
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

      // Subscribe to gyroscope data
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
      // Reset data when tracking stops
      resetRecordedData();
    }

    // Unsubscribe from sensors on cleanup
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
