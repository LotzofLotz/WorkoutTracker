// components/SavedSetsComponent.tsx
import React from 'react';
import {View, Text, FlatList, StyleSheet} from 'react-native';
import {WorkoutSet} from '../storageService';

interface SavedSetsComponentProps {
  sets: WorkoutSet[];
}

const SavedSetsComponent: React.FC<SavedSetsComponentProps> = ({sets}) => {
  // Funktion zum Gruppieren der Sets nach Datum
  const groupSetsByDate = (sets: WorkoutSet[]) => {
    return sets.reduce((groups: {[date: string]: WorkoutSet[]}, set) => {
      // Datum aus dem Timestamp extrahieren (YYYY-MM-DD)
      const date = new Date(set.timestamp).toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(set);
      return groups;
    }, {});
  };

  // Gruppiere die Sets nach Datum
  const groupedSets = groupSetsByDate(sets);

  // Array der Datumswerte sortieren (optional)
  const sortedDates = Object.keys(groupedSets).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gespeicherte Workout-Sets</Text>
      {sortedDates.length === 0 ? (
        <Text style={styles.emptyText}>Keine Sets gespeichert.</Text>
      ) : (
        <FlatList
          data={sortedDates}
          keyExtractor={date => date}
          renderItem={({item: date}) => (
            <View style={styles.dateGroup}>
              <Text style={styles.dateTitle}>{formatDate(date)}</Text>
              {groupedSets[date].map((set, index) => (
                <View key={index} style={styles.setItem}>
                  <Text style={styles.setText}>
                    {/* Zeit extrahieren und formatieren */}
                    {formatTime(set.timestamp)} - {set.label} -{' '}
                    {set.repetitions} Reps
                  </Text>
                </View>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
};

// Hilfsfunktionen zur Formatierung von Datum und Zeit
const formatDate = (dateString: string) => {
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  return new Date(dateString).toLocaleDateString('de-DE', options);
};

const formatTime = (timestamp: string) => {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
  };
  return new Date(timestamp).toLocaleTimeString('de-DE', options);
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#444',
  },
  setItem: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 5,
  },
  setText: {
    fontSize: 16,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20,
    fontSize: 16,
  },
});

export default SavedSetsComponent;
