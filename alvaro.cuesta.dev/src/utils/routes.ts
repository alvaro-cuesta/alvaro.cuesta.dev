import { match, compile, type ParamData } from "path-to-regexp";
import { NeedsTrailingSlashError } from "@xenon-ssg/core";

type RouteBuildOptions = { hash?: string };

type Route<Params> = {
  match: (path: string) => Params | null;
  build: (params: Params, options?: RouteBuildOptions) => string;
  isActive: (pathname: string) => boolean;
};

type MakeRouteOptions = {
  activePrefix?: string;
  exact?: boolean;
};

/**
 * The params of a path the route's pattern matches, or `null` when they aren't
 * the route's after all (e.g. a page that isn't a number), as path-to-regexp's
 * patterns can't say what a param holds.
 */
type ParseParams<Params, ParsedParams> = (
  params: Params,
) => ParsedParams | null;

export function makeRoute<Params extends ParamData>(
  path: string,
  options?: MakeRouteOptions,
): Route<Params>;
export function makeRoute<Params extends ParamData>(
  path: string,
  parse: ParseParams<Params, Params>,
  options?: MakeRouteOptions,
): Route<Params>;
export function makeRoute<Params extends ParamData, ParsedParams>(
  path: string,
  parse: ParseParams<Params, ParsedParams>,
  serialize: (params: ParsedParams) => Params,
  options?: MakeRouteOptions,
): Route<ParsedParams>;
export function makeRoute<Params extends ParamData, ParsedParams>(
  path: string,
  parseOrOptions?: ParseParams<Params, ParsedParams> | MakeRouteOptions,
  serializeOrOptions?: ((params: ParsedParams) => Params) | MakeRouteOptions,
  options?: MakeRouteOptions,
): Route<ParsedParams> {
  const parse =
    typeof parseOrOptions === "function" ? parseOrOptions : undefined;
  const serialize =
    typeof serializeOrOptions === "function" ? serializeOrOptions : undefined;
  const resolvedOptions =
    typeof parseOrOptions === "object"
      ? parseOrOptions
      : typeof serializeOrOptions === "object"
        ? serializeOrOptions
        : options;

  const parseMatched = (params: Params) =>
    parse
      ? parse(params)
      : // `as` here should be safe because the only way `parse` is not provided is if `ParsedParams` is `Params`
        (params as unknown as ParsedParams);

  const matchFn = match<Params>(path);
  const matchWithoutTrailingFn = path.endsWith("/")
    ? match<Params>(path.slice(0, -1))
    : undefined;

  const buildFn = compile<Params>(path);

  const activePrefix = resolvedOptions?.activePrefix;
  const exact = resolvedOptions?.exact ?? false;

  return {
    isActive: (pathname: string) =>
      activePrefix !== undefined &&
      (exact ? pathname === activePrefix : pathname.startsWith(activePrefix)),

    match: (requestedPath: string) => {
      const matched = matchFn(requestedPath);

      if (matched === false) {
        const matchedWithoutTrailing = matchWithoutTrailingFn?.(requestedPath);
        // Only for a path that would be the route's with the slash, so a bad
        // param doesn't redirect to another miss.
        if (
          matchedWithoutTrailing &&
          parseMatched(matchedWithoutTrailing.params) !== null
        ) {
          throw new NeedsTrailingSlashError(path);
        }

        return null;
      }

      return parseMatched(matched.params);
    },

    // Typed, as TypeScript 7.1's beta no longer infers it from `Route`.
    // @todo Drop the type once https://github.com/microsoft/TypeScript/issues/64974
    // is fixed.
    build: (params: ParsedParams, { hash }: RouteBuildOptions = {}) => {
      const path = buildFn(
        serialize
          ? serialize(params)
          : // `as` here should be safe because the only way `serialize` is not provided is if `ParsedParams` is `Params`
            (params as unknown as Params),
      );

      return `${path}${hash ? `#${hash}` : ""}`;
    },
  };
}
