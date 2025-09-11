// This is a workaround to register the mdxNodeLoader.mjs as a loader for .mdx files BEFORE the TSX loader is registered.
//
// This is helpful because if this is done the TSX watch is aware of any changes in the .mdx files, and it will restart
// the server when a .mdx file is changed.
//
// Ideally we wouldn't reload the whole app when a single import changes, but MDX can import other files, so a simple
// file watch wouldn't be enough to reload the server when the content of any transitively-imported file changes.
//
// TODO: Maybe this could be worked around with some sort of partial reload a-la HMR, but I'm not sure how to do that
//       with the current setup while still keeping it simple.

import { register } from "node:module";

register("./mdxNodeLoader.mjs", import.meta.url);
