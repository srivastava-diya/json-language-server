import { TextDocumentSyncKind } from "vscode-languageserver";
import { Server } from "../services/server.ts";
import { JsonDocument } from "../models/JsonDocument.ts";

import type { ServerCapabilities, Diagnostic, TextDocuments } from "vscode-languageserver";

export type DiagnosticsProvider = {
  getDiagnostics(jsonDocument: JsonDocument): Promise<Diagnostic[]>;
};

export class Diagnostics {
  private providers: DiagnosticsProvider[];

  constructor(server: Server, documents: TextDocuments<JsonDocument>, providers: DiagnosticsProvider[]) {
    this.providers = providers;

    server.onInitialize(() => {
      const serverCapabilities: ServerCapabilities = {
        textDocumentSync: TextDocumentSyncKind.Incremental
      };

      return {
        capabilities: serverCapabilities
      };
    });

    documents.onDidChangeContent(async (change) => {
      const diagnostics = [];
      for (const provider of this.providers) {
        diagnostics.push(...await provider.getDiagnostics(change.document));
      }

      await server.sendDiagnostics({
        uri: change.document.uri,
        diagnostics: diagnostics
      });
    });
  }
}
