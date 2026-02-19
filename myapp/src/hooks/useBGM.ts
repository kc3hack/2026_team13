import { useEffect, useRef, useState } from 'react';
import { Audio } from 'expo-av';
import { getBGMVolume, setBGMVolume } from '../utils/storage';

const BGM_FILE = require('../../assets/sounds/静止した宇宙.mp3');

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
      void (async () => {
        const sound = soundRef.current;
        if (!sound) {
          return;
        }

        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            await sound.unloadAsync();
          }
        } catch {
          // no-op
        } finally {
          soundRef.current = null;
        }
      })();
    };
  }, []);

  const loadBGM = async () => {
    try {
      if (soundRef.current) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            await soundRef.current.unloadAsync();
          }
        } catch {
          // no-op
        }
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
      if (!soundRef.current) {
        return;
      }

      const status = await soundRef.current.getStatusAsync();
      if (!status.isLoaded) {
        setIsPlaying(false);
        return;
      }

      if (status.isPlaying) {
        await soundRef.current.stopAsync();
      }
      setIsPlaying(false);
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
