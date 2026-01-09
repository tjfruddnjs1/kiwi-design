import React, { memo, useEffect, useState } from 'react';
import { Row, Col } from 'antd';
import SecurityVulnerabilityCard from './SecurityVulnerabilityCard';

const SecurityOverviewTab: React.FC = memo(() => {
  const [apiData, setApiData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // API 호출 함수
  const fetchK8sDashboardData = async () => {
    setLoading(true);
    try {
      // API 호출 주석처리
      /*
      const response = await fetch('http://localhost:7000/dashboard/k8s?git_url=https://gitlab.mipllab.com/lw/evc/eRMSpwa.git');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      setApiData(data);
      */

      // 임시 JSON 데이터 사용
      const mockData = {
        data: {
          codeql: {
            items: [
              {
                file: 'src/app/notice/page.tsx',
                level: 'note',
                message: 'Unused variable closeDetailModal.',
                rule: 'js/unused-local-variable',
              },
              {
                file: 'src/app/page.tsx',
                level: 'note',
                message:
                  'Unused imports ArcElement, LineElement, PointElement.',
                rule: 'js/unused-local-variable',
              },
              {
                file: 'src/app/page.tsx',
                level: 'note',
                message:
                  'Unused imports AiOutlineInfoCircle, AiOutlineWarning.',
                rule: 'js/unused-local-variable',
              },
            ],
            summary: {
              error: 0,
              note: 3,
              warning: 0,
            },
            total: 3,
          },
          repository_info: {
            git_url: 'https://gitlab.mipllab.com/lw/evc/eRMSpwa.git',
            idx: 1,
          },
          semgrep: {
            items: [
              {
                file: '/tmp/tmpqied04or/k8s/app.yaml',
                level: 'warning',
                message:
                  "In Kubernetes, each pod runs in its own isolated environment with its own set of security policies. However, certain container images may contain `setuid` or `setgid` binaries that could allow an attacker to perform privilege escalation and gain access to sensitive resources. To mitigate this risk, it's recommended to add a `securityContext` to the container in the pod, with the parameter `allowPrivilegeEscalation` set to `false`. This will prevent the container from running any privileged processes and limit the impact of any potential attacks. By adding the `allowPrivilegeEscalation` parameter to your the `securityContext`, you can help to ensure that your containerized applications are more secure and less vulnerable to privilege escalation attacks.",
                rule: 'yaml.kubernetes.security.allow-privilege-escalation.allow-privilege-escalation',
              },
              {
                file: '/tmp/tmpqied04or/k8s/app.yaml',
                level: 'warning',
                message:
                  "In Kubernetes, each pod runs in its own isolated environment with its own set of security policies. However, certain container images may contain `setuid` or `setgid` binaries that could allow an attacker to perform privilege escalation and gain access to sensitive resources. To mitigate this risk, it's recommended to add a `securityContext` to the container in the pod, with the parameter `allowPrivilegeEscalation` set to `false`. This will prevent the container from running any privileged processes and limit the impact of any potential attacks. By adding a `securityContext` to your Kubernetes pod, you can help to ensure that your containerized applications are more secure and less vulnerable to privilege escalation attacks.",
                rule: 'yaml.kubernetes.security.allow-privilege-escalation-no-securitycontext.allow-privilege-escalation-no-securitycontext',
              },
            ],
            summary: {
              error: 0,
              note: 0,
              warning: 2,
            },
            total: 2,
          },
          trivy: {
            items: [
              {
                description:
                  'Next.js is a React framework for building full-stack web applications. In Next.js App Router from 15.3.0 to before 15.3.3 and Vercel CLI from 41.4.1 to 42.2.0, a cache poisoning vulnerability was found. The issue allowed page requests for HTML content to return a React Server Component (RSC) payload instead under certain conditions. When deployed to Vercel, this would only impact the browser cache, and would not lead to the CDN being poisoned. When self-hosted and deployed externally, this could lead to cache poisoning if the CDN does not properly distinguish between RSC / HTML in the cache keys. This issue has been resolved in Next.js 15.3.3.',
                fixed_version: '15.3.3',
                id: 'CVE-2025-49005',
                package: 'next',
                severity: 'LOW',
                title: 'nextjs: Next.js cache poisoning',
              },
              {
                description:
                  'Undici is an HTTP/1.1 client for Node.js. Prior to versions 5.29.0, 6.21.2, and 7.5.0, applications that use undici to implement a webhook-like system are vulnerable. If the attacker set up a server with an invalid certificate, and they can force the application to call the webhook repeatedly, then they can cause a memory leak. This has been patched in versions 5.29.0, 6.21.2, and 7.5.0. As a workaound, avoid calling a webhook repeatedly if the webhook fails.',
                fixed_version: '5.29.0, 6.21.2, 7.5.0',
                id: 'CVE-2025-47279',
                package: 'undici',
                severity: 'LOW',
                title: 'undici: Undici Memory Leak with Invalid Certificates',
              },
            ],
            summary: {
              CRITICAL: 0,
              HIGH: 0,
              LOW: 2,
              MEDIUM: 0,
            },
            total: 2,
          },
          zap: {
            items: [
              {
                description:
                  '<p>Content Security Policy (CSP) is an added layer of security that helps to detect and mitigate certain types of attacks, including Cross Site Scripting (XSS) and data injection attacks. These attacks are used for everything from data theft to site defacement or distribution of malware. CSP provides a set of standard HTTP headers that allow website owners to declare approved sources of content that browsers should be allowed to load on that page — covered types are JavaScript, CSS, HTML frames, fonts, images and embeddable objects such as Java applets, ActiveX, audio and video files.</p>',
                name: 'Content Security Policy (CSP) Header Not Set',
                risk: 'Medium (High)',
                solution:
                  '<p>Ensure that your web server, application server, load balancer, etc. is configured to set the Content-Security-Policy header.</p>',
              },
              {
                description:
                  '<p>The cache-control header has not been set properly or is missing, allowing the browser and proxies to cache content. For static assets like css, js, or image files this might be intended, however, the resources should be reviewed to ensure that no sensitive content will be cached.</p>',
                name: 'Re-examine Cache-control Directives',
                risk: 'Informational (Low)',
                solution:
                  '<p>For secure content, ensure the cache-control HTTP header is set with "no-cache, no-store, must-revalidate". If an asset should be cached consider setting the directives "public, max-age, immutable".</p>',
              },
            ],
            summary: {
              High: 0,
              Informational: 0,
              Low: 1,
              Medium: 1,
            },
            total: 2,
          },
        },
        success: true,
      };

      setApiData(mockData);
    } catch (_error) {
      setApiData(null);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 API 호출
  useEffect(() => {
    void fetchK8sDashboardData();
  }, []);

  // API 데이터를 파싱해서 카드에 맞는 형태로 변환
  const parseApiData = (apiData: any) => {
    if (!apiData?.data) return null;

    const { codeql, semgrep, trivy, zap } = apiData.data;

    // SAST 데이터 (CodeQL + Semgrep)
    const sastData: any = {
      projectId: '1',
      scanDate: new Date().toISOString(),
      totalIssues: (codeql?.total || 0) + (semgrep?.total || 0),
      criticalCount:
        (codeql?.summary?.error || 0) + (semgrep?.summary?.error || 0),
      highCount:
        (codeql?.summary?.warning || 0) + (semgrep?.summary?.warning || 0),
      mediumCount: 0, // CodeQL과 Semgrep에는 medium 레벨이 없음
      lowCount: (codeql?.summary?.note || 0) + (semgrep?.summary?.note || 0),
      vulnerabilities: [
        // CodeQL items
        ...(codeql?.items?.map((item: any) => ({
          id: `codeql-${item.rule}`,
          title: item.message,
          description: item.message,
          severity:
            item.level === 'error'
              ? 'critical'
              : item.level === 'warning'
                ? 'high'
                : 'low',
          status: 'open',
          file: item.file,
          line: 0,
          solution: '',
        })) || []),
        // Semgrep items
        ...(semgrep?.items?.map((item: any) => ({
          id: `semgrep-${item.rule}`,
          title: item.message,
          description: item.message,
          severity:
            item.level === 'error'
              ? 'critical'
              : item.level === 'warning'
                ? 'high'
                : 'low',
          status: 'open',
          file: item.file,
          line: 0,
          solution: '',
        })) || []),
      ],
    };

    // DAST 데이터 (ZAP)
    const dastData: any = {
      projectId: '1',
      scanDate: new Date().toISOString(),
      totalIssues: zap?.total || 0,
      criticalCount: 0, // ZAP에는 critical 레벨이 없음
      highCount: 0, // ZAP에는 high 레벨이 없음
      mediumCount: zap?.summary?.Medium || 0,
      lowCount: zap?.summary?.Low || 0,
      vulnerabilities:
        zap?.items?.map((item: any) => ({
          id: `zap-${item.name}`,
          title: item.name,
          description: item.description,
          severity:
            item.risk === 'Medium (High)' ||
            item.risk === 'Medium (Medium)' ||
            item.risk === 'Medium (Low)'
              ? 'medium'
              : item.risk === 'Low (High)' ||
                  item.risk === 'Low (Medium)' ||
                  item.risk === 'Low (Low)'
                ? 'low'
                : 'low',
          status: 'open',
          solution: item.solution,
        })) || [],
    };

    // SCA 데이터 (Trivy)
    const scaData: any = {
      projectId: '1',
      scanDate: new Date().toISOString(),
      totalIssues: trivy?.total || 0,
      criticalCount: trivy?.summary?.CRITICAL || 0,
      highCount: trivy?.summary?.HIGH || 0,
      mediumCount: trivy?.summary?.MEDIUM || 0,
      lowCount: trivy?.summary?.LOW || 0,
      vulnerabilities:
        trivy?.items?.map((item: any) => ({
          id: `trivy-${item.id}`,
          title: item.title,
          description: item.description,
          severity:
            item.severity === 'CRITICAL'
              ? 'critical'
              : item.severity === 'HIGH'
                ? 'high'
                : item.severity === 'MEDIUM'
                  ? 'medium'
                  : item.severity === 'LOW'
                    ? 'low'
                    : 'low',
          status: 'open',
          file: item.package,
          line: 0,
          solution: `Fixed version: ${item.fixed_version}`,
        })) || [],
    };

    return { sastData, dastData, scaData };
  };

  const parsedData = parseApiData(apiData);

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} xl={8}>
        <SecurityVulnerabilityCard
          title='SAST 분석'
          type='sast'
          data={
            parsedData?.sastData || {
              projectId: 'aggregate',
              scanDate: new Date().toISOString(),
              status: 'completed' as const,
              totalIssues: 0,
              criticalCount: 0,
              highCount: 0,
              mediumCount: 0,
              lowCount: 0,
              vulnerabilities: [],
            }
          }
          loading={loading}
        />
      </Col>
      <Col xs={24} xl={8}>
        <SecurityVulnerabilityCard
          title='DAST 분석'
          type='dast'
          data={
            parsedData?.dastData || {
              projectId: 'aggregate',
              scanDate: new Date().toISOString(),
              status: 'completed' as const,
              totalIssues: 0,
              criticalCount: 0,
              highCount: 0,
              mediumCount: 0,
              lowCount: 0,
              vulnerabilities: [],
            }
          }
          loading={loading}
        />
      </Col>
      <Col xs={24} xl={8}>
        <SecurityVulnerabilityCard
          title='SCA 분석'
          type='sca'
          data={
            parsedData?.scaData || {
              projectId: 'aggregate',
              scanDate: new Date().toISOString(),
              status: 'completed' as const,
              totalIssues: 0,
              criticalCount: 0,
              highCount: 0,
              mediumCount: 0,
              lowCount: 0,
              vulnerabilities: [],
            }
          }
          loading={loading}
        />
      </Col>
    </Row>
  );
});

SecurityOverviewTab.displayName = 'SecurityOverviewTab';

export default SecurityOverviewTab;
