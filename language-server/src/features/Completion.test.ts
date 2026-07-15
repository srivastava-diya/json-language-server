import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { CompletionRequest, CompletionItemKind, PublishDiagnosticsNotification } from "vscode-languageserver";
import { TestClient } from "../test/TestClient.ts";

describe("Completions", () => {
  let client: TestClient;
  let fixtureSchemaUri: string;

  beforeEach(async () => {
    client = new TestClient();
    await client.start();
  });

  afterEach(async () => {
    await client.stop();
  });

  test("completion returns null when there are no properties", async () => {
    const diagnostics: Promise<void> = new Promise((resolve) => {
      client.onNotification(PublishDiagnosticsNotification.type, () => {
        resolve();
      });
    });

    fixtureSchemaUri = await client.writeDocument("schema.json", `{
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "type": "object"
    }`);

    const instanceText = `{
      "$schema": "${fixtureSchemaUri}",
      ""
    }`;

    await client.writeDocument("instance.json", instanceText);
    const uri = await client.openDocument("instance.json");

    await diagnostics;

    const completions = await client.sendRequest(CompletionRequest.type, {
      textDocument: { uri },
      position: { line: 2, character: 7 }
    });

    expect(completions).toEqual([]);
  });

  test("completion returns properties", async () => {
    const diagnostics: Promise<void> = new Promise((resolve) => {
      client.onNotification(PublishDiagnosticsNotification.type, () => {
        resolve();
      });
    });

    fixtureSchemaUri = await client.writeDocument("schema.json", `{
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "type": "object",
      "properties": {
        "name": { "type": "string" }
      }
    }`);

    const instanceText = `{
      "$schema": "${fixtureSchemaUri}",
      ""
    }`;

    await client.writeDocument("instance.json", instanceText);
    const uri = await client.openDocument("instance.json");

    await diagnostics;

    const completions = await client.sendRequest(CompletionRequest.type, {
      textDocument: { uri },
      position: { line: 2, character: 7 }
    });

    expect(completions).toEqual([
      { label: "name", kind: CompletionItemKind.Property }
    ]);
  });

  test("completion returns properties for nested object", async () => {
    const diagnostics: Promise<void> = new Promise((resolve) => {
      client.onNotification(PublishDiagnosticsNotification.type, () => {
        resolve();
      });
    });

    fixtureSchemaUri = await client.writeDocument("schema.json", `{
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "type": "object",
      "properties": {
        "address": {
          "type": "object",
          "properties": {
            "street": { "type": "string" },
            "city": { "type": "string" },
            "zipCode": { "type": "number" }
          }
        }
      }
    }`);

    const instanceText = `{
      "$schema": "${fixtureSchemaUri}",
      "address": {
      ""
      }
    }`;

    await client.writeDocument("instance.json", instanceText);
    const uri = await client.openDocument("instance.json");

    await diagnostics;

    const completions = await client.sendRequest(CompletionRequest.type, {
      textDocument: { uri },
      position: { line: 3, character: 7 }
    });

    expect(completions).toEqual([
      { label: "street", kind: CompletionItemKind.Property },
      { label: "city", kind: CompletionItemKind.Property },
      { label: "zipCode", kind: CompletionItemKind.Property }
    ]);
  });
});
