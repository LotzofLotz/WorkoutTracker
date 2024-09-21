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
import email from 'react-native-email';

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
  const [quality, setQuality] = useState<number>(0);
  const [jerk, setJerk] = useState<number>(0);

  const [emailData, setEmailData] = useState<EmailData>({
    rawX: [],
    rawY: [],
    rawZ: [],
    smoothedX: [],
    smoothedY: [],
    smoothedZ: [],
    normalizedX: [],
    normalizedY: [],
    normalizedZ: [],
    pca: [],
    peaks: [],
    label: '',
  });

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
          require('./android/app/src/main/assets/modelShort.tflite'),
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

  const maxLength = 29;

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

  function padReps(rep: any, targetLength: number): any {
    return {
      accX: padSequence(rep.accX, targetLength),
      accY: padSequence(rep.accY, targetLength),
      accZ: padSequence(rep.accZ, targetLength),
      gyroX: padSequence(rep.gyroX, targetLength),
      gyroY: padSequence(rep.gyroY, targetLength),
      gyroZ: padSequence(rep.gyroZ, targetLength),
    };
  }

  function calculateCorrelation(arr1: number[], arr2: number[]): number {
    const n = arr1.length;
    const mean1 = arr1.reduce((sum, value) => sum + value, 0) / n;
    const mean2 = arr2.reduce((sum, value) => sum + value, 0) / n;

    const numerator = arr1.reduce(
      (sum, value, i) => sum + (value - mean1) * (arr2[i] - mean2),
      0,
    );
    const denominator = Math.sqrt(
      arr1.reduce((sum, value) => sum + (value - mean1) ** 2, 0) *
        arr2.reduce((sum, value) => sum + (value - mean2) ** 2, 0),
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  // function segmentReps(normalizedPC1: number[], peaks: number[]): number[][] {
  //   const segments: number[][] = [];
  //   for (let i = 0; i < peaks.length - 1; i++) {
  //     segments.push(normalizedPC1.slice(peaks[i], peaks[i + 1]));
  //   }
  //   return segments;
  // }

  // function calculateSimilarity(segment1: number[], segment2: number[]): number {
  //   const n = Math.min(segment1.length, segment2.length);
  //   let sum = 0;

  //   for (let i = 0; i < n; i++) {
  //     sum += (segment1[i] - segment2[i]) ** 2;
  //   }

  //   return 1 / (1 + Math.sqrt(sum / n)); // Wert zwischen 0 und 1
  // }

  // function calculateOverallSimilarity(segments: number[][]): number {
  //   let totalSimilarity = 0;
  //   let count = 0;

  //   for (let i = 0; i < segments.length; i++) {
  //     for (let j = i + 1; j < segments.length; j++) {
  //       totalSimilarity += calculateSimilarity(segments[i], segments[j]);
  //       count++;
  //     }
  //   }

  //   return count === 0 ? 0 : totalSimilarity / count;
  // }

  function calculateOverallJerk(
    accX: number[],
    accY: number[],
    accZ: number[],
  ): number {
    const jerkX = calculateDerivative(accX);
    const jerkY = calculateDerivative(accY);
    const jerkZ = calculateDerivative(accZ);

    let totalJerk = 0;
    for (let i = 0; i < jerkX.length; i++) {
      totalJerk += Math.sqrt(jerkX[i] ** 2 + jerkY[i] ** 2 + jerkZ[i] ** 2);
    }

    // Durchschnittlicher Jerk-Wert für die gesamte Übung
    return totalJerk / jerkX.length;
  }

  function calculateCombinedJerk(
    accX: number[],
    accY: number[],
    accZ: number[],
  ): number[] {
    const jerkX = calculateDerivative(accX);
    const jerkY = calculateDerivative(accY);
    const jerkZ = calculateDerivative(accZ);

    let combinedJerk = [];
    for (let i = 0; i < jerkX.length; i++) {
      combinedJerk.push(
        Math.sqrt(jerkX[i] ** 2 + jerkY[i] ** 2 + jerkZ[i] ** 2),
      );
    }
    return combinedJerk;
  }

  const calculateDerivative = (data: number[]) => {
    let derivative = [];
    for (let i = 1; i < data.length; i++) {
      derivative.push(data[i] - data[i - 1]);
    }
    return derivative;
  };

  function calculateRepJerk(
    accX: number[],
    accY: number[],
    accZ: number[],
  ): number {
    const jerkX = calculateDerivative(accX);
    const jerkY = calculateDerivative(accY);
    const jerkZ = calculateDerivative(accZ);

    let totalJerk = 0;
    for (let i = 0; i < jerkX.length; i++) {
      totalJerk += Math.sqrt(jerkX[i] ** 2 + jerkY[i] ** 2 + jerkZ[i] ** 2);
    }

    // Durchschnittlicher Jerk-Wert für die gesamte Rep
    return totalJerk / jerkX.length;
  }

  function calculateOverallSimilarity(
    extractedData: Record<string, any>,
    targetLength: number,
  ): number {
    const repKeys = Object.keys(extractedData);
    let totalCorrelation = 0;
    let count = 0;

    for (let i = 0; i < repKeys.length; i++) {
      for (let j = i + 1; j < repKeys.length; j++) {
        const rep1 = padReps(extractedData[repKeys[i]], targetLength);
        const rep2 = padReps(extractedData[repKeys[j]], targetLength);

        // Berechne die Korrelationen
        const corrAccX = calculateCorrelation(rep1.accX, rep2.accX);
        const corrAccY = calculateCorrelation(rep1.accY, rep2.accY);
        const corrAccZ = calculateCorrelation(rep1.accZ, rep2.accZ);
        const corrGyroX = calculateCorrelation(rep1.gyroX, rep2.gyroX);
        const corrGyroY = calculateCorrelation(rep1.gyroY, rep2.gyroY);
        const corrGyroZ = calculateCorrelation(rep1.gyroZ, rep2.gyroZ);

        // Berechne die euklidische Norm des Jerks für jede Rep
        // const jerk1 = calculateCombinedJerk(rep1.accX, rep1.accY, rep1.accZ);
        // const jerk2 = calculateCombinedJerk(rep2.accX, rep2.accY, rep2.accZ);
        // console.log('jerk1', jerk1);
        // console.log('jerk2:', jerk2);

        // Berechne die Korrelation der kombinierten Jerk-Werte
        // const corrJerk = calculateCorrelation(jerk1, jerk2);
        // console.log('corrJerk:', corrJerk);

        // Durchschnittliche Korrelation über alle Achsen
        const avgCorrelation =
          (corrAccX + corrAccY + corrAccZ + corrGyroX + corrGyroY + corrGyroZ) /
          6;

        totalCorrelation += avgCorrelation;
        count++;
      }
    }

    return count === 0 ? 0 : totalCorrelation / count;
  }
  const formatArray = (arr: number[]): string => arr.join(', ');
  type EmailData = {
    rawX: number[];
    rawY: number[];
    rawZ: number[];
    smoothedX: number[];
    smoothedY: number[];
    smoothedZ: number[];
    normalizedX: number[];
    normalizedY: number[];
    normalizedZ: number[];
    pca: number[];
    peaks: number[];
    label: string;
  };

  const handleEmail = ({
    rawX,
    rawY,
    rawZ,
    smoothedX,
    smoothedY,
    smoothedZ,
    normalizedX,
    normalizedY,
    normalizedZ,
    pca,
    peaks,
    label,
  }: EmailData) => {
    const to = ['christopherlotz97@gmail.com']; // Ziel-E-Mail-Adresse

    // Erstelle den E-Mail-Body mit den Daten
    const body = `
      Label: ${label}\n
      rawX: [${formatArray(rawX)}]\n
      rawY: [${formatArray(rawY)}]\n
      rawZ: [${formatArray(rawZ)}]\n
      smoothedX: [${formatArray(smoothedX)}]\n
      smoothedY: [${formatArray(smoothedY)}]\n
      smoothedZ: [${formatArray(smoothedZ)}]\n
      normalizedX: [${formatArray(normalizedX)}]\n
      normalizedY: [${formatArray(normalizedY)}]\n
      normalizedZ: [${formatArray(normalizedZ)}]\n
      PCA: [${formatArray(pca)}]\n
      Peaks: [${formatArray(peaks)}]
    `;

    // Sende die E-Mail
    email(to, {
      subject: 'Training Data',
      body: body,
      checkCanOpen: false,
    }).catch(console.error);
    console.log('email sent! ');
  };

  const predictLabel = async () => {
    const filteredYData = applySavitzkyGolayFilter(recordedData.accY, 9, 3);
    const filteredXData = applySavitzkyGolayFilter(recordedData.accX, 9, 3);
    const filteredZData = applySavitzkyGolayFilter(recordedData.accZ, 9, 3);
    const yDataMeanSubtracted = subtractMean(filteredYData);
    const zDataMeanSubtracted = subtractMean(filteredZData);
    const xDataMeanSubtracted = subtractMean(filteredXData);

    const avgJerk = calculateOverallJerk(
      filteredXData,
      filteredYData,
      filteredZData,
    );

    setJerk(avgJerk);
    console.log('Average Jerk for the entire exercise:', avgJerk);

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
        ? findPeaks(normalizedPC1, 7, 0, 0)
        : findPeaks(invertArray(normalizedPC1), 7, 0, 0);

    setPeaks(peaks);
    setPredReps(peaks.length - 1);

    // const segments = segmentReps(normalizedPC1, peaks);

    // Berechne die Gesamtähnlichkeit
    // const similarityScore = calculateOverallSimilarity(segments);
    // setQuality(similarityScore);

    // console.log('Overall Similarity:', similarityScore);

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

    const targetLength = 27; // Ziel-Länge nach Padding, z.B. 100
    const overallSimilarity = calculateOverallSimilarity(
      extractedData,
      targetLength,
    );
    setQuality(overallSimilarity);
    console.log('Overall Similarity:', overallSimilarity);

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
    const emailData: EmailData = {
      rawX: recordedData.accX,
      rawY: recordedData.accY,
      rawZ: recordedData.accZ,
      smoothedX: filteredXData,
      smoothedY: filteredYData,
      smoothedZ: filteredZData,
      normalizedX: xDataMeanSubtracted,
      normalizedY: yDataMeanSubtracted,
      normalizedZ: zDataMeanSubtracted,
      pca: normalizedPC1,
      peaks: peaks,
      label: finalLabel,
    };
    setEmailData(emailData);
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
        quality={quality}
        jerk={jerk}
        emailData={emailData}
        handleEmail={handleEmail}
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
