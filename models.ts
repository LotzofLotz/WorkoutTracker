export interface MLModel {
  run(inputs: Float32Array[]): Promise<number[][]>;
}
