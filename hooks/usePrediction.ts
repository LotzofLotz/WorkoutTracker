// hooks/usePrediction.ts
import {useState} from 'react';
import {
  applySavitzkyGolayFilter,
  subtractMean,
  normalizeToRange,
  invertArray,
  prepareDataForModel,
  padReps,
  calculateOverallJerk,
  calculateOverallSimilarity,
} from '../utils';
import {findPeaks} from '../components/FindPeaks';
import {Matrix} from 'ml-matrix';
import {PCA} from 'ml-pca';
import DynamicTimeWarping from 'dynamic-time-warping';

type Prediction = {
  label: string;
  probability: number;
};

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

interface UsePredictionProps {
  model: any;
  recordedData: {
    accX: number[];
    accY: number[];
    accZ: number[];
    gyroX: number[];
    gyroY: number[];
    gyroZ: number[];
  };
}

const usePrediction = ({model, recordedData}: UsePredictionProps) => {
  const [predReps, setPredReps] = useState<number>(0);
  const [predLabel, setPredLabel] = useState<string>('');
  const [peaks, setPeaks] = useState<number[]>([]);
  const [chartData, setChartData] = useState<number[]>([]);
  const [avgRepTime, setAvgRepTime] = useState<number>(0);
  const [avgFirstPartTime, setAvgFirstPartTime] = useState<number>(0);
  const [avgSecondPartTime, setAvgSecondPartTime] = useState<number>(0);
  const [quality, setQuality] = useState<number>(0);
  const [jerk, setJerk] = useState<number>(0);
  const [emailData, setEmailData] = useState<EmailData | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const maxLength = 29;
  const classNames = ['PullUp', 'PushUp', 'SitUp', 'Squat'];

  function findExtreme(data, start, end, type) {
    if (start >= end || start < 0 || end > data.length) {
      console.warn(
        `Ungültiger Bereich zum Suchen des ${type}: Start=${start}, End=${end}`,
      );
      return null;
    }

    let extremeIndex = start;
    let extremeValue = data[start];

    for (let i = start + 1; i < end; i++) {
      if (type === 'min' && data[i] < extremeValue) {
        extremeValue = data[i];
        extremeIndex = i;
      } else if (type === 'max' && data[i] > extremeValue) {
        extremeValue = data[i];
        extremeIndex = i;
      }
    }

    return extremeIndex;
  }
  function computeAverageRepetition(repetitions) {
    const maxLength = Math.max(...repetitions.map(rep => rep.length));

    // Padding der Wiederholungen auf gleiche Länge
    const paddedReps = repetitions.map(rep => {
      const padding = new Array(maxLength - rep.length).fill(
        rep[rep.length - 1],
      );
      return rep.concat(padding);
    });

    // Berechne den Durchschnittswert für jeden Datenpunkt
    const averageRep = [];
    for (let i = 0; i < maxLength; i++) {
      let sum = 0;
      for (const rep of paddedReps) {
        sum += rep[i];
      }
      averageRep.push(sum / repetitions.length);
    }

    return averageRep;
  }

  function calculateConsistencyWithAverageRep(repetitions) {
    const representativeRep = computeAverageRepetition(repetitions);

    let totalDistance = 0;

    for (let i = 0; i < repetitions.length; i++) {
      const dtwInstance = new DynamicTimeWarping(
        representativeRep,
        repetitions[i],
        (a, b) => Math.abs(a - b),
      );
      const distance = dtwInstance.getDistance();
      totalDistance += distance;
    }

    const averageDistance = totalDistance / repetitions.length;

    // Berechne den Konsistenzscore wie zuvor
    const minDistance = 0;
    const maxDistance = 5;

    const clampedDistance = Math.min(averageDistance, maxDistance);
    const consistencyScore =
      100 * (1 - (clampedDistance - minDistance) / (maxDistance - minDistance));

    return consistencyScore;
  }
  function calculateConsistencyDTW(repetitions) {
    if (repetitions.length < 2) {
      console.warn('Nicht genügend Wiederholungen für DTW-Berechnung.');
      return 0;
    }

    let totalDistance = 0;
    let count = 0;

    // Wähle die erste Wiederholung als Referenz
    const referenceRep = repetitions[0];

    const dtw = new DynamicTimeWarping();

    for (let i = 1; i < repetitions.length; i++) {
      const currentRep = repetitions[i];

      // Erstelle neue DTW-Instanz für jede Paarung
      const dtwInstance = new DynamicTimeWarping(
        referenceRep,
        currentRep,
        function (a, b) {
          return Math.abs(a - b);
        },
      );

      const distance = dtwInstance.getDistance();
      console.log(
        `DTW-Distanz zwischen Referenz und Wiederholung ${i}: ${distance}`,
      );
      totalDistance += distance;
      count++;
    }

    const averageDistance = totalDistance / count;
    // Konsistenzscore invertieren oder normalisieren
    const consistencyScore = 100 / (1 + averageDistance); // Beispiel

    return consistencyScore;
  }
  function calculateConsistencyDTWAllPairs(repetitions) {
    const n = repetitions.length;
    if (n < 2) {
      console.warn('Nicht genügend Wiederholungen für DTW-Berechnung.');
      return 0;
    }

    let totalDistance = 0;
    let count = 0;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dtwInstance = new DynamicTimeWarping(
          repetitions[i],
          repetitions[j],
          (a, b) => Math.abs(a - b),
        );
        const distance = dtwInstance.getDistance();
        totalDistance += distance;
        count++;
      }
    }

    const averageDistance = totalDistance / count;

    // Wähle geeignete minDistance und maxDistance basierend auf deinen Daten
    const minDistance = 0;
    const maxDistance = 5;

    const clampedDistance = Math.min(averageDistance, maxDistance);
    const consistencyScore =
      100 * (1 - (clampedDistance - minDistance) / (maxDistance - minDistance));

    return consistencyScore;
  }

  function analyzeReps(pcaData, peaks, sampleRate) {
    // Validierung der Eingaben
    if (!Array.isArray(peaks) || peaks.length < 2) {
      console.warn('Nicht genügend Peaks, um Wiederholungen zu analysieren.');
      return {
        averageRepDuration: 0,
        averageFirstPartDuration: 0,
        averageSecondPartDuration: 0,
      };
    }

    let totalRepDuration = 0;
    let totalFirstPartDuration = 0;
    let totalSecondPartDuration = 0;
    let validRepCount = 0;

    for (let i = 0; i < peaks.length - 1; i++) {
      const start = peaks[i];
      const end = peaks[i + 1];

      // Validierung der Peak-Paare
      if (end <= start) {
        console.warn(
          `Ungültige Peak-Paarung: Peak ${i} (${start}) ist nicht kleiner als Peak ${
            i + 1
          } (${end}).`,
        );
        continue;
      }

      // Bestimmung des Trennpunkts basierend auf dem ersten Wert der Wiederholung
      const firstValue = pcaData[start];
      let trennpunktIndex;

      if (firstValue > 0) {
        // Suche nach dem Minimum zwischen start und end
        trennpunktIndex = findExtreme(pcaData, start, end, 'min');
      } else {
        // Suche nach dem Maximum zwischen start und end
        trennpunktIndex = findExtreme(pcaData, start, end, 'max');
      }

      if (trennpunktIndex === null) {
        console.warn(
          `Kein gültiger Trennpunkt gefunden für Wiederholung zwischen Peak ${start} und Peak ${end}.`,
        );
        continue;
      }

      // Sicherstellen, dass der Trennpunkt innerhalb des Bereichs liegt
      if (trennpunktIndex <= start || trennpunktIndex >= end) {
        console.warn(
          `Trennpunkt ${trennpunktIndex} liegt außerhalb des gültigen Bereichs (${start}, ${end}).`,
        );
        continue;
      }

      // Berechnung der Gesamtdauer der Wiederholung in Sekunden
      const totalDifference = end - start;
      const totalDuration = totalDifference / sampleRate;

      // Berechnung der Dauer des ersten Teils (start bis trennpunkt) in Sekunden
      const firstDifference = trennpunktIndex - start;
      const firstDuration = firstDifference / sampleRate;

      // Berechnung der Dauer des zweiten Teils (trennpunkt bis end) in Sekunden
      const secondDifference = end - trennpunktIndex;
      const secondDuration = secondDifference / sampleRate;

      // Accumulieren der Dauern
      totalRepDuration += totalDuration;
      totalFirstPartDuration += firstDuration;
      totalSecondPartDuration += secondDuration;
      validRepCount++;
    }

    if (validRepCount === 0) {
      console.warn('Keine gültigen Wiederholungen gefunden.');
      return {
        averageRepDuration: 0,
        averageFirstPartDuration: 0,
        averageSecondPartDuration: 0,
      };
    }

    // Berechnung der Durchschnittswerte
    const averageRepDuration = totalRepDuration / validRepCount;
    const averageFirstPartDuration = totalFirstPartDuration / validRepCount;
    const averageSecondPartDuration = totalSecondPartDuration / validRepCount;

    return {
      averageRepDuration,
      averageFirstPartDuration,
      averageSecondPartDuration,
    };
  }

  const predictLabel = async () => {
    if (!model) {
      console.log('Model is not loaded yet');
      return;
    }

    // Preprocess data
    const filteredY = applySavitzkyGolayFilter(recordedData.accY, 9, 3);
    const filteredX = applySavitzkyGolayFilter(recordedData.accX, 9, 3);
    const filteredZ = applySavitzkyGolayFilter(recordedData.accZ, 9, 3);

    const yMeanSubtracted = subtractMean(filteredY);
    const xMeanSubtracted = subtractMean(filteredX);
    const zMeanSubtracted = subtractMean(filteredZ);

    // Calculate jerk
    const avgJerk = calculateOverallJerk(filteredX, filteredY, filteredZ);
    setJerk(avgJerk);

    // Prepare data matrix for PCA
    const dataMatrix = new Matrix(xMeanSubtracted.length, 3);
    for (let i = 0; i < xMeanSubtracted.length; i++) {
      dataMatrix.setRow(i, [
        xMeanSubtracted[i],
        yMeanSubtracted[i],
        zMeanSubtracted[i],
      ]);
    }

    // Apply PCA
    const pca = new PCA(dataMatrix);
    const transformedData = pca.predict(dataMatrix).to2DArray();

    // Extract first principal component
    const firstPC: number[] = transformedData.map(row => row[0]);

    // Normalize PCA data
    const normalizedPC1 = normalizeToRange(firstPC);
    setChartData(normalizedPC1);
    console.log('Normalized PC1:', normalizedPC1);

    // Find peaks
    const detectedPeaks =
      normalizedPC1[0] > 0
        ? findPeaks(normalizedPC1, 7, 0, 0)
        : findPeaks(invertArray(normalizedPC1), 7, 0, 0);

    console.log('Detected Peaks:', detectedPeaks);
    setPeaks(detectedPeaks);
    setPredReps(detectedPeaks.length - 1);

    const analysisResult = analyzeReps(normalizedPC1, detectedPeaks, 10);
    console.log(
      `Durchschnittliche Repetitionszeit: ${analysisResult.averageRepDuration.toFixed(
        2,
      )} Sekunden`,
    );
    console.log(
      `Durchschnittliche Dauer der ersten Phase: ${analysisResult.averageFirstPartDuration.toFixed(
        2,
      )} Sekunden`,
    );
    console.log(
      `Durchschnittliche Dauer der zweiten Phase: ${analysisResult.averageSecondPartDuration.toFixed(
        2,
      )} Sekunden`,
    );
    setAvgRepTime(analysisResult.averageRepDuration);
    setAvgFirstPartTime(analysisResult.averageFirstPartDuration);
    setAvgSecondPartTime(analysisResult.averageSecondPartDuration);

    // Extract segments between peaks
    const repetitions = [];

    const extractedData: Record<string, any> = {};
    for (let i = 0; i < detectedPeaks.length - 1; i++) {
      const start = detectedPeaks[i];
      const end = detectedPeaks[i + 1];
      const repPC1 = normalizedPC1.slice(start, end);
      repetitions.push(repPC1);
      extractedData[`Rep${i + 1}`] = {
        accX: recordedData.accX.slice(start, end),
        accY: recordedData.accY.slice(start, end),
        accZ: recordedData.accZ.slice(start, end),
        gyroX: recordedData.gyroX.slice(start, end),
        gyroY: recordedData.gyroY.slice(start, end),
        gyroZ: recordedData.gyroZ.slice(start, end),
      };
    }

    // Calculate overall similarity
    // const overallSimilarity = calculateOverallSimilarity(
    //   extractedData,
    //   maxLength,
    // );
    // setQuality(overallSimilarity);
    // const overallConsistency = calculateConsistencyDTWAllPairs(repetitions);
    // console.log('Overall Consistency pairs:', overallConsistency);
    // const overallConsistency2 = calculateConsistencyDTW(repetitions);
    // console.log('Overall Consistency:', overallConsistency2);
    const overallConsistency3 = calculateConsistencyWithAverageRep(repetitions);
    console.log(
      'Overall Consistency with Representative:',
      overallConsistency3,
    );
    setQuality(overallConsistency3);

    // Make predictions
    const predictionsArray: Prediction[] = [];
    for (let i = 1; i <= 3; i++) {
      const rep = extractedData[`Rep${i}`];
      if (!rep) {
        console.error(`No data for Rep${i}`);
        continue;
      }

      const paddedRep = padReps(rep, maxLength);
      const preparedData = prepareDataForModel(paddedRep, maxLength);
      if (preparedData.length === 0) continue;

      const floatArray = new Float32Array(preparedData);

      try {
        const output = await model.run([floatArray]);
        const outputArray = output[0] as number[];
        const maxIndex = outputArray.indexOf(Math.max(...outputArray));

        predictionsArray.push({
          label: classNames[maxIndex],
          probability: outputArray[maxIndex],
        });
      } catch (error) {
        console.error(`Error during prediction for Rep${i}:`, error);
      }
    }

    setPredictions(predictionsArray);

    // Determine final label
    let finalLabel: string;
    if (
      predictionsArray[0] &&
      predictionsArray[1] &&
      predictionsArray[0].label === predictionsArray[1].label
    ) {
      finalLabel = predictionsArray[0].label;
    } else {
      const votes: {[key: string]: number} = {};
      predictionsArray.forEach(pred => {
        votes[pred.label] = (votes[pred.label] || 0) + 1;
      });
      finalLabel = Object.keys(votes).reduce((a, b) =>
        votes[a] > votes[b] ? a : b,
      );
    }

    setPredLabel(finalLabel);

    // Set email data
    const emailPayload: EmailData = {
      rawX: recordedData.accX,
      rawY: recordedData.accY,
      rawZ: recordedData.accZ,
      smoothedX: filteredX,
      smoothedY: filteredY,
      smoothedZ: filteredZ,
      normalizedX: xMeanSubtracted,
      normalizedY: yMeanSubtracted,
      normalizedZ: zMeanSubtracted,
      pca: normalizedPC1,
      peaks: detectedPeaks,
      label: finalLabel,
    };
    setEmailData(emailPayload);
  };

  return {
    predictLabel,
    predReps,
    predLabel,
    peaks,
    chartData,
    avgFirstPartTime,
    avgRepTime,
    avgSecondPartTime,
    quality,
    jerk,
    emailData,
    predictions,
  };
};

export default usePrediction;
