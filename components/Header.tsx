// components/Header.tsx
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
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
    alignItems: 'center',

    backgroundColor: Colors.primary, // Hintergrundfarbe zuerst#
    elevation: 5,
    justifyContent: 'center',

    paddingBottom: 20,
    paddingTop: 20, // Für Safe Area und StatusBar Abstand

    shadowColor: Colors.shadow, // Ersetzt '#000' durch Colors.shadow
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,

    width: '100%', // Width nach backgroundColor
  },
  headerTitle: {
    color: Colors.background, // Ersetzt '#fff' durch Colors.textLight
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default Header;
