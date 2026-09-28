import { Sha256 } from "@aws-crypto/sha256-js";
import { SignatureV4 } from "@smithy/signature-v4";
import { describe, expect, it } from "vitest";
import { createS3ObjectStore } from "../src/backends/s3.js";
import { sha256Hex, signS3Request } from "../src/backends/sigv4.js";
import { createFakeS3 } from "./fake-backends.js";

// Every case is checked against AWS's own signer (@smithy/signature-v4, used by the AWS SDK).
const credentials = { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY" };
const signingDate = new Date("2026-09-27T12:34:56Z");

async function referenceAuthorization(
  method: string,
  url: URL,
  headers: Record<string, string>,
  body: Uint8Array,
  region: string,
  sessionToken?: string,
): Promise<string | undefined> {
  const signer = new SignatureV4({
    credentials: { ...credentials, ...(sessionToken ? { sessionToken } : {}) },
    region,
    service: "s3",
    sha256: Sha256,
    uriEscapePath: false,
  });
  const signed = await signer.sign(
    {
      method,
      protocol: url.protocol,
      hostname: url.hostname,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      headers: { host: url.host, ...headers, "x-amz-content-sha256": await sha256Hex(body as Uint8Array<ArrayBuffer>) },
      body,
    },
    { signingDate },
  );
  return signed.headers.authorization;
}

describe("signS3Request", () => {
  const cases = [
    {
      name: "PUT with a body and content type (R2 region)",
      method: "PUT",
      url: new URL("https://account.r2.cloudflarestorage.com/screens/siteping-0123abcd.jpg"),
      headers: { "content-type": "image/jpeg" },
      body: new TextEncoder().encode("jpeg-bytes"),
      region: "auto",
    },
    {
      name: "DELETE with an empty body (AWS region)",
      method: "DELETE",
      url: new URL("https://s3.eu-west-3.amazonaws.com/my-bucket/siteping-0123abcd.png"),
      headers: {},
      body: new Uint8Array(),
      region: "eu-west-3",
    },
    {
      name: "a key needing RFC 3986 escaping and a query string",
      method: "GET",
      // "shot (1)!.webp", RFC 3986-encoded by hand (independent of the code under test).
      url: new URL("https://minio.local:9000/bucket/shot%20%281%29%21.webp?versionId=a b"),
      headers: {},
      body: new Uint8Array(),
      region: "us-east-1",
    },
  ];

  for (const testCase of cases) {
    it(`matches AWS's signer for ${testCase.name}`, async () => {
      const signed = await signS3Request(
        {
          method: testCase.method,
          url: testCase.url,
          headers: testCase.headers,
          payloadHash: await sha256Hex(testCase.body as Uint8Array<ArrayBuffer>),
        },
        credentials,
        testCase.region,
        signingDate,
      );

      expect(signed.authorization).toBe(
        await referenceAuthorization(testCase.method, testCase.url, testCase.headers, testCase.body, testCase.region),
      );
    });
  }

  it("signs the session token of temporary credentials", async () => {
    const url = new URL("https://s3.us-east-1.amazonaws.com/bucket/key.jpg");
    const signed = await signS3Request(
      { method: "DELETE", url, headers: {}, payloadHash: await sha256Hex("") },
      { ...credentials, sessionToken: "session-token" },
      "us-east-1",
      signingDate,
    );

    expect(signed["x-amz-security-token"]).toBe("session-token");
    expect(signed.authorization).toBe(
      await referenceAuthorization(
        "DELETE",
        url,
        { "x-amz-security-token": "session-token" },
        new Uint8Array(),
        "us-east-1",
        "session-token",
      ),
    );
  });
});

describe("createS3ObjectStore — signing clock", () => {
  it("signs every request with the injected clock, read once per request", async () => {
    const fake = createFakeS3({ bucket: "screens", region: "auto", ...credentials });
    const signingDates = [new Date("2026-09-27T12:34:56Z"), new Date("2026-09-27T12:40:00Z")];
    let clockReads = 0;
    const objectStore = createS3ObjectStore({
      endpoint: "https://account.r2.cloudflarestorage.com",
      bucket: "screens",
      publicBaseUrl: "https://screens.example.com",
      ...credentials,
      fetch: fake.fetch,
      now: () => signingDates[clockReads++] as Date,
    });

    await objectStore.put({
      key: "siteping-0123abcd.jpg",
      bytes: new TextEncoder().encode("jpeg-bytes"),
      contentType: "image/jpeg",
    });
    await objectStore.remove("siteping-0123abcd.jpg");

    // The fake bucket re-signs each request with AWS's own signer and answers 403 on mismatch,
    // so the object round-trip proves the signatures were valid for the injected instants.
    expect(fake.objects.has("siteping-0123abcd.jpg")).toBe(false);
    expect(fake.requests.map((request) => request.headers.get("x-amz-date"))).toEqual([
      "20260927T123456Z",
      "20260927T124000Z",
    ]);
    expect(fake.requests[0]?.headers.get("authorization")).toContain("/20260927/auto/s3/aws4_request");
    expect(clockReads).toBe(2);
  });
});
