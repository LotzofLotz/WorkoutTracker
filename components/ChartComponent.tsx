import React from 'react';
import {View, Dimensions, ActivityIndicator, StyleSheet} from 'react-native';
import {LineChart} from 'react-native-chart-kit';
import {Svg, Line} from 'react-native-svg';
import Colors from './colors';

// Bestimme die Bildschirmbreite
const screenWidth = Dimensions.get('window').width;

// Maximale Anzahl von Labels auf der X-Achse
const MAX_LABELS = 10;

interface ChartComponentProps {
  peaks: number[];
  chartData: number[];
  timePerDataPoint?: number; // in Sekunden, Standardwert 0.1
  labelInterval?: number; // gewünschtes Label-Intervall in Sekunden, Standardwert 2
}

const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(0, 48, 73, ${opacity})`,
  fillShadowGradient: Colors.secondary,
  fillShadowGradientOpacity: 0.6,
  strokeWidth: 2,
  decimalPlaces: 1, // Eine Dezimalstelle für die Y-Achsen-Werte
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  labelFontSize: 10, // Reduzierte Schriftgröße
  propsForBackgroundLines: {
    strokeDasharray: '',
  },
};

interface CustomDecoratorProps {
  width: number;
  height: number;
}

const ChartComponent: React.FC<ChartComponentProps> = ({
  peaks,
  chartData,
  timePerDataPoint = 0.1,
  labelInterval = 2,
}) => {
  // Berechne den Schritt basierend auf dem gewünschten Label-Intervall
  const desiredStep = Math.ceil(labelInterval / timePerDataPoint);

  // Berechne den maximalen Schritt basierend auf MAX_LABELS
  const stepMax = Math.ceil(chartData.length / MAX_LABELS);

  // Finaler Schrittwert ist der größere der beiden
  const step = Math.max(desiredStep, stepMax);

  // Generiere die X-Achsen-Labels ohne Nachkommastellen
  const generateXLabels = (length: number): string[] => {
    const labels: string[] = [];
    for (let i = 0; i < length; i++) {
      if (i % step === 0) {
        const time = Math.round(i * timePerDataPoint); // Entferne Nachkommastellen
        labels.push(`${time}s`);
      } else {
        labels.push('');
      }
    }
    return labels;
  };

  const CustomDecorator: React.FC<CustomDecoratorProps> = ({width, height}) => {
    const yAxisOffset = 64; // Anpassung basierend auf Chart-Konfiguration

    return (
      <Svg style={styles.svg}>
        {peaks.map((peakIndex, idx) => {
          const validPeakIndex = Math.min(
            Math.max(peakIndex, 0),
            chartData.length - 1,
          );
          const x = (validPeakIndex / chartData.length) * (width - yAxisOffset);
          return (
            <Line
              key={`peak-${idx}`}
              x1={x + yAxisOffset}
              y1={10}
              x2={x + yAxisOffset}
              y2={height - 38}
              stroke={Colors.red}
              strokeWidth="2"
              strokeDasharray="4 2"
            />
          );
        })}
      </Svg>
    );
  };

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
              data: chartData.length > 0 ? chartData : [0],
              color: (opacity = 1) => `rgba(0, 48, 73, ${opacity})`,
              strokeWidth: 2,
              withDots: false,
            },
          ],
        }}
        width={screenWidth - 40} // Bildschirmbreite minus Padding
        height={200}
        yLabelsOffset={15} // Optional: Anpassung für bessere Lesbarkeit
        fromZero={false}
        chartConfig={chartConfig}
        bezier
        style={styles.chartStyle}
        withHorizontalLabels={true}
        withVerticalLabels={true}
        withHorizontalLines={true}
        withVerticalLines={true}
        withInnerLines={true}
        segments={4} // Y-Achse in 4 Segmente unterteilen
        formatYLabel={value => parseFloat(value).toFixed(1)} // Erzwingt 1 Dezimalstelle
        decorator={({width, height}) => (
          <CustomDecorator width={width} height={height} />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  chartStyle: {
    // Optional: Passe die Styles nach Bedarf an
  },
  container: {
    padding: 0,
    right: 10,
    width: '100%',
  },
  loaderContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  svg: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
});

export default ChartComponent;
