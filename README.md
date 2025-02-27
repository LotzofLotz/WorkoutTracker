This project explores the use of **deep learning and smartphone sensors** (accelerometer) for real-time detection and repetition counting of **bodyweight exercises** directly on a smartphone. The developed model is optimized for **on-device inference** using **TensorFlow Lite (TFLite)**. The app is capable of accurately counting, recognizing and automatically tracking bodyweight exercises.  

## 🎯 **Key Features**
- 📱 **Smartphone-Based Exercise Tracking** – No need for external wearables.
- 🏋️ **Detection of 4 Exercises** – Recognizes **Push-Ups, Pull-Ups, Squats, and Sit-Ups**.
- 🔄 **Repetition Counting** – Real-time counting using peak detection.
- 🎭 **Deep Learning Model** – **CNN-based** classifier with **99% accuracy**.
- ⚡ **Optimized for On-Device Processing** – Lightweight TFLite model for real-time use.
- 📊 **Workout Tracking & History** – Stores previous workout data for progress monitoring.
- 🏆 **Workout Quality Scoring** – Evaluates consistency, control, explosiveness, stamina, and power.

## 📷 **Screenshots**

<p align="center">
  <img src="https://github.com/user-attachments/assets/08074db6-5b08-4d83-98a4-c67a034fc3eb" width="20%">
  <img src="https://github.com/user-attachments/assets/89775498-5c81-42d4-bebb-d93eda834e6f" width="20%">
  <img src="https://github.com/user-attachments/assets/8e997d91-cc5b-4c55-a06d-5ac97fec704d" width="20%">
</p>


## 🏗 **Technical Details**
- **Sensor Data:** The app collects **accelerometer data** from a smartphone worn on the **upper arm**.
- **Preprocessing:** The raw data undergoes **smoothing, normalization, and PCA transformation**.
- **Peak Detection:** A **custom peak detection algorithm** identifies repetitions.
- **Deep Learning:** The model is a **Convolutional Neural Network (CNN)** trained to classify exercise types.
- **Model Deployment:** The trained model is converted to **TFLite** for real-time smartphone inference.

## 🚀 **How It Works**
1. **Start Workout**: The user presses "Start" to begin a set and performs the exercise.
2. **Sensor Recording**: The app collects **accelerometer data** during movement.
3. **Repetition Detection**: A peak detection algorithm segments the repetitions.
4. **Exercise Classification**: The CNN model predicts the **exercise type**.
5. **Results & Feedback**:
   - The user gets **repetition count & detected exercise**.
   - The **workout quality score** provides feedback on form and performance.
6. **Data Storage**: The set is saved for **progress tracking**
