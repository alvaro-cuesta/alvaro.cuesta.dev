import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import {
  pStr,
  cMap,
  type Parser,
  cOpt,
  cOr,
  pRegex,
  pWs,
  cSeq2,
  oComplete,
  cBetween,
  cMany,
} from "../utils/parsers.mjs";
import type { Code } from "mdast";

// Parsers for meta
const pIdentifier = pRegex(/^[a-zA-Z0-9_\-]+/);

const pUnquotedValue = pRegex(/^[^\s'"]+/);

const pDoubleQuotedValue = cMap(
  cSeq2(
    pStr('"'),
    cMap(cSeq2(cOpt(pRegex(/^[^"]*/)), pStr('"')), ([val]) => val ?? ""),
  ),
  ([, val]) => val,
);

const pSingleQuotedValue = cMap(
  cSeq2(
    pStr("'"),
    cMap(cSeq2(cOpt(pRegex(/^[^']*/)), pStr("'")), ([val]) => val ?? ""),
  ),
  ([, val]) => val,
);

// Accepts key= as key=""
const pEmptyValue = cMap(cOr(pStr('""'), pStr("''")), () => "");

const pValue = cOr(
  pDoubleQuotedValue,
  pSingleQuotedValue,
  pEmptyValue,
  cMap(pUnquotedValue, (val) =>
    val === "true" ? true : val === "false" ? false : val,
  ),
);

// Accepts key= as key=""
const pKeyValue: Parser<[string, string | boolean]> = cOr(
  // key= (with nothing after =) is treated as key=""
  cMap(cSeq2(pIdentifier, cSeq2(pStr("="), cOpt(pValue))), ([key, [, val]]) => [
    key,
    val === undefined ? "" : val,
  ]),
  cMap(pIdentifier, (key) => [key, true]),
);

const metaEntry: Parser<[string, string | boolean]> = (input) => {
  const [_, rest1] = cOpt(pWs())(input);
  const [kv, rest2] = pKeyValue(rest1);
  const [__, rest3] = cOpt(pWs())(rest2);
  return [kv, rest3];
};

export const parseMeta = oComplete(
  cBetween(cMap(cMany(metaEntry), Object.fromEntries), cOpt(pWs())),
);

declare module "mdast" {
  interface CodeData {
    hProperties?: Record<string, unknown>;
  }
}
/**
 * Remark plugin to parse code block meta into data- attributes.
 * If the meta has key "caption", find a footnote with identification codeMeta[caption]
 * and take all its MDAST and put it in data.caption.
 */
export const remarkParseCodeMeta: Plugin = () => (tree) => {
  visit(tree, "code", (node: Code) => {
    if (node.meta) {
      node.data = node.data ?? {};
      node.data.hProperties = node.data.hProperties ?? {};

      const codeMeta = parseMeta(node.meta);
      for (const [key, value] of Object.entries(codeMeta)) {
        if (typeof value === "boolean") {
          if (value) {
            node.data.hProperties[`data-${key}`] = "";
          }
          // If value is false, do not add the attribute at all
        } else {
          node.data.hProperties[`data-${key}`] = value;
        }
      }
    }
  });
};

export default remarkParseCodeMeta;
