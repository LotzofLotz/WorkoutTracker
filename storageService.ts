// storageService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WorkoutSet {
  timestamp: string; // ISO-String
  label: string;
  repetitions: number;
}

const WORKOUT_SETS_KEY = 'workout_sets';

// Funktion zum Abrufen aller Sets
export const getWorkoutSets = async (): Promise<WorkoutSet[]> => {
  try {
    const setsJSON = await AsyncStorage.getItem(WORKOUT_SETS_KEY);
    //console.log('sets', setsJSON);
    return setsJSON ? JSON.parse(setsJSON) : [];
  } catch (error) {
    console.error('Fehler beim Abrufen der Sets:', error);
    return [];
  }
};

// Funktion zum Speichern eines neuen Sets
export const saveWorkoutSet = async (newSet: WorkoutSet): Promise<void> => {
  try {
    const currentSets = await getWorkoutSets();
    currentSets.push(newSet);
    await AsyncStorage.setItem(WORKOUT_SETS_KEY, JSON.stringify(currentSets));
  } catch (error) {
    console.error('Fehler beim Speichern des Sets:', error);
  }
};

// Optional: Funktion zum Löschen eines Sets
export const deleteWorkoutSet = async (index: number): Promise<void> => {
  try {
    const currentSets = await getWorkoutSets();
    currentSets.splice(index, 1);
    await AsyncStorage.setItem(WORKOUT_SETS_KEY, JSON.stringify(currentSets));
  } catch (error) {
    console.error('Fehler beim Löschen des Sets:', error);
  }
};

// Funktion zum Gruppieren der Sets nach Datum
export const groupWorkoutSetsByDate = (
  workoutSets: WorkoutSet[],
): {[date: string]: WorkoutSet[]} => {
  return workoutSets.reduce(
    (groups: {[date: string]: WorkoutSet[]}, set: WorkoutSet) => {
      // Datum aus dem Timestamp extrahieren (YYYY-MM-DD)
      const date = new Date(set.timestamp).toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(set);
      return groups;
    },
    {},
  );
};

export const getGroupedWorkoutSets = async (): Promise<{
  [date: string]: WorkoutSet[];
}> => {
  const workoutSets = await getWorkoutSets();
  return groupWorkoutSetsByDate(workoutSets);
};
