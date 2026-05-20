export interface Endpoint {
  id: number;
  title: string;
  description: string;
  purpose: string;
  method: string;
  path: string;
  version: string;
  lastUpdated: string;
  headers: Array<Record<string, unknown>>;
  parameters: Array<Record<string, unknown>>;
  pathParams: Array<Record<string, unknown>>;
  statusCodes: Array<Record<string, unknown>>;
  rateLimit: string;
  usageNotes: string[];
  successExample?: Record<string, unknown>;
  errorExamples?: Array<Record<string, unknown>>;
  jsRequest?: Record<string, unknown>;
  curlRequest?: Record<string, unknown>;
}
