import { readFileSync } from "fs";

/**
 * Which deployment this process is: "production", "staging", "development", "test".
 *
 * NODE_ENV is "production" for BOTH the prod and the dev/staging deployments
 * (it controls secure cookies, dev-only routes, etc.), so it cannot be used to
 * tell them apart. APP_ENV is the real environment label and is what error
 * tracking (Sentry + alert emails) reports.
 */
export const appEnv: string =
  process.env.APP_ENV?.trim() ||
  process.env.SENTRY_ENVIRONMENT?.trim() ||
  process.env.NODE_ENV?.trim() ||
  "development";

/**
 * Release identifier (git SHA) for this build. Deploy scripts write it to
 * dist/RELEASE at build time; SENTRY_RELEASE overrides when set.
 */
function readReleaseFile(): string | undefined {
  try {
    const value = readFileSync(new URL("../RELEASE", import.meta.url), "utf8").trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

export const appRelease: string | undefined =
  process.env.SENTRY_RELEASE?.trim() || readReleaseFile();
