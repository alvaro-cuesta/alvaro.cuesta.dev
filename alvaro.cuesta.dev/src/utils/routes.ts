import { match, compile, type ParamData } from "path-to-regexp";
import { NeedsTrailingSlashError } from "xenon-ssg/src/middleware";

type Route<Params> = {
  match: (path: string) => Params | null;
  build: (params: Params, options?: { hash?: string }) => string;
  isActive: (pathname: string) => boolean;
};

type MakeRouteOptions = {
  activePrefix?: string;
};

export function makeRoute<Params extends ParamData>(
  path: string,
  options?: MakeRouteOptions,
): Route<Params>;
export function makeRoute<Params extends ParamData, ParsedParams>(
  path: string,
  parse: (params: Params) => ParsedParams,
  serialize: (params: ParsedParams) => Params,
  options?: MakeRouteOptions,
): Route<ParsedParams>;
export function makeRoute<Params extends ParamData, ParsedParams>(
  path: string,
  parseOrOptions?: ((params: Params) => ParsedParams) | MakeRouteOptions,
  serialize?: (params: ParsedParams) => Params,
  options?: MakeRouteOptions,
): Route<ParsedParams> {
  const parse =
    typeof parseOrOptions === "function" ? parseOrOptions : undefined;
  const resolvedOptions =
    typeof parseOrOptions === "object" ? parseOrOptions : options;

  const matchFn = match<Params>(path);
  const matchWithoutTrailingFn = path.endsWith("/")
    ? match<Params>(path.slice(0, -1))
    : undefined;

  const buildFn = compile<Params>(path);

  const activePrefix = resolvedOptions?.activePrefix;

  return {
    isActive: (pathname: string) =>
      activePrefix !== undefined && pathname.startsWith(activePrefix),

    match: (requestedPath: string) => {
      const matched = matchFn(requestedPath);

      if (matched === false) {
        if (matchWithoutTrailingFn && matchWithoutTrailingFn(requestedPath)) {
          throw new NeedsTrailingSlashError(path);
        }

        return null;
      }

      return parse
        ? parse(matched.params)
        : // `as` here should be safe because the only way `parse` is not proided is if `ParsedParams` is `Params`
          (matched.params as unknown as ParsedParams);
    },

    build: (params: ParsedParams, { hash } = {}) => {
      const path = buildFn(
        serialize
          ? serialize(params)
          : // `as` here should be safe because the only way `serialize` is not proided is if `ParsedParams` is `Params`
            (params as unknown as Params),
      );

      return `${path}${hash ? `#${hash}` : ""}`;
    },
  };
}
