import { expectTypeOf, test } from "vitest";
import type { CloudflareImagesObjectStoreOptions } from "../src/backends/cloudflare-images.js";
import type { LibSQLScreenshotObjectStoreOptions } from "../src/backends/drizzle-libsql.js";
import type { PgScreenshotObjectStoreOptions } from "../src/backends/drizzle-pg.js";
import type { S3ObjectStoreOptions } from "../src/backends/s3.js";
import type { ScreenshotServeHandlerOptions, ScreenshotStorageOptions } from "../src/index.js";

// Under exactOptionalPropertyTypes, a caller forwards its own optional values
// (`sessionToken: process.env.AWS_SESSION_TOKEN`) — every optional option
// accepts an explicit undefined, like the stores' options do.
test("optional options accept an explicit undefined", () => {
  expectTypeOf<{
    allowedContentTypes: undefined;
    maxBytes: undefined;
    keyPrefix: undefined;
    logger: undefined;
    onUncertainUpload: undefined;
  }>().toExtend<ScreenshotStorageOptions>();
  expectTypeOf<{
    authorize: undefined;
    cacheControl: undefined;
    keyPrefix: undefined;
  }>().toExtend<ScreenshotServeHandlerOptions>();
  expectTypeOf<{
    endpoint: string;
    bucket: string;
    publicBaseUrl: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string | undefined;
    region: undefined;
    fetch: undefined;
    timeoutMs: undefined;
    now: undefined;
    treatAccessDeniedAsMissing: undefined;
    cacheControl: undefined;
  }>().toExtend<S3ObjectStoreOptions>();
  expectTypeOf<{
    accountId: string;
    apiToken: string;
    accountHash: string;
    variant: undefined;
    deliveryBaseUrl: undefined;
    fetch: undefined;
    timeoutMs: undefined;
  }>().toExtend<CloudflareImagesObjectStoreOptions>();
  expectTypeOf<{ publicBaseUrl: string; table: undefined }>().toExtend<PgScreenshotObjectStoreOptions>();
  expectTypeOf<{ publicBaseUrl: string; table: undefined }>().toExtend<LibSQLScreenshotObjectStoreOptions>();
});
