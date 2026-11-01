import type { Router } from "express";
import type { XenonExpressSiteMeta } from "./index.tsx";
import type { ReactNode } from "react";
import type { XenonGeneratedPage } from "@xenon-ssg/core/generate/generate";
import type { UnknownRecord } from "type-fest";
import { toServedHref } from "@xenon-ssg/core/url";

/**
 * Attaches the plugin's routes for dev mode.
 *
 * `router` is mounted at the site's root, wherever that is: routes are site
 * paths (e.g. `/feed.rss`), without the base path.
 */
export type PluginAttachToExpressFunction = (router: Router) => void;

export type PluginBuildPreOptions = {
  siteMeta: XenonExpressSiteMeta;
  baseOutputFolder: string;
  /**
   * Declare a pathname as emitted by this plugin as a static file (e.g.
   * feed documents, sitemaps, css bundles). The link crawler will skip
   * these when rendering pages — they're not React-rendered routes.
   */
  emitStaticPathname: (pathname: string) => void;
};

export type PluginBuildPreFunction<BuildPreResult = unknown> = (
  options: PluginBuildPreOptions,
) => Promise<BuildPreResult>;

export type PluginBuildPostOptions<
  BuildPreResult,
  PageMetadata extends UnknownRecord,
> = {
  siteMeta: XenonExpressSiteMeta;
  baseOutputFolder: string;
  buildPreResult: BuildPreResult;
  generatedPages: XenonGeneratedPage<PageMetadata>[];
};

export type PluginBuildPostFunction<
  BuildPreResult,
  PageMetadata extends UnknownRecord,
> = (
  options: PluginBuildPostOptions<BuildPreResult, PageMetadata>,
) => Promise<void>;

export type PluginInjectableStylesheet = {
  tagType: "stylesheet";
  /** A site path, served at the base path for you, or any other href. */
  href: string;
  cachebust?: boolean;
};

export type PluginInjectableLink = {
  tagType: "link";
  rel: string;
  type?: string | undefined;
  title?: string | undefined;
  sizes?: string | undefined;
  media?: string | undefined;
  /** A site path, served at the base path for you, or any other href. */
  href: string;
  cachebust?: boolean;
};

export type PluginInjectableMeta = {
  tagType: "meta";
  name: string;
  content: string;
};

export type PluginInjectableTag = {
  critical?: boolean | undefined;
} & (PluginInjectableStylesheet | PluginInjectableLink | PluginInjectableMeta);

export type PluginGetInjectableFunctionOptions<BuildPreResult> = {
  siteMeta: XenonExpressSiteMeta;
} & (
  | {
      isBuild: true;
      baseOutputFolder: string;
      /**
       * Value returned from {@link RunnablePlugin.buildPre}.
       *
       * Will be `undefined` if the plugin is running in dev mode.
       */
      buildPreResult: BuildPreResult;
    }
  | {
      isBuild: false;
      baseOutputFolder?: never;
      buildPreResult?: never;
    }
);

/**
 * Returns the `<link>` / `<meta>` / `<style>` tags this plugin contributes to
 * every rendered page's `<head>`.
 *
 * **Lifecycle contract:**
 *
 * - **Dev mode**: called by `makeXenonDevRouter`'s render wrapper on
 *   *every* request. Returning a `Promise` is allowed — the middleware
 *   awaits before rendering. Returning a different array (by reference or
 *   by content) on different calls is also allowed: that's how a plugin
 *   reflects updated source files (e.g. favicon's `inputFile` thunk)
 *   without forcing a process restart.
 *
 * - **Build mode**: called by `buildXenonExpressSite` exactly once per
 *   plugin per build, after `buildPre` has produced its `buildPreResult`.
 *
 * **Performance contract for plugins:** because dev-mode invocation is
 * per-request, plugins that do non-trivial work to produce their tags MUST
 * memoize internally — typically with a `cell` (`@xenon-ssg/thunks`) over
 * the heavy compute, plus an `fs.watch`-driven `invalidate()`. Returning
 * a stable reference until the underlying source changes makes the
 * per-request call effectively free (one microtask tick to await an
 * already-resolved promise) while still letting the middleware see fresh
 * data the moment the source file is edited.
 *
 * Plugins that produce trivially cheap tags (e.g. a single `<link
 * rel="stylesheet">`) don't need to memoize — constructing the array each
 * call is sub-microsecond.
 */
export type PluginGetInjectableFunction<BuildPreResult> = (
  options: PluginGetInjectableFunctionOptions<BuildPreResult>,
) =>
  | PluginInjectableTag[]
  | undefined
  | Promise<PluginInjectableTag[] | undefined>;

export type RunnablePlugin<
  BuildPreResult,
  PageMetadata extends UnknownRecord,
> = {
  /**
   * Attaches the plugin to Express during `dev` mode.
   */
  attachToExpress?: PluginAttachToExpressFunction | undefined;

  /**
   * Builds the plugin during `build` mode. Runs before the static site is generated.
   *
   * This is where plugins should declare the pathnames they emit as static
   * files via the `emitStaticPathname` callback on the options.
   */
  buildPre?: PluginBuildPreFunction<BuildPreResult> | undefined;

  /**
   * Injectable tags that can be used by the plugin.
   *
   * For example, a CSS file can be injected into the HTML head.
   */
  getInjectable?: PluginGetInjectableFunction<BuildPreResult> | undefined;

  /**
   * Builds the plugin during `build` mode. Runs after the static site is generated.
   */
  buildPost?: PluginBuildPostFunction<BuildPreResult, PageMetadata> | undefined;
};

/**
 * Can return `undefined` if the plugin doesn't need to do anything. Useful if you want to disable the plugin with some
 * specific options for example.
 *
 * A plugin that owns something, like thunks that watch its source files, is also `Disposable`, and whoever made it
 * disposes it once it's done with it: e.g. the module that makes the site, once a dev server reload replaces it. The
 * site's runs of it (one per `siteMeta`) share it, so they don't own anything themselves.
 */
export type Plugin<
  BuildPreResult = unknown,
  PageMetadata extends UnknownRecord = UnknownRecord,
> = (
  siteMeta: XenonExpressSiteMeta,
) => RunnablePlugin<BuildPreResult, PageMetadata> | undefined;

function renderInjectableRaw(
  tag: PluginInjectableTag,
  index: number,
  basepath: string,
) {
  switch (tag.tagType) {
    case "stylesheet":
      return (
        <link
          key={index}
          rel="stylesheet"
          href={toServedHref(tag.href, basepath)}
        />
      );

    case "link":
      return (
        <link
          key={index}
          rel={tag.rel}
          type={tag.type}
          title={tag.title}
          sizes={tag.sizes}
          media={tag.media}
          href={toServedHref(tag.href, basepath)}
        />
      );

    case "meta":
      return <meta key={index} name={tag.name} content={tag.content} />;

    default:
      // @ts-expect-error This should never happen
      throw new Error(`Unknown injectable tag type: ${tag.type}`);
  }
}

/**
 * The tags for `injectableRaw`, with each `href` served at `basepath` (see
 * `toServedHref`), so plugins can give site paths.
 */
export function getTagsFromInjectableRaw(
  injectableRaw: PluginInjectableTag[],
  basepath: string,
): {
  injectable: ReactNode[];
  injectableCritical: ReactNode[];
} {
  return {
    injectable: injectableRaw
      .filter((x) => !x.critical)
      .map((tag, index) => renderInjectableRaw(tag, index, basepath)),
    injectableCritical: injectableRaw
      .filter((x) => x.critical)
      .map((tag, index) => renderInjectableRaw(tag, index, basepath)),
  };
}
