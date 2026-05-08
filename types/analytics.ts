/**
 * Analytics response types.
 * All analytics endpoints return admin-only data.
 */

export interface AnalyticsSummary {
  totalScans: number;
  activeUsers: number;
  apiCost: number;
  successRate: number;
}

export interface AnalyticsTrendPoint {
  label: string;
  scans: number;
  cost: number;
}

export interface AnalyticsTrends {
  points: AnalyticsTrendPoint[];
}

export interface TopProduct {
  name: string;
  count: number;
  lastSeen: string;
}

export interface TopProducts {
  products: TopProduct[];
}

export interface TopUser {
  userId: string;
  email: string;
  scanCount: number;
  cost: number;
}

export interface TopUsers {
  users: TopUser[];
}

export interface APIUsageKey {
  apiKeyIndex: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface APIUsage {
  keys: APIUsageKey[];
}