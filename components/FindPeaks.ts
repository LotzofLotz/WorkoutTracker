// utils/findPeaks.ts

/**
 * Finds the indices of local maxima in the data array.
 * A local maximum is a point that is greater than its immediate neighbors.
 *
 * @param data - Array of numerical data points.
 * @returns Array of indices where local maxima occur.
 */
function findLocalMaxima(data: number[]): number[] {
  const maxima: number[] = [];
  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
      maxima.push(i);
    }
  }
  return maxima;
}

/**
 * Filters indices based on a minimum height threshold.
 *
 * @param indices - Array of peak indices.
 * @param data - Array of numerical data points.
 * @param height - Minimum height a peak must have to be retained.
 * @returns Filtered array of indices meeting the height criteria.
 */
function filterByHeight(
  indices: number[],
  data: number[],
  height: number,
): number[] {
  return indices.filter(i => data[i] > height);
}

/**
 * Returns the indices that would sort the array.
 *
 * @param arr - Array of numerical values.
 * @returns Array of indices sorted based on the corresponding values in arr.
 */
function argsort(arr: number[]): number[] {
  return arr
    .map((value, index) => [value, index] as [number, number])
    .sort((a, b) => b[0] - a[0]) // Sort in descending order
    .map(pair => pair[1]);
}

/**
 * Filters peaks based on a minimum distance between them.
 *
 * @param indices - Array of peak indices.
 * @param data - Array of numerical data points.
 * @param distance - Minimum required distance between peaks.
 * @returns Filtered array of indices meeting the distance criteria.
 */
function filterByDistance(
  indices: number[],
  data: number[],
  distance: number,
): number[] {
  const toRemove = Array(indices.length).fill(false);
  const heights = indices.map(i => data[i]);
  const sortedIndices = argsort(heights);

  sortedIndices.forEach(current => {
    if (toRemove[current]) return;

    let neighbor = current - 1;
    while (
      neighbor >= 0 &&
      Math.abs(indices[current] - indices[neighbor]) < distance
    ) {
      toRemove[neighbor] = true;
      neighbor--;
    }

    neighbor = current + 1;
    while (
      neighbor < indices.length &&
      Math.abs(indices[neighbor] - indices[current]) < distance
    ) {
      toRemove[neighbor] = true;
      neighbor++;
    }
  });

  return indices.filter((_, i) => !toRemove[i]);
}

/**
 * Checks if there is a significant minimum between two peaks.
 *
 * @param leftIndex - Index of the left peak.
 * @param rightIndex - Index of the right peak.
 * @param data - Array of numerical data points.
 * @param height - Minimum height for a point to be considered significant.
 * @returns True if a significant minimum exists between the peaks, else false.
 */
function hasSignificantMinimum(
  leftIndex: number,
  rightIndex: number,
  data: number[],
  height: number,
): boolean {
  for (let i = leftIndex + 1; i < rightIndex; i++) {
    if (data[i] < height) {
      return true;
    }
  }
  return false;
}

/**
 * Filters peaks by ensuring there is a significant minimum between consecutive peaks.
 *
 * @param indices - Array of peak indices.
 * @param data - Array of numerical data points.
 * @param height - Minimum height for the significant minimum.
 * @returns Filtered array of indices meeting the minimum criteria.
 */
function filterByMinimumBetweenMaxima(
  indices: number[],
  data: number[],
  height: number,
): number[] {
  const filteredIndices: number[] = [];
  for (let i = 0; i < indices.length - 1; i++) {
    if (hasSignificantMinimum(indices[i], indices[i + 1], data, height)) {
      filteredIndices.push(indices[i]);
    }
  }
  if (indices.length > 0) {
    filteredIndices.push(indices[indices.length - 1]);
  }
  return filteredIndices;
}

/**
 * Applies multiple filtering criteria to the peak indices.
 *
 * @param indices - Array of peak indices.
 * @param data - Array of numerical data points.
 * @param distance - Minimum required distance between peaks.
 * @param height - Minimum height a peak must have to be retained.
 * @param minBetweenMaximaHeight - Minimum height for significant minima between peaks.
 * @returns Filtered array of peak indices.
 */
function filterMaxima(
  indices: number[],
  data: number[],
  distance?: number,
  height?: number,
  minBetweenMaximaHeight?: number,
): number[] {
  let newIndices = indices;
  if (height !== undefined) {
    newIndices = filterByHeight(newIndices, data, height);
  }
  if (distance !== undefined) {
    newIndices = filterByDistance(newIndices, data, distance);
  }
  if (minBetweenMaximaHeight !== undefined) {
    newIndices = filterByMinimumBetweenMaxima(
      newIndices,
      data,
      minBetweenMaximaHeight,
    );
  }
  return newIndices;
}

/**
 * Finds peaks in the data array based on optional filtering criteria.
 *
 * @param data - Array of numerical data points.
 * @param distance - (Optional) Minimum required distance between peaks.
 * @param height - (Optional) Minimum height a peak must have to be retained.
 * @param prominence - (Optional) Not implemented.
 * @returns Array of indices where peaks occur.
 */
// export function findPeaks(
//   data: number[],
//   distance?: number,
//   height?: number,
//   prominence?: number,
// ): number[] {
//   const indices = findLocalMaxima(data);
//   return filterMaxima(indices, data, distance, height, prominence);
// }
export function findPeaks(
  data: number[],
  distance?: number,
  height?: number,
  prominence?: number,
): number[] {
  let indices = findLocalMaxima(data);
  indices = filterMaxima(indices, data, distance, height, prominence);

  // Neue Bedingung hinzufügen
  // Wenn der erste Peak-Index größer als 7 ist, prüfen wir die ersten 7 Datenpunkte
  if (indices.length > 0 && indices[0] > 7) {
    const numPointsToCheck = 7; // Anzahl der zu prüfenden Datenpunkte
    let significantDifferenceFound = false;

    // Prüfen, ob die Differenz zwischen zwei beliebigen Punkten größer als 1 ist
    for (let i = 0; i < numPointsToCheck; i++) {
      for (let j = i + 1; j < numPointsToCheck; j++) {
        if (Math.abs(data[i] - data[j]) > 1) {
          significantDifferenceFound = true;
          break;
        }
      }
      if (significantDifferenceFound) {
        break;
      }
    }

    // Wenn eine signifikante Differenz gefunden wurde, fügen wir den Index 0 hinzu
    if (significantDifferenceFound) {
      indices.unshift(0); // Index 0 am Anfang des Arrays einfügen
    }
  }
  if (indices.length > 0 && data.length - indices[indices.length - 1] > 7) {
    const numPointsToCheck = 7;
    const startIdx = data.length - numPointsToCheck;
    let significantDifferenceFound = false;

    for (let i = startIdx; i < data.length; i++) {
      for (let j = i + 1; j < data.length; j++) {
        if (Math.abs(data[i] - data[j]) > 1) {
          significantDifferenceFound = true;
          break;
        }
      }
      if (significantDifferenceFound) {
        break;
      }
    }

    if (significantDifferenceFound) {
      indices.push(data.length - 1);
    }
  }

  return indices;
}
