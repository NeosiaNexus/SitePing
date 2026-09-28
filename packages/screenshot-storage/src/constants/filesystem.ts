/**
 * Suffix of the file next to each screenshot that records its content type,
 * so types beyond the default extensions (`image/gif`…) are served as stored.
 * Never matches a generated key, so the serve handler cannot read it.
 */
export const CONTENT_TYPE_SIDECAR_SUFFIX = ".content-type";

/** Content type reported when neither the sidecar nor the extension identifies the file. */
export const UNKNOWN_CONTENT_TYPE = "application/octet-stream";
