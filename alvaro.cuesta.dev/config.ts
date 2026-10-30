import type { RenderToStreamOptions } from "xenon-ssg/render";
import path from "node:path";

/** Root folder of the site package. Resolve site files (content, assets) from here. */
export const SITE_ROOT_FOLDER = import.meta.dirname;

export const OUTPUT_FOLDER = path.join(SITE_ROOT_FOLDER, "dist");

export const DEV_PORT = 3000;

export const RENDER_TO_STREAM_OPTIONS: RenderToStreamOptions = {
  timeoutMsecs: 2000,
};

/**
 * Timezone to use as input when converting a "dumb" JS `Date` to an internal `BlogItemDate` (which has plain
 * dates/times).
 *
 * When converting a `Date` object it will be assumed to be in this timezone regardless of the actual timezone. This
 * will allow anyone to specify a `Date` as a value which can be run in any server in the world.
 *
 * This MUST be the same implied timezone of the rest ofthe plain dates. E.g. if you blog post filenames are named
 * 'YYYY-MM-DD-HH-mm__slug.mdx` then the timezone should be the same as the one used to generate the filenames.
 */
export const DATETIME_INPUT_TZ = "UTC";

export const SITE_TITLE = "Álvaro Cuesta";

export const MY_NAME = "Álvaro Cuesta";

export const SITE_SHORT_DESCRIPTION = "Álvaro Cuesta's personal website";

export const HOMEPAGE_BLURB_DESCRIPTION =
  "Álvaro Cuesta — full-stack software engineer, musician, and creator sharing insights on technology, art, and creative ideas.";

export const HOMEPAGE_BLURB_SOCIAL_DESCRIPTION =
  "Discover the work of Álvaro Cuesta: from deep-dives into software engineering to explorations in art and creativity.";

export const BLOG_BLURB_DESCRIPTION =
  "Explore Álvaro Cuesta's blog — a mix of technology deep-dives, music insights, and creative explorations. Stay updated with insights, tutorials, and thought pieces.";

export const makeBlogBlurbSocialDescription = (browsing?: string | undefined) =>
  `You're browsing ${browsing ? `${browsing} of ` : ""}Álvaro Cuesta's blog — keep exploring articles on technology, music, and creativity.`;

export const TIMELINE_BLURB_DESCRIPTION =
  "Álvaro Cuesta's timeline — short-form thoughts on technology, music, creativity, and more.";

export const makeTimelineBlurbSocialDescription = (
  browsing?: string | undefined,
) =>
  `You're browsing ${browsing ? `${browsing} of ` : ""}Álvaro Cuesta's timeline — short-form thoughts on technology, music, creativity, and more.`;

/**
 * Maps non-canonical tag names to their canonical form.
 *
 * E.g. `{ llms: "llm" }` means `#llms` will link to the `#llm` tag page.
 *
 * The display text stays as the author wrote it.
 */
export const CANONICAL_TAGS: Record<string, string> = {
  llms: "llm",
};

/**
 * Information about a blog series.
 */
type SeriesInfo = {
  /**
   * The name of the series, in human-readable form.
   */
  name: string;
  /**
   * The number of the series' first post (e.g. 0 or 1).
   */
  firstPart: number;
  /**
   * A brief description of the series, starting in lowercase.
   *
   * This description will be used in the series blurb on the blog, as in
   * `"Part N of <name>: <description>"`.
   */
  description?: string | undefined;
};

/**
 * Blog tags that group posts into a series, and how to display each series.
 *
 * Every post with the tag is part of it, in publication order.
 */
export const SERIES_TAGS: Record<string, SeriesInfo> = {
};
