import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { HoverRequest } from "vscode-languageserver";
import { TestClient } from "../test/TestClient.ts";
import { unregisterSchema } from "@hyperjump/json-schema";

describe("Hover", () => {
  let client: TestClient;
  let fixtureSchemaUri: string;

  beforeEach(async () => {
    client = new TestClient();
    await client.start();
  });

  afterEach(async () => {
    await client.stop();
  });

  afterEach(() => {
    unregisterSchema(fixtureSchemaUri);
  });

  test("should return title and description on hover over a property value", async () => {
    const diagnostics = new Promise<void>((resolve) => {
      client.onNotification("textDocument/publishDiagnostics", () => {
        resolve();
      });
    });

    fixtureSchemaUri = await client.writeDocument("schema.json", `{
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "type": "object",
      "properties": {
        "name": {
          "title": "Full Name",
          "description": "The full name of the person.",
          "type": "string"
        }
      }
    }`);

    const instanceText = `{\n  "$schema": "${fixtureSchemaUri}",\n  "name": "Alice"\n}`;
    await client.writeDocument("instance.json", instanceText);
    const uri = await client.openDocument("instance.json");

    await diagnostics;

    const result = await client.sendRequest(HoverRequest.type, {
      textDocument: { uri },
      position: { line: 2, character: 10 }
    });

    expect(result).not.toBeNull();
    expect(result?.contents).toMatchObject({
      value: expect.stringContaining("Full Name")
    });
    expect(result?.contents).toMatchObject({
      value: expect.stringContaining("The full name of the person.")
    });
  });

  test("should return null on hover when no schema is associated", async () => {
    await client.writeDocument("no-schema.json", `{"key": "value"}`);
    const uri = await client.openDocument("no-schema.json");

    const result = await client.sendRequest(HoverRequest.type, {
      textDocument: { uri },
      position: { line: 0, character: 8 }
    });

    expect(result).toBeNull();
  });

  test("should return null on hover over a property with no title or description", async () => {
    const diagnostics = new Promise<void>((resolve) => {
      client.onNotification("textDocument/publishDiagnostics", () => {
        resolve();
      });
    });

    fixtureSchemaUri = await client.writeDocument("schema.json", `{
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "type": "object",
      "properties": {
        "age": { "type": "number" }
      }
    }`);

    await client.writeDocument("instance.json", `{\n  "$schema": "${fixtureSchemaUri}",\n  "age": 30\n}`);
    const uri = await client.openDocument("instance.json");

    await diagnostics;

    const result = await client.sendRequest(HoverRequest.type, {
      textDocument: { uri },
      position: { line: 2, character: 8 }
    });

    expect(result).toBeNull();
  });

  test("should return only title when description is absent", async () => {
    const diagnostics = new Promise<void>((resolve) => {
      client.onNotification("textDocument/publishDiagnostics", () => {
        resolve();
      });
    });

    fixtureSchemaUri = await client.writeDocument("schema.json", `{
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "type": "object",
      "properties": {
        "status": {
          "title": "Status",
          "type": "string"
        }
      }
    }`);

    await client.writeDocument("instance.json", `{\n  "$schema": "${fixtureSchemaUri}",\n  "status": "active"\n}`);
    const uri = await client.openDocument("instance.json");

    await diagnostics;

    const result = await client.sendRequest(HoverRequest.type, {
      textDocument: { uri },
      position: { line: 2, character: 12 }
    });

    expect(result).not.toBeNull();
    expect(result?.contents).toMatchObject({
      value: expect.stringContaining("Status")
    });
  });

  test("should return null on hover in a document with JSON parse errors", async () => {
    await client.writeDocument("bad.json", `{"key": `);
    const uri = await client.openDocument("bad.json");

    const result = await client.sendRequest(HoverRequest.type, {
      textDocument: { uri },
      position: { line: 0, character: 4 }
    });

    expect(result).toBeNull();
  });
});
