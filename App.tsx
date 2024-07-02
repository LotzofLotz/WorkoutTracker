
import React, {useEffect, useState} from 'react';
import {
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Text,
} from 'react-native';
import { loadTensorflowModel } from 'react-native-fast-tflite';
import { accelerometer, gyroscope, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import TrackingModal from './components/TrackingModal';
const { sgg } = require('ml-savitzky-golay-generalized');
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
  const [timeElapsed, setTimeElapsed]= useState<number>(0)
  const [peaks, setPeaks] = useState<number[]>([]);
  const [chartData, setChartData] = useState<number[]>([])

  const [accData, setAccData] = useState<any[]>([]);
  const [gyroData, setGyroData] = useState<any[]>([]);
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);
  

 
console.log("recorded Data: ",  recordedData)



  //loads the modal on Open
  useEffect(() => {
    const loadModel = async () => {
      try {
         //const loadedModel = await loadTensorflowModel(require('./android/app/src/main/assets/model.tflite'));
        const loadedModel = await loadTensorflowModel(require('./android/app/src/main/assets/newSplitModel.tflite')); //besseres model, aber zeigt immer nur squat 
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


// pads the single rep sequence to have a uniform length (that of the longest rep recorded)
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


  //filter method, adjusts the windowsize, if the length of the data isnt as big
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
      return data; // Rückgabe der ursprünglichen Daten im Fehlerfall hier ggf einen anderen filter anwenden oä 
    }
  };


  type AxisRange = {
    axis: 'y' | 'magnitude';
    range: number;
  };
  
  // Funktion zum Berechnen der Range
  function calculateRange(data: number[]): number {
    const min = Math.min(...data);
    const max = Math.max(...data);
    return max - min;
  }
  
  // Funktion zum Auswählen der besten Achse
  function selectBestAxis(yData: number[], magnitudeData: number[]): 'y' | 'magnitude' {
    const yRange = calculateRange(yData);
    const magnitudeRange = calculateRange(magnitudeData);
  
    const ranges: AxisRange[] = [
      { axis: 'y', range: yRange },
      { axis: 'magnitude', range: magnitudeRange }
    ];
  
    ranges.sort((a, b) => b.range - a.range);
    return ranges[0].axis;
  }

  

  //combines x,y,z direction of the accelerometer
  //  const calculateMagnitude = (x: number, y: number, z: number) => {
  //   return Math.sqrt(x ** 2 + y ** 2 + z ** 2);
  // };
  const calculateMagnitude = (x: number[], y: number[], z: number[]): number[] => {
    return x.map((_, index) => Math.sqrt(x[index] ** 2 + y[index] ** 2 + z[index] ** 2));
  };


 //function to normalize the data
    const minMaxScaler = (data: number[]) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    return data.map((value) => (value - min) / (max - min));
  };


const predict = ()=> {
  // const combinedData = recordedData.accX.map((x, i) =>
  //   calculateMagnitude(x, recordedData.accY[i], recordedData.accZ[i])
  // ); 
 
  const magnitude = calculateMagnitude(recordedData.accX, recordedData.accY, recordedData.accZ)
  const bestAxis = selectBestAxis(magnitude, recordedData.accY)
  console.log("BEST AXIS:", bestAxis)
  let peaks: number[] = [];

  if(bestAxis == "y"){
    const smoothedY = applySavitzkyGolayFilter(recordedData.accY,9,3)
    const normedY = minMaxScaler(smoothedY)
    setChartData(normedY)
   console.log("normedY:", normedY)
    const yData = normedY.map((value)=> normedY[0]<0.5? -value: value)
    peaks = findPeaks(yData,9, -0.2,0.5)
    setPeaks(peaks)
    setPredReps(peaks.length-1)
    console.log("Accy peaks:", peaks)
  }
  else{
  const smoothedMag = applySavitzkyGolayFilter(magnitude, 9,3)
  const normedMag = minMaxScaler(smoothedMag)
  console.log("normedMag:", normedMag)
  setChartData(normedMag)
  //Rep == Valley or Hill? Maxima->Maxima or Minima->Minima? 
  const magData = normedMag.map((value)=> normedMag[0]<0.5? -value: value)
  peaks= findPeaks(magData,9, -0.2,0.5)
  setPredReps(peaks.length-1)
  setPeaks(peaks)
  console.log("MAGNITUDE peaks: ", peaks)}
  
  
 
    
      //setPeaks(peaks);
      const extractedData: any = {};
      for (let i = 0; i < peaks.length-1 ; i++) {
        const start = peaks[i];
        const end = peaks[i + 1];

        const segmentAccX = recordedData.accX.slice(start,end)
        const segmentAccY = recordedData.accY.slice(start,end)
        const segmentAccZ = recordedData.accZ.slice(start,end)
        const segmentGyroX = recordedData.gyroX.slice(start,end)
        const segmentGyroZ = recordedData.gyroZ.slice(start,end)
        const segmentGyroY = recordedData.gyroY.slice(start,end)

  
      // const segmentAccX = normalizedAccX.slice(start, end);
      // const segmentAccY = normalizedAccY.slice(start, end);
      // const segmentAccZ = normalizedAccZ.slice(start, end);
      // const segmentGyroX = normalizedGyroX.slice(start, end);
      // const segmentGyroY = normalizedGyroY.slice(start, end);
      // const segmentGyroZ = normalizedGyroZ.slice(start, end);
  
      extractedData[`Rep${i + 1}`] = {
        accX: segmentAccX,
        accY: segmentAccY,
        accZ: segmentAccZ,
        gyroX: segmentGyroX,
        gyroY: segmentGyroY,
        gyroZ: segmentGyroZ,
      };
    }
 // const smoothedData = applySavitzkyGolayFilter(recordedData.accY,9,3)
  // const invData = smoothedData.map((value: number)=> -value)
  // const peaks=  findPeaks(invData, 9, -0.5, 0.7)
  // console.log("smoothedData", smoothedData),98
  // console.log("peaks:", peaks)

  // const smoothedData = applySavitzkyGolayFilter(combinedData,9,3)
  //const smoothedData2 = applySavitzkyGolayFilter(combinedData,13,3)
  
  //console.log("smoothed data size 13", smoothedData2)
  // const normalizedData = minMaxScaler(smoothedData);
  // console.log("NORMALIZED COMBINED DATA:", normalizedData)
  //  const example = [0.618040552629508, 0.4112559027681461, 0.2954085394554974, 0.2564787141747587, 0.28044667840912585, 0.39911933221290186, 0.46868903224850705, 0.47527006502225094, 0.554644578804998, 0.7314845010462436, 0.824875801981758, 0.8029570813246576, 0.7442211017394238, 0.7225404858546401, 0.5172465222624764, 0.275804635467232, 0.22029520011953066, 0.21117469513555098, 0.15825709321415982, 0.09155657445049008, 0.09765298494403643, 0.23046458274302006, 0.24353354696938964, 0.2697092641335558, 0.35952558238030846, 0.41618706059430677, 0.4811076869008306, 0.5264662870371414, 0.461387907305928, 0.3815258927298769, 0.45273848239149533, 0.4961402099040545, 0.5596586281829015, 0.5918996999382564, 0.6280871797467613, 0.6085006815818863, 0.47211517408564424, 0.4141781047759924, 0.5710177825424325, 0.7179894309015712, 0.8698452683617006, 0.9708370102841374, 1, 0.816571245786882, 0.6234256992407131, 0.4463863444475735, 0.25959746291671754, 0.17160980852283136, 0.17222443063777304, 0.17040910777618964, 0.11736772060263827, 0.009798253174203705, 0, 0.10201989632792854, 0.16105644838648492, 0.2661701860009938, 0.37878411957273556, 0.37039782716004366, 0.4262998979395553, 0.4712787609308802, 0.44245038991902635, 0.46438984498429137, 0.45874211631013484, 0.43874478529209815, 0.5147505528244011, 0.5225636727724808, 0.5233872233553046, 0.5073892634895341, 0.4313558995751066, 0.42742571777795785, 0.43083119888874205, 0.4454900400119684, 0.467740497577581, 0.49392082801552606]
  //   const invData = example.map((value)=> -value)
  //   const peaks = findPeaks(invData,7,-0.4, 0.3) ;
  //   const peaks2 = findPeaks(invData,7,-0.4)
  //   console.log("PEAKS MIT 0.3 ", peaks)  
  //   console.log("PEAKS OHNE::::", peaks2)
   
   // const invData = normalizedData.map((value) => -value); 
      // const peaks = findPeaks(invData,7,-0.4, 0.3) ;
      // const peaks2 = findPeaks(normalizedData,7,0.4)
      // console.log("Minimas:", peaks)
      // console.log("actual Peaks ", peaks2)
  
      // const smoothedAccX = applySavitzkyGolayFilter(recordedData.accX, 9, 2);
      // const smoothedAccY = applySavitzkyGolayFilter(recordedData.accY, 9, 2);
      // const smoothedAccZ = applySavitzkyGolayFilter(recordedData.accZ, 9, 2);
      // const smoothedGyroX = applySavitzkyGolayFilter(recordedData.gyroX, 9, 2);
      // const smoothedGyroY = applySavitzkyGolayFilter(recordedData.gyroY, 9, 2);
      // const smoothedGyroZ = applySavitzkyGolayFilter(recordedData.gyroZ, 9, 2);

      // const normalizedAccX = minMaxScaler(smoothedAccX);
      // const normalizedAccY = minMaxScaler(smoothedAccY);
      // const normalizedAccZ = minMaxScaler(smoothedAccZ);
      // const normalizedGyroX = minMaxScaler(smoothedGyroX);
      // const normalizedGyroY = minMaxScaler(smoothedGyroY);
      // const normalizedGyroZ = minMaxScaler(smoothedGyroZ);

      // console.log("NORMALIZED ACCY", normalizedAccY)
    console.log("EXTRACTED DATA:", extractedData)

    
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
      const preparedData = prepareDataForModel(paddedRep, 51); 
      console.log("PREPARED DATA:::::", preparedData)// 51 hier abhängig von der shape des tensors im training
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
        chartData={chartData}
        peaks={peaks}
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
