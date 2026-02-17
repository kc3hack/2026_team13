// src/api/githubAPI.ts
import { GitHubEvent, UserSettings } from '../types';

const GITHUB_API_URL = 'https://api.github.com';

/**
 * Fetch events for a specific user
 * Requires a personal access token to read private repo events
 */
export const fetchUserEvents = async (
  settings: UserSettings,
  page: number = 1
): Promise<GitHubEvent[]> => {
  if (!settings.username || !settings.token) {
    throw new Error('Username and token are required to fetch events.');
  }

  try {
    const response = await fetch(
      `${GITHUB_API_URL}/users/${settings.username}/events?per_page=30&page=${page}`,
      {
        headers: {
          Authorization: `token ${settings.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API Error:', response.status, errorText);
      throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data as GitHubEvent[];
  } catch (error) {
    console.error('Failed to fetch user events:', error);
    throw error;
  }
};

/**
 * Verifies if the token is valid by fetching the authenticated user
 */
export const verifyToken = async (token: string): Promise<boolean> => {
  try {
    const response = await fetch(`${GITHUB_API_URL}/user`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};
