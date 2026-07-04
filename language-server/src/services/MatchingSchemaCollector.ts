import * as Instance from "@hyperjump/json-schema/instance/experimental";

import type { EvaluationPlugin } from "@hyperjump/json-schema/experimental";
import type { JsonNode } from "@hyperjump/json-schema/instance/experimental";

export class MatchingSchemaCollector implements EvaluationPlugin {
  private schemas: Map<string, { title?: string; description?: string }>;

  constructor() {
    this.schemas = new Map();
  }

  afterKeyword(node: [string, string, unknown], instance: JsonNode): void {
    const [keywordId, , keywordValue] = node;
    const instanceUri = Instance.uri(instance);
    const hashIndex = instanceUri.indexOf("#");
    const instanceLocation = hashIndex === -1 ? "" : instanceUri.slice(hashIndex + 1);

    if (!this.schemas.has(instanceLocation)) {
      this.schemas.set(instanceLocation, {});
    }

    const entry = this.schemas.get(instanceLocation)!;
    if (keywordId.endsWith("/title")) {
      entry.title = keywordValue as string;
    } else if (keywordId.endsWith("/description")) {
      entry.description = keywordValue as string;
    }
  }

  getAnnotations(instanceLocation: string): { title?: string; description?: string } | undefined {
    return this.schemas.get(instanceLocation);
  }
}
