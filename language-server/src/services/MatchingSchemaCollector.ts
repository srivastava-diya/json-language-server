import type { EvaluationPlugin, ValidationContext } from "@hyperjump/json-schema/experimental";
import type { JsonNode } from "@hyperjump/json-schema/instance/experimental";
import type { Node, Keyword } from "@hyperjump/json-schema/experimental";

type Annotation = Record<string, unknown>;

type SchemaAnnotationContext = ValidationContext & {
  pendingAnnotations?: Annotation;
};

export class MatchingSchemaCollector implements EvaluationPlugin {
  private annotations: Map<string, Annotation[]> = new Map();

  beforeSchema(_url: string, _instance: JsonNode, context: SchemaAnnotationContext): void {
    context.pendingAnnotations = {};
  }

  afterKeyword(node: Node<unknown>, instance: JsonNode, context: SchemaAnnotationContext, valid: boolean, schemaContext: SchemaAnnotationContext, keyword: Keyword<unknown>): void {
    if (!valid) {
      return;
    }

    const [keywordId, , keywordValue] = node;

    if (keyword.annotation) {
      schemaContext.pendingAnnotations ??= {};
      schemaContext.pendingAnnotations[keywordId] = keyword.annotation(keywordValue, instance, context);
    }
  }

  afterSchema(_schemaUri: string, instance: JsonNode, context: SchemaAnnotationContext, valid: boolean): void {
    const annotations = context.pendingAnnotations;

    if (!valid || !annotations) {
      return;
    }

    const instanceLocation = instance.pointer;

    if (!this.annotations.has(instanceLocation)) {
      this.annotations.set(instanceLocation, []);
    }

    const existing = this.annotations.get(instanceLocation)!;
    existing.push(annotations);
  }

  getAnnotations(instanceLocation: string): Annotation[] {
    return this.annotations.get(instanceLocation) ?? [];
  }
}
