// Types every `with { type: "url" }` import as a `FileUrl` of an `unknown`
// module. Declare more specific ones (e.g. `"*.mdx"`) before this one: of two
// patterns that both match, TypeScript takes the first.
//
// @todo Type each file by its own module, so a code file keeps the exact types
// a plain import gives it, instead of only its kind's. A pattern declaration
// can't refer to the module it matched (`typeof import(...)` needs the path
// written again): https://github.com/microsoft/TypeScript/issues/65109
declare module "*" with { type: "url" } {
  const file: import("@xenon-ssg/import-url").FileUrl;
  export default file;
}
