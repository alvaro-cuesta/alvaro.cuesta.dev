import { execFile } from "node:child_process";
import path from "node:path";

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

export const getGitLastModifiedDate = async (
  repoRootPath: string,
  repoRelativeFilePath: string,
): Promise<Date | null> => {
  const lastModifiedAtIso8601 = await runGitCommand(
    ["log", "-1", "--follow", "--format=%cI", "--", repoRelativeFilePath],
    repoRootPath,
  );

  if (lastModifiedAtIso8601 === null) {
    return null;
  }

  const date = new Date(lastModifiedAtIso8601);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
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
