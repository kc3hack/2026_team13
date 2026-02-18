// src/components/FilmDisplay.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FilmInventory, FILM_META, FILM_TYPES } from '../types';

interface FilmDisplayProps {
  inventory: FilmInventory;
}

export const FilmDisplay: React.FC<FilmDisplayProps> = ({ inventory }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Film Collection</Text>
      <View style={styles.row}>
        {FILM_TYPES.map((type) => {
          const meta = FILM_META[type];
          return (
            <View key={type} style={styles.filmItem}>
              <Text style={styles.emoji}>{meta.emoji}</Text>
              <Text style={styles.count}>{inventory[type]}</Text>
              <Text style={styles.filmLabel}>{meta.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 20,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  label: {
    fontSize: 18,
    color: '#666',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  filmItem: {
    alignItems: 'center',
    minWidth: 70,
  },
  emoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  count: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  filmLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
});
