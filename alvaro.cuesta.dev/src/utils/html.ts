import { convert as htmlToText } from "html-to-text";

const collapseWhitespace = (text: string): string => {
  return text.replace(/\s+/g, " ").trim();
};

const normalizeMultilineWhitespace = (text: string): string => {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => collapseWhitespace(paragraph))
    .filter(Boolean)
    .join("\n\n");
};

export const htmlToPlainText = (html: string): string => {
  return normalizeMultilineWhitespace(
    htmlToText(html, {
      preserveNewlines: true,
      wordwrap: false,
      selectors: [
        {
          selector: "pre",
          format: "skip",
        },
        {
          selector: "code",
          format: "skip",
        },
        {
          selector: "a",
          options: {
            ignoreHref: true,
          },
        },
      ],
    }),
  );
};
