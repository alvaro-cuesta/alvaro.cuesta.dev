import type { ElementType } from "react";
import type { MDXContent } from "mdx/types";
import type { Item } from "../utils/analyze";
import type { BlogItemModuleParsed } from "../blog/item-module";
import {
  type TimelineItemModuleParsed,
  timelineSlugFromDate,
} from "./item-module";

const PREFIXES = [
  "New blog post!",
  "Check out my latest blog post:",
  "Just posted:",
  "New post:",
  "Latest on the blog:",
  "Hot off the press:",
  "Don't miss my new blog post:",
  "Freshly published:",
  "My newest blog post is up:",
  "Read my latest post:",
  "Discover my new blog post:",
  "Check out my recent post:",
  "Just published:",
  "New on the blog:",
  "My latest blog post is live:",
  "Read my new post:",
  "New blog post 👉",
  "Check out my latest blog post 👉",
  "Just posted 👉",
  "New post 👉",
  "Latest on the blog 👉",
  "Hot off the press 👉",
  "Don't miss my new blog post 👉",
  "Freshly published 👉",
  "My newest blog post is up 👉",
  "Read my latest post 👉",
  "Discover my new blog post 👉",
  "Check out my recent post 👉",
  "Just published 👉",
  "New on the blog 👉",
  "My latest blog post is live 👉",
  "Read my new post 👉",
];

const hashSlug = (slug: string): number => {
  let hash = 0;

  for (let i = 0; i < slug.length; i++) {
    hash = (hash << 5) - hash + slug.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return Math.abs(hash);
};

function makeImplicitComponent(module: BlogItemModuleParsed): MDXContent {
  const ImplicitBlogPost: MDXContent = ({ components }) => {
    const A = (components?.["a"] ?? "a") as ElementType;

    const prefix = PREFIXES[hashSlug(module.slug) % PREFIXES.length];

    return (
      <>
        <p>
          {prefix} <A href={`blog-post:///${module.slug}`}>{module.title}</A>
        </p>
        {module.summary ? <p>{module.summary}</p> : null}
        {module.tags.length > 0 ? (
          <p>
            {module.tags.map((tag, i) => (
              <span key={tag.slug}>
                {i > 0 ? " " : ""}
                <A href={`timeline-tag:///${tag.slug}`}>#{tag.original}</A>
              </span>
            ))}
          </p>
        ) : null}
      </>
    );
  };

  return ImplicitBlogPost;
}

export function blogItemToImplicitTimelineItem(
  blogItem: Item<BlogItemModuleParsed>,
): Item<TimelineItemModuleParsed> {
  const { module } = blogItem;
  const slug = timelineSlugFromDate(module.creationDate);

  return {
    filename: `implicit:${module.slug}`,
    module: {
      Component: makeImplicitComponent(module),
      slug,
      creationDate: module.creationDate,
      publicationDate: module.publicationDate,
      lastModificationDate: null,
      draft: module.draft,
      tags: module.tags.map((tag) => tag.slug),
      tableOfContents: [],
      implicit: true,
    },
  };
}
