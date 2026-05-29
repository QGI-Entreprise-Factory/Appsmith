/**
 * Builders for an import-compatible Appsmith application JSON document.
 *
 * The shape mirrors what `GET /api/v1/applications/export/{id}` produces and
 * what `POST /api/v1/applications/import/{workspaceId}` accepts. Schema version
 * defaults track the server constants (clientVersion=2, serverVersion=12 in
 * JsonSchemaVersionsFallback) and the page DSL version used by the editor.
 */

export const CLIENT_SCHEMA_VERSION = 2;
export const SERVER_SCHEMA_VERSION = 12;
export const DSL_VERSION = 87;

export interface ScaffoldOptions {
  name: string;
  /** Page names. Defaults to a single "Page1". */
  pages?: string[];
  /** Add a heading Text widget to the first page. */
  withSample?: boolean;
  clientSchemaVersion?: number;
  serverSchemaVersion?: number;
}

function emptyCanvas(children: unknown[]): Record<string, unknown> {
  return {
    widgetName: "MainContainer",
    backgroundColor: "none",
    rightColumn: 4896,
    snapColumns: 64,
    detachFromLayout: true,
    widgetId: "0",
    topRow: 0,
    bottomRow: 380,
    containerStyle: "none",
    snapRows: 125,
    parentRowSpace: 1,
    type: "CANVAS_WIDGET",
    canExtend: true,
    version: DSL_VERSION,
    minHeight: 1292,
    parentColumnSpace: 1,
    dynamicTriggerPathList: [],
    leftColumn: 0,
    dynamicBindingPathList: [],
    children,
  };
}

function sampleTextWidget(text: string): Record<string, unknown> {
  return {
    widgetName: "Heading",
    displayName: "Text",
    type: "TEXT_WIDGET",
    widgetId: "scaffoldheading",
    parentId: "0",
    renderMode: "CANVAS",
    version: 1,
    text,
    fontSize: "1.25rem",
    fontStyle: "BOLD",
    textAlign: "LEFT",
    textColor: "#231F20",
    leftColumn: 1,
    rightColumn: 33,
    topRow: 1,
    bottomRow: 5,
    parentColumnSpace: 17,
    parentRowSpace: 10,
    isLoading: false,
    dynamicBindingPathList: [],
    dynamicTriggerPathList: [],
  };
}

function buildPage(name: string, withSample: boolean): Record<string, unknown> {
  const children = withSample ? [sampleTextWidget(name)] : [];
  const layout = {
    viewMode: false,
    dsl: emptyCanvas(children),
    layoutOnLoadActions: [],
    layoutActions: [],
  };
  return {
    unpublishedPage: {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      layouts: [layout],
      isHidden: false,
    },
    publishedPage: {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      layouts: [structuredClone(layout)],
      isHidden: false,
    },
    gitSyncId: undefined,
  };
}

export function buildApplicationJson(
  options: ScaffoldOptions,
): Record<string, unknown> {
  const pages =
    options.pages && options.pages.length > 0 ? options.pages : ["Page1"];

  return {
    clientSchemaVersion:
      options.clientSchemaVersion ?? CLIENT_SCHEMA_VERSION,
    serverSchemaVersion:
      options.serverSchemaVersion ?? SERVER_SCHEMA_VERSION,
    exportedApplication: {
      name: options.name,
      isPublic: false,
      color: "#A8A8F1",
      icon: "calender",
      slug: options.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      unpublishedAppLayout: { type: "DESKTOP" },
      publishedAppLayout: { type: "DESKTOP" },
      evaluationVersion: 2,
      applicationVersion: 2,
      collapseInvisibleWidgets: true,
    },
    datasourceList: [],
    customJSLibList: [],
    pageList: pages.map((p, i) => buildPage(p, i === 0 && !!options.withSample)),
    actionList: [],
    actionCollectionList: [],
    editModeTheme: undefined,
    publishedTheme: undefined,
    decryptedFields: {},
  };
}
