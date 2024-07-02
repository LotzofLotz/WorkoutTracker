function findLocalMaxima(data: number[]): number[] {
    const maxima: number[] = [];
    for (let i = 1; i < data.length - 1; i++) {
        if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
            maxima.push(i);
        }
    }
    return maxima;
}

function filterByHeight(indices: number[], data: number[], height: number): number[] {
    return indices.filter(i => data[i] > height);
}

function argsort(arr: number[]): number[] {
    return arr.map((v, i) => [v, i])
              .sort((a, b) => a[0] - b[0])
              .map(pair => pair[1]);
}

function filterByDistance(indices: number[], data: number[], dist: number): number[] {
    const toRemove = Array(indices.length).fill(false);
    const heights = indices.map(i => data[i]);
    const sortedIndexPositions = argsort(heights).reverse();

    for (let current of sortedIndexPositions) {
        if (toRemove[current]) continue;

        let neighbor = current - 1;
        while (neighbor >= 0 && (indices[current] - indices[neighbor]) < dist) {
            toRemove[neighbor] = true;
            neighbor--;
        }

        neighbor = current + 1;
        while (neighbor < indices.length && (indices[neighbor] - indices[current]) < dist) {
            toRemove[neighbor] = true;
            neighbor++;
        }
    }
    return indices.filter((v, i) => !toRemove[i]);
}

function calculateProminence(index: number, data: number[], maxima: number[]): number {
    const peakHeight = data[index];
    let leftMin = peakHeight;
    let rightMin = peakHeight;

    // Find the lowest point to the left of the peak
    for (let i = index - 1; i >= 0; i--) {
        if (maxima.includes(i)) break;
        leftMin = Math.min(leftMin, data[i]);
    }

    // Find the lowest point to the right of the peak
    for (let i = index + 1; i < data.length; i++) {
        if (maxima.includes(i)) break;
        rightMin = Math.min(rightMin, data[i]);
    }

    return peakHeight - Math.min(leftMin, rightMin);
}

function filterByProminence(indices: number[], data: number[], prominence: number): number[] {
    return indices.filter(i => calculateProminence(i, data, indices) >= prominence);
}

function filterMaxima(indices: number[], data: number[], distance?: number, height?: number, prominence?: number): number[] {
    let newIndices = indices;
    if (height !== undefined) {
        newIndices = filterByHeight(indices, data, height);
    }
    if (distance !== undefined) {
        newIndices = filterByDistance(newIndices, data, distance);
    }
    if (prominence !== undefined) {
        newIndices = filterByProminence(newIndices, data, prominence);
    }
    return newIndices;
}

export function findPeaks(data: number[], distance?: number, height?: number, prominence?: number): number[] {
    const indices = findLocalMaxima(data);
    return filterMaxima(indices, data, distance, height, prominence);
}