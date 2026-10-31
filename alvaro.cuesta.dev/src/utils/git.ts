import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { cell, derived, family, thunk } from "@xenon-ssg/thunks";
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
  root: string,
): Promise<Set<string>> => {
  let content: string;
  try {
    content = await fs.readFile(
      path.join(root, IGNORE_REVS_FILENAME),
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

/**
 * The top level of the worktree a directory is in.
 *
 * `null` outside one.
 *
 * It's read once per directory: a directory doesn't move between worktrees.
 */
const worktreeRoot = family((cwd: string) =>
  thunk(() => runGitCommand(["rev-parse", "--show-toplevel"], cwd)),
);

/** A worktree's ignored commits, read once, and again in development whenever they change. */
const ignoredRevsOf = family((root: string) => {
  const revs = cell(() => readIgnoredRevs(root));

  // Editors may save by renaming over the file, which ends a watch on the file itself, so watch its folder instead.
  watchInDev(root, ({ filename }) => {
    if (filename === IGNORE_REVS_FILENAME) revs.invalidate();
  });

  return revs;
});

/**
 * The commits listed in `.git-blame-ignore-revs`, in the worktree a directory is in.
 *
 * They're mechanical changes, like refactors or reformatting, so they don't count as modifications.
 *
 * It's the file `git blame --ignore-revs-file` takes (and GitHub's blame view reads): one full commit hash per line,
 * with `#` comments.
 *
 * It's read once per worktree, and again in development whenever it changes. There are none outside a worktree.
 */
export const ignoredRevs = family((cwd: string) =>
  derived(async (get) => {
    const root = await get(worktreeRoot(cwd));
    return root === null ? new Set<string>() : get(ignoredRevsOf(root));
  }),
);

/** A worktree's `HEAD`, read once, and again in development whenever it moves. */
const headOf = family((root: string) => {
  const head = cell(() => runGitCommand(["rev-parse", "HEAD"], root));

  // Finding what to watch shells out to git, and only development watches, so don't in production builds.
  if (process.env["NODE_ENV"] === "development") {
    void getGitWatchPaths(root).then((gitWatchPaths) => {
      for (const gitWatchPath of gitWatchPaths) {
        // Git replaces these files by renaming a lock file over them, which ends a watch on the file itself, so
        // watch its folder instead. But only react to the file: other files there (e.g. `.git/index`) change on
        // every `git status`.
        const fileName = path.basename(gitWatchPath);
        watchInDev(path.dirname(gitWatchPath), ({ filename }) => {
          if (filename === fileName) head.invalidate();
        });
      }
    });
  }

  return head;
});

/**
 * The commit `HEAD` points to, in the worktree a directory is in.
 *
 * `null` outside a worktree, or before its first commit.
 *
 * It's read once per worktree, and again in development whenever `HEAD` moves: on commits, checkouts, resets…
 */
export const gitHead = family((cwd: string) =>
  derived(async (get) => {
    const root = await get(worktreeRoot(cwd));
    return root === null ? null : get(headOf(root));
  }),
);

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

/** When a file was created and last modified, according to its history up to `head`, without `ignoredRevs`. */
const readGitFileDates = async (
  filePath: string,
  head: string | null,
  ignoredRevs: Set<string>,
): Promise<GitFileDates | null> => {
  if (head === null) {
    return null;
  }

  // Newest first. Each commit prints `commit <hash> <date>` followed by a tab-separated `--name-status` line such as
  // `M <path>` or `R100 <old> <new>`. Merge commits print no status line.
  const log = await runGitCommand(
    [
      "log",
      "--follow",
      "--name-status",
      `--format=${COMMIT_LINE_PREFIX}%H %aI`,
      head,
      "--",
      filePath,
    ],
    // Git finds the worktree from the file's own folder.
    path.dirname(filePath),
  );

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

// Files are never dropped: their dates hold no resources, and take little room.
/**
 * When a file was created and last modified, according to git.
 *
 * `null` if the file has no git history (e.g. it isn't committed yet).
 *
 * It's read again whenever `HEAD` moves or the ignored commits change, in the file's worktree.
 */
export const gitFileDates = family((filePath: string) =>
  derived(async (get) => {
    // Git finds the worktree from any folder in it, so the file's own will do.
    const folder = path.dirname(filePath);
    const [head, revs] = await Promise.all([
      get(gitHead(folder)),
      get(ignoredRevs(folder)),
    ]);

    return readGitFileDates(filePath, head, revs);
  }),
);

/** Absolute paths of the files that change when `HEAD` moves: `HEAD` itself and the current branch's ref. */
const getGitWatchPaths = async (cwd: string): Promise<string[]> => {
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
