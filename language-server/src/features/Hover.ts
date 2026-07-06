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
      const document = this.documents.get(params.textDocument.uri)!;
      const annotations = await document.getAnnotations(params.position);

      const lines: string[] = [];
      for (const annotation of annotations) {
        if (annotation["https://json-schema.org/keyword/title"]) {
          lines.push(`**${annotation["https://json-schema.org/keyword/title"]}**`);
        }
        if (annotation["https://json-schema.org/keyword/description"]) {
          lines.push(`${annotation["https://json-schema.org/keyword/description"]}`);
        }
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
