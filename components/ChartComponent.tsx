import React from 'react';
import {View, Dimensions, ActivityIndicator, StyleSheet} from 'react-native';
import {LineChart} from 'react-native-chart-kit';
import {Svg, Line} from 'react-native-svg';

// Bestimme die Bildschirmbreite
const screenWidth = Dimensions.get('window').width;

// Definiere die Props für die Komponente
interface ChartComponentProps {
  peaks: number[];
  chartData: number[];
}

// Definiere das ChartConfig-Objekt ohne Typimport
const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 2, // Standard Linienbreite
  decimalPlaces: 2, // Anzahl der Dezimalstellen
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForDots: {
    r: '2', // Größe der Punkte ändern
    strokeWidth: '4',
    stroke: '#ffa726',
  },
  propsForBackgroundLines: {
    strokeDasharray: '', // Entfernt gestrichelte Linien
  },
};

interface CustomDecoratorProps {
  width: number;
  height: number;
}

const ChartComponent: React.FC<ChartComponentProps> = ({peaks, chartData}) => {
  // Generiere X-Achsen-Labels dynamisch
  const generateXLabels = (length: number): string[] => {
    const numLabels = Math.floor(length / 10) || 1; // Verhindere Division durch Null
    const interval = Math.floor(length / numLabels);

    return Array.from({length}, (_, i) =>
      i % interval === 0 ? `${Math.floor(i / interval)}[s]` : '',
    );
  };

  // Definiere den CustomDecorator mit Typen
  const CustomDecorator: React.FC<CustomDecoratorProps> = ({width, height}) => {
    const yAxisOffset = 64; // Offset für die y-Achse

    return (
      <Svg style={styles.svg}>
        {/* Vertikale Linien für Peaks */}
        {peaks.map(peakIndex => {
          const x = (peakIndex / chartData.length) * (width - yAxisOffset);
          return (
            <Line
              key={peakIndex}
              x1={x + yAxisOffset}
              y1={10}
              x2={x + yAxisOffset}
              y2={height - 38}
              stroke="blue"
              strokeWidth="2"
              strokeDasharray="4 2" // Erzeugt eine gestrichelte Linie
            />
          );
        })}
      </Svg>
    );
  };

  // Zeige einen Ladeindikator, wenn keine Daten vorhanden sind
  if (chartData.length === 0 && peaks.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LineChart
        data={{
          labels: generateXLabels(chartData.length),
          datasets: [
            {
              data: chartData,
              color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
              strokeWidth: 2,
              withDots: false, // Deaktiviere Punkte, um Interferenzen zu vermeiden
            },
          ],
        }}
        width={screenWidth - 40} // Bildschirmbreite minus Padding
        height={220}
        yLabelsOffset={10}
        fromZero={false} // Setze fromZero auf false, um negative Werte zu erlauben
        chartConfig={chartConfig}
        bezier
        style={styles.chartStyle}
        withHorizontalLabels={true}
        withVerticalLabels={true}
        withHorizontalLines={true}
        withVerticalLines={true}
        withInnerLines={false}
        segments={4}
        xLabelsOffset={-5}
        decorator={({width, height}: {width: number; height: number}) => (
          <CustomDecorator width={width} height={height} />
        )}
      />
    </View>
  );
};

// Definiere die Styles
const styles = StyleSheet.create({
  container: {
    padding: 0,
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
    // zIndex: 1, // Optional: kann je nach Bedarf hinzugefügt werden
  },
});

export default ChartComponent;
