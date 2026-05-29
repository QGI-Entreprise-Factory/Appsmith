import { CliError } from "../util/logger.js";
import type { Profile } from "../config.js";

/** Appsmith wraps every REST response in this envelope. */
export interface ResponseMeta {
  status: number;
  success: boolean;
  error?: { code?: number; message?: string };
}
export interface ApiEnvelope<T> {
  responseMeta: ResponseMeta;
  data: T;
}

export interface Workspace {
  id: string;
  name: string;
}
export interface Application {
  id: string;
  name: string;
  workspaceId: string;
  modifiedAt?: string;
  slug?: string;
}
export interface CurrentUser {
  email: string;
  name?: string;
  username?: string;
  emptyInstance?: boolean;
}

const API = "/api/v1";

export class ApiClient {
  constructor(private readonly profile: Profile) {}

  private base(): string {
    return this.profile.url.replace(/\/+$/, "");
  }

  /** Performs a JSON request against the Appsmith API and unwraps the envelope. */
  async request<T>(
    method: string,
    path: string,
    opts: {
      body?: unknown;
      formData?: FormData;
      query?: Record<string, string | undefined>;
      auth?: boolean;
    } = {},
  ): Promise<T> {
    const url = new URL(this.base() + path);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined) url.searchParams.set(k, v);
    }

    const headers: Record<string, string> = { Accept: "application/json" };
    if (opts.auth !== false && this.profile.cookie) {
      headers.Cookie = this.profile.cookie;
    }

    let body: string | FormData | undefined;
    if (opts.formData) {
      body = opts.formData; // fetch sets the multipart boundary header
    } else if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }

    let res: Response;
    try {
      res = await fetch(url, { method, headers, body });
    } catch (err) {
      throw new CliError(
        `Could not reach ${this.base()}: ${(err as Error).message}`,
      );
    }

    const text = await res.text();
    let parsed: ApiEnvelope<T> | undefined;
    if (text) {
      try {
        parsed = JSON.parse(text) as ApiEnvelope<T>;
      } catch {
        /* non-JSON body (e.g. HTML error page) handled below */
      }
    }

    if (!res.ok || (parsed && parsed.responseMeta?.success === false)) {
      const message =
        parsed?.responseMeta?.error?.message ??
        (text && text.length < 300 ? text : res.statusText);
      throw new CliError(
        `${method} ${path} failed (HTTP ${res.status}): ${message}`,
      );
    }

    if (!parsed) {
      throw new CliError(`Unexpected non-JSON response from ${path}`);
    }
    return parsed.data;
  }

  /**
   * Logs in via Spring Security form login and returns the session cookie.
   * We disable redirect-following so we can read the Set-Cookie header and
   * inspect the redirect target to tell success from failure.
   */
  async login(email: string, password: string): Promise<string> {
    const form = new URLSearchParams({ username: email, password });
    let res: Response;
    try {
      res = await fetch(this.base() + API + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        redirect: "manual",
      });
    } catch (err) {
      throw new CliError(
        `Could not reach ${this.base()}: ${(err as Error).message}`,
      );
    }

    const setCookie = res.headers.getSetCookie?.() ?? [];
    const session = setCookie
      .map((c) => c.split(";")[0])
      .find((c) => c.startsWith("SESSION="));

    const location = res.headers.get("location") ?? "";
    const failed =
      !session || /error/i.test(location) || res.status >= 400;
    if (failed) {
      throw new CliError(
        "Login failed: check the instance URL, email and password.",
      );
    }
    return session;
  }

  async logout(): Promise<void> {
    try {
      await fetch(this.base() + API + "/logout", {
        method: "POST",
        headers: this.profile.cookie ? { Cookie: this.profile.cookie } : {},
        redirect: "manual",
      });
    } catch {
      /* best effort: server-side logout is optional, we always clear locally */
    }
  }

  health(): Promise<unknown> {
    return this.request("GET", API + "/health", { auth: false });
  }

  me(): Promise<CurrentUser> {
    return this.request<CurrentUser>("GET", API + "/users/me");
  }

  listWorkspaces(): Promise<Workspace[]> {
    return this.request<Workspace[]>("GET", API + "/workspaces/home");
  }

  createWorkspace(name: string): Promise<Workspace> {
    return this.request<Workspace>("POST", API + "/workspaces", {
      body: { name },
    });
  }

  listApplications(workspaceId?: string): Promise<Application[]> {
    return this.request<Application[]>("GET", API + "/applications/home", {
      query: { workspaceId },
    });
  }

  createApplication(name: string, workspaceId: string): Promise<Application> {
    return this.request<Application>("POST", API + "/applications", {
      body: { name, workspaceId },
    });
  }

  deleteApplication(id: string): Promise<Application> {
    return this.request<Application>("DELETE", API + `/applications/${id}`);
  }

  /** Exports an application as JSON. Returns the raw exported object. */
  exportApplication(id: string): Promise<unknown> {
    return this.request<unknown>("GET", API + `/applications/export/${id}`);
  }

  /** Imports an exported application JSON file into a workspace. */
  importApplication(
    workspaceId: string,
    fileName: string,
    contents: Buffer | Uint8Array,
  ): Promise<Application> {
    const form = new FormData();
    form.append(
      "file",
      new Blob([contents], { type: "application/json" }),
      fileName,
    );
    return this.request<Application>(
      "POST",
      API + `/applications/import/${workspaceId}`,
      { formData: form },
    );
  }
}
