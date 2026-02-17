// src/components/CoinDisplay.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CoinDisplayProps {
  balance: number;
}

export const CoinDisplay: React.FC<CoinDisplayProps> = ({ balance }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Current Balance</Text>
      <Text style={styles.amount}>{balance} 🪙</Text>
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
    marginBottom: 5,
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFD700', // Gold color
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
