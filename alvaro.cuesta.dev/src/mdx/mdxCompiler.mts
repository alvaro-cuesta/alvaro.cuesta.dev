import fs from "node:fs";
import { compileSync, type CompileOptions } from "@mdx-js/mdx";
import { SourceMapGenerator } from "source-map";
import { VFile } from "vfile";
import { reporter } from "vfile-reporter";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
// Explicit grammar composition: `common` (~34 grammars, includes `source.js`
// which handles JSX) plus `source.tsx` for TypeScript+JSX code blocks.
// Importing from the package root would normally also eager-evaluate
// `./lib/all.js` (hundreds of unused grammars, ~630ms cold-boot cost), but
// we ship a pnpm patch that strips that re-export — see
// `patches/@wooorm__starry-night*.patch`.
import {
  createStarryNight,
  common as starryNightCommon,
} from "@wooorm/starry-night";
import sourceTsx from "@wooorm/starry-night/source.tsx";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import recmaPluginInjectisMDXComponent from "recma-mdx-is-mdx-component";
import rehypeShiftHeading from "rehype-shift-heading";
import withToc from "@stefanprobst/rehype-extract-toc";
import withTocExport from "@stefanprobst/rehype-extract-toc/mdx";
import rehypeStarryNightSync from "./rehypeStarryNightSync.mts";
import remarkParseCodeMeta from "./remarkParseCodeMeta.mts";
import remarkCodeCaptionToFigure from "./remarkCodeCaptionToFigure.mts";
import remarkHashtags from "./remarkHashtags.mts";
import { CANONICAL_TAGS } from "../../config.ts";

const starryNightGrammars = [...starryNightCommon, sourceTsx];

// Async, so it happens once, as the worker starts, instead of in `compileMdx`.
const starryNight = await createStarryNight(starryNightGrammars);

const compileOptions: CompileOptions = {
  SourceMapGenerator,
  remarkRehypeOptions: {
    footnoteLabelTagName: "h1",
  },
  rehypePlugins: [
    rehypeKatex,
    [rehypeStarryNightSync, { starryNight, grammars: starryNightGrammars }],
    [rehypeShiftHeading, { shift: 2 }],
    rehypeSlug,
    [
      rehypeAutolinkHeadings,
      // Make sure this matches `BlogArticle` TOC
      {
        behavior: "append",
        content: {
          type: "element",
          tagName: "span",
          properties: { className: ["fas fa-link autolink-icon"] },
        },
        headingProperties: {
          className: ["autolink-heading"],
        },
        properties: () => ({
          className: ["autolink-link"],
          "aria-label": "(permalink)",
        }),
      },
    ],
    withToc,
    withTocExport,
  ],
  remarkPlugins: [
    remarkGfm,
    remarkMath,
    [remarkHashtags, { canonicalTags: CANONICAL_TAGS }],
    remarkParseCodeMeta,
    remarkCodeCaptionToFigure,
  ],
  recmaPlugins: [recmaPluginInjectisMDXComponent],
  // I couldn't get this to work. I think it's because the MDX file are loading a different instance of the context, so
  // the provider is not the same as the one that is being used in the rest of the app...
  // Workaround is to just manually pass the `components` prop to each MDX render. Cumbersome, but reasonable.
  // providerImportSource: "@mdx-js/react",
};

/** Compiles an `.mdx` (or Markdown) file to the source of a JS module. */
export const compileMdx = (fileUrl: URL): string => {
  const file = compileSync(
    new VFile({ value: fs.readFileSync(fileUrl), path: fileUrl }),
    compileOptions,
  );

  if (file.messages.length > 0) {
    console.error(reporter(file));
  }

  const sourceMap = Buffer.from(JSON.stringify(file.map)).toString("base64");

  return `${String(file)}\n//# sourceMappingURL=data:application/json;base64,${sourceMap}\n`;
};
