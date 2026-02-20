import { ImageSourcePropType } from 'react-native';

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

/** Available reward film types */
export type RewardFilmType = 'mono' | 'vivid' | 'retro' | 'disposable' | 'soft';

export const FILM_TYPES: RewardFilmType[] = ['mono', 'vivid', 'retro', 'disposable', 'soft'];

export const FILM_IMAGES: Record<RewardFilmType, ImageSourcePropType> = {
  mono:  require('../../assets/images/KC3_film01_mono.png'),
  vivid: require('../../assets/images/KC3_film02_vivid.png'),
  retro: require('../../assets/images/KC3_film03_retro.png'),
  disposable: require('../../assets/images/KC3_film03_retro.png'),
  soft: require('../../assets/images/KC3_film01_mono.png'),
};

export const FILM_META: Record<RewardFilmType, { label: string; emoji: string; image: ImageSourcePropType; description: string }> = {
  mono:  { label: '01 Mono',  emoji: '🎞️', image: FILM_IMAGES.mono,  description: 'モノクロームの静かなトーン' },
  vivid: { label: '02 Vivid', emoji: '🌈', image: FILM_IMAGES.vivid, description: '鮮やかで力強い色彩' },
  retro: { label: '03 Retro', emoji: '📷', image: FILM_IMAGES.retro, description: 'ノスタルジックな褪せた風合い' },
  disposable: { label: '04 Disposable', emoji: '🧃', image: FILM_IMAGES.disposable, description: '使い捨てカメラ風のラフな質感' },
  soft: { label: '05 Soft', emoji: '☁️', image: FILM_IMAGES.soft, description: 'やわらかい光と落ち着いたトーン' },
};

/** Inventory of each film type the user owns */
export interface FilmInventory {
  mono: number;
  vivid: number;
  retro: number;
  disposable: number;
  soft: number;
}
