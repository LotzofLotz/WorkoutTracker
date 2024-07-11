import React, { useState , useEffect} from "react";
import { View, Dimensions, ActivityIndicator } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Svg, Circle } from 'react-native-svg';

const screenWidth = Dimensions.get("window").width;

const ChartComponent = ({ peaks,chartData }) => {


 
 

  const calculateMagnitude = (x, y, z) => {
    return x.map((_, index) => Math.sqrt(x[index] ** 2 + y[index] ** 2 + z[index] ** 2));
  };


const hidePointsAtIndex = Object.values(chartData)
    .map((_, index) => index)
    .filter(index => !peaks.includes(index));




  // const filteredChartData = showGyro ? applySavitzkyGolayFilter(chartData, 9, 2) : chartData;

  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    decimalPlaces: 2,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
   
  };

  if (chartData.length === 0 && peaks.length === 0 ) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={{ padding: 0, flex: 1 }}>
         <LineChart
        data={{
          datasets: [
            {
              data: Object.values(chartData),
              color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`, // optional
              strokeWidth: 2, // optional
              withDots: true, // Dots deaktiviert
            }
          ]
        }}
        width={screenWidth - 40} // from react-native
        height={220}
        chartConfig={chartConfig}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16
        }}
        hidePointsAtIndex={hidePointsAtIndex}
      />
    </View>
  );
};

export default ChartComponent;
