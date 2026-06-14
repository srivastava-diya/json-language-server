import { DiagnosticSeverity } from "vscode-languageserver";
import * as jsonc from "jsonc-parser";

import type { DiagnosticsProvider } from "./Diagnostics.ts";
import { JsonDocument } from "../models/JsonDocument.ts";

export class SyntaxValidation implements DiagnosticsProvider {
  async getDiagnostics(jsonDocument: JsonDocument) {
    return jsonDocument.getParseErrors().map((error) => ({
      severity: DiagnosticSeverity.Error,
      range: {
        start: jsonDocument.positionAt(error.offset),
        end: jsonDocument.positionAt(error.offset + error.length)
      },
      message: jsonc.printParseErrorCode(error.error),
      source: "hyperjump-json-language-server"
    }));
  }
}
