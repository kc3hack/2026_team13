// GitHub API Event Types
export interface GitHubCommit {
  sha: string;
  author: {
    email: string;
    name: string;
  };
  message: string;
  url: string;
  distinct: boolean;
}

export interface GitHubPushPayload {
  push_id: number;
  size: number;
  distinct_size: number;
  ref: string;
  head: string;
  before: string;
  commits: GitHubCommit[];
}

export interface GitHubEvent {
  id: string;
  type: string; // "PushEvent" etc.
  actor: {
    id: number;
    login: string;
    display_login: string;
    gravatar_id: string;
    url: string;
    avatar_url: string;
  };
  repo: {
    id: number;
    name: string;
    url: string;
  };
  payload: GitHubPushPayload; // For PushEvent
  public: boolean;
  created_at: string;
}

export interface UserSettings {
  username: string;
  token: string;
  gitEmail?: string; // Optional: used to match commits accurately
}

// --- Repo-based commit detection types ---

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  pushed_at: string; // ISO 8601
  owner: {
    login: string;
  };
}

export interface GitHubRepoCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
    id: number;
  } | null;
  html_url: string;
}

// --- SQLite models ---

export interface FilmType {
  id: number;
  name: string;
  description: string;
  effect_type: string;
}

export interface PhotoRecord {
  id: number;
  uri: string;
  film_id: number;
  status: 'undeveloped' | 'developing' | 'developed';
  created_at: string;
  developing_started_at?: string | null;
}

// --- Commit reward film inventory types ---

/** The three available reward film types */
export type RewardFilmType = 'mono' | 'vivid' | 'retro';

export const FILM_TYPES: RewardFilmType[] = ['mono', 'vivid', 'retro'];

export const FILM_META: Record<RewardFilmType, { label: string; emoji: string; description: string }> = {
  mono:  { label: 'Mono',  emoji: '🎞️', description: 'モノクロームの静かなトーン' },
  vivid: { label: 'Vivid', emoji: '🌈', description: '鮮やかで力強い色彩' },
  retro: { label: 'Retro', emoji: '📷', description: 'ノスタルジックな褪せた風合い' },
};

/** Inventory of each film type the user owns */
export interface FilmInventory {
  mono: number;
  vivid: number;
  retro: number;
}
