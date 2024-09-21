import React from 'react';
import {View, Dimensions, ActivityIndicator, Text} from 'react-native';
import {LineChart} from 'react-native-chart-kit';
import {Svg, Line} from 'react-native-svg';

const screenWidth = Dimensions.get('window').width;

const ChartComponent = ({peaks, chartData}) => {
  console.log(Object.values(chartData));
  console.log(Object.values(chartData).length);
  // const hidePointsAtIndex = Object.values(chartData)
  //   .map((_, index) => index)
  //   .filter(index => !peaks.includes(index));

  const chartConfig = {
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    decimalPlaces: 2,
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

  const CustomDecorator = ({width, height}) => {
    const yZeroPosition = height / 2.2; // Adjust to ensure horizontal line at y=0
    const yAxisOffset = 64;
    return (
      <Svg style={{zIndex: 1}}>
        {/* Horizontal line at y = 0 */}
        <Line
          x1={yAxisOffset}
          y1={yZeroPosition}
          x2={width}
          y2={yZeroPosition}
          opacity={0.4}
          stroke="red"
          strokeWidth="2"
        />
        {/* Add Y-axis label "[g]" */}
        {/* <Text
          x={15}
          y={height / 2}
          fill="black"
          fontSize="16"
          textAnchor="middle">
          [g]
        </Text>
        Add X-axis label "[s]"  
        <Text
          zIndex={100}
          x={100}
          y={100}
          fill="black"
          fontSize="16"
          textAnchor="middle">
          [s]hallo aminaheum
        </Text> */}
        {peaks.map(peakIndex => {
          const x = (peakIndex / chartData.length) * (width - yAxisOffset);
          return (
            <Line
              key={peakIndex}
              x1={x + yAxisOffset}
              y1="10"
              x2={x + yAxisOffset}
              y2={height - 38}
              stroke="blue"
              strokeWidth="2"
              strokeDasharray="4 2" // Creates a dashed line (adjust for desired dash style)
            />
          );
        })}
      </Svg>
    );
  };

  const generateXLabels = length => {
    const numLabels = Math.floor(length / 10); // Dynamically determine the number of labels
    const interval = Math.floor(length / numLabels);

    // Ensure labels are rounded to integers for simplicity
    return Array.from({length}, (_, i) =>
      i % interval === 0 ? `${Math.floor(i / interval)}[s]` : '',
    );
  };
  console.log(generateXLabels(Object.values(chartData).length));

  if (chartData.length === 0 && peaks.length === 0) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={{padding: 0, flex: 1}}>
      <LineChart
        data={{
          labels: generateXLabels(Object.values(chartData).length),
          datasets: [
            {
              data: Object.values(chartData),
              color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
              strokeWidth: 2,
              withDots: false, // Disable dots to avoid interference
            },
          ],
        }}
        width={screenWidth - 40}
        height={220}
        yLabelsOffset={10}
        fromZero={true}
        chartConfig={chartConfig}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        withHorizontalLabels={true}
        withVerticalLabels={true}
        withHorizontalLines={true}
        withVerticalLines={true}
        withInnerLines={false}
        segments={4}
        xLabelsOffset={-5}
        decorator={({width, height}) => (
          <CustomDecorator width={width} height={height} />
        )}
      />
    </View>
  );
};

export default ChartComponent;
