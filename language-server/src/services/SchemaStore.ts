import { validate } from "@hyperjump/json-schema-errors";
import { unregisterSchema } from "@hyperjump/json-schema";

import type { EvaluateInstance, Json } from "@hyperjump/json-schema-errors";
import type { Server } from "../services/server.ts";

export class SchemaStore {
  private validatorCache: Map<string, EvaluateInstance> = new Map();

  constructor(server: Server) {
    server.onExit(() => {
      this.clearAll();
    });
  }

  async validate(schemaUri: string, instance: Json) {
    if (!this.validatorCache.has(schemaUri)) {
      this.validatorCache.set(schemaUri, await validate(schemaUri));
    }
    const validator = this.validatorCache.get(schemaUri)!;

    return validator(instance);
  }

  clearAll() {
    for (const schemaUri of this.validatorCache.keys()) {
      this.clear(schemaUri);
    }
  }

  clear(schemaUri: string) {
    unregisterSchema(schemaUri);
    this.validatorCache.delete(schemaUri);
    // TODO: Unregister schemas under $id and id
  }
}
