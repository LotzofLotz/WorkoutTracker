import React from "react";
import { View, TouchableOpacity, Text, Button, Alert } from "react-native";
import Modal from "react-native-modal";
import ChartComponent from "./ChartComponent";


const TrackingModal = ({
  trackingModalOpen,
  setTrackingModalOpen,
  isTracking,
  setIsTracking,
  timeElapsed, 
  setTimeElapsed,
  setAccData,
  setGyroData,
  predict,
  predLabel,
  predReps,
  setPredLabel,
  setPredReps,
  setRecordedData, 
  chartData, 
  peaks
}) => {

  const Items = Array.from(Array(50).keys());

  const handleStartStop = () => {
    if (isTracking) {
      predict();
     // onClose()
    }
    setIsTracking(prevIsTracking => !prevIsTracking);
  };

  const onClose = ()=> {
    console.log("RESETTING EVERXXTHING")
    setTrackingModalOpen(false),
    setIsTracking(false)
    setGyroData([]),
    setTimeElapsed(0),
    setAccData([]),
    setPredLabel(""),
    setPredReps(0),
    setRecordedData({
      accX: [],
      accY: [],
      accZ: [],
      gyroX: [],
      gyroY: [],
      gyroZ: [],
    });
  }


  return (
    <Modal // Tracking Modal zum Starten und Stoppen der Datenerfassung
      onBackButtonPress={() => {
        onClose()
      }}
      style={{ alignItems: "center" }}
      isVisible={trackingModalOpen}
      animationIn="slideInUp"
      backdropColor={"#132224"}
      animationOut="slideOutDown"
      onDismiss={() => {
      onClose()
      }}
      onRequestClose={() => {
        onClose()
      }}
    >
      <View
        style={{
          backgroundColor: "white",
          margin: "4%",
          padding: "4%",
          borderRadius: 10,
          width: "100%",
          minHeight: "60%",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => handleStartStop()}
          style={{
            width: 100,
            height: 100,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "red",
            borderRadius: 20,
          }}
        >
          <Text style={{ fontSize: 28, color: "white" }}>
            {isTracking ? "STOP" : "START"}{" "}
          </Text>
        </TouchableOpacity>
        <Text style={{color:"black"}}>Zeit: {timeElapsed} in Sekunden</Text> 
        {!isTracking && timeElapsed != 0 ? (
          <View
            style={{
              flex: 1,
              width: "100%",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View style={{flex:1, justifyContent:"center", alignItems:"center"}}>
            <ChartComponent chartData={chartData} peaks={peaks}/>
            </View>
            <Text style={{color:"black", fontSize:25}}>MY PREDICTIONS:</Text>
            <Text style={{color:"black", fontSize:25}}>LABEL: {predLabel}</Text>
            <Text style={{color:"black", fontSize:25}}>REPS: {predReps}</Text>
            <View style={{ width: 150 }}>
              <Button title="SAVE" onPress={() => {onClose()}} color="blue" />
            </View>
          </View>
        ) : (
          <View />
        )}
        
      </View>
    </Modal>
  );
};

export default TrackingModal;