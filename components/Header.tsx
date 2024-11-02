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
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    elevation: 5,
    justifyContent: 'center',
    paddingBottom: 20,
    paddingTop: 20,
    shadowColor: Colors.shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    width: '100%',
  },
  headerTitle: {
    color: Colors.background,
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default Header;
