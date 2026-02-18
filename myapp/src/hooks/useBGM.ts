import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { getBGMVolume, setBGMVolume } from '../utils/storage';

const BGM_FILE = require('../../assets/seishishitauchu.mp3');

export const useBGM = () => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);

  // Initialize audio and load volume setting
  useEffect(() => {
    const initAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });
        const savedVolume = await getBGMVolume();
        setVolume(savedVolume);
      } catch (error) {
        console.error('Error initializing audio:', error);
      }
    };
    initAudio();

    return () => {
      // Cleanup
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const loadBGM = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(BGM_FILE, {
        volume,
        isLooping: true,
        shouldPlay: false,
      });
      soundRef.current = sound;
    } catch (error) {
      console.error('Error loading BGM:', error);
    }
  };

  const startBGM = async () => {
    try {
      if (!soundRef.current) {
        await loadBGM();
      }
      if (soundRef.current && !isPlaying) {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error starting BGM:', error);
    }
  };

  const stopBGM = async () => {
    try {
      if (soundRef.current && isPlaying) {
        await soundRef.current.stopAsync();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error stopping BGM:', error);
    }
  };

  const updateVolume = async (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    await setBGMVolume(clampedVolume);
    
    // Load BGM if not already loaded
    if (!soundRef.current) {
      await loadBGM();
    }
    
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(clampedVolume);
    }
  };

  return {
    volume,
    updateVolume,
    startBGM,
    stopBGM,
    isPlaying,
  };
};
