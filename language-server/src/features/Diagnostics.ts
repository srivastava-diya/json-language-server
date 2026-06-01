import { TextDocuments, TextDocumentSyncKind } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Server } from "../services/server.ts";

import type { ServerCapabilities, Diagnostic } from "vscode-languageserver";

export type DiagnosticsProvider = {
  getDiagnostics(textDocument: TextDocument): Diagnostic[];
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

    // Single onDidChangeContent handler to ensure one combined sendDiagnostics call per change, preventing multiple diagnostic pushes per keystroke from separate features
    documents.onDidChangeContent(async (change) => {
      const diagnostics = [];
      for (const provider of this.providers) {
        diagnostics.push(...provider.getDiagnostics(change.document));
      }

      // const textDocument = change.document;
      // const text = textDocument.getText();
      // const parseErrors: jsonc.ParseError[] = [];

      // const tree = jsonc.parseTree(text, parseErrors);

      // // for syntax errors
      // const syntaxDiagnostics = getSyntaxDiagnostics(textDocument, parseErrors);

      // // for schema validation errors
      // const schemaNode = tree ? jsonc.findNodeAtLocation(tree, ["$schema"]) : undefined;
      // const schemaUri = schemaNode?.value;
      // const schemaDiagnostics = schemaUri && parseErrors.length === 0 && tree
      //   ? await getSchemaDiagnostics(textDocument, tree, schemaUri, documentMap)
      //   : [];

      await server.sendDiagnostics({
        uri: change.document.uri,
        diagnostics: diagnostics
      });
    });
  }
}
