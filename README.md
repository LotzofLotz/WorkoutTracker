## 🎯 **Key Features**
- 📱 **Smartphone-Based Exercise Tracking** – No need for external wearables.
- 🏋️ **Detection of 4 Exercises** – Recognizes **Push-Ups, Pull-Ups, Squats, and Sit-Ups**.
- 🔄 **Repetition Counting** – Real-time counting using peak detection.
- 🎭 **Deep Learning Model** – **CNN-based** classifier with **99% accuracy**.
- ⚡ **Optimized for On-Device Processing** – Lightweight TFLite model for real-time use.
- 📊 **Workout Tracking & History** – Stores previous workout data for progress monitoring.
- 🏆 **Workout Quality Scoring** – Evaluates consistency, control, explosiveness, stamina, and power.

## 🏗 **Technical Details**
- **Sensor Data:** The app collects **accelerometer data** from a smartphone worn on the **upper arm**.
- **Preprocessing:** The raw data undergoes **smoothing, normalization, and PCA transformation**.
- **Peak Detection:** A **custom peak detection algorithm** identifies repetitions.
- **Deep Learning:** The model is a **Convolutional Neural Network (CNN)** trained to classify exercise types.
- **Model Deployment:** The trained model is converted to **TFLite** for real-time smartphone inference.

## 🚀 **How It Works**
1. **Start Workout**: The user presses "Start" to begin a set.
2. **Sensor Recording**: The app collects **accelerometer data** during movement.
3. **Repetition Detection**: A peak detection algorithm segments the repetitions.
4. **Exercise Classification**: The CNN model predicts the **exercise type**.
5. **Results & Feedback**:
   - The user gets **repetition count & detected exercise**.
   - The **workout quality score** provides feedback on form and performance.
6. **Data Storage**: The set is saved for **progress tracking**
