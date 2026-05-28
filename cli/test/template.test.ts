import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildApplicationJson,
  CLIENT_SCHEMA_VERSION,
  SERVER_SCHEMA_VERSION,
} from "../src/scaffold/template.js";

test("scaffold produces a single default page", () => {
  const app = buildApplicationJson({ name: "My App" }) as any;
  assert.equal(app.exportedApplication.name, "My App");
  assert.equal(app.clientSchemaVersion, CLIENT_SCHEMA_VERSION);
  assert.equal(app.serverSchemaVersion, SERVER_SCHEMA_VERSION);
  assert.equal(app.pageList.length, 1);
  assert.equal(app.pageList[0].unpublishedPage.name, "Page1");
  assert.equal(app.pageList[0].unpublishedPage.layouts[0].dsl.type, "CANVAS_WIDGET");
});

test("scaffold honours custom pages and sample widget", () => {
  const app = buildApplicationJson({
    name: "Multi",
    pages: ["Home", "Settings"],
    withSample: true,
  }) as any;
  assert.deepEqual(
    app.pageList.map((p: any) => p.unpublishedPage.name),
    ["Home", "Settings"],
  );
  // Sample widget only on the first page.
  assert.equal(app.pageList[0].unpublishedPage.layouts[0].dsl.children.length, 1);
  assert.equal(app.pageList[1].unpublishedPage.layouts[0].dsl.children.length, 0);
});

test("slugs are url-safe", () => {
  const app = buildApplicationJson({ name: "Hello World!" }) as any;
  assert.equal(app.exportedApplication.slug, "hello-world-");
});
