import { type ReactNode } from "react";
import cx from "classnames";
import { Link } from "./atoms/Link";
import { Icon } from "./atoms/Icon";
import { useBlogItems } from "../blog/promise";
import type { SiteRenderMeta } from "../site";
import { routeBlogArticleList, routeHome } from "../routes";
import {
  blogItemDateToUTCISO8601Z,
  type BlogItemDate,
} from "../blog/item-dates";

type TemplateProps = {
  siteRenderMeta: SiteRenderMeta;
  canonicalPathname?: string;
  canonicalUrl?: string;
  metaTags: TemplateMetaTags;
  mainClassName?: string;
  children?: ReactNode;
};

type TemplateMetaTags = {
  title: string;
  description?: string;
  socialTitle: string;
  socialDescription: string;
  publishedTime?: BlogItemDate;
  modifiedTime?: BlogItemDate;
  openGraph: TemplateMetaTagsOpenGraph;
  imageAbsoluteUrl?: string;
  additional?: ReactNode;
};

type TemplateMetaTagsOpenGraph =
  | {
      type: "website";
    }
  | {
      type: "article";
      expirationTime?: BlogItemDate;
      authorProfileUrl?: string;
      section?: string;
      tags?: string[];
    }
  | {
      type: "profile";
      firstName?: string;
      lastName?: string;
      username?: string;
      gender?: "male" | "female";
    };

export const Template: React.FC<TemplateProps> = ({
  siteRenderMeta,
  canonicalPathname = siteRenderMeta.pathname,
  canonicalUrl = `${siteRenderMeta.baseUrl}${canonicalPathname}`,
  metaTags,
  mainClassName,
  children,
}) => {
  const blogItems = useBlogItems();

  const ogImage = metaTags.imageAbsoluteUrl ?? siteRenderMeta.defaultOgImage;

  const year = new Date().getFullYear();

  return (
    <html lang="en" prefix="og: http://ogp.me/ns#">
      <head>
        <meta charSet="utf-8" />

        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
        <meta name="darkreader-lock" />

        {siteRenderMeta.injectableCritical}

        {/* Common */}
        <title>{metaTags.title}</title>
        {metaTags.description ? (
          <meta name="description" content={metaTags.description} />
        ) : null}
        {metaTags.publishedTime ? (
          <meta
            name="date"
            content={blogItemDateToUTCISO8601Z(metaTags.publishedTime)}
          />
        ) : null}
        {metaTags.modifiedTime ? (
          <meta
            name="last-modified"
            content={blogItemDateToUTCISO8601Z(metaTags.modifiedTime)}
          />
        ) : null}

        {/* OpenGraph */}
        <meta
          property="og:site_name"
          content="Álvaro Cuesta's personal website"
        />
        <meta property="og:title" content={metaTags.socialTitle} />
        {metaTags.socialDescription ? (
          <meta
            property="og:description"
            content={metaTags.socialDescription}
          />
        ) : null}
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:locale" content="en_US" />
        <meta property="og:type" content={metaTags.openGraph.type} />

        {/* OpenGraph - Not in spec */}
        {metaTags.publishedTime ? (
          <meta
            property="og:published_time"
            content={blogItemDateToUTCISO8601Z(metaTags.publishedTime)}
          />
        ) : null}
        {metaTags.modifiedTime ? (
          <meta
            property="og:updated_time"
            content={blogItemDateToUTCISO8601Z(metaTags.modifiedTime)}
          />
        ) : null}

        {/* OpenGraph - Article*/}
        {metaTags.openGraph.type === "article" ? (
          <>
            {metaTags.publishedTime ? (
              <meta
                property="article:published_time"
                content={blogItemDateToUTCISO8601Z(metaTags.publishedTime)}
              />
            ) : null}
            {metaTags.modifiedTime ? (
              <meta
                property="article:modified_time"
                content={blogItemDateToUTCISO8601Z(metaTags.modifiedTime)}
              />
            ) : null}
            {metaTags.openGraph.authorProfileUrl ? (
              <meta
                property="article:author"
                content={metaTags.openGraph.authorProfileUrl}
              />
            ) : null}
            {metaTags.openGraph.section ? (
              <meta
                property="article:section"
                content={metaTags.openGraph.section}
              />
            ) : null}
            {metaTags.openGraph.tags?.map((tag) => (
              <meta property="article:tag" content={tag} key={tag} />
            ))}
          </>
        ) : null}

        {/* OpenGraph - Profile*/}
        {metaTags.openGraph.type === "profile" ? (
          <>
            {metaTags.openGraph.firstName ? (
              <meta
                property="profile:first_name"
                content={metaTags.openGraph.firstName}
              />
            ) : null}
            {metaTags.openGraph.lastName ? (
              <meta
                property="profile:last_name"
                content={metaTags.openGraph.lastName}
              />
            ) : null}
            {metaTags.openGraph.username ? (
              <meta
                property="profile:username"
                content={metaTags.openGraph.username}
              />
            ) : null}
            {metaTags.openGraph.gender ? (
              <meta
                property="profile:gender"
                content={metaTags.openGraph.gender}
              />
            ) : null}
          </>
        ) : null}

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={metaTags.socialTitle} />
        {metaTags.socialDescription ? (
          <meta
            name="twitter:description"
            content={metaTags.socialDescription}
          />
        ) : null}
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:image" content={ogImage} />

        <link rel="canonical" href={canonicalUrl} />

        {metaTags.additional}

        {siteRenderMeta.injectable}
      </head>

      <body>
        <header className="container">
          <nav>
            <ul>
              <li>
                <h1 className="marginless">
                  <Link href={routeHome.build({})}>Álvaro Cuesta</Link>
                </h1>
              </li>
            </ul>
            <ul>
              <li>
                <Link href={routeHome.build({}, { hash: "technologies" })}>
                  Tech
                </Link>
              </li>
              <li>
                <Link href={routeHome.build({}, { hash: "knowledge" })}>
                  Knowledge
                </Link>
              </li>
              <li>
                <Link href={routeHome.build({}, { hash: "projects" })}>
                  Projects
                </Link>
              </li>
              {blogItems.all.length > 0 ? (
                <li>
                  <Link href={routeBlogArticleList.build({ page: null })}>
                    Blog
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>
        </header>
        <main className={cx("container", mainClassName)}>{children}</main>
        <footer className="container">
          <nav>
            <ul>
              <li>
                © {year} <Link href={routeHome.build({})}>Álvaro Cuesta</Link>
              </li>
            </ul>
            <ul>
              <li>
                <Link
                  href="https://github.com/alvaro-cuesta/"
                  aria-label="Álvaro Cuesta's GitHub (opens in new tab)"
                >
                  <Icon collection="fab" name="github" aria-hidden /> GitHub
                </Link>
              </li>
            </ul>
          </nav>
        </footer>
      </body>
    </html>
  );
};
