import { useState, useCallback, useEffect } from 'react';
import { fetchUserRepos, fetchRepoCommits } from '../api/githubAPI';
import {
  getCoinBalance,
  getLastCheckTimestamp,
  getUserSettings,
  setLastCheckTimestamp,
  updateCoinBalance,
} from '../utils/storage';
import { UserSettings, GitHubRepoCommit } from '../types';

export interface CheckResult {
  success: boolean;
  message: string;
  newCommits: number;
  coinsEarned: number;
}

/**
 * Determines if a commit belongs to the authenticated user.
 */
const isMyCommit = (
  commit: GitHubRepoCommit,
  settings: UserSettings
): boolean => {
  const usernameLower = settings.username.toLowerCase();
  const gitEmailLower = settings.gitEmail?.toLowerCase();
  const authorEmailLower = commit.commit.author.email.toLowerCase();
  const authorNameLower = commit.commit.author.name.toLowerCase();

  // Strategy 1: Match by configured Git Email (most reliable)
  if (gitEmailLower) {
    return authorEmailLower === gitEmailLower;
  }

  // Strategy 2: Match by linked GitHub account (reliable when commit is linked)
  if (commit.author?.login) {
    return commit.author.login.toLowerCase() === usernameLower;
  }

  // Strategy 3: Match by author name or GitHub noreply email
  return (
    authorNameLower === usernameLower ||
    authorEmailLower.includes(usernameLower) ||
    authorEmailLower.endsWith('@users.noreply.github.com')
  );
};

export const useGithubCommits = () => {
  const [loading, setLoading] = useState(false);
  const [coinBalance, setCoinBalance] = useState(0);
  const [lastCheckTime, setLastCheckTime] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    const balance = await getCoinBalance();
    setCoinBalance(balance);
  }, []);

  useEffect(() => {
    const loadState = async () => {
      const balance = await getCoinBalance();
      setCoinBalance(balance);
      const ts = await getLastCheckTimestamp();
      if (ts) {
        setLastCheckTime(new Date(ts).toLocaleString('ja-JP'));
      }
    };
    loadState();
  }, []);

  const checkForCommits = useCallback(async (): Promise<CheckResult> => {
    const settings = await getUserSettings();
    if (!settings?.username || !settings?.token) {
      return {
        success: false,
        message: 'GitHubのユーザー名とトークンを設定画面で入力してください。',
        newCommits: 0,
        coinsEarned: 0,
      };
    }

    setLoading(true);
    try {
      console.log('[CommitCheck] ユーザー:', settings.username, '| gitEmail:', settings.gitEmail || '(未設定)');

      const lastTimestamp = await getLastCheckTimestamp();
      console.log(`[CommitCheck] 前回チェック: ${lastTimestamp ? new Date(lastTimestamp).toISOString() : '(初回)'}`);

      if (!lastTimestamp) {
        // First time: set timestamp and return without awarding coins
        await setLastCheckTimestamp();
        setLastCheckTime(new Date().toLocaleString('ja-JP'));
        return {
          success: true,
          message: '初回チェック完了！次回以降、新しいコミットが検出されるとコインが付与されます。',
          newCommits: 0,
          coinsEarned: 0,
        };
      }

      // 1. Fetch user's repos sorted by most recently pushed
      const repos = await fetchUserRepos(settings);
      console.log(`[CommitCheck] 取得リポジトリ数: ${repos.length}`);

      if (!Array.isArray(repos)) {
        console.error('[CommitCheck] Unexpected repos response:', JSON.stringify(repos).slice(0, 500));
        return {
          success: false,
          message: 'GitHub APIからの応答が不正です。トークンの権限を確認してください。',
          newCommits: 0,
          coinsEarned: 0,
        };
      }

      // 2. Filter repos pushed after last check
      const recentRepos = repos.filter(
        (r) => new Date(r.pushed_at).getTime() > lastTimestamp
      );
      console.log(`[CommitCheck] 前回以降にpushされたリポジトリ数: ${recentRepos.length}`);
      for (const repo of recentRepos) {
        console.log(`  [Repo] ${repo.full_name} (private=${repo.private}) pushed_at=${repo.pushed_at}`);
      }

      if (recentRepos.length === 0) {
        await setLastCheckTimestamp();
        setLastCheckTime(new Date().toLocaleString('ja-JP'));
        return {
          success: true,
          message: '新しいプッシュはありません。',
          newCommits: 0,
          coinsEarned: 0,
        };
      }

      // 3. For each recently pushed repo, fetch commits since last check
      const sinceISO = new Date(lastTimestamp).toISOString();
      let newCommitsCount = 0;

      for (const repo of recentRepos) {
        console.log(`[CommitCheck] ${repo.full_name} のコミットを取得中... (since=${sinceISO})`);

        let commits: GitHubRepoCommit[];
        try {
          commits = await fetchRepoCommits(settings, repo.full_name, sinceISO);
        } catch (err: any) {
          console.warn(`[CommitCheck] ${repo.full_name} のコミット取得をスキップ: ${err.message}`);
          continue;
        }

        if (!Array.isArray(commits)) {
          console.warn(`[CommitCheck] ${repo.full_name}: unexpected response, skipping`);
          continue;
        }

        console.log(`  取得コミット数: ${commits.length}`);

        for (const commit of commits) {
          const mine = isMyCommit(commit, settings);
          console.log(
            `    [Commit] sha=${commit.sha.slice(0, 7)} ` +
            `author="${commit.commit.author.name}" ` +
            `email="${commit.commit.author.email}" ` +
            `ghUser=${commit.author?.login || '(unlinked)'} ` +
            `mine=${mine} ` +
            `msg="${commit.commit.message.split('\n')[0].slice(0, 60)}"`
          );

          if (mine) {
            newCommitsCount++;
          }
        }
      }

      console.log(`[CommitCheck] 検出コミット数: ${newCommitsCount}`);

      // 4. Award coins
      let coinsEarned = 0;
      if (newCommitsCount > 0) {
        const rewardPerCommit = 10;
        coinsEarned = newCommitsCount * rewardPerCommit;
        await updateCoinBalance(coinsEarned);
      }

      // Refresh balance from storage
      const latestBalance = await getCoinBalance();
      setCoinBalance(latestBalance);

      // 5. Update last check timestamp
      await setLastCheckTimestamp();
      setLastCheckTime(new Date().toLocaleString('ja-JP'));

      if (newCommitsCount > 0) {
        return {
          success: true,
          message: `${newCommitsCount}件の新しいコミットを検出！\n${coinsEarned}コインを獲得しました！`,
          newCommits: newCommitsCount,
          coinsEarned,
        };
      } else {
        return {
          success: true,
          message: `${recentRepos.length}件のリポジトリにプッシュがありましたが、\nあなたのコミットは見つかりませんでした。\n\n設定画面でGit Emailを登録すると検出精度が向上します。`,
          newCommits: 0,
          coinsEarned: 0,
        };
      }
    } catch (error: any) {
      console.error('[CommitCheck] Error:', error);
      const errorMsg = error?.message || String(error);
      return {
        success: false,
        message: `エラーが発生しました:\n${errorMsg}`,
        newCommits: 0,
        coinsEarned: 0,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    coinBalance,
    loading,
    checkForCommits,
    lastCheckTime,
    refreshBalance,
  };
};
