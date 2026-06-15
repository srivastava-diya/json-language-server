import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { JsonDocument } from "../models/JsonDocument.ts";
import { SchemaValidatorCache } from "../services/schemaValidatorCache.ts";

import type { ErrorObject, EvaluateInstance } from "@hyperjump/json-schema-errors";
import type { DiagnosticsProvider } from "./Diagnostics.ts";

export class SchemaValidation implements DiagnosticsProvider {
  private validatorCache = new SchemaValidatorCache();

  clearCache(document: JsonDocument) {
    this.validatorCache.clear(document);
  }

  async getDiagnostics(jsonDocument: JsonDocument) {
    const schemaDiagnostics: Diagnostic[] = [];

    const schemaNode = jsonDocument.findNodeAtPointer("/$schema");
    const schemaUri = schemaNode?.value;

    if (schemaUri && jsonDocument.getParseErrors().length === 0) {
      let instance = JSON.parse(jsonDocument.getText());
      try {
        const compiledValidator = await this.validatorCache.getValidator(schemaUri);

        if (compiledValidator) {
          const result = compiledValidator(instance);

          if (!result.valid) {
            const errors = result.errors;
            errors.forEach((error) => {
              const pointer = decodeURIComponent(error.instanceLocation.slice(1));
              const node = jsonDocument.findNodeAtPointer(pointer);

              if (node) {
                schemaDiagnostics.push({
                  severity: DiagnosticSeverity.Error,
                  range: {
                    start: jsonDocument.positionAt(node.offset),
                    end: jsonDocument.positionAt(node.offset + node.length)
                  },
                  message: formatError(error),
                  source: "hyperjump-json-language-server"
                });
              }
            });
          }
        }
      } catch (_error: unknown) {
        // TODO: Handle invalid or missing schema errors
      }
    }

    return schemaDiagnostics;
  }
}

const formatError = (error: ErrorObject, depth = 0): string => {
  let message = error.message;
  if (error.alternatives && error.alternatives.length > 0) {
    const indent = "  ".repeat(depth + 1);
    const lines = error.alternatives.flatMap((alt) => alt.map((subErr) => `${indent}- ${formatError(subErr, depth + 1)}`));
    message += `:\n${lines.join("\n")}`;
  }
  return message;
};
