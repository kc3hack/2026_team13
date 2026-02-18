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
