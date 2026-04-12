import type { Express } from "express";
import type { XenonExpressSiteMeta } from "..";
import type { ReactNode } from "react";
import type { XenonGeneratedPage } from "xenon-ssg/src/generate/generate";
import type { UnknownRecord } from "type-fest";

export type PluginAttachToExpressFunction = (app: Express) => void;

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

export type PluginGetInjectableFunction<BuildPreResult> = (
  options: PluginGetInjectableFunctionOptions<BuildPreResult>,
) => PluginInjectableTag[] | undefined;

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
 */
export type Plugin<
  BuildPreResult = unknown,
  PageMetadata extends UnknownRecord = UnknownRecord,
> = (
  siteMeta: XenonExpressSiteMeta,
) => RunnablePlugin<BuildPreResult, PageMetadata> | undefined;

function renderInjectableRaw(tag: PluginInjectableTag, index: number) {
  switch (tag.tagType) {
    case "stylesheet":
      return <link key={index} rel="stylesheet" href={tag.href} />;

    case "link":
      return (
        <link
          key={index}
          rel={tag.rel}
          type={tag.type}
          title={tag.title}
          sizes={tag.sizes}
          media={tag.media}
          href={tag.href}
        />
      );

    case "meta":
      return <meta key={index} name={tag.name} content={tag.content} />;

    default:
      // @ts-expect-error This should never happen
      throw new Error(`Unknown injectable tag type: ${tag.type}`);
  }
}

export function getTagsFromInjectableRaw(
  injectableRaw: PluginInjectableTag[],
): {
  injectable: ReactNode[];
  injectableCritical: ReactNode[];
} {
  return {
    injectable: injectableRaw
      .filter((x) => !x.critical)
      .map(renderInjectableRaw),
    injectableCritical: injectableRaw
      .filter((x) => x.critical)
      .map(renderInjectableRaw),
  };
}
