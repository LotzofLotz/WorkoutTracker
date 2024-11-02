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

    // Find peaks
    const detectedPeaks =
      normalizedPC1[0] > 0
        ? findPeaks(normalizedPC1, 7, 0, 0)
        : findPeaks(invertArray(normalizedPC1), 7, 0, 0);

    setPeaks(detectedPeaks);
    setPredReps(detectedPeaks.length - 1);

    // Extract segments between peaks
    const extractedData: Record<string, any> = {};
    for (let i = 0; i < detectedPeaks.length - 1; i++) {
      const start = detectedPeaks[i];
      const end = detectedPeaks[i + 1];

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
    const overallSimilarity = calculateOverallSimilarity(
      extractedData,
      maxLength,
    );
    setQuality(overallSimilarity);

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
    quality,
    jerk,
    emailData,
    predictions,
  };
};

export default usePrediction;
