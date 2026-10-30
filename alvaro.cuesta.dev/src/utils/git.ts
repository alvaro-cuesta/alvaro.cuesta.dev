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

/**
 * Date of the most recent commit that changed the file's content, following renames. Returns `null` if the file was
 * never modified after being added. Pure renames (`R100`) don't count as modifications.
 */
export const getGitLastModifiedDate = async (
  repoRootPath: string,
  repoRelativeFilePath: string,
): Promise<Temporal.Instant | null> => {
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
  for (const line of log.split("\n")) {
    if (line.startsWith(COMMIT_LINE_PREFIX)) {
      commitDate = line.slice(COMMIT_LINE_PREFIX.length);
      continue;
    }

    const status = line.split("\t")[0];
    if (!status || commitDate === null || status === "A" || status === "R100") {
      continue;
    }

    const date = new Date(commitDate);
    return Number.isNaN(date.getTime())
      ? null
      : Temporal.Instant.from(commitDate);
  }

  return null;
};

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
    (gitPath) => path.dirname(path.resolve(cwd, gitPath)),
  );
};
