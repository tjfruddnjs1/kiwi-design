import { InfraWithNodes } from '../../types/infra';
import { RuntimeDetailsForKubernetes } from './RuntimeSetting';
import { Tabs, TabsProps } from 'antd';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import InfraKubernetesRuntimeResourceTab from './InfraKubernetesRuntimeResourceTab';
import InfraKubernetesNodeSettingTab from './InfraKubernetesNodeSettingTab';
import InfraKubernetesInfoTab from './InfraKubernetesInfoTab';
import K8sCertificatesTab from '../services/operate-modal/tabs/k8s/K8sCertificatesTab';
import { kubernetesApi, SshHop } from '../../lib/api';
import SshCredentialModal from '../services/SshCredentialModal';

interface InfraKubernetesSettingProps {
  runtimeDetails: RuntimeDetailsForKubernetes;
  selectedInfra: InfraWithNodes;
  onLoading: boolean;
  getStoredAuthHops: (hops: SshHop[]) => SshHop[];
}

export interface KubernetesInfo {
  // 통계 카드
  runningPods: number;
  totalPods: number;
  failedOrStoppedPods: number;
  workloadCount: number; // Deployment, StatefulSet 등의 수
  imageCount: number;

  // 런타임 상세 정보
  runtimeType: string;
  architecture: string;
  runtimeVersion: string;
  apiServerVersion: string;
  os: string;
  kernelVersion: string;
  totalCpu: string;
  totalMemory: string;

  // 스토리지 정보
  mainNodeStorage: {
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

const InfraKubernetesSetting: React.FC<InfraKubernetesSettingProps> = ({
  selectedInfra,
  runtimeDetails,
  onLoading,
  getStoredAuthHops,
}) => {
  const [sshCredentialModalVisible, setSshCredentialModalVisible] =
    useState<boolean>(false);
  const [sshCredentialRetry, setSshCredentialRetry] = useState(false);
  const [playbookPayload, setPlaybookPayload] =
    useState<PlaybookPayload | null>(null);
  const [pendingHops, setPendingHops] = useState<SshHop[]>([]);

  const [runtimeInfo, setRuntimeInfo] = useState<KubernetesInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState<boolean>(false);

  const handleSshCredentialComplete = (hopsWithCreds: SshHop[]) => {
  };

  // 마스터/컨트롤플레인 노드를 찾는 헬퍼 함수
  const findMasterNode = useCallback((nodes: typeof selectedInfra.nodes) => {
    // master, control-plane, external_kubernetes 등의 노드 타입 필터링
    const masterNodes = nodes.filter(node => {
      const nodeType =
        typeof node.type === 'string' ? node.type.toLowerCase() : '';
      return (
        nodeType.includes('master') ||
        nodeType.includes('control-plane') ||
        nodeType.includes('control_plane')
      );
    });

    // 마스터 노드가 없으면 첫 번째 노드 사용 (external_kubernetes 대비)
    return masterNodes.length > 0 ? masterNodes[0] : nodes[0];
  }, []);

  const fetchRuntimeInfo = useCallback(async () => {
    setRuntimeInfo(null);

    if (!selectedInfra) return;
    if (selectedInfra.nodes.length === 0) return;

    setInfoLoading(true);
    try {
      const targetNode = findMasterNode(selectedInfra.nodes);
      const hopsWithCreds = getStoredAuthHops(
        JSON.parse(targetNode.hops as string) as SshHop[]
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
      const infoResult = await kubernetesApi.request<{
        success: boolean;
        runningPodsResult: string;
        totalPodsResult: string;
        stopPodsResult: string;
        workloadsResult: string;
        imagesResult: string;
        runtimeResult: string;
        architectureResult: string;
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
      }>('getRuntimeInfo', {
        hops: hopsWithCreds,
        infra_id: selectedInfra.id,
      });

      // info 데이터 생성
      const storageData = infoResult.data.storageResult
        ?.split('\n')[0]
        .split(' ');

      // 메모리 상세 정보 파싱 (Ki 단위를 바이트로 변환)
      const memoryDetailParts = infoResult.data.memoryDetailResult?.split(
        ' '
      ) || ['0Ki', '0Ki'];
      const parseKiToBytes = (kiStr: string): number => {
        const numStr = kiStr.replace(/Ki$/, '');
        return (Number(numStr) || 0) * 1024;
      };
      const memoryUsedBytes = parseKiToBytes(memoryDetailParts[0] || '0Ki');
      const memoryTotalBytes = parseKiToBytes(memoryDetailParts[1] || '0Ki');

      const runtimeInfo: KubernetesInfo = {
        runningPods: infoResult.data.runningPodsResult
          .split('\n')
          .filter(data => data.trim().length !== 0).length,
        totalPods: infoResult.data.totalPodsResult
          .split('\n')
          .filter(data => data.trim().length !== 0).length,
        failedOrStoppedPods: infoResult.data.stopPodsResult
          .split('\n')
          .filter(data => data.trim().length !== 0).length,
        workloadCount: infoResult.data.workloadsResult
          .split('\n')
          .filter(data => data.trim().length !== 0).length,
        imageCount: infoResult.data.imagesResult
          .split('\n')
          .filter(data => data.trim().length !== 0).length,

        runtimeType: infoResult.data.runtimeResult.split('://')[0],
        architecture: infoResult.data.architectureResult,
        runtimeVersion: infoResult.data.runtimeResult.split('://')[1],
        apiServerVersion: infoResult.data.apiVersionResult.split('\n')[0],
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
        memoryUsed: memoryUsedBytes,
        memoryTotal: memoryTotalBytes,
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
        const targetNode = findMasterNode(selectedInfra.nodes);
        const hopsWithCreds = getStoredAuthHops(
          JSON.parse(targetNode.hops as string) as SshHop[]
        );

        setPendingHops(hopsWithCreds);
        setSshCredentialRetry(true);
        setSshCredentialModalVisible(true);
      }
    } finally {
      setInfoLoading(false);
    }
  }, [selectedInfra, getStoredAuthHops, findMasterNode]);

  useEffect(() => {
    void fetchRuntimeInfo();
  }, [fetchRuntimeInfo]);

  // 마스터 노드의 hops 정보 가져오기 (인증서 관리 탭용)
  const masterNodeHops = useMemo(() => {
    if (!selectedInfra || selectedInfra.nodes.length === 0) return [];
    const targetNode = findMasterNode(selectedInfra.nodes);
    if (!targetNode || !targetNode.hops) return [];
    try {
      const hops = JSON.parse(targetNode.hops as string) as SshHop[];
      return getStoredAuthHops(hops);
    } catch {
      return [];
    }
  }, [selectedInfra, findMasterNode, getStoredAuthHops]);

  // 쿠버네티스 탭 구성
  const tabItems: TabsProps['items'] = [
    {
      key: 'runtimeInfo',
      label: '개요',
      children: (
        <InfraKubernetesInfoTab
          selectedInfra={selectedInfra}
          info={runtimeInfo}
          infoLoading={infoLoading}
        />
      ),
    },
    {
      key: 'nodeSetting',
      label: '노드 목록',
      children: <InfraKubernetesNodeSettingTab selectedInfra={selectedInfra} />,
    },
    {
      key: 'runtimeDetails',
      label: '런타임 환경',
      children: (
        <InfraKubernetesRuntimeResourceTab
          runtimeDetails={runtimeDetails}
          onLoading={onLoading}
        />
      ),
    },
    {
      key: 'certificates',
      label: (
        <span>
          <SafetyCertificateOutlined style={{ marginRight: 8 }} />
          인증서 관리
        </span>
      ),
      children: (
        <K8sCertificatesTab
          hops={masterNodeHops}
          infraId={selectedInfra?.id}
          onCertificateRefresh={() => {
            // 인증서 갱신 후 런타임 정보 새로고침
            void fetchRuntimeInfo();
          }}
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

export default InfraKubernetesSetting;
