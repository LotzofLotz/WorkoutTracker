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
  const [quality, setQuality] = useState<number>(0);
  const [jerk, setJerk] = useState<number>(0);
  const [emailData, setEmailData] = useState<EmailData | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  const maxLength = 29;
  const classNames = ['PullUp', 'PushUp', 'SitUp', 'Squat'];

  const predictLabel = async () => {
    if (!model) {
      console.log('Model is not loaded yet');
      return;
    }

    // Daten vorverarbeiten: Glätten und Mittelwert subtrahieren
    const filteredYData = applySavitzkyGolayFilter(recordedData.accY, 9, 3);
    const filteredXData = applySavitzkyGolayFilter(recordedData.accX, 9, 3);
    const filteredZData = applySavitzkyGolayFilter(recordedData.accZ, 9, 3);

    const yDataMeanSubtracted = subtractMean(filteredYData);
    const zDataMeanSubtracted = subtractMean(filteredZData);
    const xDataMeanSubtracted = subtractMean(filteredXData);

    // Jerk berechnen
    const avgJerk = calculateOverallJerk(
      filteredXData,
      filteredYData,
      filteredZData,
    );
    setJerk(avgJerk);

    // Erstelle eine Datenmatrix für PCA
    const dataMatrix = new Matrix(xDataMeanSubtracted.length, 3);
    for (let i = 0; i < xDataMeanSubtracted.length; i++) {
      dataMatrix.setRow(i, [
        xDataMeanSubtracted[i],
        yDataMeanSubtracted[i],
        zDataMeanSubtracted[i],
      ]);
    }

    // PCA anwenden
    const pca = new PCA(dataMatrix);
    const transformedData = pca.predict(dataMatrix).to2DArray();

    // Erste Hauptkomponente extrahieren
    const firstPrincipalComponent: number[] = transformedData.map(
      (row: number[]) => row[0],
    );

    // Normalisieren der ersten Hauptkomponente
    const normalizedPC1 = normalizeToRange(firstPrincipalComponent);
    setChartData(normalizedPC1);

    // Peaks finden
    const peaks =
      normalizedPC1[0] > 0
        ? findPeaks(normalizedPC1, 7, 0, 0)
        : findPeaks(invertArray(normalizedPC1), 7, 0, 0);

    setPeaks(peaks);
    console.log('PEAKS:', peaks);
    setPredReps(peaks.length - 1);

    // Extrahiere Datensegmente zwischen Peaks
    const extractedData: Record<string, any> = {};
    for (let i = 0; i < peaks.length - 1; i++) {
      const start = peaks[i];
      const end = peaks[i + 1];

      const segmentAccX = recordedData.accX.slice(start, end);
      const segmentAccY = recordedData.accY.slice(start, end);
      const segmentAccZ = recordedData.accZ.slice(start, end);
      const segmentGyroX = recordedData.gyroX.slice(start, end);
      const segmentGyroY = recordedData.gyroY.slice(start, end);
      const segmentGyroZ = recordedData.gyroZ.slice(start, end);

      extractedData[`Rep${i + 1}`] = {
        accX: segmentAccX,
        accY: segmentAccY,
        accZ: segmentAccZ,
        gyroX: segmentGyroX,
        gyroY: segmentGyroY,
        gyroZ: segmentGyroZ,
      };
    }

    // Berechne die Gesamtähnlichkeit zwischen den Wiederholungen
    const targetLength = 27; // Ziel-Länge nach Padding
    const overallSimilarity = calculateOverallSimilarity(
      extractedData,
      targetLength,
    );
    setQuality(overallSimilarity);

    // Modellvorhersagen durchführen
    const predictionsArray: Prediction[] = [];
    for (let i = 1; i <= 3; i++) {
      // Annahme: Wir analysieren die ersten 3 Wiederholungen
      const rep = extractedData[`Rep${i}`];
      if (!rep) {
        console.error(`No data in extractedData for Rep${i}`);
        continue;
      }

      // Daten polstern
      const paddedRep = padReps(rep, maxLength);
      const preparedData = prepareDataForModel(paddedRep, maxLength);
      if (preparedData.length === 0) {
        continue;
      }

      // Daten in Float32Array umwandeln
      const floatArray = new Float32Array(preparedData);

      try {
        // Modell ausführen
        const output = await model.run([floatArray]);
        const outputArray = output[0] as number[];
        console.log('output array:', outputArray);

        // Bestimme das maximale Ergebnis
        const maxIndex = outputArray.indexOf(Math.max(...outputArray));
        console.log(`Rep${i} maxIndex:`, maxIndex);

        predictionsArray.push({
          label: classNames[maxIndex],
          probability: outputArray[maxIndex],
        });
      } catch (error) {
        console.error(`Error during model prediction for Rep${i}:`, error);
      }
    }

    setPredictions(predictionsArray);

    // Bestimme das finale Label basierend auf den Vorhersagen
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
        if (!votes[pred.label]) votes[pred.label] = 0;
        votes[pred.label]++;
      });
      finalLabel = Object.keys(votes).reduce((a, b) =>
        votes[a] > votes[b] ? a : b,
      );
    }

    setPredLabel(finalLabel);

    // Setze die Email-Daten
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

  return {
    predictLabel,
    predReps,
    predLabel,
    peaks,
    chartData,
    quality,
    jerk,
    emailData,
    predictions,
  };
};

export default usePrediction;
