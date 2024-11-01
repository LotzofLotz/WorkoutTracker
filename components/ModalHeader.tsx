// components/ModalHeader.tsx
import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Colors from './colors';

interface ModalHeaderProps {
  title: string;
  onClose?: () => void;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({title, onClose}) => {
  return (
    <View style={styles.headerContainer}>
      <Text style={styles.headerTitle}>{title}</Text>
      {onClose && (
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={Colors.background} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  closeButton: {
    padding: 5,
    position: 'absolute',
    right: 10,
  },
  headerContainer: {
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 12,
    paddingTop: 12,
    position: 'relative',
    width: '100%',
  },
  headerTitle: {
    color: Colors.background,
    fontSize: 25,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ModalHeader;
