import { Server } from "../services/server.ts";
import { JsonDocument } from "../models/JsonDocument.ts";

import type { Diagnostic, TextDocuments } from "vscode-languageserver";

export type DiagnosticsProvider = {
  getDiagnostics(jsonDocument: JsonDocument): Promise<Diagnostic[]>;
  clearCache?(document: JsonDocument): void;
};

export class Diagnostics {
  private providers: DiagnosticsProvider[];

  constructor(server: Server, documents: TextDocuments<JsonDocument>, providers: DiagnosticsProvider[]) {
    this.providers = providers;

    documents.onDidChangeContent(async (change) => {
      for (const provider of this.providers) {
        provider.clearCache?.(change.document);
      }

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
