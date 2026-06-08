import { TextDocuments, TextDocumentSyncKind } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Server } from "../services/server.ts";

import type { ServerCapabilities, Diagnostic } from "vscode-languageserver";

export type DiagnosticsProvider = {
  getDiagnostics(textDocument: TextDocument): Promise<Diagnostic[]>;
};

export class Diagnostics {
  private providers: DiagnosticsProvider[];

  constructor(server: Server, documents: TextDocuments<TextDocument>, providers: DiagnosticsProvider[]) {
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
