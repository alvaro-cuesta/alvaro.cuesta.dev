import type { Plugin } from "unified";
import type { ElementContent, Root } from "hast";
import type { createStarryNight, Grammar } from "@wooorm/starry-night";
import { toString } from "hast-util-to-string";
import { levenshteinEditDistance } from "levenshtein-edit-distance";
import { SKIP, visit } from "unist-util-visit";

type StarryNight = Awaited<ReturnType<typeof createStarryNight>>;

type RehypeStarryNightSyncOptions = {
  starryNight: StarryNight;
  /** The grammars `starryNight` was created with, to suggest names for unknown languages. */
  grammars: readonly Grammar[];
};

const LANGUAGE_CLASS_PREFIX = "language-";

// Same as `rehype-starry-night`: suggest up to 4 names within an edit distance of a third of the language's length.
const MAX_SUGGESTIONS = 4;
const MAX_RELATIVE_DISTANCE = 0.33;

const listFormatDisjunction = new Intl.ListFormat("en", {
  type: "disjunction",
});

const suggestNames = (language: string, names: readonly string[]) =>
  names
    .map((name) => ({
      name,
      distance: levenshteinEditDistance(language, name) / language.length,
    }))
    .filter(({ distance }) => distance < MAX_RELATIVE_DISTANCE)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ name }) => name);

/**
 * Highlights `<code class="language-*">` like `rehype-starry-night`, but
 * synchronously: that one awaits `createStarryNight()` inside its transform,
 * which `compileSync` can't run. Takes an already-created instance instead.
 */
const rehypeStarryNightSync: Plugin<[RehypeStarryNightSyncOptions], Root> = ({
  starryNight,
  grammars,
}) => {
  const names = grammars.flatMap((grammar) => grammar.names);
  let checkedScopes = false;

  return (tree, file) => {
    if (!checkedScopes) {
      const missingScopes = starryNight.missingScopes();
      if (missingScopes.length > 0) {
        file.message(
          `Unexpected missing scopes likely needed for highlighting to work: ${missingScopes.join(", ")}`,
          { ruleId: "missing-scopes", source: "rehype-starry-night-sync" },
        );
      }
      checkedScopes = true;
    }

    visit(tree, "element", (node) => {
      if (node.tagName !== "code") return;

      const classes = node.properties["className"];
      const languageClass = Array.isArray(classes)
        ? classes.find(
            (className): className is string =>
              typeof className === "string" &&
              className.startsWith(LANGUAGE_CLASS_PREFIX),
          )
        : undefined;

      if (languageClass === undefined) return SKIP;

      const language = languageClass.slice(LANGUAGE_CLASS_PREFIX.length);
      const scope = starryNight.flagToScope(language);

      if (scope) {
        node.children = starryNight.highlight(toString(node), scope)
          .children as ElementContent[];
      } else {
        const suggestions = suggestNames(language, names);
        file.message(
          `Unexpected unknown language \`${language}\` defined with \`language-\` class, expected a known name${
            suggestions.length > 0
              ? `; did you mean ${listFormatDisjunction.format(suggestions.map((name) => `\`${name}\``))}`
              : ""
          }`,
          {
            ...(node.position ? { place: node.position } : {}),
            ruleId: "missing-language",
            source: "rehype-starry-night-sync",
          },
        );
      }

      return SKIP;
    });
  };
};

export default rehypeStarryNightSync;
