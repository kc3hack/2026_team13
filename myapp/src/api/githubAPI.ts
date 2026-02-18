// src/api/githubAPI.ts
import { GitHubEvent, GitHubRepo, GitHubRepoCommit, UserSettings } from '../types';

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
      `${GITHUB_API_URL}/users/${settings.username}/events?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${settings.token}`,
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
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Fetch the authenticated user's repositories, sorted by most recently pushed.
 * Uses GET /user/repos which returns both public and private repos the token can access.
 */
export const fetchUserRepos = async (
  settings: UserSettings
): Promise<GitHubRepo[]> => {
  if (!settings.token) {
    throw new Error('Token is required to fetch repos.');
  }

  const response = await fetch(
    `${GITHUB_API_URL}/user/repos?sort=pushed&direction=desc&per_page=20&type=all`,
    {
      headers: {
        Authorization: `Bearer ${settings.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('GitHub API Error (repos):', response.status, errorText);
    throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

/**
 * Fetch commits for a specific repo since a given timestamp.
 * Uses GET /repos/{owner}/{repo}/commits which works reliably with
 * Fine-grained PATs that have Contents (Read-only) permission.
 */
export const fetchRepoCommits = async (
  settings: UserSettings,
  repoFullName: string,
  since: string
): Promise<GitHubRepoCommit[]> => {
  if (!settings.token) {
    throw new Error('Token is required to fetch commits.');
  }

  const url = `${GITHUB_API_URL}/repos/${repoFullName}/commits?since=${encodeURIComponent(since)}&per_page=100`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${settings.token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    if (response.status === 409) {
      // 409 Conflict = empty repository
      return [];
    }
    if (response.status === 403) {
      // Access denied — skip silently
      console.warn(`Skipping ${repoFullName}: access denied (403)`);
      return [];
    }
    const errorText = await response.text();
    console.error(`GitHub API Error (commits for ${repoFullName}):`, response.status, errorText);
    throw new Error(`GitHub API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};
