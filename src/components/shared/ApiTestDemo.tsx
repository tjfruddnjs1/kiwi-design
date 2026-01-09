// API 개선 사항 데모 컴포넌트
// 새로운 통합 API 클라이언트의 기능을 보여주는 테스트 컴포넌트

import React, { useState } from 'react';
import { Button, Card, Space, Typography, message, Divider } from 'antd';
import { api, isApiError } from '@/lib/api';
import * as ApiTypes from '../../types/api-unified';

const { Title, Text, Paragraph } = Typography;

/**
 * API 개선 사항을 시연하는 데모 컴포넌트
 */
const ApiTestDemo: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, result]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  /**
   * 헬스 체크 API 테스트
   */
  const testHealthCheck = async () => {
    setLoading(true);
    try {
      const response = await api.checkHealth();

      if (response.success) {
        addResult(` 헬스 체크 성공: ${response.data?.status}`);
        message.success('헬스 체크 성공!');
      }
    } catch (error) {
      if (isApiError(error)) {
        addResult(
          ` API 에러: ${error.message} (Status: ${error.statusCode})`
        );
      } else {
        addResult(
          ` 알 수 없는 에러: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * 인프라 목록 조회 테스트
   */
  const testInfraList = async () => {
    setLoading(true);
    try {
      const response = await api.infra.list();

      if (response.success && response.data) {
        const infraCount = response.data.length;

        addResult(` 인프라 목록 조회 성공: ${infraCount}개의 인프라 발견`);

        // 첫 번째 인프라 정보 표시
        if (infraCount > 0) {
          const firstInfra = response.data[0];

          addResult(
            `   📋 첫 번째 인프라: ${firstInfra.name} (Type: ${firstInfra.type})`
          );
        }
        message.success(`인프라 목록 조회 성공! ${infraCount}개 발견`);
      }
    } catch (error) {
      if (isApiError(error)) {
        addResult(
          ` API 에러: ${error.message} (Status: ${error.statusCode})`
        );
        if (error.statusCode === 401) {
          addResult(`   🔐 인증이 필요합니다. 로그인 후 다시 시도하세요.`);
        }
      } else {
        addResult(
          ` 알 수 없는 에러: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * 타입 안전성 테스트
   */
  const testTypeSafety = () => {
    addResult('🔍 타입 안전성 테스트:');

    // 컴파일 타임에 타입 체크됨
    const sampleInfra: ApiTypes.Infrastructure = {
      id: 1,
      name: 'Test Infrastructure',
      type: 'kubernetes',
      info: 'Test info',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addResult(
      `    Infrastructure 타입: ${sampleInfra.name} (${sampleInfra.type})`
    );

    // SSH 호프 타입 테스트
    const sampleHop: ApiTypes.SshHop = {
      host: '192.168.1.100',
      port: 22,
      username: 'admin',
      password: 'secret',
    };

    addResult(
      `    SshHop 타입: ${sampleHop.username}@${sampleHop.host}:${sampleHop.port}`
    );

    message.success('타입 안전성 테스트 완료!');
  };

  /**
   * 에러 처리 테스트 (의도적으로 실패하는 요청)
   */
  const testErrorHandling = async () => {
    setLoading(true);
    try {
      // 존재하지 않는 인프라 ID로 서버 목록 조회 시도
      await api.infra.listServers(99999);
      addResult(' 에러가 발생했어야 하는데 성공했습니다.');
    } catch (error) {
      if (isApiError(error)) {
        addResult(` 예상된 API 에러 처리: ${error.message}`);
        addResult(`   📊 상태 코드: ${error.statusCode}`);
        message.info(
          '에러 처리 테스트 완료 - 정상적으로 에러가 감지되었습니다.'
        );
      } else {
        addResult(
          ` 예상과 다른 에러 타입: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title='🚀 API 개선 사항 데모'
      style={{ maxWidth: 800, margin: '20px auto' }}
    >
      <div style={{ marginBottom: 20 }}>
        <Title level={4}>새로운 통합 API 클라이언트 테스트</Title>
        <Paragraph>
          이 데모는 개선된 API 클라이언트의 주요 기능들을 보여줍니다:
        </Paragraph>
        <ul>
          <li>
             <strong>통합된 API 클라이언트</strong> - 하나의 일관된 인터페이스
          </li>
          <li>
            🔒 <strong>완전한 타입 안전성</strong> - TypeScript로 모든 타입 보장
          </li>
          <li>
            🎯 <strong>구조화된 에러 처리</strong> - UnifiedApiError 클래스
          </li>
          <li>
            ⚡ <strong>자동 재시도</strong> - 네트워크 에러 시 자동 재시도
          </li>
          <li>
            🔐 <strong>자동 인증</strong> - JWT 토큰 자동 관리
          </li>
        </ul>
      </div>

      <Divider />

      <Space direction='vertical' style={{ width: '100%' }}>
        <Space wrap>
          <Button type='primary' onClick={testHealthCheck} loading={loading}>
            헬스 체크 테스트
          </Button>
          <Button onClick={testInfraList} loading={loading}>
            인프라 목록 테스트
          </Button>
          <Button onClick={testTypeSafety}>타입 안전성 테스트</Button>
          <Button onClick={testErrorHandling} loading={loading}>
            에러 처리 테스트
          </Button>
          <Button onClick={clearResults} type='text'>
            결과 지우기
          </Button>
        </Space>

        <Divider />

        {testResults.length > 0 && (
          <Card
            title='🔍 테스트 결과'
            size='small'
            style={{ backgroundColor: '#f5f5f5' }}
          >
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {testResults.map(result => (
                <div
                  key={`result-${result.slice(0, 50)}-${result.length}`}
                  style={{ marginBottom: 4 }}
                >
                  <Text code style={{ fontSize: 12 }}>
                    {result}
                  </Text>
                </div>
              ))}
            </div>
          </Card>
        )}
      </Space>

      <Divider />

      <div
        style={{
          marginTop: 20,
          padding: 16,
          backgroundColor: '#f0f8ff',
          borderRadius: 8,
        }}
      >
        <Title level={5}>💡 개발자 가이드</Title>
        <Paragraph style={{ margin: 0, fontSize: 12 }}>
          <strong>마이그레이션:</strong> 기존 API 호출을 새로운 통합
          클라이언트로 이전하려면
          <code>API_MIGRATION_GUIDE.md</code> 파일을 참고하세요.
          <br />
          <strong>타입 정의:</strong> 모든 API 타입은{' '}
          <code>types/api-unified.ts</code>에서 확인할 수 있습니다.
          <br />
          <strong>에러 처리:</strong> <code>isUnifiedApiError()</code> 함수로
          API 에러를 구분할 수 있습니다.
        </Paragraph>
      </div>
    </Card>
  );
};

export default ApiTestDemo;
