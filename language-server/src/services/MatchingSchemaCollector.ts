import type { EvaluationPlugin, ValidationContext } from "@hyperjump/json-schema/experimental";
import type { JsonNode } from "@hyperjump/json-schema/instance/experimental";
import type { Node, Keyword } from "@hyperjump/json-schema/experimental";

type Annotation = Record<string, unknown>;

type SchemaAnnotationContext = ValidationContext & {
  pendingAnnotation?: Annotation;
};

export class MatchingSchemaCollector implements EvaluationPlugin {
  private annotations: Map<string, Annotation[]> = new Map();

  beforeSchema(_url: string, _instance: JsonNode, context: SchemaAnnotationContext): void {
    context.pendingAnnotation = {};
  }

  afterKeyword(node: Node<unknown>, instance: JsonNode, context: SchemaAnnotationContext, valid: boolean, schemaContext: SchemaAnnotationContext, keyword: Keyword<unknown>): void {
    if (!valid) {
      return;
    }

    const [keywordId, , keywordValue] = node;

    if (keyword.annotation) {
      schemaContext.pendingAnnotation ??= {};
      schemaContext.pendingAnnotation[keywordId] = keyword.annotation(keywordValue, instance, context);
    }
  }

  afterSchema(_schemaUri: string, instance: JsonNode, context: SchemaAnnotationContext, valid: boolean): void {
    const annotation = context.pendingAnnotation;

    if (!valid || !annotation) {
      return;
    }

    const instanceLocation = instance.pointer;
    const existing = this.annotations.get(instanceLocation) ?? [];
    existing.push(annotation);
    this.annotations.set(instanceLocation, existing);
  }

  getAnnotations(instanceLocation: string): Annotation[] {
    return this.annotations.get(instanceLocation) ?? [];
  }
}
