import { Server } from "../services/server.ts";
import { JsonDocuments } from "../services/JsonDocuments.ts";
import { JsonDocument } from "../models/JsonDocument.ts";

import type { Diagnostic } from "vscode-languageserver";
import type { SchemaStore } from "../services/SchemaStore.ts";

export type DiagnosticsProvider = {
  getDiagnostics(jsonDocument: JsonDocument): Promise<Diagnostic[]>;
};

export class Diagnostics {
  private server: Server;
  private providers: DiagnosticsProvider[];

  constructor(server: Server, documents: JsonDocuments, schemaStore: SchemaStore, providers: DiagnosticsProvider[]) {
    this.server = server;
    this.providers = providers;

    documents.onDidChangeContent(async (change) => {
      await this.sendDiagnostics(change.document);
    });

    server.onDidChangeWatchedFiles(async (params) => {
      const changedUris = new Set(params.changes.map((change) => decodeURIComponent(change.uri)));

      for (const document of documents.all()) {
        const schemaUri = document.getSchemaUri();

        if (schemaUri === undefined) {
          continue;
        }
        const dependentSchemaUris = schemaStore.getDependentSchemaUris(schemaUri);

        if (dependentSchemaUris === undefined || [...changedUris].some((uri) => dependentSchemaUris.has(uri))) {
          document.revalidate();
          await this.sendDiagnostics(document);
        }
      }
    });
  }

  async sendDiagnostics(document: JsonDocument) {
    const diagnostics = [];
    for (const provider of this.providers) {
      diagnostics.push(...await provider.getDiagnostics(document));
    }

    await this.server.sendDiagnostics({
      uri: document.uri,
      diagnostics: diagnostics
    });
  }
}
