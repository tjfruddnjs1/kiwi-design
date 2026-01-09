'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Row, Col, message, Statistic, Button, Card } from 'antd';
import {
  CloudServerOutlined,
  ReloadOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ClusterOutlined,
  ContainerOutlined,
} from '@ant-design/icons';
import InfraSettingsModal from './InfraSettingsModal';
import {
  InfraItem,
  InfraStatus,
  Server,
  Node,
  NodeType,
  InfraWithNodes,
} from '../../../types/infra';
import './InfraSettings.css';
import * as kubernetesApi from '../../../lib/api/kubernetes';
import { logger } from '../../../utils/logger';
import RuntimeSetting from '../../../components/infra/RuntimeSetting';
import { AddInfraModal, ImportInfraModal } from '../../../components/infra';
import { useInfraManagement } from '../../../hooks/useInfraManagement';
import { useParams } from 'react-router-dom';
import { useCredsStore } from '../../../stores/useCredsStore';
// import { ServerListSection, InfraConfigForm, ConnectionTestSection } from '../../../components/infra';
import { useAuth } from '../../../context/AuthContext';
import { useOrganization } from '../../../context/OrganizationContext';
import { api } from '../../../services/api';
import { deviceApi } from '../../../lib/api/devices';
import { Device } from '@/pages/devices/DeviceManagement';
import { awxApi } from '../../../lib/api';

const InfraSettings: React.FC = () => {
  const [infraData, setInfraData] = useState<InfraWithNodes[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedInfraId, setSelectedInfraId] = useState<number | null>(null);
  const [isSettingsModalVisible, setIsSettingsModalVisible] =
    useState<boolean>(false);
  const [selectedInfra, setSelectedInfra] = useState<InfraWithNodes | null>(
    null
  );
  const [messageApi, contextHolder] = message.useMessage();
  const { infraId } = useParams<{ infraId?: string }>();
  const { user } = useAuth();
  const { selectedOrgId, isLoading: orgLoading } = useOrganization();
  // 인프라 추가 및 가져오기 모달 상태
  const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);
  const [isImportModalVisible, setIsImportModalVisible] =
    useState<boolean>(false);

  // useInfraManagement 훅 사용
  const { createInfrastructure, importInfrastructure } = useInfraManagement();

  const fetchInfraData = useCallback(async () => {
    if (orgLoading) return; // 기관 로딩 중이면 대기

    setLoading(true);
    try {
      const response = await kubernetesApi.getInfras(selectedOrgId);
      const data: InfraItem[] = response || [];

      const dataWithNodesAndStatus = await Promise.all(
        data.map(
          async (infra: InfraItem): Promise<InfraItem & { status: string }> => {
            try {
              const serverResponse = await kubernetesApi.getServers(infra.id);
              const statusResponse = await kubernetesApi.getInfraStatusById(
                infra.id
              );
              return {
                ...infra,
                nodes: serverResponse,
                status: statusResponse as InfraStatus,
              };
            } catch (error) {
              logger.error(
                `인프라 ID ${infra.id} 상태 조회 실패`,
                error as Error
              );
              return {
                ...infra,
                status: 'unknown',
              };
            }
          }
        )
      );

      const enhancedData = await Promise.all(
        dataWithNodesAndStatus.map(async (infra): Promise<InfraWithNodes> => {
          if (
            infra.type === 'kubernetes' ||
            infra.type === 'external_kubernetes'
          ) {
            try {
              const response = await kubernetesApi.getServers(infra.id);
              const servers: Server[] = response || [];

              // [개선] Server[]를 Node[]로 변환하는 로직을 더 깔끔하게 수정
              // todo: 쿠버네티스 상태 표현 로직 개선 필요 (현재 외부 쿠버네티스의 경우 import 성공 시 활성, 내부 쿠버네티스의 경우 마스터노드와 워커노드가 존재 시 활성으로 간주)
              let hasMaster = false,
                hasWorker = false,
                hasExternalK8s = false;
              const nodesData: Node[] = servers.map((server: Server) => {
                if (server.type.includes('external_kubernetes')) {
                  hasExternalK8s = true;
                }
                if (server.type.includes('master')) {
                  hasMaster = true;
                }
                if (server.type.includes('worker')) {
                  hasWorker = true;
                }
                return {
                  ...server, // Server의 모든 속성을 복사
                  id: String(server.id), // id를 string으로 덮어쓰기
                  // node_type(string)을 nodeType(NodeType)으로 안전하게 할당
                  nodeType: server.node_type as NodeType,
                };
              });

              return {
                ...infra,
                nodes: nodesData,
                status:
                  (hasMaster && hasWorker) || hasExternalK8s
                    ? infra.status
                    : 'uninstalled',
              };
            } catch (error) {
              logger.error(
                `인프라 ID ${infra.id} 서버 정보 조회 실패:`,
                error as Error
              );
              return {
                ...infra,
                nodes: [],
              };
            }
          }
          return infra;
        })
      );

      setInfraData(enhancedData);
    } catch (error) {
      logger.error('인프라 데이터 조회 실패', error as Error);
      messageApi.error('인프라 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [messageApi, selectedOrgId, orgLoading]);

  const handleInfraStatusUpdate = (infraId: number, status: InfraStatus) => {
    setInfraData(currentData =>
      currentData.map(infra =>
        infra.id === infraId
          ? { ...infra, status: status } // 여기서 'updating' 상태로 변경
          : infra
      )
    );
  };

  // 새로고침 핸들러
  const handleRefresh = async () => {
    await fetchInfraData();
    messageApi.success('데이터가 새로고침되었습니다.');
  };

  // 스토어에서 서버 인증 정보를 가져오는 함수
  const getStoredServerCredentials = (host: string, port: number) => {
    const credsStore = useCredsStore.getState();
    const normalizedHost = host.trim().toLowerCase();
    const normalizedPort = port || 22;

    return credsStore.serverlist.find(
      server =>
        server.host.trim().toLowerCase() === normalizedHost &&
        (server.port || 22) === normalizedPort
    );
  };

  // 스토어에서 hops 정보를 기반으로 인증 정보를 가져오는 함수
  const getStoredAuthHops = (hops: { host: string; port: number }[]) => {
    return hops.map(hop => {
      const storedCreds = getStoredServerCredentials(hop.host, hop.port);
      return {
        ...hop,
        username: storedCreds?.userId || '',
        password: storedCreds?.password || '',
      };
    });
  };

  // 인프라 선택 핸들러
  const handleInfraSelect = async (id: number) => {
    setSelectedInfraId(id);
    const selected = infraData.find(infra => infra.id === id);

    if (selected) {
      selected.nodes = await kubernetesApi.getServers(selected.id);
      // 선택된 인프라의 노드들에 대해 자동 인증 시도
      if (selected.nodes && selected.nodes.length > 0) {
        for (const node of selected.nodes) {
          try {
            // hops 정보 파싱
            const hops = JSON.parse((node.hops as string) || '[]') as {
              host: string;
              port: number;
            }[];
            if (hops.length > 0) {
              // 스토어에서 저장된 인증 정보 확인
              const storedAuthHops = getStoredAuthHops(hops);
              const hasCompleteCredentials = storedAuthHops.every(
                hop => hop.username && hop.password
              );
              if (hasCompleteCredentials) {
                // 여기서 필요한 자동 처리 로직을 실행할 수 있습니다
                // 예: 노드 상태 확인, 연결 테스트 등
              } else {
                //
              }
            }
          } catch (error) {
            console.error(error);
          }
        }
      }
    }

    setSelectedInfra(selected || null);
  };

  // 설정 모달 표시
  const showSettingsModal = (infra: InfraWithNodes) => {
    setSelectedInfra(infra);
    setIsSettingsModalVisible(true);
  };

  // DEPRECATED: 권한 관리 모달 - organization 기반 권한 관리로 변경
  // const showPermissionsModal = (infra: InfraWithNodes) => {
  //   setSelectedInfra(infra);
  //   setIsPermissionModalVisible(true);
  // };

  // 설정 모달 취소
  const handleSettingsCancel = () => {
    setIsSettingsModalVisible(false);
    // 선택된 인프라는 유지 (설정만 닫기)
  };

  // 설정 저장
  const handleSaveSettings = async (updatedInfra: InfraWithNodes) => {
    try {
      await kubernetesApi.updateInfra(updatedInfra.id, updatedInfra);
      messageApi.success('설정이 저장되었습니다.');
      setIsSettingsModalVisible(false);
      // 선택된 인프라는 유지하고 업데이트된 정보로 갱신
      setSelectedInfra(updatedInfra);
      await fetchInfraData();
    } catch (error) {
      logger.error('설정 저장 실패', error as Error);
      messageApi.error('설정 저장에 실패했습니다.');
    }
  };

  // 인프라 추가 모달 핸들러
  const handleAddInfra = () => {
    setIsAddModalVisible(true);
  };

  // 외부 런타임 가져오기 모달 핸들러
  const handleImportInfra = () => {
    setIsImportModalVisible(true);
  };

  // 인프라 추가 제출 핸들러
  const handleAddInfraSubmit = async (values: {
    name: string;
    type: string;
    info?: string;
    k8sInfra?: string;
    storageInfra?: string;
    storageServer?: number;
    minioMode?: 'new' | 'existing';
    existingMinioId?: number;
    user_id?: string;
  }): Promise<boolean> => {
    try {
      let result = false;

      if (values.type === 'backup') {
        // backup 타입일 때는 다른 로직 사용 (아직 구현하지 않음)
        values.user_id = user?.id + '' || '';
        const response = await api.backup.addInfraBackupLine(values);

        result = response.data.success;
      } else {
        // 일반 인프라 생성
        const infraData = {
          name: values.name,
          type: values.type,
          info: values.info || '',
        };
        result = await createInfrastructure(infraData);
      }

      if (result) {
        setIsAddModalVisible(false);
        await fetchInfraData();
      }
      return result;
    } catch (error) {
      logger.error('인프라 추가 실패', error as Error);
      return false;
    }
  };

  // 외부 런타임 가져오기 제출 핸들러
  const handleImportInfraSubmit = async (data: {
    name: string;
    type: string;
    info: string;
    hops: Array<{
      host: string;
      port: number;
      username: string;
      password: string;
    }>;
  }): Promise<boolean> => {
    try {
      let serverType = data.type;
      if (data.type === 'external_docker') serverType = 'docker';
      if (data.type === 'external_podman') serverType = 'podman';

      const response = await api.infra.validationImportData(
        data.name,
        serverType,
        data.hops,
        user?.id
      );
      if (response.data.success) {
        message.success('데이터 검증에 성공했습니다.');
      } else {
        message.error('데이터 검증에 실패했습니다. 입력 정보를 확인해주세요.');
        return;
      }

      if (data.type === 'external_kubernetes') {
        // 노드 목록을 가져오기
        const nodeResponse = await kubernetesApi.calculateNodes({
          hops: data.hops.map(hop => ({
            host: hop.host || '',
            port: hop.port || 22,
            username: hop.username || '',
            password: hop.password || '',
          })),
        });
        const nodeList = nodeResponse.data.list;

        // 인프라 등록
        const infra = await kubernetesApi.createInfra({
          name: data.name,
          type: data.type,
          info: data.info,
        });

        // 장비 등록하기
        try {
          for (const node of nodeList) {
            const existingDevice = (await deviceApi.checkExistingDevice(
              node.name,
              node.ip,
              user?.id
            )) as { data: Device };
            if (existingDevice.data) {
              const response = (await awxApi.addHost(
                node.ip,
                user.awx_inventory,
                user.awx_template
              )) as { data: { id: number } };
              await deviceApi.updateDeviceAWXHostId(
                existingDevice.data.id,
                response.data.id
              );
            }

            await kubernetesApi.addServerFromExternalKubernetes(
              node,
              infra.id,
              existingDevice.data.id
            );
          }
          setIsImportModalVisible(false);
          await fetchInfraData();
          return true;
        } catch (error) {
          console.error(error);
        }
      } else {
        // 등록한 장비인지 체크 함과 동시에 없으면 자동 등록
        const existingDevice = (await deviceApi.checkExistingDevice(
          data.name,
          data.hops,
          user?.id
        )) as { data: Device };
        // AWX 호스트에 등록 후 devices 테이블의 awxHostId 컬럼 업데이트
        if (existingDevice.data) {
          const response = (await awxApi.addHost(
            data.hops,
            user.awx_inventory,
            user.awx_template
          )) as { data: { id: number } };
          await deviceApi.updateDeviceAWXHostId(
            existingDevice.data.id,
            response.data.id
          );
        }
        const masterDeviceId = existingDevice.data.id;

        const result = await importInfrastructure(
          masterDeviceId,
          data,
          user?.id
        );
        if (result) {
          setIsImportModalVisible(false);
          await fetchInfraData();
        }
        return result;
      }
    } catch (error) {
      logger.error('외부 런타임 가져오기 실패', error as Error);
      return false;
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    void fetchInfraData();
  }, [fetchInfraData]);

  // URL 파라미터 변경 시 선택된 인프라 업데이트
  useEffect(() => {
    if (infraId && infraData.length > 0) {
      const id = parseInt(infraId);
      const infra = infraData.find(item => item.id === id);
      if (infra) {
        setSelectedInfraId(id);
        setSelectedInfra(infra);
      }
    }
  }, [infraId, infraData]);

  useEffect(() => {
  }, [selectedInfraId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size='large' />
        <div style={{ marginTop: '16px' }}>인프라 데이터를 불러오는 중...</div>
      </div>
    );
  }

  // 통계 계산
  const activeInfras = infraData.filter(
    infra => infra.status === 'active'
  ).length;
  const k8sInfras = infraData.filter(
    infra => infra.type === 'kubernetes' || infra.type === 'external_kubernetes'
  ).length;
  const dockerInfras = infraData.filter(
    infra => infra.type === 'docker' || infra.type === 'external_docker'
  ).length;
  const podmanInfras = infraData.filter(
    infra => infra.type === 'podman' || infra.type === 'external_podman'
  ).length;

  return (
    <div className='infra-settings management-page'>
      {contextHolder}

      {/* 페이지 헤더 */}
      <div className='page-header'>
        <div className='page-header-title'>
          <CloudServerOutlined style={{ fontSize: 28, color: '#1890ff' }} />
          <div>
            <h1>런타임 환경</h1>
            <p className='page-header-description'>
              Kubernetes, Docker, Podman 인프라를 관리하고 모니터링합니다
            </p>
          </div>
        </div>
        <div className='page-header-actions'>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            새로고침
          </Button>
          <Button icon={<PlusOutlined />} onClick={handleAddInfra}>
            런타임 추가
          </Button>
          <Button
            type='primary'
            icon={<CloudServerOutlined />}
            onClick={handleImportInfra}
          >
            외부 런타임 가져오기
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <Row gutter={16} className='stats-row'>
        <Col xs={24} sm={6}>
          <div className='stat-card'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className='stat-card-icon blue'>
                <CloudServerOutlined />
              </div>
              <Statistic
                title='전체 런타임'
                value={infraData.length}
                suffix='개'
              />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={6}>
          <div className='stat-card'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className='stat-card-icon green'>
                <CheckCircleOutlined />
              </div>
              <Statistic
                title='활성 런타임'
                value={activeInfras}
                suffix={`/ ${infraData.length}`}
              />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={6}>
          <div className='stat-card'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className='stat-card-icon purple'>
                <ClusterOutlined />
              </div>
              <Statistic title='Kubernetes' value={k8sInfras} suffix='개' />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={6}>
          <div className='stat-card'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className='stat-card-icon cyan'>
                <ContainerOutlined />
              </div>
              <Statistic
                title='Docker / Podman'
                value={dockerInfras + podmanInfras}
                suffix='개'
              />
            </div>
          </div>
        </Col>
      </Row>

      {/* 메인 컨텐츠 */}
      <div className='main-card'>
        <Card bordered={false}>
          <RuntimeSetting
            infraData={infraData}
            selectedInfra={selectedInfra}
            onInfraSelect={handleInfraSelect}
            onShowSettings={showSettingsModal}
            onRefresh={handleRefresh}
            onStatusUpdate={handleInfraStatusUpdate}
            setInfraData={setInfraData}
          />
        </Card>
      </div>

      {/* 런타임 추가 모달 */}
      <AddInfraModal
        visible={isAddModalVisible}
        onCancel={() => setIsAddModalVisible(false)}
        onSubmit={handleAddInfraSubmit}
      />

      {/* 외부 런타임 가져오기 모달 */}
      <ImportInfraModal
        visible={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        onSubmit={handleImportInfraSubmit}
      />

      {/* 설정 모달 */}
      {selectedInfra && (
        <InfraSettingsModal
          visible={isSettingsModalVisible}
          infraItem={selectedInfra}
          onCancel={handleSettingsCancel}
          onSave={handleSaveSettings}
        />
      )}

      {/* DEPRECATED: 권한 관리 모달 - organization 기반 권한 관리로 변경 */}
      {/* {selectedInfra && (
        <InfraPermissionModal
          visible={isPermissionModalVisible}
          infra={{
            id: selectedInfra.id,
            name: selectedInfra.name,
            type: selectedInfra.type,
            info: selectedInfra.info,
            status: selectedInfra.status,
            created_at: selectedInfra.created_at,
            updated_at: selectedInfra.updated_at
          }}
          onClose={handlePermissionsCancel}
        />
      )} */}
    </div>
  );
};

export default InfraSettings;
