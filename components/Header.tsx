// components/Header.tsx
import React from 'react';
import {View, Text, StyleSheet, StatusBar} from 'react-native';
import Colors from './colors';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({title}) => {
  return (
    <View style={styles.headerContainer}>
      {/* <StatusBar barStyle="light-content" backgroundColor="#2196F3" /> */}
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingTop: 20, // Für Safe Area und StatusBar Abstand
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    // Schatten für einen modernen Look
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default Header;
