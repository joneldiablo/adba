import type { IStatusCode } from "./types";

const statusCodes: Record<string, Partial<IStatusCode>> = {
  "200.0": { status: 200, code: 0, description: "ok" },
  "201.0": { status: 201, code: 0, description: "created" },
  "202.0": { status: 202, code: 0, description: "accepted" },
  "203.0": {
    status: 203,
    code: 0,
    description: "non-authoritative-information",
  },
  "204.0": { status: 204, code: 0, description: "no-content" },
  "205.0": { status: 205, code: 0, description: "reset-content" },
  "206.0": { status: 206, code: 0, description: "partial-content" },

  "300.0": { status: 300, code: 0, description: "multiple-choices" },
  "301.0": { status: 301, code: 0, description: "moved-permanently" },
  "302.0": { status: 302, code: 0, description: "found" },
  "303.0": { status: 303, code: 0, description: "see-other" },
  "304.0": { status: 304, code: 0, description: "not-modified" },
  "307.0": { status: 307, code: 0, description: "temporary-redirect" },
  "308.0": { status: 308, code: 0, description: "permanent-redirect" },

  "400.0": { status: 400, code: 0, description: "bad-request" },
  "401.0": { status: 401, code: 0, description: "unauthorized" },
  "402.0": { status: 402, code: 0, description: "payment-required" },
  "403.0": { status: 403, code: 0, description: "forbidden" },
  "404.0": { status: 404, code: 0, description: "not-found" },
  "405.0": { status: 405, code: 0, description: "method-not-allowed" },
  "406.0": { status: 406, code: 0, description: "not-acceptable" },
  "407.0": {
    status: 407,
    code: 0,
    description: "proxy-authentication-required",
  },
  "408.0": { status: 408, code: 0, description: "request-timeout" },
  "409.0": { status: 409, code: 0, description: "conflict" },
  "410.0": { status: 410, code: 0, description: "gone" },
  "411.0": { status: 411, code: 0, description: "length-required" },
  "412.0": { status: 412, code: 0, description: "precondition-failed" },
  "413.0": { status: 413, code: 0, description: "payload-too-large" },
  "414.0": { status: 414, code: 0, description: "uri-too-long" },
  "415.0": { status: 415, code: 0, description: "unsupported-media-type" },
  "416.0": { status: 416, code: 0, description: "range-not-satisfiable" },
  "417.0": { status: 417, code: 0, description: "expectation-failed" },
  "418.0": { status: 418, code: 0, description: "im-a-teapot" },
  "421.0": { status: 421, code: 0, description: "misdirected-request" },
  "422.0": { status: 422, code: 0, description: "unprocessable-entity" },
  "423.0": { status: 423, code: 0, description: "locked" },
  "424.0": { status: 424, code: 0, description: "failed-dependency" },
  "425.0": { status: 425, code: 0, description: "too-early" },
  "426.0": { status: 426, code: 0, description: "upgrade-required" },
  "428.0": { status: 428, code: 0, description: "precondition-required" },
  "429.0": { status: 429, code: 0, description: "too-many-requests" },
  "431.0": {
    status: 431,
    code: 0,
    description: "request-header-fields-too-large",
  },
  "451.0": {
    status: 451,
    code: 0,
    description: "unavailable-for-legal-reasons",
  },

  "500.0": { status: 500, code: 0, description: "internal-server-error" },
  "501.0": { status: 501, code: 0, description: "not-implemented" },
  "502.0": { status: 502, code: 0, description: "bad-gateway" },
  "503.0": { status: 503, code: 0, description: "service-unavailable" },
  "504.0": { status: 504, code: 0, description: "gateway-timeout" },
  "505.0": { status: 505, code: 0, description: "http-version-not-supported" },
  "506.0": { status: 506, code: 0, description: "variant-also-negotiates" },
  "507.0": { status: 507, code: 0, description: "insufficient-storage" },
  "508.0": { status: 508, code: 0, description: "loop-detected" },
  "510.0": { status: 510, code: 0, description: "not-extended" },
  "511.0": {
    status: 511,
    code: 0,
    description: "network-authentication-required",
  },
};

export function addStatusCodes(extraStatusCodes: IStatusCode[] = []) {
  extraStatusCodes.forEach((x) => {
    if (!x.status) throw new Error("missing status");
    x.code = x.code || 0;
    statusCodes[`${x.status}.${x.code}`] = x;
  });
}

export default function getStatusCode(
  status: number,
  code = 0
): Partial<IStatusCode> {
  if (!status) throw new Error("Missing status");

  // 1. Buscar status + code exacto
  const exact = statusCodes[`${status}.${code}`];
  if (exact) return exact;

  // 2. Buscar status con code 0
  const baseCode = statusCodes[`${status}.0`];
  if (baseCode) return baseCode;

  // 3. Buscar grupo X00.0
  const group = Math.floor(status / 100) * 100;
  const fallback = statusCodes[`${group}.0`];
  if (fallback) return fallback;

  // 4. Último recurso: generar respuesta fallback
  return {
    status,
    code: 0,
    description: "unknown-error",
  };
}
