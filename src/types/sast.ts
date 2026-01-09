// SAST 분석 관련 타입 정의

// SARIF (Static Analysis Results Interchange Format) 관련 타입
export interface SarifPhysicalLocation {
  artifactLocation?: {
    uri?: string;
  };
  region?: {
    startLine?: number;
    endLine?: number;
    startColumn?: number;
    endColumn?: number;
  };
}

export interface SarifLocation {
  physicalLocation?: SarifPhysicalLocation;
}

export interface SarifMessage {
  text?: string;
  markdown?: string;
}

export interface SarifProperties {
  securitySeverity?: string;
  'security-severity'?: string;
  severity?: string;
  tags?: string[];
  kind?: string;
  precision?: string;
  cwe?: {
    id?: string;
  };
  problem?: {
    category?: string;
  };
  help?: string;
  fix?: string;
}

export interface SarifResult {
  ruleId?: string;
  rule?: {
    id?: string;
    name?: string;
    level?: string;
    message?: string | SarifMessage;
    properties?: SarifProperties;
  };
  level?: string;
  rank?: string;
  message?: SarifMessage;
  locations?: SarifLocation[];
  properties?: SarifProperties;
  fixes?: Array<{
    description?: {
      text?: string;
    };
  }>;
  id?: string;
  shortDescription?: {
    text?: string;
  };
  fullDescription?: {
    text?: string;
  };
  help?: {
    text?: string;
  };
  cwe?: string | { id?: string };
  tags?: string[];
}

export interface SarifRun {
  results?: SarifResult[];
}

export interface SarifDocument {
  runs?: SarifRun[];
}

// Parsed SARIF issue for display
export interface ParsedSarifIssue {
  id: number;
  ruleId: string;
  message: string;
  level: string;
  locations: Array<{
    file: string;
    startLine: number;
    endLine: number;
  }>;
}

export interface SastAnalysisResult {
  success: boolean;
  results?: {
    sarif_json: string;
    schema: string;
    total_findings: number;
  };
  summary?: {
    analysis_time: number;
    clone_time: number;
    config: string;
    git_url: string;
    scan_id: string;
  };
  error?: string;
  details?: string;
}

export interface SastResultData {
  semgrep?: SastAnalysisResult;
  codeql?: SastAnalysisResult;
  status?: string;
  semgrep_command_log?: string;
  codeql_command_log?: string;
  executionLogs?: {
    semgrep: string;
    codeql: string;
  };
  // 백엔드가 제공하는 요약 정보 (aggregateSastSummary에서 생성)
  summary?: {
    severity_counts?: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    security_score?: number;
    grade?: string;
  };
  categories?: Array<{
    name: string;
    count: number;
  }>;
  hot_spots?: Array<{
    file: string;
    finding_count: number;
    priority?: number;
  }>;
  history?: Array<{
    created_at: string;
    security_score: number;
  }>;
}
