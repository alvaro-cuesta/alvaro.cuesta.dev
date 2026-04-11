import type { Plugin } from "unified";
import type { Root, Text, Parent } from "mdast";
import { visit } from "unist-util-visit";

const TAG_CONTENT_REGEX = /[a-zA-Z0-9][a-zA-Z0-9-]*/y;

interface MdxJsxAttribute {
  type: "mdxJsxAttribute";
  name: string;
  value: string;
}

interface MdxJsxTextElement {
  type: "mdxJsxTextElement";
  name: string;
  attributes: MdxJsxAttribute[];
  children: Array<{ type: string; value?: string }>;
}

export type RemarkHashtagsOptions = {
  canonicalTags?: Record<string, string>;
};

export const remarkHashtags: Plugin<[RemarkHashtagsOptions?], Root> =
  (options = {}) =>
  (tree) => {
    const { canonicalTags = {} } = options;
    const allTags = new Set<string>();

    visit(
      tree,
      "text",
      (
        node: Text,
        index: number | undefined,
        parent: Parent | undefined,
      ): number | undefined => {
        if (!parent || index === undefined) return;

        const text = node.value;
        const replacements: Array<Text | MdxJsxTextElement> = [];
        let lastEnd = 0;
        let i = 0;
        let lastTagEnd = -1;

        while (i < text.length) {
          if (text[i] === "#") {
            const charBefore = i > 0 ? text[i - 1] : undefined;
            const isAfterTag = i === lastTagEnd;

            TAG_CONTENT_REGEX.lastIndex = i + 1;
            const match = TAG_CONTENT_REGEX.exec(text);

            if (
              match &&
              (isAfterTag ||
                charBefore === undefined ||
                !/[a-zA-Z0-9]/.test(charBefore))
            ) {
              const rawTagName = match[0]!.toLowerCase();
              const canonicalTagName = canonicalTags[rawTagName] ?? rawTagName;
              allTags.add(canonicalTagName);

              if (i > lastEnd) {
                replacements.push({
                  type: "text",
                  value: text.slice(lastEnd, i),
                });
              }

              const needsTagProp = canonicalTagName !== rawTagName;

              replacements.push({
                type: "mdxJsxTextElement",
                name: "Hashtag",
                attributes: needsTagProp
                  ? [
                      {
                        type: "mdxJsxAttribute",
                        name: "tag",
                        value: canonicalTagName,
                      },
                    ]
                  : [],
                children: [{ type: "text", value: rawTagName }],
              });

              lastTagEnd = TAG_CONTENT_REGEX.lastIndex;
              lastEnd = lastTagEnd;
              i = lastTagEnd;
              continue;
            }
          }
          i++;
        }

        if (replacements.length > 0) {
          if (lastEnd < text.length) {
            replacements.push({ type: "text", value: text.slice(lastEnd) });
          }

          parent.children.splice(
            index,
            1,
            ...(replacements as unknown as typeof parent.children),
          );

          // Skip past the inserted nodes
          return index + replacements.length;
        }

        return undefined;
      },
    );

    // Inject `export const hashtags = [...]` into the MDX module
    const sortedTags = [...allTags].sort();

    (tree.children as unknown[]).push({
      type: "mdxjsEsm",
      value: "",
      data: {
        estree: {
          type: "Program",
          sourceType: "module",
          body: [
            {
              type: "ExportNamedDeclaration",
              declaration: {
                type: "VariableDeclaration",
                kind: "const",
                declarations: [
                  {
                    type: "VariableDeclarator",
                    id: { type: "Identifier", name: "hashtags" },
                    init: {
                      type: "ArrayExpression",
                      elements: sortedTags.map((tag) => ({
                        type: "Literal",
                        value: tag,
                        raw: JSON.stringify(tag),
                      })),
                    },
                  },
                ],
              },
              specifiers: [],
              source: null,
            },
          ],
        },
      },
    });
  };

export default remarkHashtags;
