

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



function App(): React.JSX.Element {
  const [trackingModalOpen, setTrackingModalOpen] = useState<boolean>(false)

  const [model, setModel] = useState<any>(null);
  const [isTracking,setIsTracking] = useState<boolean>(false)
  const [prediction, setPrediction] = useState<any>(null);
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
  const [normalizedData, setNormalizedData] = useState<number[]>([]);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [extractedData, setExtractedData] = useState<any>({});
  const [timeElapsed, setTimeElapsed]= useState<number>(0)


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
      }, 1000); // Zeit alle 1 Sekunde aktualisieren
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

function findPeaks(
    data: number[],
    height = [-0.4, 0],
    prominence = 0.2,
    distance = 5,
    width = 2
  ) {
    const invertedData = data.map((value) => -value);
    const peaks = [];
    const length = invertedData.length;
  
    for (let i = 1; i < length - 1; i++) {
      if (
        invertedData[i] > invertedData[i - 1] &&
        invertedData[i] > invertedData[i + 1]
      ) {
        const peakValue = invertedData[i];
        if (peakValue >= height[0] && peakValue <= height[1]) {
          peaks.push(i);
        }
      }
    }
  
    // Apply distance constraint
    const filteredPeaks = peaks.filter((peak, index, arr) => {
      if (index === 0) return true;
      return peak - arr[index - 1] >= distance;
    });
  
    return filteredPeaks;
  }

  
  const applySavitzkyGolayFilter = (data: number[], windowSize: number, polynomialOrder: number) => {
    if (data.length < windowSize) {
      console.warn('Data length is less than window size, reducing window size to match data length.');
      windowSize = data.length; // Fenstergröße auf Datenlänge reduzieren
    }
    const options = { windowSize, polynomialOrder };
    try {
      return sgg(data, options);
    } catch (error) {
      console.error('Error applying Savitzky-Golay filter:', error);
      return data; // Rückgabe der ursprünglichen Daten im Fehlerfall
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

useEffect(() => {
  if (model) {
        const data = {
      accX: [0.24989519044181088, 0.0628828320250046, 0, 0.04115373182378242, 0.16625106495333816, 0.39830030070516653, 0.5674667085273633, 0.8674960450398744, 1, 0.9385730075268016, 0.757250162827597, 0.5621488006485225, 0.4540124238146181, 0.5197201455116767, 0.8461510789254912],
      accY: [0, 0.060603663385607534, 0.2461039722441515, 0.4980337657228538, 0.7579258829689361, 0.915542085481741, 0.9269841201674348, 0.9372464430603867, 0.9621587139297737, 0.992033234712496, 0.9860579478621501, 1, 0.899002691365482, 0.6197253865193642, 0.09882745002241469],
      accZ: [1, 0.25423000026727827, 0, 0.090518215957657, 0.3789928648997417, 0.5313739749922887, 0.7699517042114125, 0.9786518146796422, 0.8975880908135581, 0.842153636464105, 0.5468822968932544, 0.514346721071645, 0.5545252718976613, 0.6714802688568402, 0.8692740314347189],
      gyroX: [0.9567065311006212, 0.9011953120538015, 0.7027593215768598, 0.4319157916985178, 0.15918195444749755, 0, 0.03889352864798595, 0.16148615485590326, 0.2754973095448739, 0.3413782629314328, 0.48765718213108106, 0.631808237609165, 0.773634011453445, 0.9005570751037728, 1],
      gyroY: [0.38527298820768424, 0.8096690718710339, 0.876516720780011, 0.7159676315676297, 0.4581735008669038, 0.4946052528292455, 0.33914381965346807, 0.320773292063984, 0.4958478972463564, 0.986282890295725, 1, 0.8680768125686334, 0.6369673827390928, 0.337374261540006, 0],
      gyroZ: [0.014409871632245117, 0.029185797091670632, 0.22670228549464047, 0.5218454409147283, 0.8295013674255078, 0.9932506752416813, 1, 0.8871645504181427, 0.758574478388244, 0.5307900428972017, 0.39656908736713475, 0.27085588363991364, 0.16132126980111244, 0.0702682929035387, 0]
    };

    const data2 =  [[[0.7375983, 0.10987086, 0.4867064, 0.38655856, 0.5238816, 0.50194293],
    [0.6992545, 0.11966467, 0.49030712, 0.39074373, 0.5235228, 0.48102337],
    [0.6622963, 0.1203996, 0.49482507, 0.37982702, 0.50591254, 0.46067548],
    [0.6370917, 0.11169226, 0.4886594, 0.35766456, 0.47615346, 0.4438295],
    [0.6326607, 0.09542342, 0.46762532, 0.33125055, 0.44588232, 0.43298084],
    [0.6521261, 0.07496931, 0.43669808, 0.31010717, 0.43125874, 0.4294627],
    [0.6899612, 0.05434384, 0.407056, 0.30504835, 0.44849715, 0.43306252],
    [0.7326877, 0.03740492, 0.3902889, 0.32600322, 0.50763744, 0.44218522],
    [0.7628567, 0.02717643, 0.3930813, 0.37917504, 0.6069755, 0.45453396],
    [0.7646091, 0.02541292, 0.4150683, 0.46449262, 0.7312082, 0.46813405],
    [0.728644, 0.03260026, 0.4502424, 0.5745875, 0.8550211, 0.48246595],
    [0.6548514, 0.04849604, 0.48991063, 0.69605076, 0.95122355, 0.49937114],
    [0.55187154, 0.07306844, 0.5247411, 0.8126252, 1.0, 0.52326953],
    [0.43416834, 0.10740938, 0.54526246, 0.9089829, 0.9949649, 0.56025773],
    [0.31824, 0.15407486, 0.54224575, 0.9735954, 0.9434846, 0.61595494],
    [0.21958008, 0.2164886, 0.50847554, 1.0, 0.8620675, 0.69245684],
    [0.1509251, 0.29748562, 0.4417402, 0.9867678, 0.76990825, 0.7852814],
    [0.12116585, 0.39752558, 0.3474034, 0.93695503, 0.68352836, 0.8815922],
    [0.13407356, 0.5133103, 0.23878591, 0.85756075, 0.613838, 0.9610427],
    [0.18676235, 0.6373966, 0.13448839, 0.75886744, 0.56545657, 1.0],
    [0.26877347, 0.7590126, 0.05314998, 0.65315837, 0.5375409, 0.97856086],
    [0.36296514, 0.8658781, 0.00747537, 0.55261594, 0.52546144, 0.8881158],
    [0.448735, 0.94653696, 0.0, 0.4669255, 0.522862, 0.73620987],
    [0.5068819, 0.99255973, 0.02246275, 0.40146872, 0.52359486, 0.54605],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]]];

        const maxLength = 51;

    const paddedRep = {
      accX: padSequence(data.accX, maxLength),
      accY: padSequence(data.accY, maxLength),
      accZ: padSequence(data.accZ, maxLength),
      gyroX: padSequence(data.gyroX, maxLength),
      gyroY: padSequence(data.gyroY, maxLength),
      gyroZ: padSequence(data.gyroZ, maxLength)
    };
    //console.log(paddedRep)

    // fürs testen mit anderer methode: 
    //const preparedData = prepareDataForModel(data2);
    const preparedData = prepareDataForModel(paddedRep, 51);
    //console.log(preparedData)

    const runInference = async () => {
      if (!model) return;
      try {
        const output = await model.run([preparedData]);
        console.log('Inference result:', output);

        const maxIndex = output[0].indexOf(Math.max(...output[0]));
        console.log((class_names[maxIndex]))
        //setPrediction(output);
      } catch (error) {
        console.error('Error running inference:', error);
      }
    };

   //runInference();
  }
}, [model]);


// useEffect(() => {
//   if (model) {
//   }
//   else {console.log("kein model")}
// }, [model]);


const predict = ()=> {
  const combinedData = recordedData.accX.map((x, i) =>
    calculateMagnitude(x, recordedData.accY[i], recordedData.accZ[i])
  );
  // const smoothedData = sgg(combinedData, {
  //   windowSize: 11,
  //   polynomial: 2,
  // });
  const smoothedData = applySavitzkyGolayFilter(combinedData,7,2)
  const normalizedData = minMaxScaler(smoothedData);
      setNormalizedData(normalizedData);
      const peaks = findPeaks(normalizedData);
      setPeaks(peaks);
      const extractedData: any = {};
      for (let i = 0; i < peaks.length - 1; i++) {
        const start = peaks[i];
        const end = peaks[i + 1];

        const segmentAccX = recordedData.accX.slice(start, end);
        const segmentAccY = recordedData.accY.slice(start, end);
        const segmentAccZ = recordedData.accZ.slice(start, end);
        const segmentGyroX = recordedData.gyroX.slice(start, end);
        const segmentGyroY = recordedData.gyroY.slice(start, end);
        const segmentGyroZ = recordedData.gyroZ.slice(start, end);

        const processSegment = (segment: number[]) => {
          const windowSize = Math.min(segment.length, 7); // Nutze die maximale mögliche Fenstergröße
          const smoothedSegment = applySavitzkyGolayFilter(segment, windowSize, 2);
          return minMaxScaler(smoothedSegment);
        };

        extractedData[`Rep${i + 1}`] = {
          accX: processSegment(segmentAccX),
          accY: processSegment(segmentAccY),
          accZ: processSegment(segmentAccZ),
          gyroX: processSegment(segmentGyroX),
          gyroY: processSegment(segmentGyroY),
          gyroZ: processSegment(segmentGyroZ),
        };
      }
      console.log("EXTRACTED DATA:", extractedData)
      setExtractedData(extractedData);
      const repCount =  Object.keys(extractedData).length;
      console.log("PREDICTED REPS:", repCount)
      setPredReps(repCount)
      const maxLength= 51
      const rep1 = extractedData.Rep1;
      const paddedRep = {
        accX: padSequence(rep1.accX, maxLength),
        accY: padSequence(rep1.accY, maxLength),
        accZ: padSequence(rep1.accZ, maxLength),
        gyroX: padSequence(rep1.gyroX, maxLength),
        gyroY: padSequence(rep1.gyroY, maxLength),
        gyroZ: padSequence(rep1.gyroZ, maxLength)
      };
      const preparedData = prepareDataForModel(paddedRep, 51);
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

  const handleButtonPress = () => {
    if (isTracking) {
      // Combine accelerometer data by calculating magnitude
      const combinedData = recordedData.accX.map((x, i) =>
        calculateMagnitude(x, recordedData.accY[i], recordedData.accZ[i])
      );

      // Filter the combined data using Savitzky-Golay filter
      const smoothedData = sgg(combinedData, {
        windowSize: 11,
        polynomial: 2,
      });

      // Normalize the smoothed data
      const normalizedData = minMaxScaler(smoothedData);
      setNormalizedData(normalizedData);
      //console.log("NORMALIZED DATA:", normalizedData )   // Find peaks in the normalized data
      const peaks = findPeaks(normalizedData);
      setPeaks(peaks);
  

      // Extract data segments between peaks
      const extractedData: any = {};
      for (let i = 0; i < peaks.length - 1; i++) {
        const start = peaks[i];
        const end = peaks[i + 1];

        const segmentAccX = recordedData.accX.slice(start, end);
        const segmentAccY = recordedData.accY.slice(start, end);
        const segmentAccZ = recordedData.accZ.slice(start, end);
        const segmentGyroX = recordedData.gyroX.slice(start, end);
        const segmentGyroY = recordedData.gyroY.slice(start, end);
        const segmentGyroZ = recordedData.gyroZ.slice(start, end);

        const processSegment = (segment: number[]) => {
          const smoothedSegment = sgg(segment, {
            windowSize: 11,
            polynomial: 2,
          });
          return minMaxScaler(smoothedSegment);
        };

        extractedData[`Rep${i + 1}`] = {
          accX: processSegment(segmentAccX),
          accY: processSegment(segmentAccY),
          accZ: processSegment(segmentAccZ),
          gyroX: processSegment(segmentGyroX),
          gyroY: processSegment(segmentGyroY),
          gyroZ: processSegment(segmentGyroZ),
        };
      }

      setExtractedData(extractedData);

      // console.log('Smoothed and Normalized Accelerometer Data:');
      // console.log('Peaks:', peaks);
      //console.log('Extracted Data :', extractedData);
      Object.keys(extractedData).length;
     
      const maxLength= 51
      const rep1 = extractedData.Rep1;
      const paddedRep = {
        accX: padSequence(rep1.accX, maxLength),
        accY: padSequence(rep1.accY, maxLength),
        accZ: padSequence(rep1.accZ, maxLength),
        gyroX: padSequence(rep1.gyroX, maxLength),
        gyroY: padSequence(rep1.gyroY, maxLength),
        gyroZ: padSequence(rep1.gyroZ, maxLength)
      };
      // const inputArray = [
      //   ...rep1.accX,
      //   ...rep1.accY,
      //   ...rep1.accZ,
      //   ...rep1.gyroX,
      //   ...rep1.gyroY,
      //   ...rep1.gyroZ
      // ];

      // const input = new Float32Array(inputArray);
      const preparedData = prepareDataForModel(paddedRep, 51);
      const runInference = async () => {
        if (!model) return;
        try {
          const output = await model.run([preparedData]);
          console.log('Inference result:', output);
  
          const maxIndex = output[0].indexOf(Math.max(...output[0]));
          console.log((class_names[maxIndex]))
          setPrediction(class_names[maxIndex]);
        } catch (error) {
          console.error('Error running inference:', error);
        }
      };
      runInference()


    }
    setIsTracking(!isTracking);
    if (!isTracking) {
      setRecordedData({
        accX: [],
        accY: [],
        accZ: [],
        gyroX: [],
        gyroY: [],
        gyroZ: [],
      }); // Clear recorded data when starting a new session
    }
  };

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
        // label={label}
        // setLabel={setLabel}
        // setReps={setReps}
        // saveToFile={saveToFile}
        // reps={reps}
        setAccData={setAccelerometerData}
        setGyroData={setGyroscopeData}
        predict={predict}
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
     {/* <View style={styles.sensorDataContainer}> 
      <Text style={styles.title}>Accelerometer</Text>
      <Text style={styles.paragraph}>x: {accelerometerData.x.toFixed(2)}</Text>
      <Text style={styles.paragraph}>y: {accelerometerData.y.toFixed(2)}</Text>
      <Text style={styles.paragraph}>z: {accelerometerData.z.toFixed(2)}</Text>
    </View>
    <View style={styles.sensorDataContainer}>
      <Text style={styles.title}>Gyroscope</Text>
      <Text style={styles.paragraph}>x: {gyroscopeData.x.toFixed(2)}</Text>
      <Text style={styles.paragraph}>y: {gyroscopeData.y.toFixed(2)}</Text>
      <Text style={styles.paragraph}>z: {gyroscopeData.z.toFixed(2)}</Text>
    </View>
    <View style={styles.buttonContainer}>
      <Button title={isTracking ? "Stop" : "Start"} onPress={handleButtonPress} />
      <Button title="Reset" onPress={()=>{}} color="red" />
    </View>
    <View>
      <Text>
        {prediction}
      </Text>
    </View>*/}
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
