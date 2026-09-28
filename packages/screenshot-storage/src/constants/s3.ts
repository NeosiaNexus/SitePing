/** Signature algorithm identifier of AWS Signature Version 4. */
export const SIGV4_ALGORITHM = "AWS4-HMAC-SHA256";

/** Service name in the SigV4 credential scope. */
export const S3_SERVICE = "s3";

/** Terminator of the SigV4 credential scope. */
export const SIGV4_SCOPE_TERMINATOR = "aws4_request";

/** Region S3-compatible services without regions accept (Cloudflare R2). */
export const S3_DEFAULT_REGION = "auto";

/**
 * S3 error code of a plain permission denial — what a GET of a missing key
 * returns when the credentials may read objects but not list the bucket.
 * Credential failures carry other codes (`SignatureDoesNotMatch`,
 * `InvalidAccessKeyId`, `ExpiredToken`, `RequestTimeTooSkewed`…).
 */
export const S3_ACCESS_DENIED_ERROR_CODE = "AccessDenied";

/** Extracts the `<Code>` of an S3 XML error body. */
export const S3_ERROR_CODE_PATTERN = /<Code>\s*([^<\s]+)\s*<\/Code>/;
