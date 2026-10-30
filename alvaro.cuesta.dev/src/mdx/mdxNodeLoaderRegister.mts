// Registers the `.mdx` loader. Pass it to Node with `--import` so it's in place before the app imports any `.mdx` file.
//
// `module.registerHooks()` runs the hook on the main thread. (`module.register()`, used before, ran hooks on a separate
// thread that every import had to wait for, and Node 26 deprecates it.)

import { registerHooks } from "node:module";
import { load } from "./mdxNodeLoader.mts";

registerHooks({ load });
