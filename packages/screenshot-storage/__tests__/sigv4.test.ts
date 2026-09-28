import { Sha256 } from "@aws-crypto/sha256-js";
import { SignatureV4 } from "@smithy/signature-v4";
import { describe, expect, it } from "vitest";
import { createS3ObjectStore } from "../src/backends/s3.js";
import { sha256Hex, signS3Request } from "../src/backends/sigv4.js";
import { createFakeS3 } from "./fake-backends.js";

// The cases of the first suite are checked against the AWS SDK's own signer (@smithy/signature-v4).
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

/**
 * The worked examples of AWS's S3 API reference ("Signature Calculations for the
 * Authorization Header: Transferring Payload in a Single Chunk"): example keys,
 * bucket `examplebucket` in us-east-1, signed at 20130524T000000Z. Each expected
 * signature is AWS's published value, independent of any signer implementation.
 */
describe("signS3Request — AWS's published S3 examples", () => {
  const exampleCredentials = {
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  };
  const exampleDate = new Date("2013-05-24T00:00:00Z");
  const examples = [
    {
      name: "GET Object (a Range header, no body)",
      method: "GET",
      url: "https://examplebucket.s3.amazonaws.com/test.txt",
      headers: { range: "bytes=0-9" },
      body: "",
      signedHeaders: "host;range;x-amz-content-sha256;x-amz-date",
      signature: "f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    },
    {
      name: "PUT Object (a `$` in the key, a body, a Date and a storage class)",
      method: "PUT",
      url: "https://examplebucket.s3.amazonaws.com/test$file.text",
      headers: { date: "Fri, 24 May 2013 00:00:00 GMT", "x-amz-storage-class": "REDUCED_REDUNDANCY" },
      body: "Welcome to Amazon S3.",
      signedHeaders: "date;host;x-amz-content-sha256;x-amz-date;x-amz-storage-class",
      signature: "98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd",
    },
    {
      name: "GET Bucket lifecycle (a subresource without a value)",
      method: "GET",
      url: "https://examplebucket.s3.amazonaws.com/?lifecycle",
      headers: {},
      body: "",
      signedHeaders: "host;x-amz-content-sha256;x-amz-date",
      signature: "fea454ca298b7da1c68078a5d1bdbfbbe0d65c699e0f91ac7a200a0136783543",
    },
    {
      name: "GET Bucket, List Objects (sorted query parameters)",
      method: "GET",
      url: "https://examplebucket.s3.amazonaws.com/?max-keys=2&prefix=J",
      headers: {},
      body: "",
      signedHeaders: "host;x-amz-content-sha256;x-amz-date",
      signature: "34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7",
    },
  ];

  it("hashes the PUT example's payload as AWS publishes it", async () => {
    expect(await sha256Hex("Welcome to Amazon S3.")).toBe(
      "44ce7dd67c959e0d3524ffac1771dfbba87d2b6b4b4e99e42034a8b803f8b072",
    );
  });

  for (const example of examples) {
    it(`produces AWS's signature for ${example.name}`, async () => {
      const signed = await signS3Request(
        {
          method: example.method,
          url: new URL(example.url),
          headers: example.headers,
          payloadHash: await sha256Hex(example.body),
        },
        exampleCredentials,
        "us-east-1",
        exampleDate,
      );

      expect(signed["x-amz-date"]).toBe("20130524T000000Z");
      expect(signed.authorization).toBe(
        "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, " +
          `SignedHeaders=${example.signedHeaders}, Signature=${example.signature}`,
      );
    });
  }
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
