import { useState, useCallback, useEffect } from 'react';
import { fetchUserEvents } from '../api/githubAPI';
import {
  getCoinBalance,
  getLastProcessedEventId,
  getUserSettings,
  saveUserSettings,
  setLastProcessedEventId,
  updateCoinBalance,
} from '../utils/storage';
import { GitHubEvent } from '../types';

export const useGithubCommits = () => {
  const [loading, setLoading] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  // Load initial state
  useEffect(() => {
    const loadState = async () => {
      const balance = await getCoinBalance();
      const eventId = await getLastProcessedEventId();
      setCoinBalance(balance);
      setLastEventId(eventId);
    };
    loadState();
  }, []);

  const checkForCommits = useCallback(async () => {
    const settings = await getUserSettings();
    if (!settings?.username || !settings?.token) {
      console.log('User settings not found');
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch latest events
      const events = await fetchUserEvents(settings);
      
      // 2. Filter for PushEvents
      const pushEvents = events.filter((e) => e.type === 'PushEvent');

      if (pushEvents.length === 0) {
        setLoading(false);
        return;
      }

      // If first run (no lastEventId), just mark the latest as processed to avoid massive initial coin gain
      // OR: Process all recent events? better to start fresh from "now".
      const currentLastEventId = await getLastProcessedEventId();
      
      if (!currentLastEventId) {
        // First time running: mark the latest event as processed without awarding coins
        await setLastProcessedEventId(pushEvents[0].id);
        setLastEventId(pushEvents[0].id);
        setLoading(false);
        return;
      }

      // 3. Find new events since last processed ID
      const newEvents: GitHubEvent[] = [];
      
      // Since API returns events in desc order (newest first), we iterate until we find the last processed ID
      for (const event of pushEvents) {
        if (event.id === currentLastEventId) {
          break; 
        }
        newEvents.push(event);
      }

      if (newEvents.length === 0) {
        setLoading(false);
        return;
      }

      // 4. Calculate commits
      let newCommitsCount = 0;
      
      for (const event of newEvents) {
        if (!event.payload || !event.payload.commits) continue;
        
        // Only process commits if the actor is the user (basic security check)
        // Although the user might push commits by others, typically we only care if they pushed their own work?
        // Requirement says: "In the target repo, when a push occurs, count the user's commits included in that push"
        // So even if I push someone else's commit, it shouldn't count.
        // But if I push my own commit, it counts.
        
        for (const commit of event.payload.commits) {
          let isMyCommit = false;

          // Strategy 1: Match by configured Git Email
          if (settings.gitEmail && commit.author.email.toLowerCase() === settings.gitEmail.toLowerCase()) {
            isMyCommit = true;
          } 
          // Strategy 2: Match by GitHub Username (less reliable as git config user.name might differ)
          else if (commit.author.name.toLowerCase() === settings.username.toLowerCase()) {
            isMyCommit = true;
          }
          // Strategy 3: Loose match if no email configured
          else if (!settings.gitEmail && event.actor.login.toLowerCase() === settings.username.toLowerCase()) {
             // If the pusher is the user, and we have no email config, we might assume the commit is theirs 
             // IF the commit author name looks like the username.
             // But to be safe, let's stick to author name check or email check.
             // If the user hasn't set up gitEmail, let's try to match author.name with username.
             isMyCommit = commit.author.name.toLowerCase().includes(settings.username.toLowerCase());
          }

          if (isMyCommit) {
            newCommitsCount++;
          }
        }
      }

      // 5. Update coins
      if (newCommitsCount > 0) {
        const rewardPerCommit = 10;
        const totalReward = newCommitsCount * rewardPerCommit;
        
        // Fetch fresh balance before updating
        const currentBalance = await getCoinBalance();
        const newBalance = currentBalance + totalReward;
        
        await updateCoinBalance(totalReward); // Add difference
        setCoinBalance(newBalance);
      }

      // 6. Update last processed event ID (the most recent one in the list is at index 0 of pushEvents)
      // Note: newEvents[0] is the newest processed event.
      if (newEvents.length > 0) {
        // We use the ID of the newest event we found
        const newestEventId = newEvents[0].id;
        await setLastProcessedEventId(newestEventId); 
        setLastEventId(newestEventId);
      }

    } catch (error) {
      console.error('Error checking for commits:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    coinBalance,
    loading,
    checkForCommits,
    lastEventId
  };
};
