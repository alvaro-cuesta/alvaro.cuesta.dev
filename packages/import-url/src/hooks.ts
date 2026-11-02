// Makes a `with { type: "url" }` import give the file's URL (see `FileUrl`)
// without loading it. Pass it to Node with `--import`, after the loaders that
// load the files it names (e.g. one for `.mdx`), so it answers first.

import { registerHooks } from "node:module";

registerHooks({
  load(url, context, nextLoad) {
    // `?.`: a `require()` has none, whatever Node's docs and types say.
    // @todo Drop it if Node passes `{}` instead:
    // https://github.com/nodejs/node/issues/67209
    if (context.importAttributes?.["type"] !== "url") {
      return nextLoad(url, context);
    }

    // Answers itself: Node's own loader rejects `type: "url"`.
    return {
      format: "module",
      source: `export default new URL(${JSON.stringify(url)});`,
      shortCircuit: true,
    };
  },
});
