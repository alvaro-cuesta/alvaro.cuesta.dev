import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gitFileDates } from "./git.ts";
import { read } from "@xenon-ssg/thunks";

let repo: string;

const git = (args: string[], date: string, committerDate = date) =>
  execFileSync("git", args, {
    cwd: repo,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Test",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_AUTHOR_DATE: date,
      GIT_COMMITTER_NAME: "Test",
      GIT_COMMITTER_EMAIL: "test@example.com",
      GIT_COMMITTER_DATE: committerDate,
    },
  });

const commit = async (
  date: string,
  files: Record<string, string>,
  moves: [string, string][] = [],
) => {
  for (const [from, to] of moves) {
    await fs.mkdir(path.dirname(path.join(repo, to)), { recursive: true });
    git(["mv", from, to], date);
  }
  for (const [file, content] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(repo, file)), { recursive: true });
    await fs.writeFile(path.join(repo, file), content);
    git(["add", file], date);
  }
  git(["commit", "--quiet", "--message", date], date);
};

const CONTENT = "line\n".repeat(20);

// Each test has its own repository, so none of them share thunks.
const getGitFileDates = (repoRootPath: string, file: string) =>
  read(gitFileDates(path.resolve(repoRootPath, file)));

const getLastModifiedAt = async (repoRootPath: string, file: string) =>
  (await getGitFileDates(repoRootPath, file))?.lastModifiedAt ?? null;

beforeEach(async () => {
  repo = await fs.mkdtemp(path.join(os.tmpdir(), "git-dates-"));
  git(["init", "--quiet"], "2026-01-01T00:00:00Z");
});

afterEach(async () => {
  await fs.rm(repo, { recursive: true, force: true });
});

describe("getGitFileDates", () => {
  it("returns the creation date of a file that was only added", async () => {
    await commit("2026-01-01T00:00:00Z", { "a.mdx": CONTENT });

    expect(await getGitFileDates(repo, "a.mdx")).toEqual({
      createdAt: Temporal.Instant.from("2026-01-01T00:00:00Z"),
      lastModifiedAt: null,
    });
  });

  it("follows renames back to the creation date", async () => {
    await commit("2026-01-01T00:00:00Z", { "old/a.mdx": CONTENT });
    await commit("2026-01-02T00:00:00Z", { "old/a.mdx": CONTENT + "edit\n" });
    await commit("2026-01-03T00:00:00Z", {}, [["old/a.mdx", "new/a.mdx"]]);

    expect(await getGitFileDates(repo, "new/a.mdx")).toEqual({
      createdAt: Temporal.Instant.from("2026-01-01T00:00:00Z"),
      lastModifiedAt: Temporal.Instant.from("2026-01-02T00:00:00Z"),
    });
  });

  it("uses author dates, which survive amends and rebases", async () => {
    await commit("2026-01-01T00:00:00Z", { "a.mdx": CONTENT });
    await commit("2026-01-02T00:00:00Z", { "a.mdx": CONTENT + "edit\n" });
    // Rewrite both commits on a later day, as a rebase would.
    git(
      ["rebase", "--quiet", "--root", "--force-rebase"],
      "2026-01-01T00:00:00Z",
      "2026-02-01T00:00:00Z",
    );

    expect(await getGitFileDates(repo, "a.mdx")).toEqual({
      createdAt: Temporal.Instant.from("2026-01-01T00:00:00Z"),
      lastModifiedAt: Temporal.Instant.from("2026-01-02T00:00:00Z"),
    });
  });

  it("returns null for an untracked file", async () => {
    await commit("2026-01-01T00:00:00Z", { "a.mdx": CONTENT });
    await fs.writeFile(path.join(repo, "new.mdx"), CONTENT);

    expect(await getGitFileDates(repo, "new.mdx")).toBeNull();
  });
});

describe("lastModifiedAt", () => {
  it("returns null for a file that was only added", async () => {
    await commit("2026-01-01T00:00:00Z", { "a.mdx": CONTENT });

    expect(await getLastModifiedAt(repo, "a.mdx")).toBeNull();
  });

  it("returns the date of the last modification", async () => {
    await commit("2026-01-01T00:00:00Z", { "a.mdx": CONTENT });
    await commit("2026-01-02T00:00:00Z", { "a.mdx": CONTENT + "edit\n" });
    await commit("2026-01-03T00:00:00Z", { "a.mdx": CONTENT + "edit 2\n" });

    expect(await getLastModifiedAt(repo, "a.mdx")).toEqual(
      Temporal.Instant.from("2026-01-03T00:00:00Z"),
    );
  });

  it("ignores pure renames", async () => {
    await commit("2026-01-01T00:00:00Z", { "old/a.mdx": CONTENT });
    await commit("2026-01-02T00:00:00Z", { "old/a.mdx": CONTENT + "edit\n" });
    await commit("2026-01-03T00:00:00Z", {}, [["old/a.mdx", "new/a.mdx"]]);

    expect(await getLastModifiedAt(repo, "new/a.mdx")).toEqual(
      Temporal.Instant.from("2026-01-02T00:00:00Z"),
    );
  });

  it("returns null for a file that was added and then only renamed", async () => {
    await commit("2026-01-01T00:00:00Z", { "old/a.mdx": CONTENT });
    await commit("2026-01-02T00:00:00Z", {}, [["old/a.mdx", "new/a.mdx"]]);

    expect(await getLastModifiedAt(repo, "new/a.mdx")).toBeNull();
  });

  it("counts a rename with edits as a modification", async () => {
    await commit("2026-01-01T00:00:00Z", { "old/a.mdx": CONTENT });
    await commit("2026-01-02T00:00:00Z", { "new/a.mdx": CONTENT + "edit\n" }, [
      ["old/a.mdx", "new/a.mdx"],
    ]);

    expect(await getLastModifiedAt(repo, "new/a.mdx")).toEqual(
      Temporal.Instant.from("2026-01-02T00:00:00Z"),
    );
  });

  it("ignores commits listed in .git-blame-ignore-revs", async () => {
    await commit("2026-01-01T00:00:00Z", { "a.mdx": CONTENT });
    await commit("2026-01-02T00:00:00Z", { "a.mdx": CONTENT + "edit\n" });
    await commit("2026-01-03T00:00:00Z", { "a.mdx": CONTENT + "reformat\n" });
    const mechanical = git(["rev-parse", "HEAD"], "2026-01-03T00:00:00Z")
      .toString()
      .trim();
    await commit("2026-01-04T00:00:00Z", {
      ".git-blame-ignore-revs": `# Reformatting\n${mechanical}\n`,
    });

    expect(await getLastModifiedAt(repo, "a.mdx")).toEqual(
      Temporal.Instant.from("2026-01-02T00:00:00Z"),
    );
  });

  it("accepts an absolute file path", async () => {
    await commit("2026-01-01T00:00:00Z", { "a.mdx": CONTENT });
    await commit("2026-01-02T00:00:00Z", { "a.mdx": CONTENT + "edit\n" });

    expect(
      await getLastModifiedAt(repo, path.join(repo, "a.mdx")),
    ).toEqual(Temporal.Instant.from("2026-01-02T00:00:00Z"));
  });

  it("returns null for an untracked file", async () => {
    await commit("2026-01-01T00:00:00Z", { "a.mdx": CONTENT });

    expect(await getLastModifiedAt(repo, "missing.mdx")).toBeNull();
  });
});
