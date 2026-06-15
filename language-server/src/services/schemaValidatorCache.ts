import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { validate } from "@hyperjump/json-schema-errors";
import { unregisterSchema } from "@hyperjump/json-schema";
import { JsonDocument } from "../models/JsonDocument.ts";
import type { EvaluateInstance } from "@hyperjump/json-schema-errors";

type CacheEntry = {
  compiledValidator: EvaluateInstance | null;
  content?: string;
};

export class SchemaValidatorCache {
  private cache = new Map<string, CacheEntry>();

  async getValidator(schemaUri: string): Promise<EvaluateInstance | null> {
    const currentContent = await getFileContent(schemaUri);
    let cacheEntry = this.cache.get(schemaUri);

    const hasChanged = cacheEntry && (
      currentContent !== undefined && cacheEntry.content !== currentContent
    );

    if (hasChanged) {
      unregisterSchema(schemaUri);
      this.cache.delete(schemaUri);
      cacheEntry = undefined;
    }

    if (cacheEntry === undefined) {
      try {
        const compiledValidator = await validate(schemaUri);
        cacheEntry = { compiledValidator, content: currentContent };
        this.cache.set(schemaUri, cacheEntry);
      } catch (error) {
        cacheEntry = { compiledValidator: null, content: currentContent };
        this.cache.set(schemaUri, cacheEntry);
      }
    }

    return cacheEntry.compiledValidator;
  }

  clear(document: JsonDocument) {
    unregisterSchema(document.uri);
    this.cache.delete(document.uri);
    const idNode = document.findNodeAtPointer("/$id") ?? document.findNodeAtPointer("/id");
    if (idNode && typeof idNode.value === "string") {
      unregisterSchema(idNode.value);
      this.cache.delete(idNode.value);
    }
  }
}

const getFileContent = async (uri: string): Promise<string | undefined> => {
  if (uri.startsWith("file://")) {
    try {
      const filePath = fileURLToPath(uri);
      return await readFile(filePath, "utf-8");
    } catch {
      return undefined;
    }
  }
  return undefined;
};
