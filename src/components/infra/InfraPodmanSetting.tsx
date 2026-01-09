import React, { useCallback, useEffect, useState } from 'react';
import { Tabs, TabsProps } from 'antd';
import { RuntimeDetailsForSinglehost } from './RuntimeSetting';
import { InfraWithNodes } from '../../types';
import { dockerApi, SshHop } from '../../lib/api';
import InfraPodmanResourceTab from './InfraPodmanResourceTab';
import InfraPodmanInfoTab from './InfraPodmanInfoTab';
import SshCredentialModal from '../services/SshCredentialModal';

interface InfraPodmanSettingProps {
  runtimeDetails: RuntimeDetailsForSinglehost;
  selectedInfra: InfraWithNodes;
  onLoading: boolean;
  getStoredAuthHops: (hops: SshHop[]) => SshHop[];
  setRuntimeDetails: (runtimeDetails: RuntimeDetailsForSinglehost) => void;
}

export interface PodmanInfo {
  // 통계 카드
  runningContainers?: number;
  totalContainers?: number;
  failedOrStoppedContainers?: number;
  workloadCount?: number; // Deployment, StatefulSet 등의 수
  imageCount?: number;

  // 런타임 상세 정보
  runtimeType?: string;
  architecture?: string;
  runtimeVersion?: string;
  apiServerVersion?: string;
  os?: string;
  kernelVersion?: string;
  totalCpu?: string;
  totalMemory?: string;

  // 스토리지 정보
  mainNodeStorage?: {
    usagePercentage: number;
    total: number;
    used: number;
  };

  // 시스템 모니터링 정보
  cpuUsage?: number; // CPU 사용률 (%)
  memoryUsage?: number; // 메모리 사용률 (%)
  memoryUsed?: number; // 메모리 사용량 (bytes)
  memoryTotal?: number; // 전체 메모리 (bytes)
  networkRx?: number; // 네트워크 수신 바이트
  networkTx?: number; // 네트워크 송신 바이트
}

interface PlaybookPayload {
  server_id: number;
  infraId: number;
  action: string;
  runtimeType: string;
  playbook_to_run?: string;
  hops: SshHop[];
  awxTemplate: number;
}

const InfraPodmanSetting: React.FC<InfraPodmanSettingProps> = ({
  runtimeDetails,
  selectedInfra,
  onLoading,
  getStoredAuthHops,
  setRuntimeDetails,
}) => {
  const [sshCredentialModalVisible, setSshCredentialModalVisible] =
    useState<boolean>(false);
  const [sshCredentialRetry, setSshCredentialRetry] = useState(false);
  const [playbookPayload, setPlaybookPayload] =
    useState<PlaybookPayload | null>(null);
  const [pendingHops, setPendingHops] = useState<SshHop[]>([]);

  const [runtimeInfo, setRuntimeInfo] = useState<PodmanInfo>(null);
  const [infoLoading, setInfoLoading] = useState<boolean>(false);

  const handleSshCredentialComplete = (hopsWithCreds: SshHop[]) => {
  };

  const fetchRuntimeInfo = useCallback(async () => {
    setRuntimeInfo(null);

    if (!selectedInfra) return;
    if (selectedInfra.nodes.length === 0) return;

    setInfoLoading(true);
    try {
      const hopsWithCreds = getStoredAuthHops(
        JSON.parse(selectedInfra.nodes[0].hops as string) as SshHop[]
      );
      const isCompleted = hopsWithCreds.filter(
        hop => !hop.username || !hop.password
      );
      if (isCompleted.length > 0) {
        setPendingHops(hopsWithCreds);
        setSshCredentialRetry(true);
        setSshCredentialModalVisible(true);
      }

      // 런타임 상세 정보 가져오기
      const infoResult = await dockerApi.request<{
        success: boolean;
        runningContainersResult: string;
        totalContainersResult: string;
        stopContainersResult: string;
        workloadsResult: string;
        imagesResult: string;
        runtimeResult: string;
        architectureResult: string;
        runtimeVersionResult: string;
        apiVersionResult: string;
        kernalResult: string;
        osResult: string;
        cpuCoreResult: string;
        memoryResult: string;
        storageResult: string;
        // 새로운 모니터링 필드
        cpuUsageResult: string;
        memoryUsageResult: string;
        networkRxResult: string;
        networkTxResult: string;
        memoryDetailResult: string;
      }>('getSingleHostInfo', {
        hops: hopsWithCreds,
        infra_id: selectedInfra.id,
        type: selectedInfra.type,
      });

      // info 데이터 생성
      const storageData = infoResult.data.storageResult
        ?.split('\n')[0]
        .split(' ');

      // 메모리 상세 정보 파싱 (used total 형식)
      const memoryDetail = infoResult.data.memoryDetailResult?.split(' ') || [
        '0',
        '0',
      ];
      const memoryUsed = Number(memoryDetail[0]) || 0;
      const memoryTotal = Number(memoryDetail[1]) || 0;

      const runtimeInfo: PodmanInfo = {
        runningContainers: Number(infoResult.data.runningContainersResult),
        totalContainers: Number(infoResult.data.totalContainersResult),
        failedOrStoppedContainers: Number(infoResult.data.stopContainersResult),
        workloadCount: Number(infoResult.data.workloadsResult),
        imageCount: infoResult.data.imagesResult
          .split(' ')
          .filter(data => data.trim().length !== 0).length,

        runtimeType: 'podman',
        architecture: infoResult.data.architectureResult,
        runtimeVersion: infoResult.data.runtimeVersionResult,
        apiServerVersion: infoResult.data.apiVersionResult,
        os: infoResult.data.osResult,
        kernelVersion: infoResult.data.kernalResult,
        totalCpu: infoResult.data.cpuCoreResult,
        totalMemory: infoResult.data.memoryResult,

        mainNodeStorage: {
          usagePercentage: Number(storageData[2]?.split('%')[0]),
          total: Number(storageData[0]),
          used: Number(storageData[1]),
        },

        // 시스템 모니터링 정보
        cpuUsage: Number(infoResult.data.cpuUsageResult) || 0,
        memoryUsage: Number(infoResult.data.memoryUsageResult) || 0,
        memoryUsed: memoryUsed,
        memoryTotal: memoryTotal,
        networkRx: Number(infoResult.data.networkRxResult) || 0,
        networkTx: Number(infoResult.data.networkTxResult) || 0,
      };
      setRuntimeInfo(runtimeInfo);
    } catch (error) {
      console.error(error);
      if (
        error instanceof Error &&
        error.message.includes('SSH 연결 검증 실패')
      ) {
        const masterNodes = selectedInfra.nodes.filter(
          node =>
            node.type === 'master' ||
            (typeof node.type === 'string' && node.type.includes('master'))
        );
        const hopsWithCreds = getStoredAuthHops(
          JSON.parse(masterNodes[0].hops as string) as SshHop[]
        );

        setPendingHops(hopsWithCreds);
        setSshCredentialRetry(true);
        setSshCredentialModalVisible(true);
      }
    } finally {
      setInfoLoading(false);
    }
  }, [selectedInfra, getStoredAuthHops]);

  useEffect(() => {
    void fetchRuntimeInfo();
  }, [fetchRuntimeInfo]);

  const tabItems: TabsProps['items'] = [
    {
      key: 'runtimeInfo',
      label: '개요',
      children: (
        <InfraPodmanInfoTab
          selectedInfra={selectedInfra}
          info={runtimeInfo}
          infoLoading={infoLoading}
        />
      ),
    },
    {
      key: 'runtimeDetails',
      label: '런타임 환경',
      children: (
        <InfraPodmanResourceTab
          runtimeDetails={runtimeDetails}
          selectedInfra={selectedInfra}
          onLoading={onLoading}
          getStoredAuthHops={getStoredAuthHops}
          setRuntimeDetails={setRuntimeDetails}
        />
      ),
    },
  ];

  return (
    <>
      <Tabs defaultActiveKey='runtimeInfo' items={tabItems} />

      <SshCredentialModal
        visible={sshCredentialModalVisible}
        onClose={() => {
          setSshCredentialModalVisible(false);
          setSshCredentialRetry(false); // 재시도 상태 초기화
          setPlaybookPayload(null); // payload 초기화
        }}
        onComplete={handleSshCredentialComplete}
        hops={pendingHops.map(h => ({ ...h, username: h.username || '' }))}
        infraId={playbookPayload?.infraId}
        isRetry={sshCredentialRetry}
      />
    </>
  );
};

export default InfraPodmanSetting;
