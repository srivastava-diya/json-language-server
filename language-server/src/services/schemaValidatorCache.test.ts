import { describe, test, expect, beforeAll, afterAll, afterEach } from "vitest";
import { TestClient } from "../test/test-client.ts";
import { unregisterSchema } from "@hyperjump/json-schema";

import type { Diagnostic, PublishDiagnosticsParams } from "vscode-languageserver";

describe("SchemaValidatorCache", () => {
  let client: TestClient;
  let fixtureSchemaUri: string;

  beforeAll(async () => {
    client = new TestClient();
    await client.start();
  });

  afterAll(async () => {
    await client.stop();
  });

  afterEach(() => {
    if (fixtureSchemaUri) {
      unregisterSchema(fixtureSchemaUri);
    }
  });

  test("Same schema used twice should only compile once", async () => {
    fixtureSchemaUri = await client.writeDocument(`first.schema.json`, `{
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "type": "object",
      "properties": {
        "name": { "type": "string" }
      }
    }`);

    const instance1Uri = await client.writeDocument("instance1.json", `{
      "$schema": "${fixtureSchemaUri}",
      "name": 123
    }`);

    const instance2Uri = await client.writeDocument("instance2.json", `{
      "$schema": "${fixtureSchemaUri}",
      "name": true
    }`);

    const diagnosticsPromise1 = new Promise<Diagnostic[]>((resolve) => {
      client.onNotification("textDocument/publishDiagnostics", (params: PublishDiagnosticsParams) => {
        resolve(params.diagnostics);
      });
    });
    await client.openDocument("instance1.json");
    const diagnostics1 = await diagnosticsPromise1;

    const diagnosticsPromise2 = new Promise<Diagnostic[]>((resolve) => {
      client.onNotification("textDocument/publishDiagnostics", (params: PublishDiagnosticsParams) => {
        resolve(params.diagnostics);
      });
    });
    await client.openDocument("instance2.json");
    const diagnostics2 = await diagnosticsPromise2;

    expect(diagnostics1).toHaveLength(1);
    expect((diagnostics1[0].message as string).replace(/[\u2068\u2069]/g, "")).toBe("Expected a string");

    expect(diagnostics2).toHaveLength(1);
    expect((diagnostics2[0].message as string).replace(/[\u2068\u2069]/g, "")).toBe("Expected a string");

    await client.closeDocument(instance1Uri);
    await client.closeDocument(instance2Uri);
  });

  test("Schema changes on disk so cache should invalidate", async () => {
    fixtureSchemaUri = await client.writeDocument("second.schema.json", `{
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "type": "object",
      "properties": {
        "name": { "type": "string" }
      }
    }`);

    const instanceUri = await client.writeDocument("instance-scenario2.json", `{
      "$schema": "${fixtureSchemaUri}",
      "name": 123
    }`);

    const diagnosticsPromise1 = new Promise<Diagnostic[]>((resolve) => {
      client.onNotification("textDocument/publishDiagnostics", (params: PublishDiagnosticsParams) => {
        resolve(params.diagnostics);
      });
    });
    await client.openDocument("instance-scenario2.json");
    const diagnostics1 = await diagnosticsPromise1;
    expect(diagnostics1).toHaveLength(1);
    expect((diagnostics1[0].message as string).replace(/[\u2068\u2069]/g, "")).toBe("Expected a string");

    await client.writeDocument("second.schema.json", `{
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "type": "object",
      "properties": {
        "name": { "type": "number" }
      }
    }`);

    const diagnosticsPromise2 = new Promise<Diagnostic[]>((resolve) => {
      client.onNotification("textDocument/publishDiagnostics", (params: PublishDiagnosticsParams) => {
        resolve(params.diagnostics);
      });
    });
    await client.changeDocument("instance-scenario2.json", `{
      "$schema": "${fixtureSchemaUri}",
      "name": 123
    }`);

    const diagnostics2 = await diagnosticsPromise2;
    expect(diagnostics2).toHaveLength(0);

    await client.closeDocument(instanceUri);
  });

  test("Invalid schema URI should not crash", async () => {
    const instanceUri = await client.writeDocument("instance.json", `{
      "$schema": "file:///non-existent-schema.schema.json",
      "name": 123
    }`);

    const diagnosticsPromise = new Promise<Diagnostic[]>((resolve) => {
      client.onNotification("textDocument/publishDiagnostics", (params: PublishDiagnosticsParams) => {
        resolve(params.diagnostics);
      });
    });
    await client.openDocument("instance.json");
    const diagnostics = await diagnosticsPromise;

    expect(diagnostics).toHaveLength(0);

    await client.closeDocument(instanceUri);
  });
});
