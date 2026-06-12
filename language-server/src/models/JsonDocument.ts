import { DocumentUri, TextDocumentContentChangeEvent } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as jsonc from "jsonc-parser";
import { pointerSegments } from "@hyperjump/json-pointer";

import type { Position, Range } from "vscode-languageserver-textdocument";

export class JsonDocument implements TextDocument {
  private textDocument: TextDocument;
  private ast: jsonc.Node | undefined;
  private parseErrors: jsonc.ParseError[] = [];

  constructor(textDocument: TextDocument) {
    this.textDocument = textDocument;

    this.ast = jsonc.parseTree(this.textDocument.getText(), this.parseErrors);
  }

  get uri() {
    return this.textDocument.uri;
  }

  get languageId() {
    return this.textDocument.languageId;
  }

  get version() {
    return this.textDocument.version;
  }

  get lineCount() {
    return this.textDocument.lineCount;
  }

  getText(range?: Range): string {
    return this.textDocument.getText(range);
  }

  positionAt(offset: number): Position {
    return this.textDocument.positionAt(offset);
  }

  offsetAt(position: Position): number {
    return this.textDocument.offsetAt(position);
  }

  update(changes: TextDocumentContentChangeEvent[], version: number): void {
    TextDocument.update(this.textDocument, changes, version);
    this.parseErrors = [];
    this.ast = jsonc.parseTree(this.textDocument.getText(), this.parseErrors);
  }

  getParseErrors() {
    return this.parseErrors;
  }

  findNodeAtPointer(pointer: string) {
    if (!this.ast) {
      return;
    }

    return findNodeByPointer(this.ast, pointer);
  }
}

export namespace JsonDocument {
  export function create(uri: DocumentUri, languageId: string, version: number, content: string) {
    const textDocument = TextDocument.create(uri, languageId, version, content);
    return new JsonDocument(textDocument);
  }

  export function update(document: JsonDocument, changes: TextDocumentContentChangeEvent[], version: number) {
    document.update(changes, version);
    return document;
  }
}

const findNodeByPointer = (node: jsonc.Node, pointer: string) => {
  if (pointer === "") {
    return node;
  }

  for (let segment of pointerSegments(pointer)) {
    const key = node.type === "array" ? parseInt(segment) : segment;
    node = jsonc.findNodeAtLocation(node, [key]) ?? node;
  }

  return node;
};
