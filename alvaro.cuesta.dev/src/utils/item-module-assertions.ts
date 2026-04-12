import type { MDXContent } from "mdx/types";
import { isItemModuleDate, type ItemModuleDate } from "./item-dates";

const getField = (module: NodeModule, field: string): unknown =>
  (module as unknown as Record<string, unknown>)[field];

/**
 * Assert that a module has a valid MDX default export.
 */
export function assertHasMdxDefaultExport(
  module: NodeModule,
  label: string,
): void {
  if (!("default" in module)) {
    throw new Error(`${label} module does not have a default export.`);
  }

  if (typeof module.default !== "function") {
    throw new Error(
      `Default export in ${label} module is not a \`function\`, but a \`${typeof module.default}\`.`,
    );
  }

  if (
    !("isMDXComponent" in module.default) ||
    typeof module.default.isMDXComponent !== "boolean" ||
    !module.default.isMDXComponent
  ) {
    throw new Error(
      `Default export in ${label} module is not an MDX component.`,
    );
  }
}

/**
 * Assert that an optional date field is a valid ItemModuleDate.
 */
export function assertOptionalDate(
  module: NodeModule,
  field: string,
  label: string,
): void {
  const value = getField(module, field);
  if (field in module && value !== undefined && !isItemModuleDate(value)) {
    throw new Error(`\`${field}\` in ${label} is not a valid date type.`);
  }
}

/**
 * Assert that an optional boolean field is valid.
 */
export function assertOptionalBoolean(
  module: NodeModule,
  field: string,
  label: string,
): void {
  const value = getField(module, field);
  if (field in module && value !== undefined && typeof value !== "boolean") {
    throw new Error(
      `\`${field}\` in ${label} is not a \`boolean\`, but a \`${typeof value}\`.`,
    );
  }
}

/**
 * Assert that an optional string field is valid.
 */
export function assertOptionalString(
  module: NodeModule,
  field: string,
  label: string,
): void {
  const value = getField(module, field);
  if (field in module && value !== undefined && typeof value !== "string") {
    throw new Error(
      `\`${field}\` in ${label} is not a \`string\`, but a \`${typeof value}\`.`,
    );
  }
}

/**
 * Assert that a required array field is present and valid.
 */
export function assertRequiredArray(
  module: NodeModule,
  field: string,
  label: string,
): void {
  if (!(field in module)) {
    throw new Error(`${label} does not have a \`${field}\` export.`);
  }

  const value = getField(module, field);
  if (!Array.isArray(value)) {
    throw new Error(
      `\`${field}\` in ${label} is not an \`array\`, but a \`${typeof value}\`.`,
    );
  }
}

/**
 * Assert that an optional string array field is valid.
 */
export function assertOptionalStringArray(
  module: NodeModule,
  field: string,
  label: string,
): void {
  const value = getField(module, field);
  if (field in module && value !== undefined) {
    if (
      !Array.isArray(value) ||
      !value.every((t: unknown) => typeof t === "string")
    ) {
      throw new Error(`\`${field}\` in ${label} is not a \`string[]\`.`);
    }
  }
}

export type ContentItemModule = NodeModule & {
  default: MDXContent;
  creationDate?: ItemModuleDate | undefined;
  publicationDate?: ItemModuleDate | undefined;
  lastModificationDate?: ItemModuleDate | undefined;
  draft?: boolean | undefined;
  tableOfContents: unknown[];
};

/**
 * Assert common content item module fields shared by blog and timeline:
 * MDX default export, date fields, draft, and tableOfContents.
 *
 * Note: individual assertion helpers intentionally don't use `asserts` return
 * types because TypeScript can't compose multiple assertion narrowings —
 * each would replace the previous instead of intersecting. The composite
 * `asserts` here declares the full narrowed type.
 */
export function assertIsContentItemModule(
  m: NodeModule,
  label: string,
): asserts m is ContentItemModule {
  assertHasMdxDefaultExport(m, label);
  assertOptionalDate(m, "creationDate", label);
  assertOptionalDate(m, "publicationDate", label);
  assertOptionalDate(m, "lastModificationDate", label);
  assertOptionalBoolean(m, "draft", label);
  assertRequiredArray(m, "tableOfContents", label);
}
