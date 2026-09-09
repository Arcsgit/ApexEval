/* ============================================================
   ApexEval — API Configuration
   ============================================================ */

export const API_BASE_URL = 'http://localhost:8080/api';

export const API_ENDPOINTS = {
  assignments: `${API_BASE_URL}/assignments`,
  submissions: `${API_BASE_URL}/submissions`,
  runTest: `${API_BASE_URL}/run-test`,
  staticCheck: `${API_BASE_URL}/static-check`,
  diff: `${API_BASE_URL}/diff`,
  execute: `${API_BASE_URL}/execute`,
} as const;