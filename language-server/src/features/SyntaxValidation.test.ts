import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { TestClient } from "../test/test-client.ts";

describe("Syntax Validation", () => {
  let client: TestClient;

  beforeEach(async () => {
    client = new TestClient();
    await client.start();
  });

  afterEach(async () => {
    await client.stop();
  });

  test("invalid JSON syntax returns a diagnostic", async () => {
    const diagnosticsPromise = new Promise((resolve) => {
      client.onNotification("textDocument/publishDiagnostics", (params) => {
        resolve(params.diagnostics);
      });
    });

    await client.writeDocument("test.json", `{ "name": }`);
    await client.openDocument("test.json");

    const diagnostics = await diagnosticsPromise;
    expect(diagnostics).toHaveLength(1);
  });

  test("valid JSON Syntax should not return a diagnostic", async () => {
    const diagnosticsPromise = new Promise((resolve) => {
      client.onNotification("textDocument/publishDiagnostics", (params) => {
        resolve(params.diagnostics);
      });
    });

    await client.writeDocument("test.json", `{ "Name": "Foo" }`);
    await client.openDocument("test.json");

    const diagnostics = await diagnosticsPromise;
    expect(diagnostics).toHaveLength(0);
  });

  test("after fixing invalid JSON Syntax, it should not return a diagnostic", async () => {
    const diagnosticsPromise1 = new Promise((resolve) => {
      client.onNotification("textDocument/publishDiagnostics", (params) => {
        resolve(params.diagnostics);
      });
    });

    await client.writeDocument("test.json", `{ "name": }`);
    await client.openDocument("test.json");

    const diagnostics1 = await diagnosticsPromise1;
    expect(diagnostics1).toHaveLength(1);

    const diagnosticsPromise2 = new Promise((resolve) => {
      client.onNotification("textDocument/publishDiagnostics", (params) => {
        resolve(params.diagnostics);
      });
    });

    await client.changeDocument("test.json", `{ "Name": "Foo" }`);

    const diagnostics2 = await diagnosticsPromise2;
    expect(diagnostics2).toHaveLength(0);
  });
});
