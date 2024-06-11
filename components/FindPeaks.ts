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

function filterMaxima(indices: number[], data: number[], distance?: number, height?: number): number[] {
    let newIndices = indices;
    if (height !== undefined) {
        newIndices = filterByHeight(indices, data, height);
    }
    if (distance !== undefined) {
        newIndices = filterByDistance(newIndices, data, distance);
    }
    return newIndices;
}

export function findPeaks(data: number[], distance?: number, height?: number): number[] {
    const indices = findLocalMaxima(data);
    return filterMaxima(indices, data, distance, height);
}