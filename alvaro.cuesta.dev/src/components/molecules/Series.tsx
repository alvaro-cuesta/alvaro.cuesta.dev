import { use } from "react";
import { Icon } from "../atoms/Icon.tsx";
import { Link } from "../atoms/Link.tsx";
import { getBlogItems } from "../../blog/promise.ts";
import { routeBlogArticle, routeBlogTag } from "../../routes.ts";
import { MdxRenderContext } from "../../mdx/MdxRenderContext.tsx";
import { SERIES_TAGS } from "../../../config.ts";

export type SeriesProps = {
  /** A tag from `SERIES_TAGS`. Every post with it is part of the series. */
  tag: string;
};

/**
 * Box saying which part of a series a blog post is, linking the series' tag
 * page. Lists the series' posts once there is more than one.
 *
 * Meant to be imported from MDX blog posts:
 *
 * ```mdx
 * import { Series } from "#components/molecules/Series";
 *
 * <Series tag="security-dojo" />
 * ```
 */
export function Series({ tag }: SeriesProps) {
  const renderContext = use(MdxRenderContext);

  if (!renderContext) {
    throw new Error("`<Series>` must be rendered inside a blog post");
  }

  return (
    <SeriesInner
      tag={tag}
      pathname={renderContext.pathname}
      canonicalizeBaseUrl={renderContext.canonicalizeBaseUrl}
    />
  );
}

type SeriesInnerProps = {
  tag: string;
  pathname: string;
  canonicalizeBaseUrl?: URL | undefined;
};

async function SeriesInner({
  tag,
  pathname,
  canonicalizeBaseUrl,
}: SeriesInnerProps) {
  const series = SERIES_TAGS[tag];

  if (series === undefined) {
    throw new Error(
      `Tag "${tag}" is not a series: add it to \`SERIES_TAGS\` in config.ts`,
    );
  }

  const blogItems = await getBlogItems();

  // `byTag` is sorted by descending date
  const parts = (blogItems.byTag.get(tag) ?? []).toReversed().map((item) => ({
    item,
    path: routeBlogArticle.build({ slug: item.module.slug }),
  }));

  const currentIndex = parts.findIndex((part) => part.path === pathname);

  if (currentIndex === -1) {
    throw new Error(
      `${pathname} renders \`<Series tag="${tag}" />\` but isn't tagged "${tag}"`,
    );
  }

  // Feeds can't resolve relative links, nor render `<Link>` (it needs the
  // renderer's link collection)
  const renderLink = (href: string, children: React.ReactNode) =>
    canonicalizeBaseUrl ? (
      <a href={new URL(href, canonicalizeBaseUrl).toString()}>{children}</a>
    ) : (
      <Link href={href}>{children}</Link>
    );

  return (
    <aside className="card">
      <p>
        <Icon name="layer-group" aria-hidden />{" "}
        <strong>
          Part {series.firstPart + currentIndex} of{" "}
          {renderLink(routeBlogTag.build({ tag }), series.name)}
        </strong>
        {series.description ? `: ${series.description}` : null}
      </p>

      {parts.length > 1 ? (
        <ol start={series.firstPart}>
          {parts.map(({ item, path }, index) => (
            <li key={path} aria-current={index === currentIndex ? "page" : undefined}>
              {index === currentIndex ? (
                <strong>{item.module.title}</strong>
              ) : (
                renderLink(path, item.module.title)
              )}
              {item.module.draft ? " (draft)" : ""}
            </li>
          ))}
        </ol>
      ) : null}
    </aside>
  );
}
