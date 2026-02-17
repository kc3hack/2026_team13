import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useGithubCommits } from '../hooks/useGithubCommits';
import { CoinDisplay } from '../components/CoinDisplay';

interface HomeScreenProps {
  onOpenSettings: () => void;
  onOpenImagePicker: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenSettings, onOpenImagePicker }) => {
  const { coinBalance, loading, checkForCommits, lastEventId } = useGithubCommits();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Git Coin Miner</Text>
      
      <CoinDisplay balance={coinBalance} />
      
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.checkButton}
          onPress={checkForCommits}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Check for Commits</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={onOpenImagePicker}
        >
          <Text style={styles.pickerButtonText}>📷 Open Camera & Gallery</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={onOpenSettings}
        >
          <Text style={styles.settingsText}>Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>Last Event ID: {lastEventId || 'None'}</Text>
        <Text style={styles.infoText}>Earn coins for every commit you push!</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  checkButton: {
    backgroundColor: '#2ea44f', // GitHub Green
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  pickerButton: {
    backgroundColor: '#eee',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 15,
  },
  pickerButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    padding: 10,
  },
  settingsText: {
    color: '#0366d6', // GitHub Blue
    fontSize: 16,
  },
  infoContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  infoText: {
    color: '#888',
    fontSize: 12,
    marginBottom: 5,
  },
});
