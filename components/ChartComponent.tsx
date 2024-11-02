import React from 'react';
import {View, Dimensions, ActivityIndicator, StyleSheet} from 'react-native';
import {LineChart} from 'react-native-chart-kit';
import {Svg, Line} from 'react-native-svg';
import Colors from './colors';

// Bestimme die Bildschirmbreite
const screenWidth = Dimensions.get('window').width;

interface ChartComponentProps {
  peaks: number[];
  chartData: number[];
}

const chartConfig = {
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  color: (opacity = 1) => `rgba(0, 48, 73, ${opacity})`,
  fillShadowGradient: Colors.secondary,
  fillShadowGradientOpacity: 0.6,
  strokeWidth: 2,
  decimalPlaces: 1,
  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  propsForBackgroundLines: {
    strokeDasharray: '',
  },
};

interface CustomDecoratorProps {
  width: number;
  height: number;
}

const ChartComponent: React.FC<ChartComponentProps> = ({peaks, chartData}) => {
  const generateXLabels = (length: number): string[] => {
    const labels: string[] = [];
    for (let i = 0; i < length; i++) {
      if (i % 10 === 0) {
        labels.push(`${i / 10}s`);
      } else {
        labels.push('');
      }
    }
    return labels;
  };

  const CustomDecorator: React.FC<CustomDecoratorProps> = ({width, height}) => {
    const yAxisOffset = 64;

    return (
      <Svg style={styles.svg}>
        {peaks.map(peakIndex => {
          const x = (peakIndex / chartData.length) * (width - yAxisOffset);
          return (
            <Line
              key={peakIndex}
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
              data: chartData,
              color: (opacity = 1) => `rgba(0, 48, 73, ${opacity})`, // Colors.primary
              strokeWidth: 2,
              withDots: false,
            },
          ],
        }}
        width={screenWidth - 40}
        height={220}
        yLabelsOffset={10}
        fromZero={false}
        chartConfig={chartConfig}
        bezier
        style={styles.chartStyle}
        withHorizontalLabels={true}
        withVerticalLabels={true}
        withHorizontalLines={true}
        withVerticalLines={true}
        withInnerLines={true}
        segments={4}
        xLabelsOffset={-5}
        decorator={({width, height}: {width: number; height: number}) => (
          <CustomDecorator width={width} height={height} />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  chartStyle: {
    borderRadius: 16,
    marginVertical: 8,
  },
  container: {
    padding: 0,

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
