import { execFile } from "node:child_process";
import path from "node:path";
import { Temporal } from "temporal-polyfill";

const runGitCommand = async (
  args: string[],
  cwd: string,
): Promise<string | null> => {
  return new Promise((resolve) => {
    execFile("git", args, { cwd }, (error, stdout) => {
      if (error) {
        resolve(null);
        return;
      }

      resolve(stdout.trim() || null);
    });
  });
};

const COMMIT_LINE_PREFIX = "commit ";

const parseGitDate = (iso8601: string): Temporal.Instant | null =>
  Number.isNaN(new Date(iso8601).getTime())
    ? null
    : Temporal.Instant.from(iso8601);

export type GitFileDates = {
  /** Date of the oldest commit touching the file, following renames. */
  createdAt: Temporal.Instant;
  /**
   * Date of the most recent commit that changed the file's content, or `null` if it was never modified after being
   * added. Pure renames (`R100`) don't count as modifications.
   */
  lastModifiedAt: Temporal.Instant | null;
};

/**
 * Returns `null` if the file has no git history (e.g. it isn't committed yet).
 */
export const getGitFileDates = async (
  repoRootPath: string,
  repoRelativeFilePath: string,
): Promise<GitFileDates | null> => {
  // Newest first. Each commit prints `commit <date>` followed by a tab-separated `--name-status` line such as
  // `M <path>` or `R100 <old> <new>`. Merge commits print no status line.
  const log = await runGitCommand(
    [
      "log",
      "--follow",
      "--name-status",
      `--format=${COMMIT_LINE_PREFIX}%cI`,
      "--",
      repoRelativeFilePath,
    ],
    repoRootPath,
  );

  if (log === null) {
    return null;
  }

  let commitDate: string | null = null;
  let lastModifiedDate: string | null = null;
  for (const line of log.split("\n")) {
    if (line.startsWith(COMMIT_LINE_PREFIX)) {
      commitDate = line.slice(COMMIT_LINE_PREFIX.length);
      continue;
    }

    const status = line.split("\t")[0];
    if (
      lastModifiedDate === null &&
      status &&
      status !== "A" &&
      status !== "R100"
    ) {
      lastModifiedDate = commitDate;
    }
  }

  // After the loop `commitDate` holds the oldest commit.
  const createdAt = commitDate === null ? null : parseGitDate(commitDate);
  if (createdAt === null) {
    return null;
  }

  return {
    createdAt,
    lastModifiedAt:
      lastModifiedDate === null ? null : parseGitDate(lastModifiedDate),
  };
};

export const getGitLastModifiedDate = async (
  repoRootPath: string,
  repoRelativeFilePath: string,
): Promise<Temporal.Instant | null> =>
  (await getGitFileDates(repoRootPath, repoRelativeFilePath))?.lastModifiedAt ??
  null;

/** Absolute paths of the files that change when `HEAD` moves: `HEAD` itself and the current branch's ref. */
export const getGitWatchPaths = async (cwd: string): Promise<string[]> => {
  const headPath = await runGitCommand(
    ["rev-parse", "--git-path", "HEAD"],
    cwd,
  );
  const headRef = await runGitCommand(["symbolic-ref", "-q", "HEAD"], cwd);
  const headRefPath =
    headRef === null
      ? null
      : await runGitCommand(["rev-parse", "--git-path", headRef], cwd);

  return [...new Set([headPath, headRefPath].filter((x) => x !== null))].map(
    (gitPath) => path.resolve(cwd, gitPath),
  );
};
