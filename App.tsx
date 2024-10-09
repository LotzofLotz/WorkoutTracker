import React, {useEffect, useState} from 'react';
import {TouchableOpacity, SafeAreaView, StyleSheet, Text} from 'react-native';
import {map} from 'rxjs/operators';
import TrackingModal from './components/TrackingModal';
const {sgg} = require('ml-savitzky-golay-generalized');
import {findPeaks} from './components/FindPeaks';
import * as numeric from 'numeric';
import {Matrix} from 'ml-matrix';
// Ändern Sie den Import von PCA, um den Standardexport zu verwenden
const {PCA} = require('ml-pca');
import email from 'react-native-email';
import useSensorData from './hooks/useSensorData';
import useTimer from './hooks/useTimer';
import useModel from './hooks/useModel';
import {
  padSequence,
  applySavitzkyGolayFilter,
  subtractMean,
  normalizeToRange,
  invertArray,
  prepareDataForModel,
  padReps,
  calculateCorrelation,
  calculateOverallJerk,
  calculateDerivative,
  calculateOverallSimilarity,
  formatArray,
} from './utils';

// Typendefinition für die Email-Datenstruktur
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

// Typendefinition für Vorhersagen des Modells
type Prediction = {
  label: string;
  probability: number;
};

const App = (): React.JSX.Element => {
  // Zustandsvariablen für die Modaleröffnung und Modellstatus
  const [trackingModalOpen, setTrackingModalOpen] = useState<boolean>(false);
  //const [model, setModel] = useState<any>(null); // TODO: Definiere einen spezifischen Typ für das Modell
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [predReps, setPredReps] = useState<number>(0);
  const [predLabel, setPredLabel] = useState<string>('');
  //const [isLoading, setIsLoading] = useState<boolean>(true);

  // Weitere Zustandsvariablen für die Zeitmessung, Peaks, Diagrammdaten usw.
  //const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [chartData, setChartData] = useState<number[]>([]);
  const [quality, setQuality] = useState<number>(0);
  const [jerk, setJerk] = useState<number>(0);

  // Zustandsvariable für die Email-Daten
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

  // Zustandsvariable für die Modellvorhersagen
  const [predictions, setPredictions] = useState<Prediction[]>([]);

  // Maximale Sequenzlänge für das Modell
  const maxLength = 29;

  // Klassennamen, die das Modell vorhersagt
  const classNames = ['PullUp', 'PushUp', 'SitUp', 'Squat'];

  const {model, isLoading} = useModel();
  const {recordedData, resetRecordedData} = useSensorData(isTracking);
  const {timeElapsed, resetTimeElapsed} = useTimer(isTracking);

  /**
   * Handhabt das Senden einer E-Mail mit den aufgezeichneten und verarbeiteten Daten.
   *
   * @param emailData - Die Daten, die in die E-Mail aufgenommen werden sollen.
   */
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
      Label: ${label}

      rawX: [${formatArray(rawX)}]
      rawY: [${formatArray(rawY)}]
      rawZ: [${formatArray(rawZ)}]
      smoothedX: [${formatArray(smoothedX)}]
      smoothedY: [${formatArray(smoothedY)}]
      smoothedZ: [${formatArray(smoothedZ)}]
      normalizedX: [${formatArray(normalizedX)}]
      normalizedY: [${formatArray(normalizedY)}]
      normalizedZ: [${formatArray(normalizedZ)}]
      PCA: [${formatArray(pca)}]
      Peaks: [${formatArray(peaks)}]
    `;

    // Sende die E-Mail
    email(to, {
      subject: 'Training Data',
      body: body,
      checkCanOpen: false,
    }).catch(console.error);
    console.log('Email sent!');
  };

  /**
   * Funktion zur Vorhersage des Labels basierend auf den aufgezeichneten Sensordaten.
   */
  const predictLabel = async () => {
    // if (!model) {
    //   console.log('Model is not loaded yet');
    //   return;
    // }
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
    // console.log('Average Jerk for the entire exercise:', avgJerk);

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
        ? findPeaks(normalizedPC1, 7, 0, -0.3)
        : findPeaks(invertArray(normalizedPC1), 7, 0, 0.3);

    setPeaks(peaks);
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
    // console.log('Overall Similarity:', overallSimilarity);

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

  return (
    <SafeAreaView style={styles.container}>
      <TrackingModal
        trackingModalOpen={trackingModalOpen}
        setTrackingModalOpen={setTrackingModalOpen}
        isTracking={isTracking}
        setIsTracking={setIsTracking}
        timeElapsed={timeElapsed}
        resetTimeElapsed={resetTimeElapsed}
        predLabel={predLabel}
        predReps={predReps}
        setPredReps={setPredReps}
        setPredLabel={setPredLabel}
        recordedData={recordedData}
        resetRecordedData={resetRecordedData}
        chartData={chartData}
        peaks={peaks}
        predictions={predictions}
        quality={quality}
        jerk={jerk}
        emailData={emailData}
        handleEmail={handleEmail}
        predict={predictLabel}
        isLoading={isLoading}
      />
      <TouchableOpacity
        onPress={() => setTrackingModalOpen(true)}
        style={styles.floatingButton}>
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// Stylesheet zur Gestaltung der Komponenten
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center', // Zentriere Inhalte vertikal
    alignItems: 'center', // Zentriere Inhalte horizontal
  },
  floatingButton: {
    position: 'absolute',
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#03A9F4',
    borderRadius: 38, // Halbe Breite/Höhe für kreisförmigen Button
    elevation: 8, // Schatten für Android
    shadowColor: '#000', // Schattenfarbe für iOS
    shadowOffset: {width: 0, height: 2}, // Schattenoffset für iOS
    shadowOpacity: 0.25, // Schattenopacity für iOS
    shadowRadius: 3.84, // Schattenradius für iOS
  },
  floatingButtonText: {
    fontSize: 50,
    color: 'white',
    lineHeight: 50, // Vertikale Zentrierung des Textes
  },
});

export default App;
