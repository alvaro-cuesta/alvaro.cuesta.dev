import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { Parent } from "unist";
import type { FootnoteDefinition, Code } from "mdast";
import type { Node } from "unist";

interface FigureNode extends Parent {
  type: "figure";
  children: Node[];
}

interface FigcaptionNode extends Parent {
  type: "figcaption";
  children: Node[];
}

export const remarkCodeCaptionToFigure: Plugin = () => (tree) => {
  // Collect all footnoteDefinition nodes by their label
  const footnotesByLabel: Record<string, FootnoteDefinition> = {};
  visit(tree, "footnoteDefinition", (node: FootnoteDefinition) => {
    if (node.label) {
      footnotesByLabel[node.label] = node;
    }
  });

  visit(
    tree,
    "code",
    (node: Code, index: number, parent: Parent | undefined) => {
      if (!parent || typeof index !== "number") return;

      const properties = node.data?.hProperties;
      if (!properties) return;

      const captionLabel = properties["data-caption"];
      if (typeof captionLabel !== "string") return;

      const footnoteNode: FootnoteDefinition | undefined =
        footnotesByLabel[captionLabel];
      if (!footnoteNode || !Array.isArray(footnoteNode.children)) return;

      // Replace the code node with a figure node containing code and figcaption
      const figureNode: FigureNode = {
        type: "figure",
        data: {
          hName: "figure",
          hProperties: {
            className: "code-with-caption",
          },
        },
        children: [
          {
            ...node,
            data: {
              ...node.data,
              hProperties: {
                ...node.data?.hProperties,
                "data-caption": undefined,
              },
            },
          },
          {
            type: "figcaption",
            data: { hName: "figcaption", hProperties: {} },
            children: footnoteNode.children,
          } as FigcaptionNode,
        ],
      };
      parent.children.splice(index, 1, figureNode);

      return "skip";
    },
  );
};

export default remarkCodeCaptionToFigure;
