

import React, {useEffect, useState} from 'react';
import type {PropsWithChildren} from 'react';
import {
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
 Button 
} from 'react-native';
import { loadTensorflowModel } from 'react-native-fast-tflite';
import { accelerometer, gyroscope, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import TrackingModal from './components/TrackingModal';
const { sgg } = require('ml-savitzky-golay-generalized');
var Fili = require('fili');
var iirCalculator = new Fili.CalcCascades();
import { findPeaks } from './components/FindPeaks';


function App(): React.JSX.Element {
  const [trackingModalOpen, setTrackingModalOpen] = useState<boolean>(false)
  const [model, setModel] = useState<any>(null);
  const [isTracking,setIsTracking] = useState<boolean>(false)
  // const [prediction, setPrediction] = useState<any>(null);
  const [predReps, setPredReps] = useState<number>(0)
  const [predLabel, setPredLabel] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accelerometerData, setAccelerometerData] = useState({ x: 0, y: 0, z: 0 });
  const [gyroscopeData, setGyroscopeData] = useState({ x: 0, y: 0, z: 0 });
   const [recordedData, setRecordedData] = useState({
    accX: [] as number[],
    accY: [] as number[],
    accZ: [] as number[],
    gyroX: [] as number[],
    gyroY: [] as number[],
    gyroZ: [] as number[],
  });
  // const [normalizedData, setNormalizedData] = useState<number[]>([]);
  // const [peaks, setPeaks] = useState<number[]>([]);
  // const [extractedData, setExtractedData] = useState<any>({});
  const [timeElapsed, setTimeElapsed]= useState<number>(0)

  const iirCalculator = new Fili.CalcCascades();
  const butterworthFilterCoeffs = iirCalculator.lowpass({
      order: 4, // 4. Ordnung (Butterworth)
      characteristic: 'butterworth',
      Fs: 10, // Abtastrate in Hz
      Fc: 1, // Grenzfrequenz in Hz
  });
  
  // Erzeugung des Filters
  const iirFilter = new Fili.IirFilter(butterworthFilterCoeffs);
  
  // Eingabedaten
  const inputSignal = [9.877067581363354, 9.9339825491859, 9.84251462154419, 10.354257534969516, 13.373713997598962, 9.926204295547642, 7.52423678835273, 8.80797202411695, 9.110746947497068, 9.04674433525003, 7.6216820560763, 9.767674343762302, 10.972864173387153, 12.044192586381547, 10.311767493624078, 9.779259887718824, 10.186689479640906, 13.445548472549364, 11.659811531785278, 7.232351246614539, 8.326743255249516, 8.691449780701179, 9.844374201414142, 9.586148221703843, 8.270785998889648, 8.213915097631686, 9.084737169890397, 11.059256723805966, 12.526292243050815, 10.521095868750852, 9.831481482019694, 10.098919690242962, 14.811084571194218, 10.242821614332174, 6.503457763867406, 8.796358410502135, 8.742400099395326, 7.729124458719839, 8.410217968879925, 9.558874710653493, 10.871951309753682, 12.28505208468855, 10.64756251498731, 9.511323614278714, 9.716664448580524, 9.4622972516373, 9.698591244496884, 9.945709897037451, 9.838054911262176, 9.902449329934491, 9.720841201966644, 9.818233615572913, 10.098537732642635, 9.764930274377393, 9.934020191430031, 10.096486041544484, 9.261850515450758];
  
  // Anwendung des Filters auf die Daten
  const outputSignal = iirFilter.simulate(inputSignal);
  
  console.log(":::::::", outputSignal);

// Filter the data
//const filteredData = iirFilter.simulate(data);

// Print the smoothed data




  //loads the modal on Open
  useEffect(() => {
    const loadModel = async () => {
      try {
        const loadedModel = await loadTensorflowModel(require('./android/app/src/main/assets/model.tflite'));
        setModel(loadedModel);
        console.log('Model loaded successfully');
      } catch (error) {
        console.error('Error loading model:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadModel();
  }, []);



    // listens to isTracking, starts Tracking of Sensordata and Time
    useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    let accelerometerSubscription: Subscription | null = null;
    let gyroscopeSubscription: Subscription | null = null;

    if (isTracking) {
      const startTime = Date.now() - timeElapsed; // Startzeitpunkt unter Berücksichtigung der bereits verstrichenen Zeit
      interval = setInterval(() => {
        setTimeElapsed(Date.now() - startTime);
      }, 100); // Zeit alle 1 Sekunde aktualisieren
      setUpdateIntervalForType(SensorTypes.accelerometer, 100); // Update every 100ms
      setUpdateIntervalForType(SensorTypes.gyroscope, 100); // Update every 100ms

      accelerometerSubscription = accelerometer
        .pipe(map(({ x, y, z }) => ({ x, y, z })))
        .subscribe(
          sensorData => {
            setAccelerometerData(sensorData);
            setRecordedData(prevState => ({
              ...prevState,
              accX: [...prevState.accX, sensorData.x],
              accY: [...prevState.accY, sensorData.y],
              accZ: [...prevState.accZ, sensorData.z],
            }));
          },
          error => console.log('The sensor is not available', error)
        );

      gyroscopeSubscription = gyroscope
        .pipe(map(({ x, y, z }) => ({ x, y, z })))
        .subscribe(
          sensorData => {
            setGyroscopeData(sensorData);
            setRecordedData(prevState => ({
              ...prevState,
              gyroX: [...prevState.gyroX, sensorData.x],
              gyroY: [...prevState.gyroY, sensorData.y],
              gyroZ: [...prevState.gyroZ, sensorData.z],
            }));
          },
          error => console.log('The sensor is not available', error)
        );
    }
    else if (!isTracking && timeElapsed !== 0) {
      if (interval) {
        clearInterval(interval); // Intervall stoppen, wenn isTracking auf false gesetzt wird
      }
    }
    return () => {
      accelerometerSubscription?.unsubscribe();
      gyroscopeSubscription?.unsubscribe();
      clearInterval(interval);
    };
  }, [isTracking]);



  function padSequence(seq: number[], maxLength: number): number[] {
  const padded = new Array(maxLength).fill(0);
  for (let i = 0; i < seq.length && i < maxLength; i++) {
      padded[i] = seq[i];
  }
  return padded;
}


const class_names = ['Dip', 'PullUp', 'PushUp', 'Squat'];

const prepareDataForModel = (paddedRep: {
  accX: number[],
  accY: number[],
  accZ: number[],
  gyroX: number[],
  gyroY: number[],
  gyroZ: number[]
}, maxLength: number): Float32Array => {
  const features = [];
  for (let i = 0; i < maxLength; i++) {
    features.push(
      paddedRep.accX[i],
      paddedRep.accY[i],
      paddedRep.accZ[i],
      paddedRep.gyroX[i],
      paddedRep.gyroY[i],
      paddedRep.gyroZ[i]
    );
  }
  return new Float32Array(features);
};
function findBase(data: number[], peakIndex: number, direction: number): number {
  let baseValue = data[peakIndex];
  let index = peakIndex;

  while (
    index >= 0 &&
    index < data.length &&
    data[index] <= baseValue
  ) {
    baseValue = data[index];
    index += direction;
  }

  return baseValue;
}

//WORKING VERSION
// function findPeaks(
//   data: number[],
//   height = [-0.4, 0],
//   prominence = 0.2,
//   distance = 6,
//   width = 2
// ): number[] {
//   const invertedData = data.map((value) => -value);
//   console.log(invertedData)
//   const peaks = [];
//   const length = invertedData.length;

//   for (let i = 1; i < length - 1; i++) {
//     if (
//       invertedData[i] > invertedData[i - 1] &&
//       invertedData[i] > invertedData[i + 1]
//     ) {
//       const peakValue = invertedData[i];
//       if (peakValue >= height[0] && peakValue <= height[1]) {
//         // Check prominence
//         const leftBase = findBase(invertedData, i, -1);
//         const rightBase = findBase(invertedData, i, 1);
//         const peakProminence = Math.min(
//           peakValue - leftBase,
//           peakValue - rightBase
//         );
//         if (peakProminence >= prominence) {
//           peaks.push(i);
//         }
//       }
//     }
//   }

//   // Apply distance constraint
//   const filteredPeaks = [];
//   let lastPeak = -distance - 1;

//   for (const peak of peaks) {
//     if (peak - lastPeak >= distance) {
//       filteredPeaks.push(peak);
//       lastPeak = peak;
//     }
//   }

//   return filteredPeaks;
// }

// function findPeaks(
//     data: number[],
//     height = [-0.4, 0],
//     prominence = 0.2,
//     distance = 5,
//     width = 2
//   ) {
//     const invertedData = data.map((value) => -value);
//     const peaks = [];
//     const length = invertedData.length;
  
//     for (let i = 1; i < length - 1; i++) {
//       if (
//         invertedData[i] > invertedData[i - 1] &&
//         invertedData[i] > invertedData[i + 1]
//       ) {
//         const peakValue = invertedData[i];
//         if (peakValue >= height[0] && peakValue <= height[1]) {
//           peaks.push(i);
//         }
//       }
//     }
  
//     // Apply distance constraint
//     const filteredPeaks = peaks.filter((peak, index, arr) => {
//       if (index === 0) return true;
//       return peak - arr[index - 1] >= distance;
//     });
  
//     return filteredPeaks;
//   }

  
  const applySavitzkyGolayFilter = (data: number[], windowSize: number, polynomialOrder: number) => {
    // console.log("SAVITZKY DATA::", data)
    if (data.length < windowSize) {
      console.warn('Data length is less than window size, reducing window size to match data length.');
      windowSize = data.length; // Fenstergröße auf Datenlänge reduzieren
    }
    const options = { windowSize, polynomialOrder };
    try {
      return sgg(data, options);
    } catch (error) {
      console.error('Error applying Savitzky-Golay filter:', error);
      return data; // Rückgabe der ursprünglichen Daten im Fehlerfall hier ggf einen anderen filter anwenden oä 
    }
  };

   const calculateMagnitude = (x: number, y: number, z: number) => {
    return Math.sqrt(x ** 2 + y ** 2 + z ** 2);
  };

    const minMaxScaler = (data: number[]) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    return data.map((value) => (value - min) / (max - min));
  };


  function findLocalMaxima(xs: number[]): number[] {
    let maxima: number[] = [];
    // iterate through all points and compare direct neighbors
    for (let i = 1; i < xs.length - 1; ++i) {
        if (xs[i] > xs[i - 1] && xs[i] > xs[i + 1]) {
            maxima.push(i);
        }
    }
    return maxima;
}

function filterByHeight(indices: number[], xs: number[], height: number): number[] {
  return indices.filter(i => xs[i] > height);
}

type Pair = [number, number];

// Combine index and value as pair
const decor = (v: number, i: number): Pair => [v, i];

// Remove value from pair
const undecor = (pair: Pair): number => pair[1];

// Sort array indices by values
const argsort = (arr: number[]): number[] => arr.map(decor).sort((a, b) => a[0] - b[0]).map(undecor);

// Filter indices based on distance
function filterByDistance(indices: number[], xs: number[], dist: number): number[] {
    let toRemove = Array(indices.length).fill(false);
    let heights = indices.map(i => xs[i]);
    let sortedIndexPositions = argsort(heights).reverse();

    for (let idx of sortedIndexPositions) {
        if (toRemove[idx]) continue;
        for (let j = 0; j < indices.length; j++) {
            if (j !== idx && Math.abs(indices[j] - indices[idx]) < dist) {
                toRemove[j] = true;
            }
        }
    }

    return indices.filter((_, i) => !toRemove[i]);
}

function filterMaxima(indices: number[], xs: number[], distance?: number, height?: number): number[] {
  let newIndices = indices;
  if (height !== undefined) {
      newIndices = filterByHeight(indices, xs, height);
  }
  if (distance !== undefined) {
      newIndices = filterByDistance(newIndices, xs, distance);
  }
  return newIndices;
}

function minimalFindPeaks(xs: number[], distance?: number, height?: number): number[] {
  let indices = findLocalMaxima(xs);
  return filterMaxima(indices, xs, distance, height);
}


const predict = ()=> {
  const combinedData = recordedData.accX.map((x, i) =>
    calculateMagnitude(x, recordedData.accY[i], recordedData.accZ[i])
  );
console.log("COMBINED DATA:", combinedData)

  const smoothedData = applySavitzkyGolayFilter(combinedData,9,3)


 
  // const filteredData = iirFilter.simulate(combinedData);
  // console.log("BUTTERWORTH DATA:::::", filteredData)
  const normalizedData = minMaxScaler(smoothedData);
  console.log("SAVGOL:::mit 4 ", smoothedData)


  //console.log("ALL PEAKS", findLocalMaxima(smoothedData))
  // const normalizedButter = minMaxScaler(filteredData)
  // console.log("BUTTER:::", normalizedButter)
  //console.log("normalized data: ", normalizedData)

      //setNormalizedData(normalizedData);
      const invData = normalizedData.map((value) => -value); 
      const peaks = findPeaks(invData,7,-0.4) ;
      const peaks2 = findPeaks(normalizedData,7,0.4)
      console.log("Minimas:", peaks)
      console.log("actual Peaks ", peaks2)
      // const minPeaks = minimalFindPeaks(invData, 5, -0.5)
      // console.log("MIN PEAKS:", minPeaks)
  
      const smoothedAccX = applySavitzkyGolayFilter(recordedData.accX, 9, 2);
      const smoothedAccY = applySavitzkyGolayFilter(recordedData.accY, 9, 2);
      const smoothedAccZ = applySavitzkyGolayFilter(recordedData.accZ, 9, 2);
      const smoothedGyroX = applySavitzkyGolayFilter(recordedData.gyroX, 9, 2);
      const smoothedGyroY = applySavitzkyGolayFilter(recordedData.gyroY, 9, 2);
      const smoothedGyroZ = applySavitzkyGolayFilter(recordedData.gyroZ, 9, 2);

      const normalizedAccX = minMaxScaler(smoothedAccX);
      const normalizedAccY = minMaxScaler(smoothedAccY);
      const normalizedAccZ = minMaxScaler(smoothedAccZ);
      const normalizedGyroX = minMaxScaler(smoothedGyroX);
      const normalizedGyroY = minMaxScaler(smoothedGyroY);
      const normalizedGyroZ = minMaxScaler(smoothedGyroZ);
    
      //setPeaks(peaks);
      const extractedData: any = {};
      for (let i = 0; i < peaks.length - 1; i++) {
        const start = peaks[i];
        const end = peaks[i + 1];

        // const segmentAccX = recordedData.accX.slice(start, end);
        // const segmentAccY = recordedData.accY.slice(start, end);
        // const segmentAccZ = recordedData.accZ.slice(start, end);
        // const segmentGyroX = recordedData.gyroX.slice(start, end);
        // const segmentGyroY = recordedData.gyroY.slice(start, end);
        // const segmentGyroZ = recordedData.gyroZ.slice(start, end);

        // const processSegment = (segment: number[]) => {
        //   const windowSize = Math.min(segment.length, 5); // Nutze die maximale mögliche Fenstergröße
        //   const smoothedSegment = applySavitzkyGolayFilter(segment, windowSize, 2);
        //   return minMaxScaler(smoothedSegment);
        // };

        // extractedData[`Rep${i + 1}`] = {
        //   accX: processSegment(segmentAccX),
        //   accY: processSegment(segmentAccY),
        //   accZ: processSegment(segmentAccZ),
        //   gyroX: processSegment(segmentGyroX),
        //   gyroY: processSegment(segmentGyroY),
        //   gyroZ: processSegment(segmentGyroZ),
        // };
      //}
      const segmentAccX = normalizedAccX.slice(start, end);
      const segmentAccY = normalizedAccY.slice(start, end);
      const segmentAccZ = normalizedAccZ.slice(start, end);
      const segmentGyroX = normalizedGyroX.slice(start, end);
      const segmentGyroY = normalizedGyroY.slice(start, end);
      const segmentGyroZ = normalizedGyroZ.slice(start, end);
  
      extractedData[`Rep${i + 1}`] = {
        accX: segmentAccX,
        accY: segmentAccY,
        accZ: segmentAccZ,
        gyroX: segmentGyroX,
        gyroY: segmentGyroY,
        gyroZ: segmentGyroZ,
      };
    }
  
    
      //setExtractedData(extractedData);
      const repCount =  Object.keys(extractedData).length;
      //console.log("PREDICTED REPS:", repCount)
      setPredReps(repCount)
      if (repCount === 0) {
        console.warn("No reps detected.");
        return;
      }
    
      const maxLength = 51;
      const rep1 = extractedData.Rep1;
    
      if (!rep1) {
        console.error("No data in extractedData for Rep1");
        return;
      }
      const paddedRep = {
        accX: padSequence(rep1.accX, maxLength),
        accY: padSequence(rep1.accY, maxLength),
        accZ: padSequence(rep1.accZ, maxLength),
        gyroX: padSequence(rep1.gyroX, maxLength),
        gyroY: padSequence(rep1.gyroY, maxLength),
        gyroZ: padSequence(rep1.gyroZ, maxLength)
      };
      const preparedData = prepareDataForModel(paddedRep, 51); // 51 hier abhängig von der shape des tensors im training
      const runInference = async () => {
        if (!model) return;
        try {
          const output = await model.run([preparedData]);
          console.log('Inference result:', output);
  
          const maxIndex = output[0].indexOf(Math.max(...output[0]));
          console.log((class_names[maxIndex]))
          setPredLabel(class_names[maxIndex]);
        } catch (error) {
          console.error('Error running inference:', error);
        }
      };
      runInference()
}

  

  return (
    <SafeAreaView style={styles.container}>
         <TrackingModal
        trackingModalOpen={trackingModalOpen}
        setTrackingModalOpen={setTrackingModalOpen}
        isTracking={isTracking}
        setIsTracking={setIsTracking}
        timeElapsed={timeElapsed}
        setTimeElapsed={setTimeElapsed}
        predLabel={predLabel}
        predReps={predReps}
        setAccData={setAccelerometerData}
        setGyroData={setGyroscopeData}
        predict={predict}
        setPredReps={setPredReps}
        setPredLabel={setPredLabel}
        setRecordedData={setRecordedData}
      />
      <TouchableOpacity
        onPress={() => setTrackingModalOpen(true)}
        style={{
          position: "absolute",
          width: 76,
          height: 76,
          alignItems: "center",
          justifyContent: "center",
          right: 20,
          bottom: 20,
          backgroundColor: "#03A9F4",
          borderRadius: 69,
          elevation: 8,
        }}
      >
        <Text style={{ fontSize: 50, color: "white" }}>+</Text>
      </TouchableOpacity>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sensorDataContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 16,
    marginVertical: 2,
  },
  buttonContainer: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  dataContainer: {
    marginTop: 20,
    width: '100%',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  dataText: {
    fontSize: 16,
  },
});

export default App;
