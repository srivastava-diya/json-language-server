import { compile, getSchema } from "@hyperjump/json-schema/experimental";
import { evaluateCompiledSchema } from "@hyperjump/json-schema-errors";
import { normalizeIri } from "@hyperjump/uri";

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
      const changedUris = new Set<string>();
      for (const change of params.changes) {
        changedUris.add(normalizeIri(change.uri));
      }

      for (const [schemaUri, compiledSchema] of this.compiledSchemaCache.entries()) {
        const dependentSchemas = this.getDepsFromCompiledSchema(compiledSchema);
        for (const uri of changedUris) {
          if (dependentSchemas.has(uri)) {
            this.clear(schemaUri);
            break;
          }
        }
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
    this.compiledSchemaCache.delete(schemaUri);
    // TODO: Unregister schemas under $id and id
  }

  private getDepsFromCompiledSchema(compiledSchema: CompiledSchema): Set<string> {
    const deps = new Set<string>();
    for (const key of Object.keys(compiledSchema.ast)) {
      if (key !== "metaData" && key !== "plugins") {
        deps.add(key.split("#")[0]);
      }
    }
    return deps;
  }
}
