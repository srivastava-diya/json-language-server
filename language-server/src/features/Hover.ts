import { MarkupKind } from "vscode-languageserver";
import { JsonDocuments } from "../services/JsonDocuments.ts";

import type { Server } from "../services/Server.ts";
import type { ServerCapabilities } from "vscode-languageserver";

export class Hover {
  private server: Server;
  private documents: JsonDocuments;

  constructor(server: Server, documents: JsonDocuments) {
    this.server = server;
    this.documents = documents;

    server.onInitialize(() => {
      const serverCapabilities: ServerCapabilities = {
        hoverProvider: true
      };

      return {
        capabilities: serverCapabilities
      };
    });

    server.onHover(async (params) => {
      const document = this.documents.get(params.textDocument.uri);
      if (!document) {
        return null;
      }

      const offset = document.offsetAt(params.position);

      const node = document.findNodeAtOffset(offset);
      if (!node) {
        return null;
      }

      await document.getSchemaErrors();
      const pointer = document.getPointerForNode(node);
      const annotations = document.getMatchingSchemaCollector().getAnnotations(pointer);
      if (!annotations?.title && !annotations?.description) {
        return null;
      }

      const lines: string[] = [];

      if (annotations.title) {
        lines.push(`**${annotations.title}**`);
      }

      if (annotations.description) {
        lines.push(`${annotations.description}`);
      }

      if (lines.length === 0) {
        return null;
      }

      lines.push("---\n\n_hyperjump-json-language-server_");

      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: lines.join("\n\n")
        }
      };
    });
  }
}
