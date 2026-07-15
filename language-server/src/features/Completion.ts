import { CompletionItemKind, ServerCapabilities } from "vscode-languageserver";
import { JsonDocuments } from "../services/JsonDocuments.ts";

import type { Server } from "../services/Server.ts";
import type { CompletionItem } from "vscode-languageserver";

export class Completion {
  constructor(server: Server, jsonDocuments: JsonDocuments) {
    server.onInitialize(() => {
      const serverCapabilities: ServerCapabilities = {
        completionProvider: {
          triggerCharacters: [":", "\""]
        }
      };

      return {
        capabilities: serverCapabilities
      };
    });

    server.onCompletion(async (params) => {
      const document = jsonDocuments.get(params.textDocument.uri)!;
      const propertyNode = document.findNodeAtPosition(params.position)!;
      const objectNode = propertyNode.parent!;

      const annotations = await document.getAnnotations(objectNode);

      const completions: CompletionItem[] = [];
      for (const annotation of annotations) {
        if (!("https://json-schema.org/keyword/properties" in annotation)) {
          continue;
        }

        for (const propertyName of annotation["https://json-schema.org/keyword/properties"] as string[]) {
          completions.push({
            label: propertyName,
            kind: CompletionItemKind.Property
          });
        }
      }

      return completions;
    });
  }
}
