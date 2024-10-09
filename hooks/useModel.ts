import {useEffect, useState} from 'react';
import {loadTensorflowModel} from 'react-native-fast-tflite';

const useModel = () => {
  const [model, setModel] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadModel = async () => {
      try {
        const loadedModel = await loadTensorflowModel(
          require('../android/app/src/main/assets/modelShort.tflite'),
        );
        setModel(loadedModel);
        console.log('Model loaded successfully');
      } catch (error) {
        console.error('Error loading model:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadModel();
  }, []);

  return {model, isLoading};
};

export default useModel;
