import { compile, getSchema } from "@hyperjump/json-schema/experimental";
import { evaluateCompiledSchema } from "@hyperjump/json-schema-errors";
import { unregisterSchema } from "@hyperjump/json-schema";

import type { CompiledSchema } from "@hyperjump/json-schema/experimental";
import type { Json, ValidationResult } from "@hyperjump/json-schema-errors";
import type { Server } from "../services/server.ts";

export class SchemaStore {
  private compiledSchemaCache: Map<string, CompiledSchema> = new Map();

  constructor(server: Server) {
    server.onExit(() => {
      this.clearAll();
    });

    server.onDidChangeWatchedFiles((params) => {
      const changedUris = new Set(params.changes.map((change) => decodeURIComponent(change.uri)));

      const toClear = [...this.compiledSchemaCache.keys()].filter((schemaUri) => {
        const dependentSchemas = this.getDepsFromCompiledSchema(this.compiledSchemaCache.get(schemaUri)!);

        return [...changedUris].some((uri) => dependentSchemas.has(uri));
      });

      for (const schemaUri of toClear) {
        this.clear(schemaUri);
      }
    });
  }

  async validate(schemaUri: string, instance: Json): Promise<ValidationResult> {
    if (!this.compiledSchemaCache.has(schemaUri)) {
      const schema = await getSchema(schemaUri);
      this.compiledSchemaCache.set(schemaUri, await compile(schema));
    }
    const compiledSchema = this.compiledSchemaCache.get(schemaUri)!;

    return evaluateCompiledSchema(compiledSchema, instance);
  }

  getDependentSchemaUris(schemaUri: string): Set<string> | undefined {
    const compiledSchema = this.compiledSchemaCache.get(schemaUri);
    if (compiledSchema === undefined) {
      return undefined;
    }
    return this.getDepsFromCompiledSchema(compiledSchema);
  }

  clearAll() {
    for (const schemaUri of this.compiledSchemaCache.keys()) {
      this.clear(schemaUri);
    }
  }

  clear(schemaUri: string) {
    unregisterSchema(schemaUri);
    this.compiledSchemaCache.delete(schemaUri);
    // TODO: Unregister schemas under $id and id
  }

  private getDepsFromCompiledSchema(compiledSchema: CompiledSchema): Set<string> {
    return new Set(
      Object.keys(compiledSchema.ast)
        .filter((key) => key !== "metaData")
        .filter((key) => key !== "plugins")
        .map((key) => key.split("#")[0])
        .filter((uri) => uri !== "")
    );
  }
}
