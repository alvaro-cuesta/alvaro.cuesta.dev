import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { cell, type Cell } from "@xenon-ssg/thunks";
import { watchInDev } from "@xenon-ssg/core/watch";

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

const IGNORE_REVS_FILENAME = ".git-blame-ignore-revs";

const readIgnoredRevs = async (
  repoRootPath: string | null,
): Promise<Set<string>> => {
  if (repoRootPath === null) {
    return new Set();
  }

  let content: string;
  try {
    content = await fs.readFile(
      path.join(repoRootPath, IGNORE_REVS_FILENAME),
      "utf-8",
    );
  } catch {
    return new Set();
  }

  return new Set(
    content
      .split("\n")
      .map((line) => line.replace(/#.*/, "").trim())
      .filter((line) => line !== ""),
  );
};

const ignoredRevsByCwd = new Map<string, Cell<Set<string>>>();

/**
 * The commits listed in the repository's `.git-blame-ignore-revs`.
 *
 * They're mechanical changes, like refactors or reformatting, so they don't count as modifications.
 *
 * It's the file `git blame --ignore-revs-file` takes (and GitHub's blame view reads): one full commit hash per line,
 * with `#` comments.
 *
 * It's read once per repository, and again in development whenever it changes.
 */
const getIgnoredRevs = (cwd: string): Promise<Set<string>> => {
  let ignoredRevs = ignoredRevsByCwd.get(cwd);

  if (ignoredRevs === undefined) {
    const repoRootPath = runGitCommand(["rev-parse", "--show-toplevel"], cwd);
    const cache = cell(async () =>
      readIgnoredRevs(await repoRootPath),
    );

    // Editors may save by renaming over the file, which ends a watch on the file itself, so watch its folder instead.
    void repoRootPath.then((root) => {
      if (root === null) return;
      watchInDev(root, ({ filename }) => {
        if (filename === IGNORE_REVS_FILENAME) cache.invalidate();
      });
    });

    ignoredRevs = cache;
    ignoredRevsByCwd.set(cwd, ignoredRevs);
  }

  return ignoredRevs();
};

const parseGitDate = (iso8601: string): Temporal.Instant | null => {
  try {
    return Temporal.Instant.from(iso8601);
  } catch {
    return null;
  }
};

/**
 * When a file was created and last modified, according to git.
 *
 * The dates are author dates: when the change was written. Committer dates change when a commit is amended, rebased
 * or cherry-picked, which doesn't change the content.
 */
export type GitFileDates = {
  /** Date of the oldest commit touching the file, following renames. */
  createdAt: Temporal.Instant;
  /**
   * Date of the most recent commit that changed the file's content.
   *
   * Pure renames (`R100`) and commits listed in `.git-blame-ignore-revs` don't count as changes.
   *
   * `null` if it was never modified after being added.
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
  // Newest first. Each commit prints `commit <hash> <date>` followed by a tab-separated `--name-status` line such as
  // `M <path>` or `R100 <old> <new>`. Merge commits print no status line.
  const [log, ignoredRevs] = await Promise.all([
    runGitCommand(
      [
        "log",
        "--follow",
        "--name-status",
        `--format=${COMMIT_LINE_PREFIX}%H %aI`,
        "--",
        repoRelativeFilePath,
      ],
      repoRootPath,
    ),
    getIgnoredRevs(repoRootPath),
  ]);

  if (log === null) {
    return null;
  }

  let commitHash: string | null = null;
  let commitDate: string | null = null;
  let lastModifiedDate: string | null = null;
  for (const line of log.split("\n")) {
    if (line.startsWith(COMMIT_LINE_PREFIX)) {
      [commitHash = null, commitDate = null] = line
        .slice(COMMIT_LINE_PREFIX.length)
        .split(" ");
      continue;
    }

    const status = line.split("\t")[0];
    if (
      lastModifiedDate === null &&
      status &&
      status !== "A" &&
      status !== "R100" &&
      !(commitHash !== null && ignoredRevs.has(commitHash))
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
