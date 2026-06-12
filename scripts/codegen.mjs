// Packet K-01 (Approved-Protected-Change: K-01).
// schemas/*.schema.json -> packages/shared/src/generated/*.ts (Zod) and
// workers/offline/generated/*.py (Pydantic v2 via datamodel-code-generator).
//
// The Zod emitter is hand-rolled: our schemas use usc:// $refs and
// allOf/if/then conditionals, which json-schema-to-zod resolves incorrectly.
// It compiles ONLY the JSON Schema subset the schemas actually use and throws
// CodegenError on anything else — extending schemas/ means extending this
// emitter, never silently mis-compiling (INV-9).

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMAS_DIR = join(REPO_ROOT, "schemas");
const ZOD_OUT_DIR = join(REPO_ROOT, "packages/shared/src/generated");
const PYDANTIC_OUT_DIR = join(REPO_ROOT, "workers/offline/generated");
const PYTHON_PROJECT_DIR = join(REPO_ROOT, "workers/offline");

const TS_HEADER = `// GENERATED FILE — DO NOT EDIT (INV-9). Source of truth: schemas/*.schema.json.
// Regenerate with \`make codegen\`. Hand edits fail CI.
`;
const PY_HEADER = `# GENERATED FILE — DO NOT EDIT (INV-9). Source of truth: schemas/*.schema.json.
# Regenerate with \`make codegen\`. Hand edits fail CI.`;

class CodegenError extends Error {
  constructor(message, schemaPath) {
    super(`${message} (at ${schemaPath})`);
    this.name = "CodegenError";
  }
}

/** Keywords that carry no shape information; everything else must be compiled or rejected. */
const METADATA_KEYWORDS = new Set(["$schema", "$id", "title", "description"]);

function loadSchemas() {
  const fileNames = readdirSync(SCHEMAS_DIR)
    .filter((name) => name.endsWith(".schema.json"))
    .sort();
  if (fileNames.length === 0) throw new CodegenError("no schemas found", SCHEMAS_DIR);
  return fileNames.map((fileName) => {
    const schema = JSON.parse(readFileSync(join(SCHEMAS_DIR, fileName), "utf8"));
    const baseName = fileName.replace(/\.schema\.json$/, "");
    if (typeof schema.$id !== "string" || typeof schema.title !== "string") {
      throw new CodegenError("schema must declare $id and title", fileName);
    }
    return { fileName, baseName, schema };
  });
}

// ---------------------------------------------------------------------------
// Zod emission
// ---------------------------------------------------------------------------

function emitZodModule(entry, schemasById) {
  const imports = new Set();
  const refExpr = (ref, at) => {
    const target = schemasById.get(ref);
    if (!target) throw new CodegenError(`unresolved $ref "${ref}"`, at);
    if (target.baseName !== entry.baseName) {
      imports.add(`import { ${target.schema.title}Schema } from "./${target.baseName}.ts";`);
    }
    return `${target.schema.title}Schema`;
  };
  const body = compileNode(entry.schema, refExpr, `${entry.fileName}#`);
  const importLines = [`import { z } from "zod";`, ...[...imports].sort()].join("\n");
  const title = entry.schema.title;
  return `${TS_HEADER}${importLines}

export const ${title}Schema = ${body};

export type ${title} = z.infer<typeof ${title}Schema>;
`;
}

function compileNode(node, refExpr, at) {
  if (typeof node !== "object" || node === null) throw new CodegenError("schema node must be an object", at);
  const keywords = Object.keys(node).filter((key) => !METADATA_KEYWORDS.has(key));
  if (node.$ref !== undefined) {
    if (keywords.length > 1) throw new CodegenError("$ref with sibling keywords is unsupported", at);
    return refExpr(node.$ref, at);
  }
  if (node.enum !== undefined) return compileEnum(node, at);
  if (node.const !== undefined) return `z.literal(${JSON.stringify(node.const)})`;
  switch (node.type) {
    case "object":
      return compileObject(node, refExpr, at);
    case "array":
      return compileArray(node, refExpr, at);
    case "string":
      return compileString(node, at);
    case "number":
    case "integer":
      return compileNumber(node, at);
    case "boolean":
      return assertOnlyKeywords(node, ["type"], at), "z.boolean()";
    default:
      throw new CodegenError(`unsupported schema (type: ${JSON.stringify(node.type)})`, at);
  }
}

function assertOnlyKeywords(node, allowed, at) {
  const extra = Object.keys(node).filter((key) => !METADATA_KEYWORDS.has(key) && !allowed.includes(key));
  if (extra.length > 0) throw new CodegenError(`unsupported keywords [${extra.join(", ")}]`, at);
}

function compileEnum(node, at) {
  assertOnlyKeywords(node, ["enum"], at);
  if (!Array.isArray(node.enum) || !node.enum.every((value) => typeof value === "string")) {
    throw new CodegenError("only string enums are supported", at);
  }
  return `z.enum([${node.enum.map((value) => JSON.stringify(value)).join(", ")}])`;
}

function compileString(node, at) {
  assertOnlyKeywords(node, ["type", "minLength", "pattern", "format"], at);
  let expr = "z.string()";
  if (node.format !== undefined) {
    if (node.format !== "date-time") throw new CodegenError(`unsupported format "${node.format}"`, at);
    expr += ".datetime({ offset: true })";
  }
  if (node.minLength !== undefined) expr += `.min(${node.minLength})`;
  if (node.pattern !== undefined) expr += `.regex(new RegExp(${JSON.stringify(node.pattern)}))`;
  return expr;
}

function compileNumber(node, at) {
  assertOnlyKeywords(node, ["type", "minimum", "maximum"], at);
  let expr = "z.number()";
  if (node.type === "integer") expr += ".int()";
  if (node.minimum !== undefined) expr += `.min(${node.minimum})`;
  if (node.maximum !== undefined) expr += `.max(${node.maximum})`;
  return expr;
}

function compileArray(node, refExpr, at) {
  assertOnlyKeywords(node, ["type", "items", "minItems"], at);
  if (node.items === undefined) throw new CodegenError("array without items is unsupported", at);
  let expr = `z.array(${compileNode(node.items, refExpr, `${at}/items`)})`;
  if (node.minItems !== undefined) expr += `.min(${node.minItems})`;
  return expr;
}

function compileObject(node, refExpr, at) {
  assertOnlyKeywords(node, ["type", "properties", "required", "additionalProperties", "allOf"], at);
  if (node.properties === undefined) {
    // Free-form object (e.g. artifact.body) or a typed map (e.g. verdict3.bindings).
    if (node.allOf !== undefined) throw new CodegenError("allOf without properties is unsupported", at);
    if (typeof node.additionalProperties === "object") {
      return `z.record(${compileNode(node.additionalProperties, refExpr, `${at}/additionalProperties`)})`;
    }
    return "z.record(z.unknown())";
  }
  const required = new Set(node.required ?? []);
  const propertyLines = Object.entries(node.properties).map(([name, sub]) => {
    const optional = required.has(name) ? "" : ".optional()";
    return `  ${JSON.stringify(name)}: ${compileNode(sub, refExpr, `${at}/properties/${name}`)}${optional},`;
  });
  let expr = `z.object({\n${propertyLines.join("\n")}\n})`;
  if (node.additionalProperties === false) expr += ".strict()";
  else if (node.additionalProperties !== undefined) {
    throw new CodegenError("properties combined with schema-valued additionalProperties is unsupported", at);
  }
  if (node.allOf !== undefined) expr += compileConditionalRefinements(node.allOf, at);
  return expr;
}

/** allOf entries must be if/then conditionals; compiled to a superRefine so INV-5/INV-1 style "required iff" rules survive codegen. */
function compileConditionalRefinements(allOf, at) {
  const checks = allOf.map((clause, index) => {
    const clauseAt = `${at}/allOf/${index}`;
    if (!clause.if?.properties || !clause.then) throw new CodegenError("only if/then conditionals are supported in allOf", clauseAt);
    const conditions = Object.entries(clause.if.properties).map(([name, sub]) => {
      if (sub.const === undefined) throw new CodegenError("if-conditions must be property const checks", clauseAt);
      return { name, expr: `value[${JSON.stringify(name)}] === ${JSON.stringify(sub.const)}`, described: `${name} === ${JSON.stringify(sub.const)}` };
    });
    const guard = conditions.map((condition) => condition.expr).join(" && ");
    const describedGuard = conditions.map((condition) => condition.described).join(" and ");
    const statements = [];
    for (const requiredField of clause.then.required ?? []) {
      statements.push(
        `    if (value[${JSON.stringify(requiredField)}] === undefined) {\n` +
          `      refinementCtx.addIssue({ code: z.ZodIssueCode.custom, path: [${JSON.stringify(requiredField)}], message: ${JSON.stringify(`required when ${describedGuard}`)} });\n` +
          `    }`,
      );
    }
    for (const [fieldName, sub] of Object.entries(clause.then.properties ?? {})) {
      const allowed = Object.keys(sub).filter((key) => key !== "minItems");
      if (allowed.length > 0) throw new CodegenError(`unsupported then-constraints [${allowed.join(", ")}]`, clauseAt);
      statements.push(
        `    const ${fieldName}Value = value[${JSON.stringify(fieldName)}];\n` +
          `    if (${fieldName}Value !== undefined && ${fieldName}Value.length < ${sub.minItems}) {\n` +
          `      refinementCtx.addIssue({ code: z.ZodIssueCode.custom, path: [${JSON.stringify(fieldName)}], message: ${JSON.stringify(`at least ${sub.minItems} item(s) required when ${describedGuard}`)} });\n` +
          `    }`,
      );
    }
    return `  if (${guard}) {\n${statements.join("\n")}\n  }`;
  });
  return `.superRefine((value, refinementCtx) => {\n${checks.join("\n")}\n})`;
}

function generateZod(entries, schemasById) {
  rmSync(ZOD_OUT_DIR, { recursive: true, force: true });
  mkdirSync(ZOD_OUT_DIR, { recursive: true });
  for (const entry of entries) {
    writeFileSync(join(ZOD_OUT_DIR, `${entry.baseName}.ts`), emitZodModule(entry, schemasById));
  }
  const exportLines = entries
    .map((entry) => `export { ${entry.schema.title}Schema, type ${entry.schema.title} } from "./${entry.baseName}.ts";`)
    .join("\n");
  writeFileSync(join(ZOD_OUT_DIR, "index.ts"), `${TS_HEADER}${exportLines}\n`);
}

// ---------------------------------------------------------------------------
// Pydantic emission (datamodel-code-generator, pinned in workers/offline/pyproject.toml)
// ---------------------------------------------------------------------------

function generatePydantic(entries) {
  // datamodel-code-generator cannot resolve the usc:// scheme and chokes on
  // dots in module names, so stage rewritten copies: usc:// $refs become
  // relative file refs and file names become python-safe module names.
  const stagingDir = mkdtempSync(join(tmpdir(), "usc-codegen-"));
  try {
    const moduleNameById = new Map(
      entries.map((entry) => [entry.schema.$id, `${entry.baseName.replaceAll("-", "_")}.json`]),
    );
    for (const entry of entries) {
      const rewritten = rewriteRefs(entry.schema, moduleNameById, entry.fileName);
      delete rewritten.$id;
      writeFileSync(join(stagingDir, moduleNameById.get(entry.schema.$id)), JSON.stringify(rewritten, null, 2));
    }
    rmSync(PYDANTIC_OUT_DIR, { recursive: true, force: true });
    execFileSync(
      "uv",
      [
        "run", "--directory", PYTHON_PROJECT_DIR, "datamodel-codegen",
        "--input", stagingDir,
        "--input-file-type", "jsonschema",
        "--output", PYDANTIC_OUT_DIR,
        "--output-model-type", "pydantic_v2.BaseModel",
        "--base-class", "usc_models_base.UscFrozenModel",
        "--target-python-version", "3.12",
        "--use-standard-collections",
        "--use-union-operator",
        "--field-constraints",
        "--use-schema-description",
        "--use-double-quotes",
        "--disable-timestamp",
        "--custom-file-header", PY_HEADER,
      ],
      { stdio: "inherit" },
    );
    patchPydanticConditionals(entries);
  } finally {
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

function patchPydanticConditionals(entries) {
  for (const entry of entries) {
    if (!Array.isArray(entry.schema.allOf) || entry.schema.allOf.length === 0) continue;
    const conditionalChecks = emitPydanticConditionalChecks(entry.schema);
    if (conditionalChecks.length === 0) continue;
    const outputPath = join(PYDANTIC_OUT_DIR, `${entry.baseName.replaceAll("-", "_")}.py`);
    const generated = readFileSync(outputPath, "utf8");
    const withImport = generated.replace(
      "from pydantic import ConfigDict, Field",
      "from pydantic import ConfigDict, Field, model_validator",
    );
    const validatorMethod = [
      "",
      "    @model_validator(mode=\"after\")",
      `    def validate_json_schema_conditionals(self) -> "${entry.schema.title}":`,
      ...conditionalChecks,
      "        return self",
    ].join("\n");
    writeFileSync(outputPath, `${withImport.trimEnd()}\n${validatorMethod}\n`);
  }
}

function emitPydanticConditionalChecks(schema) {
  return schema.allOf.flatMap((clause, index) => {
    const clauseAt = `${schema.title}.allOf[${index}]`;
    if (!clause.if?.properties || !clause.then) {
      throw new CodegenError("only if/then conditionals are supported for Pydantic patching", clauseAt);
    }
    const guardParts = Object.entries(clause.if.properties).map(([fieldName, sub]) => {
      if (sub.const === undefined) throw new CodegenError("if-conditions must be property const checks", clauseAt);
      const enumName = pythonClassName(fieldName);
      return `self.${fieldName} == ${enumName}.${pythonEnumMember(sub.const)}`;
    });
    const guard = guardParts.join(" and ");
    const checks = [];
    for (const requiredField of clause.then.required ?? []) {
      checks.push(
        `        if ${guard} and self.${requiredField} is None:`,
        `            raise ValueError(${JSON.stringify(`${requiredField} is required when ${describePydanticGuard(clause.if.properties)}`)})`,
      );
    }
    for (const [fieldName, sub] of Object.entries(clause.then.properties ?? {})) {
      const allowed = Object.keys(sub).filter((key) => key !== "minItems");
      if (allowed.length > 0) throw new CodegenError(`unsupported then-constraints [${allowed.join(", ")}]`, clauseAt);
      checks.push(
        `        if ${guard} and self.${fieldName} is not None and len(self.${fieldName}) < ${sub.minItems}:`,
        `            raise ValueError(${JSON.stringify(`${fieldName} must contain at least ${sub.minItems} item(s) when ${describePydanticGuard(clause.if.properties)}`)})`,
      );
    }
    return checks;
  });
}

function pythonClassName(fieldName) {
  return fieldName.slice(0, 1).toUpperCase() + fieldName.slice(1);
}

function pythonEnumMember(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new CodegenError(`enum const ${JSON.stringify(value)} is not a Python identifier`, "pydantic conditionals");
  }
  return value;
}

function describePydanticGuard(properties) {
  return Object.entries(properties)
    .map(([fieldName, sub]) => `${fieldName} == ${JSON.stringify(sub.const)}`)
    .join(" and ");
}

function rewriteRefs(node, moduleNameById, at) {
  if (Array.isArray(node)) return node.map((element) => rewriteRefs(element, moduleNameById, at));
  if (typeof node !== "object" || node === null) return node;
  const rewritten = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "$ref" && typeof value === "string" && value.startsWith("usc://")) {
      const moduleName = moduleNameById.get(value);
      if (!moduleName) throw new CodegenError(`unresolved $ref "${value}"`, at);
      rewritten[key] = moduleName;
    } else {
      rewritten[key] = rewriteRefs(value, moduleNameById, at);
    }
  }
  return rewritten;
}

// ---------------------------------------------------------------------------

const schemaEntries = loadSchemas();
const schemasById = new Map(schemaEntries.map((entry) => [entry.schema.$id, entry]));
generateZod(schemaEntries, schemasById);
generatePydantic(schemaEntries);
console.log(`✓ codegen: ${schemaEntries.length} schemas -> ${ZOD_OUT_DIR} + ${PYDANTIC_OUT_DIR}`);
