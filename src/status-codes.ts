import type { IStatusCode } from "./types";

const statusCodes: Record<string, Partial<IStatusCode>> = {
  '200.0': {
    status: 200,
    code: 0,
    description: 'ok',
  },
  '201.0': {
    status: 201,
    code: 0,
    description: 'created',
  },
  '202.0': {
    status: 202,
    code: 0,
    description: 'accepted',
  },
  '204.0': {
    status: 204,
    code: 0,
    description: 'no-content',
  },
  '400.0': {
    status: 400,
    code: 0,
    description: 'bad-request',
  },
  '401.0': {
    status: 401,
    code: 0,
    description: 'unauthorized',
  },
  '403.0': {
    status: 403,
    code: 0,
    description: 'forbidden',
  },
  '404.0': {
    status: 404,
    code: 0,
    description: 'not-found',
  },
  '405.0': {
    status: 405,
    code: 0,
    description: 'method-not-allowed',
  },
  '409.0': {
    status: 409,
    code: 0,
    description: 'conflict',
  },
  '412.0': {
    status: 412,
    code: 0,
    description: 'precondition-failed',
  },
  '422.0': {
    status: 422,
    code: 0,
    description: 'unprocessable-entity',
  },
  '429.0': {
    status: 429,
    code: 0,
    description: 'too-many-requests',
  },
  '500.0': {
    status: 500,
    code: 0,
    description: 'internal-server-error',
  },
  '502.0': {
    status: 502,
    code: 0,
    description: 'bad-gateway',
  },
  '503.0': {
    status: 503,
    code: 0,
    description: 'service-unavailable',
  },
};

export function addStatusCodes(extraStatusCodes: IStatusCode[] = []) {
  extraStatusCodes.forEach(x => {
    if (!x.status) throw new Error("missing status");
    x.code = x.code || 0;
    statusCodes[`${x.status}.${x.code}`] = x;
  });
}

export default function getStatusCode(status: number, code = 0) {
  if (!status) throw new Error("missing status");
  const inStatus = statusCodes[`${status}.${code}`];
  if (!inStatus) throw new Error("StatusCode not found");
  return inStatus;
}