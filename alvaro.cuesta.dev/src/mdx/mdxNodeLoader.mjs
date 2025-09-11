import { createLoader } from "@mdx-js/node-loader";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import rehypeStarryNight from "rehype-starry-night";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import { all } from "@wooorm/starry-night";
import recmaPluginInjectisMDXComponent from "recma-mdx-is-mdx-component";
import rehypeShiftHeading from "rehype-shift-heading";
import withToc from "@stefanprobst/rehype-extract-toc";
import withTocExport from "@stefanprobst/rehype-extract-toc/mdx";
import remarkParseCodeMeta from "./remarkParseCodeMeta.mts";
import remarkCodeCaptionToFigure from "./remarkCodeCaptionToFigure.mts";

const hooks = createLoader({
  remarkRehypeOptions: {
    footnoteLabelTagName: "h1",
  },
  rehypePlugins: [
    rehypeKatex,
    [rehypeStarryNight, { grammars: all }],
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
        properties: (node) => ({
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
    remarkParseCodeMeta,
    remarkCodeCaptionToFigure,
  ],
  recmaPlugins: [recmaPluginInjectisMDXComponent],
  // I couldn't get this to work. I think it's because the MDX file are loading a different instance of the context, so
  // the provider is not the same as the one that is being used in the rest of the app...
  // Workaround is to just manually pass the `components` prop to each MDX render. Cumbersome, but reasonable.
  // providerImportSource: "@mdx-js/react",
});

export const load = hooks.load;
