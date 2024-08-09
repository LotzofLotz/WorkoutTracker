import React, {useEffect, useState} from 'react';
import {TouchableOpacity, SafeAreaView, StyleSheet, Text} from 'react-native';
import {loadTensorflowModel} from 'react-native-fast-tflite';
import {
  accelerometer,
  gyroscope,
  setUpdateIntervalForType,
  SensorTypes,
} from 'react-native-sensors';
import {Subscription} from 'rxjs';
import {map} from 'rxjs/operators';
import TrackingModal from './components/TrackingModal';
const {sgg} = require('ml-savitzky-golay-generalized');
import {findPeaks} from './components/FindPeaks';
import * as numeric from 'numeric';
const {Matrix} = require('ml-matrix');
const {PCA} = require('ml-pca');

function App(): React.JSX.Element {
  const [trackingModalOpen, setTrackingModalOpen] = useState<boolean>(false);
  const [model, setModel] = useState<any>(null);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [predReps, setPredReps] = useState<number>(0);
  const [predLabel, setPredLabel] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [recordedData, setRecordedData] = useState({
    accX: [] as number[],
    accY: [] as number[],
    accZ: [] as number[],
    gyroX: [] as number[],
    gyroY: [] as number[],
    gyroZ: [] as number[],
  });
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [chartData, setChartData] = useState<number[]>([]);
  const [output, setOutput] = useState([0.0, 0.0, 0.0, 0.0]);

  type Prediction = {
    label: string;
    probability: number;
  };
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  //loads the modal on Open
  useEffect(() => {
    const loadModel = async () => {
      try {
        //const loadedModel = await loadTensorflowModel(require('./android/app/src/main/assets/newSplitModel.tflite'));
        const loadedModel = await loadTensorflowModel(
          require('./android/app/src/main/assets/diplessModel.tflite'),
        );
        setModel(loadedModel);
        console.log(loadModel, 'Model loaded successfully');
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
          error => console.log('The sensor is not available', error),
        );

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
          error => console.log('The sensor is not available', error),
        );
    } else if (!isTracking && timeElapsed !== 0) {
      if (interval) {
        clearInterval(interval); // Intervall stoppen, wenn isTracking auf false gesetzt wird
      }
    }
    return () => {
      if (accelerometerSubscription) {
        accelerometerSubscription.unsubscribe();
      }
      if (gyroscopeSubscription) {
        gyroscopeSubscription.unsubscribe();
      }
      clearInterval(interval);
    };
  }, [isTracking]);

  const maxLength = 59;

  const class_names = ['PullUp', 'PushUp', 'SitUp', 'Squat'];

  function padSequence(sequence: number[], maxLength: number): number[] {
    if (sequence.length >= maxLength) {
      return sequence.slice(0, maxLength);
    }
    const paddedSequence = new Array(maxLength).fill(0);
    for (let i = 0; i < sequence.length; i++) {
      paddedSequence[i] = sequence[i];
    }
    return paddedSequence;
  }

  //filter method, adjusts the windowsize, if the length of the data isnt as big
  const applySavitzkyGolayFilter = (
    data: number[],
    windowSize: number,
    polynomialOrder: number,
  ) => {
    if (data.length < windowSize) {
      console.warn(
        'Data length is less than window size, reducing window size to match data length.',
      );
      windowSize = data.length; // Fenstergröße auf Datenlänge reduzieren
    }
    const options = {windowSize, polynomialOrder};
    try {
      return sgg(data, options);
    } catch (error) {
      console.error('Error applying Savitzky-Golay filter:', error);
      return data; // Rückgabe der ursprünglichen Daten im Fehlerfall hier ggf einen anderen filter anwenden oä
    }
  };

  function subtractMean(data: number[]): number[] {
    const mean = numeric.sum(data) / data.length;
    return data?.map(value => value - mean);
  }

  function normalizeToRange(data: number[]): number[] {
    const min: number = Math.min(...data);
    const max: number = Math.max(...data);
    const range: number = max - min;

    if (range === 0) {
      // Wenn alle Werte gleich sind, normalisiere zu 0
      return data.map(() => 0);
    }

    return data.map((value: number) => {
      return (2 * (value - min)) / range - 1;
    });
  }

  function invertArray(data: number[]): number[] {
    return data.map(value => -value);
  }

  const prepareDataForModel = (
    paddedRep: {
      accX: number[];
      accY: number[];
      accZ: number[];
      gyroX: number[];
      gyroY: number[];
      gyroZ: number[];
    },
    maxLength: number,
  ): number[] => {
    const features = [];
    for (let i = 0; i < maxLength; i++) {
      if (
        typeof paddedRep.accX[i] !== 'number' ||
        typeof paddedRep.accY[i] !== 'number' ||
        typeof paddedRep.accZ[i] !== 'number' ||
        typeof paddedRep.gyroX[i] !== 'number' ||
        typeof paddedRep.gyroY[i] !== 'number' ||
        typeof paddedRep.gyroZ[i] !== 'number'
      ) {
        console.error(`Invalid sensor data at index ${i}`);
        return []; // Rückgabe eines leeren Arrays bei ungültigen Daten
      }

      features.push(
        paddedRep.accX[i],
        paddedRep.accY[i],
        paddedRep.accZ[i],
        paddedRep.gyroX[i],
        paddedRep.gyroY[i],
        paddedRep.gyroZ[i],
      );
    }

    if (features.length !== maxLength * 6) {
      console.log('Feature length does not match expected length');
      return []; // Rückgabe eines leeren Arrays bei falscher Länge
    }

    return features;
  };

  const predictLabel = async () => {
    const filteredYData = applySavitzkyGolayFilter(recordedData.accY, 9, 3);
    const filteredXData = applySavitzkyGolayFilter(recordedData.accX, 9, 3);
    const filteredZData = applySavitzkyGolayFilter(recordedData.accZ, 9, 3);
    const yDataMeanSubtracted = subtractMean(filteredYData);
    const zDataMeanSubtracted = subtractMean(filteredZData);
    const xDataMeanSubtracted = subtractMean(filteredXData);
    let dataMatrix = new Matrix(xDataMeanSubtracted.length, 3); // Erstellt eine leere Matrix mit der richtigen Größe
    for (let i = 0; i < xDataMeanSubtracted.length; i++) {
      dataMatrix.setRow(i, [
        xDataMeanSubtracted[i],
        yDataMeanSubtracted[i],
        zDataMeanSubtracted[i],
      ]);
    }
    let pca = new PCA(dataMatrix);
    let transformedData = pca.predict(dataMatrix).to2DArray(); // Konvertiert das Ergebnis in ein 2D-Array

    // Die erste Hauptkomponente extrahieren (wichtigste Komponente)
    let firstPrincipalComponent: number[] = transformedData.map(
      (row: number[]) => row[0],
    );

    const normalizedPC1 = normalizeToRange(firstPrincipalComponent);
    setChartData(normalizedPC1);
    const peaks =
      normalizedPC1[0] > 0
        ? findPeaks(normalizedPC1, 7, 0.1, 0)
        : findPeaks(invertArray(normalizedPC1), 7, 0.1, 0);

    setPeaks(peaks);
    setPredReps(peaks.length - 1);

    const extractedData: any = {};
    for (let i = 0; i < peaks.length - 1; i++) {
      const start = peaks[i];
      const end = peaks[i + 1];

      const segmentAccX = recordedData.accX.slice(start, end);
      const segmentAccY = recordedData.accY.slice(start, end);
      const segmentAccZ = recordedData.accZ.slice(start, end);
      const segmentGyroX = recordedData.gyroX.slice(start, end);
      const segmentGyroZ = recordedData.gyroZ.slice(start, end);
      const segmentGyroY = recordedData.gyroY.slice(start, end);

      extractedData[`Rep${i + 1}`] = {
        accX: segmentAccX,
        accY: segmentAccY,
        accZ: segmentAccZ,
        gyroX: segmentGyroX,
        gyroY: segmentGyroY,
        gyroZ: segmentGyroZ,
      };
    }
    // const rep1 = extractedData.Rep1;

    // if (!rep1) {
    //   console.error('No data in extractedData for Rep1');
    //   return;
    // }
    // const paddedRep = {
    //   accX: padSequence(rep1.accX, maxLength),
    //   accY: padSequence(rep1.accY, maxLength),
    //   accZ: padSequence(rep1.accZ, maxLength),
    //   gyroX: padSequence(rep1.gyroX, maxLength),
    //   gyroY: padSequence(rep1.gyroY, maxLength),
    //   gyroZ: padSequence(rep1.gyroZ, maxLength),
    // };
    // const preparedData = prepareDataForModel(paddedRep, maxLength);
    // //const preparedData2 = [-0.7776673436164856, -1.0019944906234741, 13.084552764892578, -0.837496280670166, 0.30604347586631775, 0.18249599635601044, -0.6394818425178528, -0.6981059908866882, 12.4540433883667, 0.6568328738212585, 0.10644327104091644, 0.1814269721508026, -0.2709871530532837, 0.6029912829399109, 10.89571762084961, 0.34605515003204346, -0.34758231043815613, 0.11270463466644287, -0.3194418251514435, 0.7639086246490479, 9.105886459350586, 0.4495968222618103, -0.5768095254898071, -0.015577063895761967, 0.04366901144385338, 1.5188441276550293, 8.169096946716309, 0.5468770861625671, -0.4657847583293915, 0.09178250283002853, 0.7680960893630981, 2.612962245941162, 7.371688365936279, 2.127185583114624, -0.33689218759536743, 0.3318525552749634, 1.0534402132034302, 3.315854072570801, 5.482554912567139, -0.010690141469240189, -0.18860463798046112, 0.14340060949325562, 2.2570300102233887, 2.589632272720337, 7.331608772277832, -1.418123722076416, 0.25824329257011414, 0.2054034322500229, 1.322034478187561, 1.8077775239944458, 8.729615211486816, -0.6902777552604675, 0.347276896238327, 0.25931230187416077, 0.1824527233839035, 1.5134602785110474, 10.029516220092773, -0.570853590965271, 0.417679101228714, 0.15714508295059204, 0.3002992272377014, 1.7336000204086304, 11.35513973236084, -0.08674286305904388, 0.46334129571914673, -0.02871066704392433, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    // const floaty = new Float32Array(preparedData);

    // const output = await model.run([floaty]);
    // setOutput(output);
    // const maxIndex = output[0].indexOf(Math.max(...output[0]));
    // console.log('maxIndex:', maxIndex);
    // setPredLabel(class_names[maxIndex]);
    const predictions: {label: string; probability: number}[] = [];
    for (let i = 1; i <= 3; i++) {
      const rep = extractedData[`Rep${i}`];
      if (!rep) {
        console.error(`No data in extractedData for Rep${i}`);
        continue;
      }

      const paddedRep = {
        accX: padSequence(rep.accX, maxLength),
        accY: padSequence(rep.accY, maxLength),
        accZ: padSequence(rep.accZ, maxLength),
        gyroX: padSequence(rep.gyroX, maxLength),
        gyroY: padSequence(rep.gyroY, maxLength),
        gyroZ: padSequence(rep.gyroZ, maxLength),
      };

      const preparedData = prepareDataForModel(paddedRep, maxLength);
      const floaty = new Float32Array(preparedData);
      const output = await model.run([floaty]);

      const maxIndex = output[0].indexOf(Math.max(...output[0]));
      console.log(`Rep${i} maxIndex:`, maxIndex);
      predictions.push({
        label: class_names[maxIndex],
        probability: output[0][maxIndex],
      });
    }
    setPredictions(predictions);

    // setOutput erwartet ein number[], aber predictions ist ein string[].
    // Wir sollten predictions als string[] belassen und setOutput entfernen, wenn es nicht benötigt wird.
    // setOutput(predictions); // Entfernen Sie diese Zeile, wenn setOutput nicht verwendet wird.

    // Bestimmen des finalen Labels basierend auf den ersten 3 Predictions
    let finalLabel: string;
    if (predictions[0].label === predictions[1].label) {
      finalLabel = predictions[0].label;
    } else {
      const votes: {[key: string]: number} = {};
      predictions.forEach(pred => {
        if (!votes[pred.label]) votes[pred.label] = 0;
        votes[pred.label]++;
      });
      finalLabel = Object.keys(votes).reduce((a, b) =>
        votes[a] > votes[b] ? a : b,
      );
    }

    setPredLabel(finalLabel);
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
        predict={predictLabel}
        setPredReps={setPredReps}
        setPredLabel={setPredLabel}
        setRecordedData={setRecordedData}
        chartData={chartData}
        peaks={peaks}
        predictions={predictions}
      />
      <TouchableOpacity
        onPress={() => setTrackingModalOpen(true)}
        style={{
          position: 'absolute',
          width: 76,
          height: 76,
          alignItems: 'center',
          justifyContent: 'center',
          right: 20,
          bottom: 20,
          backgroundColor: '#03A9F4',
          borderRadius: 69,
          elevation: 8,
        }}>
        <Text style={{fontSize: 50, color: 'white'}}>+</Text>
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
