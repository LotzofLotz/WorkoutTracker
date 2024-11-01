// utils.ts

import * as numeric from 'numeric';
const {sgg} = require('ml-savitzky-golay-generalized');

// 1. Funktion zum Auffüllen oder Trunkieren einer Sequenz
export function padSequence(sequence: number[], maxLength: number): number[] {
  if (sequence.length >= maxLength) {
    return sequence.slice(0, maxLength);
  }
  return [...sequence, ...new Array(maxLength - sequence.length).fill(0)];
}

// 2. Funktion zum Anwenden des Savitzky-Golay-Filters
export const applySavitzkyGolayFilter = (
  data: number[],
  windowSize: number,
  polynomialOrder: number,
): number[] => {
  if (data.length < windowSize) {
    console.warn(
      'Data length is less than window size, reducing window size to match data length.',
    );
    windowSize = data.length; // Reduziere die Fenstergröße auf die Datenlänge
  }
  try {
    const options = {windowSize, polynomialOrder};
    return sgg(data, options);
  } catch (error) {
    console.error('Error applying Savitzky-Golay filter:', error);
    return data; // Rückgabe der ursprünglichen Daten im Fehlerfall
  }
};

// 3. Funktion zum Subtrahieren des Mittelwerts
export function subtractMean(data: number[]): number[] {
  const mean = numeric.sum(data) / data.length;
  return data.map(value => value - mean);
}

// 4. Funktion zur Normalisierung der Daten
export function normalizeToRange(data: number[]): number[] {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;

  if (range === 0) {
    return data.map(() => 0);
  }

  return data.map(value => (2 * (value - min)) / range - 1);
}

// 5. Funktion zum Invertieren eines Arrays
export function invertArray(data: number[]): number[] {
  return data.map(value => -value);
}

// 6. Funktion zur Vorbereitung der Daten für das Modell
export function prepareDataForModel(
  paddedRep: {
    accX: number[];
    accY: number[];
    accZ: number[];
    gyroX: number[];
    gyroY: number[];
    gyroZ: number[];
  },
  maxLength: number,
): number[] {
  const features: number[] = [];
  for (let i = 0; i < maxLength; i++) {
    const sensors = [
      paddedRep.accX[i],
      paddedRep.accY[i],
      paddedRep.accZ[i],
      paddedRep.gyroX[i],
      paddedRep.gyroY[i],
      paddedRep.gyroZ[i],
    ];

    if (sensors.some(sensor => typeof sensor !== 'number')) {
      console.error(`Invalid sensor data at index ${i}`);
      return []; // Rückgabe eines leeren Arrays bei ungültigen Daten
    }

    features.push(...sensors);
  }

  if (features.length !== maxLength * 6) {
    console.log('Feature length does not match expected length');
    return []; // Rückgabe eines leeren Arrays bei falscher Länge
  }

  return features;
}

// 7. Funktion zum Polstern der Wiederholungsdaten
export function padReps(
  rep: {
    accX: number[];
    accY: number[];
    accZ: number[];
    gyroX: number[];
    gyroY: number[];
    gyroZ: number[];
  },
  targetLength: number,
) {
  return {
    accX: padSequence(rep.accX, targetLength),
    accY: padSequence(rep.accY, targetLength),
    accZ: padSequence(rep.accZ, targetLength),
    gyroX: padSequence(rep.gyroX, targetLength),
    gyroY: padSequence(rep.gyroY, targetLength),
    gyroZ: padSequence(rep.gyroZ, targetLength),
  };
}

// 8. Funktion zur Berechnung der Korrelation
export function calculateCorrelation(arr1: number[], arr2: number[]): number {
  const n = arr1.length;
  const mean1 = numeric.sum(arr1) / n;
  const mean2 = numeric.sum(arr2) / n;

  const numerator = arr1.reduce(
    (sum, value, i) => sum + (value - mean1) * (arr2[i] - mean2),
    0,
  );
  const denominator = Math.sqrt(
    numeric.sum(arr1.map(value => Math.pow(value - mean1, 2))) *
      numeric.sum(arr2.map(value => Math.pow(value - mean2, 2))),
  );

  return denominator === 0 ? 0 : numerator / denominator;
}

// 9. Funktion zur Berechnung des durchschnittlichen Jerks
export function calculateOverallJerk(
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

  return totalJerk / jerkX.length;
}

// 10. Funktion zur Berechnung der Ableitung
export function calculateDerivative(data: number[]): number[] {
  const derivative: number[] = [];
  for (let i = 1; i < data.length; i++) {
    derivative.push(data[i] - data[i - 1]);
  }
  return derivative;
}

// 11. Funktion zur Berechnung der Gesamtähnlichkeit
export function calculateOverallSimilarity(
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

      const correlations = [
        calculateCorrelation(rep1.accX, rep2.accX),
        calculateCorrelation(rep1.accY, rep2.accY),
        calculateCorrelation(rep1.accZ, rep2.accZ),
        calculateCorrelation(rep1.gyroX, rep2.gyroX),
        calculateCorrelation(rep1.gyroY, rep2.gyroY),
        calculateCorrelation(rep1.gyroZ, rep2.gyroZ),
      ];

      const avgCorrelation =
        correlations.reduce((sum, corr) => sum + corr, 0) / correlations.length;

      totalCorrelation += avgCorrelation;
      count++;
    }
  }

  return count === 0 ? 0 : totalCorrelation / count;
}

// 12. Funktion zum Formatieren eines Arrays
export const formatArray = (arr: number[]): string => arr.join(', ');
