/**
 * Database Management Page
 * 데이터베이스 연결 관리 및 데이터 동기화 기능을 제공하는 메인 페이지
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  message,
  Popconfirm,
  Typography,
  Row,
  Col,
  Statistic,
  Spin,
  Alert,
  Badge,
  Divider,
  Empty,
  Collapse,
  Progress,
} from 'antd';
import {
  DatabaseOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlayCircleOutlined,
  HistoryOutlined,
  SwapOutlined,
  ApiOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  LinkOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  TableOutlined,
  EyeOutlined,
  GlobalOutlined,
  UserOutlined,
  LockOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import databaseApi, {
  DBConnection,
  DBConnectionCreateRequest,
  DBSyncJob,
  DBSyncHistory,
  DBSyncHistoryDetail,
  DBCompareResult,
  BackupInfo,
  ServiceWithSSHInfo,
  RestoreHistoryItem,
  getDefaultPort,
  getSyncStatusColor,
  getSyncStatusText,
} from '../../lib/api/database';
import { logger } from '../../utils/logger';
import { useOrganization } from '../../context/OrganizationContext';
import './DatabaseManagement.css';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { Panel } = Collapse;

// 연결 상태 타입
type ConnectionStatus = 'unknown' | 'testing' | 'connected' | 'failed';

interface ConnectionWithStatus extends DBConnection {
  connectionStatus?: ConnectionStatus;
  lastTestMessage?: string;
}

const DatabaseManagement: React.FC = () => {
  // 기관 컨텍스트
  const { selectedOrgId, isLoading: orgLoading } = useOrganization();

  // State
  const [activeTab, setActiveTab] = useState('connections');
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<ConnectionWithStatus[]>([]);
  const [syncJobs, setSyncJobs] = useState<DBSyncJob[]>([]);
  const [syncHistory, setSyncHistory] = useState<DBSyncHistory[]>([]);
  const [testingConnections, setTestingConnections] = useState<Set<number>>(
    new Set()
  );

  // Modal State
  const [connectionModalOpen, setConnectionModalOpen] = useState(false);
  const [syncJobModalOpen, setSyncJobModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] =
    useState<DBConnection | null>(null);
  const [editingSyncJob, setEditingSyncJob] = useState<DBSyncJob | null>(null);

  // 서비스 기반 DB 연결 추가용 State
  const [servicesWithSSH, setServicesWithSSH] = useState<ServiceWithSSHInfo[]>(
    []
  );
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    null
  );
  const [loadingServices, setLoadingServices] = useState(false);
  const [servicesLoaded, setServicesLoaded] = useState(false);

  // Compare State
  const [compareResult, setCompareResult] = useState<DBCompareResult | null>(
    null
  );
  const [comparing, setComparing] = useState(false);

  // Forms
  const [connectionForm] = Form.useForm();
  const [syncJobForm] = Form.useForm();
  const [compareForm] = Form.useForm();

  // SSH 옵션 표시 상태
  const [showSSHOptions, setShowSSHOptions] = useState(false);
  const [showJumpOptions, setShowJumpOptions] = useState(false);

  // 동기화 작업 생성 시 스키마 검증 상태
  const [syncJobSchemaValidation, setSyncJobSchemaValidation] = useState<{
    validated: boolean;
    isCompatible: boolean;
    message?: string;
    differences?: DBCompareResult['schema_diff'];
  }>({ validated: false, isCompatible: false });
  const [validatingSchema, setValidatingSchema] = useState(false);

  // 마이그레이션 백업 옵션 상태
  const [migrationBackupEnabled, setMigrationBackupEnabled] = useState(true);
  const [executingMigration, setExecutingMigration] = useState(false);

  // 동기화 실행 미리보기 상태
  const [syncPreviewModalOpen, setSyncPreviewModalOpen] = useState(false);
  const [syncPreviewData, setSyncPreviewData] = useState<{
    job: DBSyncJob;
    compareResult: DBCompareResult | null;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // 비교 작업 경과 시간 추적
  const [compareElapsedTime, setCompareElapsedTime] = useState(0);
  const [previewElapsedTime, setPreviewElapsedTime] = useState(0);

  // 동기화 이력 상세 정보 (SQL 로그 포함)
  const [historyDetails, setHistoryDetails] = useState<
    Map<number, DBSyncHistoryDetail>
  >(new Map());
  const [loadingHistoryDetail, setLoadingHistoryDetail] = useState<Set<number>>(
    new Set()
  );
  const [expandedHistoryKeys, setExpandedHistoryKeys] = useState<React.Key[]>(
    []
  );

  // 백업 관리 상태
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [selectedConnectionForBackup, setSelectedConnectionForBackup] =
    useState<DBConnection | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);
  const [restoreProgress, setRestoreProgress] =
    useState<RestoreHistoryItem | null>(null);
  const [restorePollingId, setRestorePollingId] = useState<number | null>(null);
  const [restoringSyncHistoryId, setRestoringSyncHistoryId] = useState<
    number | null
  >(null);

  // 연결된 DB 목록 (동기화 작업용)
  const connectedDBs = connections.filter(
    c => c.connectionStatus === 'connected'
  );

  // 데이터 로드 (기관별 필터링 지원)
  const loadConnections = useCallback(async () => {
    if (orgLoading) return; // 기관 로딩 중이면 대기

    try {
      setLoading(true);
      const data = await databaseApi.getDBConnections(selectedOrgId);
      // 백엔드에서 저장된 연결 상태 사용 (DB에 영속화된 last_test_status, last_test_message)
      setConnections(
        (data || []).map(conn => ({
          ...conn,
          connectionStatus: conn.last_test_status || 'unknown',
          lastTestMessage: conn.last_test_message,
        }))
      );
    } catch (error) {
      logger.error('DB 연결 목록 로드 실패:', error);
      message.error('DB 연결 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId, orgLoading]);

  const loadSyncJobs = useCallback(async () => {
    try {
      const data = await databaseApi.getSyncJobs();
      setSyncJobs(data || []);
    } catch (error) {
      logger.error('동기화 작업 목록 로드 실패:', error);
    }
  }, []);

  const loadSyncHistory = useCallback(async () => {
    try {
      const data = await databaseApi.getSyncHistory();
      setSyncHistory(data || []);
    } catch (error) {
      logger.error('동기화 이력 로드 실패:', error);
    }
  }, []);

  // 서비스 목록과 SSH 정보 로드 (DB 연결 추가용)
  const loadServicesWithSSH = useCallback(async () => {
    setLoadingServices(true);
    try {
      const data = await databaseApi.getServicesWithSSHInfo();
      setServicesWithSSH(data || []);
      setServicesLoaded(true);
      if (!data || data.length === 0) {
        logger.info('SSH 정보가 있는 서비스가 없습니다.');
      }
    } catch (error) {
      logger.error('서비스 SSH 정보 로드 실패:', error);
      message.error('서비스 정보 로드에 실패했습니다.');
      setServicesLoaded(true); // 에러가 나도 로드 완료로 표시
    } finally {
      setLoadingServices(false);
    }
  }, []);

  // 서비스 선택 시 SSH 정보 자동 입력
  const handleServiceSelect = (serviceId: number | null) => {
    setSelectedServiceId(serviceId);

    if (!serviceId) {
      // 서비스 선택 해제 시 SSH 옵션만 초기화 (연결 정보는 유지)
      return;
    }

    const service = servicesWithSSH.find(s => s.service_id === serviceId);
    if (!service || service.ssh_hops.length === 0) {
      message.warning('선택한 서비스에 SSH 정보가 없습니다.');
      return;
    }

    // SSH hops 정보로 폼 자동 입력
    const hops = service.ssh_hops;

    if (hops.length >= 1) {
      // 첫 번째 hop = Jump host (있는 경우)
      // 마지막 hop = Target host
      if (hops.length >= 2) {
        // Jump host 있음
        connectionForm.setFieldsValue({
          ssh_enabled: true,
          ssh_jump_enabled: true,
          ssh_jump_host: hops[0].host,
          ssh_jump_port: hops[0].port || 22,
          ssh_jump_username: hops[0].username,
          ssh_host: hops[hops.length - 1].host,
          ssh_port: hops[hops.length - 1].port || 22,
          ssh_username: hops[hops.length - 1].username,
        });
        setShowSSHOptions(true);
        setShowJumpOptions(true);
      } else {
        // Jump host 없음, 직접 SSH
        connectionForm.setFieldsValue({
          ssh_enabled: true,
          ssh_jump_enabled: false,
          ssh_host: hops[0].host,
          ssh_port: hops[0].port || 22,
          ssh_username: hops[0].username,
        });
        setShowSSHOptions(true);
        setShowJumpOptions(false);
      }

      message.success(
        `"${service.service_name}" 서비스의 SSH 정보가 자동 입력되었습니다. 비밀번호만 입력하세요.`
      );
    }
  };

  useEffect(() => {
    loadConnections();
    loadSyncJobs();
    loadSyncHistory();
  }, [loadConnections, loadSyncJobs, loadSyncHistory]);

  // 실행 중인 작업이 있을 때 자동 폴링 (3초 간격)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const hasRunningJobs = syncHistory.some(h => h.status === 'running');

    if (hasRunningJobs) {
      // 실행 중인 작업이 있으면 폴링 시작
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(() => {
          loadSyncHistory();
        }, 3000); // 3초마다 갱신
      }
    } else {
      // 실행 중인 작업이 없으면 폴링 중지
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    // cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [syncHistory, loadSyncHistory]);

  // 비교 작업 경과 시간 추적
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (comparing) {
      setCompareElapsedTime(0);
      timer = setInterval(() => {
        setCompareElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [comparing]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (loadingPreview) {
      setPreviewElapsedTime(0);
      timer = setInterval(() => {
        setPreviewElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [loadingPreview]);

  // DB 연결 저장
  const handleSaveConnection = async (values: DBConnectionCreateRequest) => {
    try {
      setLoading(true);
      // 서비스 ID가 선택되어 있으면 values에 추가
      const requestData: DBConnectionCreateRequest = {
        ...values,
        service_id: selectedServiceId || undefined,
      };

      if (editingConnection) {
        await databaseApi.updateDBConnection(editingConnection.id, requestData);
        message.success('DB 연결 정보가 수정되었습니다.');
      } else {
        await databaseApi.createDBConnection(requestData);
        message.success('새 DB 연결이 추가되었습니다.');
      }
      setConnectionModalOpen(false);
      connectionForm.resetFields();
      setEditingConnection(null);
      setShowSSHOptions(false);
      setShowJumpOptions(false);
      setSelectedServiceId(null); // 서비스 선택 상태 초기화
      loadConnections();
    } catch (error) {
      logger.error('DB 연결 저장 실패:', error);
      message.error('DB 연결 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // DB 연결 삭제
  const handleDeleteConnection = async (id: number) => {
    try {
      await databaseApi.deleteDBConnection(id);
      message.success('DB 연결이 삭제되었습니다.');
      loadConnections();
    } catch (error) {
      logger.error('DB 연결 삭제 실패:', error);
      message.error('DB 연결 삭제에 실패했습니다.');
    }
  };

  // DB 연결 테스트
  const handleTestConnection = async (id: number) => {
    const conn = connections.find(c => c.id === id);
    try {
      setTestingConnections(prev => new Set(prev).add(id));
      setConnections(prev =>
        prev.map(c =>
          c.id === id
            ? { ...c, connectionStatus: 'testing' as ConnectionStatus }
            : c
        )
      );

      const result = await databaseApi.testDBConnection(id);

      setConnections(prev =>
        prev.map(c =>
          c.id === id
            ? {
                ...c,
                connectionStatus: result.connected ? 'connected' : 'failed',
                lastTestMessage: result.connected
                  ? '연결 성공'
                  : result.error || '연결 실패',
              }
            : c
        )
      );

      if (result.connected) {
        message.success({
          content: (
            <span>
              <strong>{conn?.name || 'DB'}</strong> 연결 성공
              <br />
              <span style={{ fontSize: 12, color: '#666' }}>
                {conn?.host}:{conn?.port}/{conn?.database_name}
              </span>
            </span>
          ),
          duration: 3,
        });
      } else {
        message.error(
          `${conn?.name || 'DB'} 연결 실패: ${result.error || '알 수 없는 오류'}`
        );
      }
    } catch (error) {
      logger.error('DB 연결 테스트 실패:', error);
      setConnections(prev =>
        prev.map(c =>
          c.id === id
            ? {
                ...c,
                connectionStatus: 'failed',
                lastTestMessage: '테스트 실패',
              }
            : c
        )
      );
      message.error(`${conn?.name || 'DB'} 연결 테스트에 실패했습니다.`);
    } finally {
      setTestingConnections(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // 모든 연결 테스트
  const handleTestAllConnections = async () => {
    for (const conn of connections) {
      await handleTestConnection(conn.id);
    }
  };

  // 동기화 작업 저장
  const handleSaveSyncJob = async (values: DBSyncJob) => {
    try {
      setLoading(true);
      if (editingSyncJob) {
        await databaseApi.updateSyncJob(editingSyncJob.id, values);
        message.success('동기화 작업이 수정되었습니다.');
      } else {
        await databaseApi.createSyncJob(values);
        message.success('동기화 작업이 생성되었습니다.');
      }
      setSyncJobModalOpen(false);
      syncJobForm.resetFields();
      setEditingSyncJob(null);
      loadSyncJobs();
    } catch (error) {
      logger.error('동기화 작업 저장 실패:', error);
      message.error('동기화 작업 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 동기화 작업 삭제
  const handleDeleteSyncJob = async (id: number) => {
    try {
      await databaseApi.deleteSyncJob(id);
      message.success('동기화 작업이 삭제되었습니다.');
      loadSyncJobs();
    } catch (error) {
      logger.error('동기화 작업 삭제 실패:', error);
      message.error('동기화 작업 삭제에 실패했습니다.');
    }
  };

  // 동기화 실행 미리보기 (스키마 + 데이터 비교)
  const handleSyncPreview = async (job: DBSyncJob) => {
    try {
      setLoadingPreview(true);
      setSyncPreviewModalOpen(true);
      setSyncPreviewData({ job, compareResult: null });

      // 스키마 + 데이터 비교 수행
      const result = await databaseApi.compareDBs(
        job.source_connection_id,
        job.target_connection_id,
        'full' // 스키마와 데이터 모두 비교
      );

      // 디버깅: API 응답 데이터 확인
      if (result.data_diff?.tables) {
        result.data_diff.tables.forEach(table => {
        });
      }

      setSyncPreviewData({ job, compareResult: result });
    } catch (error) {
      logger.error('동기화 미리보기 실패:', error);
      message.error(
        '동기화 미리보기에 실패했습니다. 연결 상태를 확인해주세요.'
      );
      setSyncPreviewModalOpen(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  // 동기화 작업 실행
  const handleExecuteSyncJob = async (id: number, dryRun: boolean = false) => {
    try {
      const result = await databaseApi.executeSyncJob(id, dryRun);
      message.success(
        dryRun
          ? `테스트 실행이 완료되었습니다. (ID: ${result.history_id})`
          : `동기화 작업이 시작되었습니다. (ID: ${result.history_id})`
      );
      loadSyncJobs();
      loadSyncHistory();
      // 미리보기 모달 닫기
      setSyncPreviewModalOpen(false);
      setSyncPreviewData(null);
    } catch (error) {
      logger.error('동기화 작업 실행 실패:', error);
      message.error('동기화 작업 실행에 실패했습니다.');
    }
  };

  // DB 스키마 비교 실행 (마이그레이션은 스키마 비교만 수행)
  const handleCompare = async (values: {
    source_id: number;
    target_id: number;
  }) => {
    try {
      setComparing(true);
      setCompareResult(null);
      const result = await databaseApi.compareDBs(
        values.source_id,
        values.target_id,
        'schema' // 항상 스키마 비교만 수행
      );
      setCompareResult(result);
      message.success('스키마 비교가 완료되었습니다.');
    } catch (error) {
      logger.error('스키마 비교 실패:', error);
      message.error('스키마 비교에 실패했습니다. 연결 상태를 확인해주세요.');
    } finally {
      setComparing(false);
    }
  };

  // 동기화 이력 상세 정보 로드 (SQL 로그 포함)
  const loadHistoryDetail = async (historyId: number) => {
    if (historyDetails.has(historyId)) {
      // 이미 로드된 경우 스킵
      return;
    }

    try {
      setLoadingHistoryDetail(prev => new Set(prev).add(historyId));
      const detail = await databaseApi.getSyncHistoryDetail(historyId);

      setHistoryDetails(prev => new Map(prev).set(historyId, detail));
    } catch (error) {
      logger.error(`이력 상세 로드 실패 (ID: ${historyId}):`, error);
      message.error('이력 상세 정보를 불러올 수 없습니다.');
    } finally {
      setLoadingHistoryDetail(prev => {
        const next = new Set(prev);
        next.delete(historyId);
        return next;
      });
    }
  };

  // 이력 행 확장/축소 토글
  const toggleHistoryExpansion = (recordId: number) => {
    setExpandedHistoryKeys(prev => {
      const isExpanded = prev.includes(recordId);
      if (isExpanded) {
        return prev.filter(key => key !== recordId);
      } else {
        loadHistoryDetail(recordId);
        return [...prev, recordId];
      }
    });
  };

  // 백업 목록 로드
  const loadBackups = async (connection: DBConnection) => {
    try {
      setLoadingBackups(true);
      setSelectedConnectionForBackup(connection);
      setBackupModalOpen(true);
      const backupList = await databaseApi.listBackups(connection.id);
      setBackups(backupList || []);
    } catch (error) {
      logger.error('백업 목록 로드 실패:', error);
      message.error('백업 목록을 불러올 수 없습니다.');
    } finally {
      setLoadingBackups(false);
    }
  };

  // 복원 진행률 폴링
  const pollRestoreProgress = useCallback(async (restoreId: number) => {
    try {
      const history = await databaseApi.getRestoreHistory(undefined, restoreId);
      if (history && history.length > 0) {
        const item = history[0];
        setRestoreProgress(item);

        if (item.status === 'completed') {
          message.success('백업이 성공적으로 복원되었습니다.');
          setRestoringBackup(null);
          setRestoreProgress(null);
          setRestorePollingId(null);
        } else if (item.status === 'failed') {
          message.error(
            `백업 복원 실패: ${item.error_message || '알 수 없는 오류'}`
          );
          setRestoringBackup(null);
          setRestoreProgress(null);
          setRestorePollingId(null);
        }
      }
    } catch (error) {
      logger.error('복원 상태 조회 실패:', error);
    }
  }, []);

  // 복원 진행률 폴링 효과
  useEffect(() => {
    if (restorePollingId !== null) {
      const interval = setInterval(() => {
        pollRestoreProgress(restorePollingId);
      }, 2000); // 2초마다 폴링
      return () => clearInterval(interval);
    }
  }, [restorePollingId, pollRestoreProgress]);

  // 백업 복원 실행
  const handleRestoreBackup = async (backupFile: string) => {
    if (!selectedConnectionForBackup) return;

    Modal.confirm({
      title: '백업 복원 확인',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>
            <strong>주의:</strong> 백업 복원은 현재 데이터를 덮어씁니다!
          </p>
          <p>
            복원할 백업: <Text code>{backupFile}</Text>
          </p>
          <p>
            대상 DB: <Text strong>{selectedConnectionForBackup.name}</Text>
          </p>
          <Alert
            type='warning'
            message='이 작업은 되돌릴 수 없습니다. 중요한 데이터가 있다면 먼저 백업하세요.'
            style={{ marginTop: 12 }}
          />
        </div>
      ),
      okText: '복원 실행',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        try {
          setRestoringBackup(backupFile);
          // 진행률 표시를 위한 초기 상태 설정
          setRestoreProgress({
            id: 0,
            connection_id: selectedConnectionForBackup.id,
            backup_file: backupFile,
            status: 'running',
            progress_percent: 50,
            started_at: new Date().toISOString(),
            completed_at: '',
            duration_seconds: 0,
            error_message: '',
            connection_name: selectedConnectionForBackup.name,
            database_name: selectedConnectionForBackup.database_name,
          });

          // 비동기 복원 시도, 실패 시 동기 복원으로 폴백
          try {
            const result = await databaseApi.restoreBackupAsync(
              selectedConnectionForBackup.id,
              backupFile
            );
            message.info('복원 작업이 시작되었습니다. 진행률을 확인하세요.');
            setRestorePollingId(result.restore_id);
            setRestoreProgress(prev =>
              prev
                ? {
                    ...prev,
                    id: result.restore_id,
                    status: 'running',
                    progress_percent: 10,
                  }
                : null
            );
          } catch (asyncError) {
            // 비동기 복원 실패 시 동기 복원으로 폴백
            logger.warn('비동기 복원 실패, 동기 복원으로 진행:', asyncError);
            await databaseApi.restoreBackup(
              selectedConnectionForBackup.id,
              backupFile
            );
            setRestoreProgress(prev =>
              prev
                ? {
                    ...prev,
                    status: 'completed',
                    progress_percent: 100,
                    completed_at: new Date().toISOString(),
                  }
                : null
            );
            message.success('백업이 성공적으로 복원되었습니다.');
            setTimeout(() => {
              setRestoreProgress(null);
              setRestoringBackup(null);
            }, 2000);
          }
        } catch (error) {
          logger.error('백업 복원 실패:', error);
          setRestoreProgress(prev =>
            prev
              ? {
                  ...prev,
                  status: 'failed',
                  progress_percent: 100,
                  error_message:
                    error instanceof Error ? error.message : '알 수 없는 오류',
                }
              : null
          );
          message.error('백업 복원에 실패했습니다.');
          setTimeout(() => {
            setRestoreProgress(null);
            setRestoringBackup(null);
          }, 3000);
        }
      },
    });
  };

  // 동기화 이력에서 백업 복원 실행
  const handleSyncHistoryRestore = async (
    connectionId: number,
    backupPath: string,
    connectionName: string,
    databaseName: string,
    historyId: number
  ) => {
    try {
      setRestoringSyncHistoryId(historyId);
      const backupFileName = backupPath.split('/').pop() || backupPath;

      // 진행률 표시를 위한 초기 상태 설정
      setRestoreProgress({
        id: 0,
        connection_id: connectionId,
        backup_file: backupPath,
        status: 'running',
        progress_percent: 10,
        started_at: new Date().toISOString(),
        completed_at: '',
        duration_seconds: 0,
        error_message: '',
        connection_name: connectionName,
        database_name: databaseName,
      });

      // 비동기 복원 시도, 실패 시 동기 복원으로 폴백
      try {
        const result = await databaseApi.restoreBackupAsync(
          connectionId,
          backupPath
        );
        setRestorePollingId(result.restore_id);
        setRestoreProgress(prev =>
          prev
            ? {
                ...prev,
                id: result.restore_id,
                status: 'running',
                progress_percent: 30,
              }
            : null
        );
      } catch (asyncError) {
        // 비동기 복원 실패 시 동기 복원으로 폴백
        logger.warn('비동기 복원 실패, 동기 복원으로 진행:', asyncError);
        setRestoreProgress(prev =>
          prev
            ? {
                ...prev,
                progress_percent: 50,
              }
            : null
        );

        await databaseApi.restoreBackup(connectionId, backupPath);

        setRestoreProgress(prev =>
          prev
            ? {
                ...prev,
                status: 'completed',
                progress_percent: 100,
                completed_at: new Date().toISOString(),
              }
            : null
        );

        Modal.success({
          title: '백업 복원 완료',
          content: (
            <div>
              <p>
                <strong>복원 파일:</strong> {backupFileName}
              </p>
              <p>
                <strong>대상 DB:</strong> {connectionName}
              </p>
              <Alert
                type='info'
                message="복원된 데이터를 확인하려면 'DB 비교' 기능을 사용하세요."
                style={{ marginTop: 12 }}
              />
            </div>
          ),
          okText: '확인',
        });

        setTimeout(() => {
          setRestoreProgress(null);
          setRestoringSyncHistoryId(null);
        }, 2000);
        loadSyncHistory();
      }
    } catch (error) {
      logger.error('백업 복원 실패:', error);
      setRestoreProgress(prev =>
        prev
          ? {
              ...prev,
              status: 'failed',
              progress_percent: 100,
              error_message:
                error instanceof Error ? error.message : '알 수 없는 오류',
            }
          : null
      );
      Modal.error({
        title: '복원 실패',
        content: (
          <div>
            <p>
              <strong>파일:</strong> {backupPath.split('/').pop()}
            </p>
            <p>
              <strong>오류:</strong>{' '}
              {error instanceof Error ? error.message : '알 수 없는 오류'}
            </p>
          </div>
        ),
        okText: '확인',
      });
      setTimeout(() => {
        setRestoreProgress(null);
        setRestoringSyncHistoryId(null);
      }, 3000);
    }
  };

  // 파일 크기 포맷
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 마이그레이션 실행 (스키마 동기화)
  const handleExecuteMigration = async () => {
    const sourceId = compareForm.getFieldValue('source_id');
    const targetId = compareForm.getFieldValue('target_id');
    const sourceConn = connections.find(c => c.id === sourceId);
    const targetConn = connections.find(c => c.id === targetId);

    if (!sourceId || !targetId) {
      message.error('소스와 타겟 DB를 선택해주세요.');
      return;
    }

    try {
      setExecutingMigration(true);
      // 마이그레이션 작업 생성 및 실행
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace('T', '_')
        .replace(/:/g, '-');
      const jobResult = await databaseApi.createSyncJob({
        name: `Migration_${sourceConn?.name || 'src'}_to_${targetConn?.name || 'tgt'}_${timestamp}`,
        description: `스키마 마이그레이션: ${sourceConn?.database_name || ''} → ${targetConn?.database_name || ''}`,
        source_connection_id: sourceId,
        target_connection_id: targetId,
        sync_type: 'schema',
        backup_before_sync: migrationBackupEnabled,
      });

      // 생성된 작업 즉시 실행
      await databaseApi.executeSyncJob(jobResult.id, false);

      message.success({
        content:
          '마이그레이션 작업이 시작되었습니다. 실행 이력에서 진행 상황을 확인할 수 있습니다.',
        duration: 3,
      });
      setCompareResult(null);
      loadSyncJobs();
      loadSyncHistory();
      // 실행 이력 탭으로 자동 전환
      setActiveTab('history');
    } catch (error) {
      logger.error('마이그레이션 실행 실패:', error);
      message.error('마이그레이션 실행에 실패했습니다.');
    } finally {
      setExecutingMigration(false);
    }
  };

  // 동기화 작업 생성 시 스키마 호환성 검증
  const validateSyncJobSchema = async (sourceId: number, targetId: number) => {
    if (!sourceId || !targetId || sourceId === targetId) {
      setSyncJobSchemaValidation({ validated: false, isCompatible: false });
      return;
    }

    try {
      setValidatingSchema(true);
      const result = await databaseApi.compareDBs(sourceId, targetId, 'schema');

      const hasOnlyInSource =
        (result.schema_diff?.only_in_source?.length || 0) > 0;
      const hasOnlyInTarget =
        (result.schema_diff?.only_in_target?.length || 0) > 0;
      const hasColumnDiffs =
        (result.schema_diff?.column_differences?.length || 0) > 0;

      const isCompatible =
        !hasOnlyInSource && !hasOnlyInTarget && !hasColumnDiffs;

      setSyncJobSchemaValidation({
        validated: true,
        isCompatible,
        message: isCompatible
          ? '스키마가 동일합니다. 데이터 동기화를 진행할 수 있습니다.'
          : '스키마가 다릅니다. 먼저 마이그레이션을 수행해주세요.',
        differences: result.schema_diff,
      });
    } catch (error) {
      logger.error('스키마 검증 실패:', error);
      setSyncJobSchemaValidation({
        validated: true,
        isCompatible: false,
        message: '스키마 검증에 실패했습니다. 연결 상태를 확인해주세요.',
      });
    } finally {
      setValidatingSchema(false);
    }
  };

  // 연결 상태 뱃지 렌더링
  const renderConnectionStatus = (record: ConnectionWithStatus) => {
    const isTesting = testingConnections.has(record.id);

    if (isTesting) {
      return <Badge status='processing' text='테스트 중...' />;
    }

    switch (record.connectionStatus) {
      case 'connected':
        return (
          <Tooltip title={record.lastTestMessage}>
            <Badge status='success' text='연결됨' />
          </Tooltip>
        );
      case 'failed':
        return (
          <Tooltip title={record.lastTestMessage}>
            <Badge status='error' text='연결 실패' />
          </Tooltip>
        );
      default:
        return <Badge status='default' text='미확인' />;
    }
  };

  // 연결 목록 테이블 컬럼
  const connectionColumns: ColumnsType<ConnectionWithStatus> = [
    {
      title: '연결 이름',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ConnectionWithStatus) => (
        <Space>
          <DatabaseOutlined
            style={{
              color:
                record.connectionStatus === 'connected' ? '#52c41a' : '#999',
            }}
          />
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            {record.description && (
              <Text type='secondary' style={{ fontSize: 12 }}>
                {record.description}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '연결 상태',
      key: 'status',
      width: 120,
      render: (_: unknown, record: ConnectionWithStatus) =>
        renderConnectionStatus(record),
    },
    {
      title: 'DB 정보',
      key: 'dbInfo',
      render: (_: unknown, record: ConnectionWithStatus) => (
        <Space direction='vertical' size={0}>
          <Space>
            <Tag color={record.db_type === 'postgresql' ? 'blue' : 'green'}>
              {record.db_type.toUpperCase()}
            </Tag>
            <Text code>{record.database_name}</Text>
          </Space>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.host}:{record.port}
          </Text>
        </Space>
      ),
    },
    {
      title: '연결 방식',
      key: 'connectionType',
      width: 140,
      render: (_: unknown, record: ConnectionWithStatus) => (
        <Space>
          {record.ssh_enabled ? (
            <Tooltip title='SSH 터널을 통한 연결'>
              <Tag color='blue' icon={<ApiOutlined />}>
                SSH 터널
              </Tag>
            </Tooltip>
          ) : (
            <Tag icon={<LinkOutlined />}>직접 연결</Tag>
          )}
          {record.ssh_jump_enabled && (
            <Tooltip title='점프 호스트 사용'>
              <Tag color='purple'>Jump</Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 220,
      render: (_: unknown, record: ConnectionWithStatus) => (
        <Space>
          <Tooltip title='연결 테스트'>
            <Button
              type='primary'
              ghost
              size='small'
              icon={<ThunderboltOutlined />}
              loading={testingConnections.has(record.id)}
              onClick={() => handleTestConnection(record.id)}
            >
              테스트
            </Button>
          </Tooltip>
          <Tooltip title='백업 관리'>
            <Button
              size='small'
              icon={<SafetyCertificateOutlined />}
              onClick={() => loadBackups(record)}
              disabled={!record.ssh_enabled}
            />
          </Tooltip>
          <Tooltip title='수정'>
            <Button
              size='small'
              icon={<EditOutlined />}
              onClick={() => {
                setEditingConnection(record);
                connectionForm.setFieldsValue(record);
                setShowSSHOptions(record.ssh_enabled);
                setShowJumpOptions(record.ssh_jump_enabled);
                setConnectionModalOpen(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title='DB 연결 삭제'
            description='이 연결을 삭제하시겠습니까? 관련 동기화 작업도 영향을 받을 수 있습니다.'
            onConfirm={() => handleDeleteConnection(record.id)}
            okText='삭제'
            cancelText='취소'
            okButtonProps={{ danger: true }}
          >
            <Tooltip title='삭제'>
              <Button size='small' danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 동기화 작업 테이블 컬럼
  const syncJobColumns: ColumnsType<DBSyncJob> = [
    {
      title: '작업명',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: DBSyncJob) => (
        <Space>
          <SyncOutlined />
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            {record.description && (
              <Text type='secondary' style={{ fontSize: 12 }}>
                {record.description}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '데이터 흐름',
      key: 'direction',
      render: (_: unknown, record: DBSyncJob) => {
        const source = connections.find(
          c => c.id === record.source_connection_id
        );
        const target = connections.find(
          c => c.id === record.target_connection_id
        );
        return (
          <Space>
            <Tag
              color={
                source?.connectionStatus === 'connected' ? 'green' : 'default'
              }
            >
              {source?.name || `ID:${record.source_connection_id}`}
            </Tag>
            <SwapOutlined />
            <Tag
              color={
                target?.connectionStatus === 'connected' ? 'green' : 'default'
              }
            >
              {target?.name || `ID:${record.target_connection_id}`}
            </Tag>
          </Space>
        );
      },
    },
    {
      title: '백업 설정',
      key: 'backup',
      width: 100,
      render: (_: unknown, record: DBSyncJob) =>
        record.backup_before_sync ? (
          <Tag color='green' icon={<SafetyCertificateOutlined />}>
            백업
          </Tag>
        ) : (
          <Tag color='default'>미적용</Tag>
        ),
    },
    {
      title: '마지막 실행',
      key: 'last_run',
      width: 200,
      render: (_: unknown, record: DBSyncJob) =>
        record.last_run_status ? (
          <Space direction='vertical' size={0}>
            <Tag color={getSyncStatusColor(record.last_run_status)}>
              {getSyncStatusText(record.last_run_status)}
            </Tag>
            {record.last_run_at && (
              <Text type='secondary' style={{ fontSize: 12 }}>
                {new Date(record.last_run_at).toLocaleString('ko-KR')}
              </Text>
            )}
          </Space>
        ) : (
          <Text type='secondary'>실행 기록 없음</Text>
        ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: DBSyncJob) => {
        const source = connections.find(
          c => c.id === record.source_connection_id
        );
        const target = connections.find(
          c => c.id === record.target_connection_id
        );
        const canExecute =
          source?.connectionStatus === 'connected' &&
          target?.connectionStatus === 'connected';

        return (
          <Space>
            <Tooltip
              title={
                canExecute
                  ? '동기화 미리보기 및 실행'
                  : '소스와 타겟 DB가 모두 연결되어야 합니다'
              }
            >
              <Button
                type='primary'
                size='small'
                icon={<EyeOutlined />}
                disabled={!canExecute}
                onClick={() => handleSyncPreview(record)}
              >
                미리보기
              </Button>
            </Tooltip>
            <Popconfirm
              title='동기화 작업 삭제'
              description='이 동기화 작업을 삭제하시겠습니까?'
              onConfirm={() => handleDeleteSyncJob(record.id)}
              okText='삭제'
              cancelText='취소'
              okButtonProps={{ danger: true }}
            >
              <Button size='small' danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  // 동기화 이력 테이블 컬럼
  const historyColumns: ColumnsType<DBSyncHistory> = [
    {
      title: '작업',
      dataIndex: 'job_name',
      key: 'job_name',
      render: (name: string) => name || '-',
    },
    {
      title: '행위 유형',
      dataIndex: 'sync_type',
      key: 'sync_type',
      width: 110,
      render: (syncType: string) => {
        if (syncType === 'data') {
          return (
            <Tag color='blue' icon={<SyncOutlined />}>
              동기화
            </Tag>
          );
        } else if (syncType === 'schema' || syncType === 'full') {
          return (
            <Tag color='purple' icon={<SwapOutlined />}>
              마이그레이션
            </Tag>
          );
        }
        return <Tag>-</Tag>;
      },
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag
          color={getSyncStatusColor(status)}
          icon={
            status === 'success' ? (
              <CheckCircleOutlined />
            ) : status === 'failed' ? (
              <CloseCircleOutlined />
            ) : status === 'running' ? (
              <SyncOutlined spin />
            ) : status === 'partial' ? (
              <ExclamationCircleOutlined />
            ) : undefined
          }
        >
          {getSyncStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '백업',
      dataIndex: 'backup_created',
      key: 'backup_created',
      width: 70,
      render: (backupCreated: boolean) =>
        backupCreated ? (
          <Tag color='green' icon={<SafetyCertificateOutlined />}>
            완료
          </Tag>
        ) : (
          <Text type='secondary'>-</Text>
        ),
    },
    {
      title: '시작 시간',
      dataIndex: 'started_at',
      key: 'started_at',
      width: 160,
      render: (time: string) =>
        time ? new Date(time).toLocaleString('ko-KR') : '-',
    },
    {
      title: '소요 시간',
      dataIndex: 'duration_seconds',
      key: 'duration_seconds',
      width: 90,
      render: (seconds: number) => {
        if (!seconds) return '-';
        if (seconds < 60) return `${seconds}초`;
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}분 ${secs}초`;
      },
    },
    {
      title: '처리 결과',
      key: 'result',
      width: 200,
      render: (_: unknown, record: DBSyncHistory) => {
        // 마이그레이션(스키마 동기화)의 경우 다른 형식으로 표시
        if (record.sync_type === 'schema' || record.sync_type === 'full') {
          const tablesCreated = record.tables_synced || 0;
          const tablesDeleted = record.rows_deleted || 0; // 제거된 테이블을 rows_deleted로 카운트
          const columnsAdded = record.rows_updated || 0; // 컬럼 추가를 rows_updated로 카운트
          return (
            <Space direction='vertical' size={0}>
              <Tooltip title='생성된 테이블'>
                <Text type='success' style={{ fontSize: 12 }}>
                  테이블 {tablesCreated}개
                </Text>
              </Tooltip>
              {tablesDeleted > 0 && (
                <Tooltip title='제거된 테이블'>
                  <Text type='danger' style={{ fontSize: 12 }}>
                    삭제 {tablesDeleted}
                  </Text>
                </Tooltip>
              )}
              {columnsAdded > 0 && (
                <Tooltip title='추가된 컬럼'>
                  <Text style={{ color: '#faad14', fontSize: 12 }}>
                    컬럼 +{columnsAdded}개
                  </Text>
                </Tooltip>
              )}
              <Text
                type='secondary'
                style={{ fontSize: 11, cursor: 'pointer', color: '#1890ff' }}
                onClick={e => {
                  e.stopPropagation();
                  toggleHistoryExpansion(record.id);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleHistoryExpansion(record.id);
                  }
                }}
                role='button'
                tabIndex={0}
              >
                {expandedHistoryKeys.includes(record.id)
                  ? '접기 ↑'
                  : '상세 보기 →'}
              </Text>
            </Space>
          );
        }
        // 데이터 동기화의 경우 기존 형식
        return (
          <Space split={<Divider type='vertical' />}>
            <Tooltip title='추가된 행'>
              <Text type='success'>+{record.rows_inserted || 0}</Text>
            </Tooltip>
            <Tooltip title='수정된 행'>
              <Text style={{ color: '#faad14' }}>
                ~{record.rows_updated || 0}
              </Text>
            </Tooltip>
            <Tooltip title='삭제된 행'>
              <Text type='danger'>-{record.rows_deleted || 0}</Text>
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: '오류',
      dataIndex: 'error_message',
      key: 'error_message',
      ellipsis: true,
      render: (msg: string) =>
        msg ? (
          <Tooltip title={msg}>
            <Text type='danger'>{msg}</Text>
          </Tooltip>
        ) : (
          '-'
        ),
    },
  ];

  // 마이그레이션/백업 통계 계산
  const migrationHistory = syncHistory.filter(
    h => h.sync_type === 'schema' || h.sync_type === 'full'
  );
  const backupHistory = syncHistory.filter(h => h.backup_created);
  const runningJobs = syncHistory.filter(h => h.status === 'running');

  return (
    <div className='database-management management-page'>
      {/* 페이지 헤더 */}
      <div className='page-header'>
        <div className='page-header-title'>
          <DatabaseOutlined style={{ fontSize: 28, color: '#1890ff' }} />
          <div>
            <h1>데이터베이스 관리</h1>
            <p className='page-header-description'>
              DB 연결, 동기화, 마이그레이션 및 백업을 관리합니다
            </p>
          </div>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            loadConnections();
            loadSyncJobs();
            loadSyncHistory();
          }}
        >
          새로고침
        </Button>
      </div>

      {/* 통계 카드 */}
      <Row gutter={16} className='stats-row'>
        <Col xs={24} sm={12} md={6}>
          <div className='stat-card'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className='stat-card-icon blue'>
                <DatabaseOutlined />
              </div>
              <Statistic
                title='DB 연결'
                value={
                  connections.filter(c => c.connectionStatus === 'connected')
                    .length
                }
                suffix={`/ ${connections.length}`}
              />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className='stat-card'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className='stat-card-icon purple'>
                <SwapOutlined />
              </div>
              <Statistic
                title='마이그레이션'
                value={migrationHistory.length}
                suffix='회'
              />
            </div>
            {runningJobs.length > 0 && (
              <Tag
                color='processing'
                icon={<SyncOutlined spin />}
                style={{ marginTop: 8 }}
              >
                {runningJobs.length}개 실행 중
              </Tag>
            )}
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className='stat-card'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className='stat-card-icon green'>
                <SafetyCertificateOutlined />
              </div>
              <Statistic
                title='백업'
                value={backupHistory.length}
                suffix='개'
              />
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className='stat-card'>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div className='stat-card-icon orange'>
                <SyncOutlined />
              </div>
              <Statistic
                title='동기화 작업'
                value={syncJobs.filter(j => j.sync_type === 'data').length}
                suffix='개'
              />
            </div>
          </div>
        </Col>
      </Row>

      {/* 메인 콘텐츠 */}
      <div className='main-card'>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* DB 연결 탭 */}
          <TabPane
            tab={
              <span>
                <DatabaseOutlined />
                DB 연결
                <Badge
                  count={
                    connections.filter(c => c.connectionStatus === 'connected')
                      .length
                  }
                  style={{ marginLeft: 8, backgroundColor: '#52c41a' }}
                  showZero
                />
              </span>
            }
            key='connections'
          >
            {/* 정보 안내 박스 */}
            {connections.some(c => c.connectionStatus !== 'connected') && (
              <div className='info-box'>
                <ExclamationCircleOutlined className='info-box-icon' />
                <div className='info-box-content'>
                  <div className='info-box-title'>연결 확인 필요</div>
                  <div className='info-box-description'>
                    일부 DB 연결이 확인되지 않았습니다. 전체 연결 확인 버튼을
                    클릭하여 연결 상태를 확인해주세요.
                  </div>
                </div>
              </div>
            )}

            {/* 툴바 */}
            <div className='tab-toolbar'>
              <div className='tab-toolbar-left'>
                <Button
                  type='primary'
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditingConnection(null);
                    connectionForm.resetFields();
                    connectionForm.setFieldsValue({
                      db_type: 'mariadb',
                      port: 3306,
                    });
                    setShowSSHOptions(false);
                    setShowJumpOptions(false);
                    setSelectedServiceId(null);
                    setServicesLoaded(false); // 상태 리셋
                    setServicesWithSSH([]); // 서비스 목록 리셋
                    setConnectionModalOpen(true);
                    loadServicesWithSSH(); // 서비스 목록 로드
                  }}
                >
                  새 DB 연결 추가
                </Button>
              </div>
              <div className='tab-toolbar-right'>
                {connections.length > 0 && (
                  <Button
                    icon={<ThunderboltOutlined />}
                    onClick={handleTestAllConnections}
                    loading={testingConnections.size > 0}
                  >
                    전체 연결 확인
                  </Button>
                )}
              </div>
            </div>

            {connections.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    등록된 DB 연결이 없습니다.
                    <br />
                    <Text type='secondary'>
                      새 DB 연결을 추가하여 시작하세요.
                    </Text>
                  </span>
                }
                className='empty-action'
              >
                <Button
                  type='primary'
                  onClick={() => setConnectionModalOpen(true)}
                >
                  DB 연결 추가
                </Button>
              </Empty>
            ) : (
              <Table
                columns={connectionColumns}
                dataSource={connections}
                rowKey='id'
                loading={loading}
                pagination={{ pageSize: 10, showSizeChanger: true }}
              />
            )}
          </TabPane>

          {/* 동기화 작업 탭 (데이터 동기화만 표시) */}
          <TabPane
            tab={
              <span>
                <SyncOutlined />
                동기화 작업
                <Badge
                  count={syncJobs.filter(j => j.sync_type === 'data').length}
                  style={{ marginLeft: 8 }}
                  showZero
                />
              </span>
            }
            key='sync-jobs'
          >
            {/* 정보 안내 박스 */}
            <div className='info-box'>
              <SyncOutlined className='info-box-icon' />
              <div className='info-box-content'>
                <div className='info-box-title'>데이터 동기화 작업</div>
                <div className='info-box-description'>
                  스키마가 동일한 두 DB 간의 데이터를 동기화합니다. 스키마
                  마이그레이션은 &apos;마이그레이션&apos; 탭에서 수행합니다.
                </div>
              </div>
            </div>

            {/* 경고: 연결된 DB 부족 */}
            {connectedDBs.length < 2 && (
              <Alert
                message={
                  <span>
                    동기화 작업을 생성하려면 <strong>최소 2개</strong>의 연결된
                    DB가 필요합니다. 현재 {connectedDBs.length}개 연결됨.
                  </span>
                }
                type='warning'
                showIcon
                icon={<ExclamationCircleOutlined />}
                style={{ marginBottom: 16 }}
              />
            )}

            {/* 툴바 */}
            <div className='tab-toolbar'>
              <div className='tab-toolbar-left'>
                <Button
                  type='primary'
                  icon={<PlusOutlined />}
                  onClick={() => {
                    if (connectedDBs.length < 2) {
                      message.warning(
                        '동기화 작업을 생성하려면 최소 2개의 연결된 DB가 필요합니다.'
                      );
                      return;
                    }
                    setEditingSyncJob(null);
                    syncJobForm.resetFields();
                    syncJobForm.setFieldsValue({
                      sync_type: 'data',
                      backup_before_sync: true,
                    });
                    setSyncJobModalOpen(true);
                  }}
                  disabled={connectedDBs.length < 2}
                >
                  새 동기화 작업 추가
                </Button>
              </div>
              <div className='tab-toolbar-right'>
                <Text type='secondary'>
                  총 {syncJobs.filter(j => j.sync_type === 'data').length}개
                  작업
                </Text>
              </div>
            </div>

            {syncJobs.filter(j => j.sync_type === 'data').length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    등록된 동기화 작업이 없습니다.
                    <br />
                    <Text type='secondary'>
                      {connectedDBs.length < 2
                        ? '먼저 DB 연결을 추가하고 연결 테스트를 완료하세요.'
                        : '새 동기화 작업을 추가하여 시작하세요.'}
                    </Text>
                  </span>
                }
              >
                {connectedDBs.length >= 2 && (
                  <Button
                    type='primary'
                    onClick={() => setSyncJobModalOpen(true)}
                  >
                    동기화 작업 추가
                  </Button>
                )}
              </Empty>
            ) : (
              <Table
                columns={syncJobColumns}
                dataSource={syncJobs.filter(j => j.sync_type === 'data')}
                rowKey='id'
                loading={loading}
                pagination={{ pageSize: 10, showSizeChanger: true }}
              />
            )}
          </TabPane>

          {/* 마이그레이션 탭 */}
          <TabPane
            tab={
              <span>
                <SwapOutlined />
                마이그레이션
                {migrationHistory.length > 0 && (
                  <Badge
                    count={migrationHistory.length}
                    style={{ marginLeft: 8, backgroundColor: '#722ed1' }}
                  />
                )}
              </span>
            }
            key='migration'
          >
            {/* 정보 안내 박스 */}
            <div className='info-box'>
              <SwapOutlined
                className='info-box-icon'
                style={{ color: '#722ed1' }}
              />
              <div className='info-box-content'>
                <div className='info-box-title'>데이터베이스 마이그레이션</div>
                <div className='info-box-description'>
                  두 데이터베이스의 스키마와 데이터를 비교하고, 소스 DB의 구조를
                  타겟 DB로 마이그레이션합니다.
                </div>
              </div>
            </div>

            {connectedDBs.length < 2 ? (
              <Alert
                message='연결된 DB가 부족합니다'
                description={
                  <span>
                    마이그레이션을 수행하려면 <strong>최소 2개</strong>의 연결된
                    DB가 필요합니다. 현재 {connectedDBs.length}개가 연결되어
                    있습니다.
                    <br />
                    <Button
                      type='link'
                      style={{ padding: 0, marginTop: 8 }}
                      onClick={() => setActiveTab('connections')}
                    >
                      DB 연결 탭으로 이동 →
                    </Button>
                  </span>
                }
                type='warning'
                showIcon
                icon={<ExclamationCircleOutlined />}
              />
            ) : (
              <>
                <Card className='section-card' style={{ marginBottom: 20 }}>
                  <Form
                    form={compareForm}
                    layout='vertical'
                    onFinish={handleCompare}
                  >
                    <Row gutter={16}>
                      <Col span={11}>
                        <Form.Item
                          name='source_id'
                          label='소스 DB (원본)'
                          rules={[
                            { required: true, message: '소스 DB를 선택하세요' },
                          ]}
                        >
                          <Select placeholder='비교 기준 DB'>
                            {connectedDBs.map(conn => (
                              <Option key={conn.id} value={conn.id}>
                                <Space>
                                  <CheckCircleOutlined
                                    style={{ color: '#52c41a' }}
                                  />
                                  {conn.name} ({conn.database_name})
                                </Space>
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col
                        span={2}
                        style={{ textAlign: 'center', paddingTop: 38 }}
                      >
                        <SwapOutlined style={{ fontSize: 18 }} />
                      </Col>
                      <Col span={11}>
                        <Form.Item
                          name='target_id'
                          label='타겟 DB (대상)'
                          rules={[
                            { required: true, message: '타겟 DB를 선택하세요' },
                          ]}
                        >
                          <Select placeholder='비교 대상 DB'>
                            {connectedDBs.map(conn => (
                              <Option key={conn.id} value={conn.id}>
                                <Space>
                                  <CheckCircleOutlined
                                    style={{ color: '#52c41a' }}
                                  />
                                  {conn.name} ({conn.database_name})
                                </Space>
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row
                      gutter={16}
                      align='middle'
                      style={{ marginBottom: 16 }}
                    >
                      <Col>
                        <Form.Item
                          label='마이그레이션 전 백업'
                          style={{ marginBottom: 0 }}
                          tooltip='타겟 DB를 마이그레이션 전에 백업합니다'
                        >
                          <Switch
                            checked={migrationBackupEnabled}
                            onChange={setMigrationBackupEnabled}
                            checkedChildren='백업함'
                            unCheckedChildren='백업 안함'
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Button
                      type='primary'
                      htmlType='submit'
                      loading={comparing}
                      icon={<SwapOutlined />}
                      size='large'
                    >
                      스키마 비교
                    </Button>
                  </Form>
                </Card>

                {comparing && (
                  <div style={{ textAlign: 'center', padding: '60px' }}>
                    <Spin size='large' />
                    <Paragraph style={{ marginTop: 16, marginBottom: 8 }}>
                      <Text strong>데이터베이스 스키마 비교 중...</Text>
                    </Paragraph>
                    <Progress
                      type='line'
                      percent={Math.min(compareElapsedTime * 3, 95)}
                      status='active'
                      strokeColor={{ from: '#108ee9', to: '#87d068' }}
                      style={{ maxWidth: 300, margin: '0 auto' }}
                    />
                    <Paragraph type='secondary' style={{ marginTop: 12 }}>
                      경과 시간: {compareElapsedTime}초
                      {compareElapsedTime > 10 &&
                        ' (테이블 수에 따라 시간이 소요될 수 있습니다)'}
                    </Paragraph>
                  </div>
                )}

                {compareResult && (
                  <div style={{ marginTop: '24px' }}>
                    <Divider>비교 결과</Divider>

                    {compareResult.schema_diff && (
                      <Card
                        title={
                          <Space>
                            <SettingOutlined /> 스키마 비교 결과
                          </Space>
                        }
                        size='small'
                        style={{ marginBottom: '16px' }}
                      >
                        {(compareResult.schema_diff.only_in_source?.length ||
                          0) === 0 &&
                        (compareResult.schema_diff.only_in_target?.length ||
                          0) === 0 &&
                        (compareResult.schema_diff.column_differences?.length ||
                          0) === 0 ? (
                          <Alert
                            type='success'
                            message='스키마가 동일합니다.'
                            showIcon
                          />
                        ) : (
                          <Space
                            direction='vertical'
                            style={{ width: '100%' }}
                            size='large'
                          >
                            {/* 테이블 차이를 통합 테이블로 표시 */}
                            <div>
                              <Title level={5} style={{ marginBottom: 12 }}>
                                <TableOutlined /> 테이블 차이 분석
                              </Title>
                              <Table
                                size='small'
                                pagination={false}
                                dataSource={[
                                  ...(
                                    compareResult.schema_diff.only_in_source ||
                                    []
                                  ).map(table => ({
                                    key: `source-${table}`,
                                    table_name: table,
                                    status: 'source_only' as const,
                                    description: '소스에만 존재',
                                  })),
                                  ...(
                                    compareResult.schema_diff.only_in_target ||
                                    []
                                  ).map(table => ({
                                    key: `target-${table}`,
                                    table_name: table,
                                    status: 'target_only' as const,
                                    description: '타겟에만 존재',
                                  })),
                                  ...(
                                    compareResult.schema_diff
                                      .column_differences || []
                                  ).map((diff, idx) => {
                                    const srcOnlyCount =
                                      diff.columns_only_source?.length || 0;
                                    const tgtOnlyCount =
                                      diff.columns_only_target?.length || 0;
                                    const typeDiffCount =
                                      diff.type_differences?.length || 0;
                                    const totalDiffs =
                                      srcOnlyCount +
                                      tgtOnlyCount +
                                      typeDiffCount;
                                    return {
                                      key: `column-diff-${idx}`,
                                      table_name: diff.table,
                                      status: 'column_diff' as const,
                                      description: `소스만: ${srcOnlyCount}개, 타겟만: ${tgtOnlyCount}개, 타입차이: ${typeDiffCount}개`,
                                      column_diff_data: diff,
                                      total_diffs: totalDiffs,
                                    };
                                  }),
                                ]}
                                columns={[
                                  {
                                    title: '테이블명',
                                    dataIndex: 'table_name',
                                    key: 'table_name',
                                    render: (name: string) => (
                                      <Text strong>{name}</Text>
                                    ),
                                  },
                                  {
                                    title: '상태',
                                    dataIndex: 'status',
                                    key: 'status',
                                    width: 150,
                                    render: (
                                      status:
                                        | 'source_only'
                                        | 'target_only'
                                        | 'column_diff'
                                    ) => {
                                      if (status === 'source_only') {
                                        return (
                                          <Tag
                                            color='blue'
                                            icon={<DatabaseOutlined />}
                                          >
                                            소스에만 존재
                                          </Tag>
                                        );
                                      }
                                      if (status === 'target_only') {
                                        return (
                                          <Tag
                                            color='orange'
                                            icon={<DatabaseOutlined />}
                                          >
                                            타겟에만 존재
                                          </Tag>
                                        );
                                      }
                                      return (
                                        <Tag
                                          color='purple'
                                          icon={<TableOutlined />}
                                        >
                                          컬럼 차이
                                        </Tag>
                                      );
                                    },
                                  },
                                  {
                                    title: '설명',
                                    dataIndex: 'description',
                                    key: 'description',
                                  },
                                ]}
                                expandable={{
                                  expandedRowRender: record => {
                                    if (
                                      record.status !== 'column_diff' ||
                                      !record.column_diff_data
                                    ) {
                                      return null;
                                    }
                                    const diffData = record.column_diff_data;
                                    // 모든 컬럼 차이를 통합 배열로 만들기
                                    const allDiffs: Array<{
                                      key: string;
                                      column: string;
                                      source_type: string;
                                      target_type: string;
                                      diff_type: string;
                                    }> = [];

                                    // 소스에만 있는 컬럼
                                    (
                                      diffData.columns_only_source || []
                                    ).forEach((col: string, i: number) => {
                                      allDiffs.push({
                                        key: `src-${i}`,
                                        column: col,
                                        source_type: '존재함',
                                        target_type: '없음',
                                        diff_type: 'source_only',
                                      });
                                    });

                                    // 타겟에만 있는 컬럼
                                    (
                                      diffData.columns_only_target || []
                                    ).forEach((col: string, i: number) => {
                                      allDiffs.push({
                                        key: `tgt-${i}`,
                                        column: col,
                                        source_type: '없음',
                                        target_type: '존재함',
                                        diff_type: 'target_only',
                                      });
                                    });

                                    // 타입 차이
                                    (diffData.type_differences || []).forEach(
                                      (
                                        diff: {
                                          column: string;
                                          source_type: string;
                                          target_type: string;
                                        },
                                        i: number
                                      ) => {
                                        allDiffs.push({
                                          key: `type-${i}`,
                                          column: diff.column,
                                          source_type: diff.source_type,
                                          target_type: diff.target_type,
                                          diff_type: 'type_diff',
                                        });
                                      }
                                    );

                                    return (
                                      <div
                                        style={{
                                          padding: '8px 16px',
                                          background: '#fafafa',
                                        }}
                                      >
                                        <Text
                                          strong
                                          style={{
                                            display: 'block',
                                            marginBottom: 8,
                                          }}
                                        >
                                          컬럼 상세 차이:
                                        </Text>
                                        <Table
                                          size='small'
                                          pagination={false}
                                          dataSource={allDiffs}
                                          columns={[
                                            {
                                              title: '컬럼명',
                                              dataIndex: 'column',
                                              key: 'column',
                                              render: (val: string) => (
                                                <Text strong>{val}</Text>
                                              ),
                                            },
                                            {
                                              title: '소스',
                                              dataIndex: 'source_type',
                                              key: 'source_type',
                                              render: (
                                                val: string,
                                                row: { diff_type: string }
                                              ) => (
                                                <Tag
                                                  color={
                                                    row.diff_type ===
                                                    'source_only'
                                                      ? 'blue'
                                                      : row.diff_type ===
                                                          'target_only'
                                                        ? 'default'
                                                        : 'blue'
                                                  }
                                                >
                                                  {val}
                                                </Tag>
                                              ),
                                            },
                                            {
                                              title: '타겟',
                                              dataIndex: 'target_type',
                                              key: 'target_type',
                                              render: (
                                                val: string,
                                                row: { diff_type: string }
                                              ) => (
                                                <Tag
                                                  color={
                                                    row.diff_type ===
                                                    'target_only'
                                                      ? 'orange'
                                                      : row.diff_type ===
                                                          'source_only'
                                                        ? 'default'
                                                        : 'orange'
                                                  }
                                                >
                                                  {val}
                                                </Tag>
                                              ),
                                            },
                                            {
                                              title: '차이 유형',
                                              dataIndex: 'diff_type',
                                              key: 'diff_type',
                                              render: (diffType: string) => {
                                                if (
                                                  diffType === 'source_only'
                                                ) {
                                                  return (
                                                    <Tag color='blue'>
                                                      소스에만 존재
                                                    </Tag>
                                                  );
                                                }
                                                if (
                                                  diffType === 'target_only'
                                                ) {
                                                  return (
                                                    <Tag color='orange'>
                                                      타겟에만 존재
                                                    </Tag>
                                                  );
                                                }
                                                return (
                                                  <Tag color='purple'>
                                                    타입 불일치
                                                  </Tag>
                                                );
                                              },
                                            },
                                          ]}
                                        />
                                      </div>
                                    );
                                  },
                                  rowExpandable: record =>
                                    record.status === 'column_diff' &&
                                    record.total_diffs > 0,
                                }}
                              />
                            </div>
                          </Space>
                        )}
                      </Card>
                    )}

                    {/* 테이블 목록 (FK 관계 포함) */}
                    {compareResult.schema_diff &&
                      ((compareResult.schema_diff.source_tables?.length || 0) >
                        0 ||
                        (compareResult.schema_diff.target_tables?.length || 0) >
                          0) && (
                        <Card
                          title={
                            <Space>
                              <DatabaseOutlined />
                              <span>DB 테이블 구조</span>
                              <Tag color='blue'>
                                {compareResult.schema_diff.source_tables
                                  ?.length || 0}
                              </Tag>
                              <span>vs</span>
                              <Tag color='green'>
                                {compareResult.schema_diff.target_tables
                                  ?.length || 0}
                              </Tag>
                            </Space>
                          }
                          size='small'
                          style={{ marginTop: 16 }}
                          extra={
                            <Space size='small'>
                              <Tag color='purple'>
                                FK 있는 테이블:{' '}
                                {compareResult.schema_diff.source_tables?.filter(
                                  t =>
                                    t.fk_relations && t.fk_relations.length > 0
                                ).length || 0}
                                개
                              </Tag>
                            </Space>
                          }
                        >
                          <Row gutter={16}>
                            {/* 소스 DB 테이블 */}
                            <Col span={12}>
                              <Card
                                type='inner'
                                size='small'
                                title={
                                  <Space>
                                    <span
                                      style={{
                                        color: '#1890ff',
                                        fontWeight: 600,
                                      }}
                                    >
                                      소스 DB
                                    </span>
                                    <Tag>
                                      {compareResult.schema_diff.source_tables
                                        ?.length || 0}
                                      개
                                    </Tag>
                                  </Space>
                                }
                                bodyStyle={{ padding: 0 }}
                              >
                                <div
                                  style={{ maxHeight: 280, overflow: 'auto' }}
                                >
                                  {compareResult.schema_diff.source_tables?.map(
                                    (table, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          padding: '6px 12px',
                                          borderBottom: '1px solid #f5f5f5',
                                          background: !table.in_target
                                            ? '#e6f7ff'
                                            : '#fff',
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                          }}
                                        >
                                          <Space size={4}>
                                            <Text
                                              style={{
                                                fontSize: 13,
                                                fontWeight: 500,
                                              }}
                                            >
                                              {table.name}
                                            </Text>
                                            {!table.in_target && (
                                              <Tag
                                                color='blue'
                                                style={{
                                                  fontSize: 10,
                                                  margin: 0,
                                                  lineHeight: '14px',
                                                }}
                                              >
                                                NEW
                                              </Tag>
                                            )}
                                          </Space>
                                          {table.fk_relations &&
                                            table.fk_relations.length > 0 && (
                                              <Tag
                                                color='purple'
                                                style={{
                                                  fontSize: 10,
                                                  margin: 0,
                                                }}
                                              >
                                                FK:{table.fk_relations.length}
                                              </Tag>
                                            )}
                                        </div>
                                        {table.fk_relations &&
                                          table.fk_relations.length > 0 && (
                                            <div
                                              style={{
                                                marginTop: 2,
                                                fontSize: 11,
                                                color: '#8c8c8c',
                                                paddingLeft: 8,
                                              }}
                                            >
                                              {table.fk_relations.map(
                                                (fk, fkIdx) => (
                                                  <div key={fkIdx}>
                                                    <code
                                                      style={{
                                                        fontSize: 10,
                                                        background: '#f0f0f0',
                                                        padding: '0 4px',
                                                        borderRadius: 2,
                                                      }}
                                                    >
                                                      {fk.column}
                                                    </code>
                                                    <span
                                                      style={{
                                                        margin: '0 4px',
                                                      }}
                                                    >
                                                      →
                                                    </span>
                                                    <span
                                                      style={{
                                                        color: '#722ed1',
                                                      }}
                                                    >
                                                      {fk.referenced_table}
                                                    </span>
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          )}
                                      </div>
                                    )
                                  )}
                                </div>
                              </Card>
                            </Col>

                            {/* 타겟 DB 테이블 */}
                            <Col span={12}>
                              <Card
                                type='inner'
                                size='small'
                                title={
                                  <Space>
                                    <span
                                      style={{
                                        color: '#52c41a',
                                        fontWeight: 600,
                                      }}
                                    >
                                      타겟 DB
                                    </span>
                                    <Tag>
                                      {compareResult.schema_diff.target_tables
                                        ?.length || 0}
                                      개
                                    </Tag>
                                  </Space>
                                }
                                bodyStyle={{ padding: 0 }}
                              >
                                <div
                                  style={{ maxHeight: 280, overflow: 'auto' }}
                                >
                                  {compareResult.schema_diff.target_tables?.map(
                                    (table, idx) => (
                                      <div
                                        key={idx}
                                        style={{
                                          padding: '6px 12px',
                                          borderBottom: '1px solid #f5f5f5',
                                          background: !table.in_source
                                            ? '#fff7e6'
                                            : '#fff',
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                          }}
                                        >
                                          <Space size={4}>
                                            <Text
                                              style={{
                                                fontSize: 13,
                                                fontWeight: 500,
                                              }}
                                            >
                                              {table.name}
                                            </Text>
                                            {!table.in_source && (
                                              <Tag
                                                color='orange'
                                                style={{
                                                  fontSize: 10,
                                                  margin: 0,
                                                  lineHeight: '14px',
                                                }}
                                              >
                                                ONLY
                                              </Tag>
                                            )}
                                          </Space>
                                          {table.fk_relations &&
                                            table.fk_relations.length > 0 && (
                                              <Tag
                                                color='purple'
                                                style={{
                                                  fontSize: 10,
                                                  margin: 0,
                                                }}
                                              >
                                                FK:{table.fk_relations.length}
                                              </Tag>
                                            )}
                                        </div>
                                        {table.fk_relations &&
                                          table.fk_relations.length > 0 && (
                                            <div
                                              style={{
                                                marginTop: 2,
                                                fontSize: 11,
                                                color: '#8c8c8c',
                                                paddingLeft: 8,
                                              }}
                                            >
                                              {table.fk_relations.map(
                                                (fk, fkIdx) => (
                                                  <div key={fkIdx}>
                                                    <code
                                                      style={{
                                                        fontSize: 10,
                                                        background: '#f0f0f0',
                                                        padding: '0 4px',
                                                        borderRadius: 2,
                                                      }}
                                                    >
                                                      {fk.column}
                                                    </code>
                                                    <span
                                                      style={{
                                                        margin: '0 4px',
                                                      }}
                                                    >
                                                      →
                                                    </span>
                                                    <span
                                                      style={{
                                                        color: '#722ed1',
                                                      }}
                                                    >
                                                      {fk.referenced_table}
                                                    </span>
                                                  </div>
                                                )
                                              )}
                                            </div>
                                          )}
                                      </div>
                                    )
                                  )}
                                </div>
                              </Card>
                            </Col>
                          </Row>
                        </Card>
                      )}

                    {/* 마이그레이션 실행 버튼 */}
                    {compareResult.schema_diff &&
                      ((compareResult.schema_diff.only_in_source?.length || 0) >
                        0 ||
                        (compareResult.schema_diff.only_in_target?.length ||
                          0) > 0 ||
                        (compareResult.schema_diff.column_differences?.length ||
                          0) > 0) && (
                        <Card
                          style={{
                            marginTop: 16,
                            border: '1px solid #722ed1',
                            background: '#faf5ff',
                          }}
                          title={
                            <Space>
                              <SwapOutlined style={{ color: '#722ed1' }} />
                              <Text strong style={{ color: '#722ed1' }}>
                                마이그레이션 실행
                              </Text>
                            </Space>
                          }
                        >
                          <Space direction='vertical' style={{ width: '100%' }}>
                            <Alert
                              message='스키마 차이 발견'
                              description={
                                <div>
                                  <p style={{ margin: '4px 0' }}>
                                    마이그레이션을 실행하면 소스 DB의 스키마를
                                    타겟 DB에 적용합니다.
                                  </p>
                                  <ul
                                    style={{ margin: '8px 0', paddingLeft: 20 }}
                                  >
                                    {(compareResult.schema_diff.only_in_source
                                      ?.length || 0) > 0 && (
                                      <li>
                                        소스에만 있는 테이블{' '}
                                        {
                                          compareResult.schema_diff
                                            .only_in_source?.length
                                        }
                                        개가 타겟에 생성됩니다.
                                      </li>
                                    )}
                                    {(compareResult.schema_diff
                                      .column_differences?.length || 0) > 0 && (
                                      <li>
                                        컬럼 차이가 있는 테이블{' '}
                                        {
                                          compareResult.schema_diff
                                            .column_differences?.length
                                        }
                                        개가 수정됩니다.
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              }
                              type='warning'
                              showIcon
                            />
                            <Row
                              gutter={16}
                              align='middle'
                              style={{ marginTop: 16 }}
                            >
                              <Col flex='auto'>
                                <Space>
                                  <SafetyCertificateOutlined
                                    style={{
                                      color: migrationBackupEnabled
                                        ? '#52c41a'
                                        : '#8c8c8c',
                                    }}
                                  />
                                  <Text
                                    type={
                                      migrationBackupEnabled
                                        ? undefined
                                        : 'secondary'
                                    }
                                  >
                                    백업:{' '}
                                    {migrationBackupEnabled
                                      ? '활성화됨 (실행 전 자동 백업)'
                                      : '비활성화됨'}
                                  </Text>
                                </Space>
                              </Col>
                              <Col>
                                <Button
                                  type='primary'
                                  size='large'
                                  icon={<SwapOutlined />}
                                  loading={executingMigration}
                                  onClick={handleExecuteMigration}
                                  style={{
                                    background: '#722ed1',
                                    borderColor: '#722ed1',
                                  }}
                                >
                                  {executingMigration
                                    ? '마이그레이션 실행 중...'
                                    : '마이그레이션 실행'}
                                </Button>
                              </Col>
                            </Row>
                          </Space>
                        </Card>
                      )}
                  </div>
                )}
              </>
            )}
          </TabPane>

          {/* 백업 탭 */}
          <TabPane
            tab={
              <span>
                <SafetyCertificateOutlined />
                백업 관리
                {syncHistory.filter(h => h.backup_created).length > 0 && (
                  <Badge
                    count={syncHistory.filter(h => h.backup_created).length}
                    style={{ marginLeft: 8, backgroundColor: '#52c41a' }}
                  />
                )}
              </span>
            }
            key='backup'
          >
            {/* 정보 안내 박스 */}
            <div className='info-box'>
              <SafetyCertificateOutlined
                className='info-box-icon'
                style={{ color: '#52c41a' }}
              />
              <div className='info-box-content'>
                <div className='info-box-title'>데이터베이스 백업 관리</div>
                <div className='info-box-description'>
                  동기화 및 마이그레이션 실행 시 생성된 백업을 확인하고 복원할
                  수 있습니다. 백업은 동기화/마이그레이션 작업의
                  &apos;백업&apos; 옵션을 활성화하면 자동으로 생성됩니다.
                </div>
              </div>
            </div>

            {/* 복원 진행률 표시 (백업 관리 탭) */}
            {restoreProgress && restoringSyncHistoryId && (
              <div className='sync-progress' style={{ marginBottom: 16 }}>
                <div className='sync-progress-title'>
                  <ReloadOutlined
                    spin={
                      restoreProgress.status === 'running' ||
                      restoreProgress.status === 'pending'
                    }
                  />
                  백업 복원{' '}
                  {restoreProgress.status === 'running'
                    ? '진행 중'
                    : restoreProgress.status === 'completed'
                      ? '완료'
                      : '실패'}
                </div>
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#fff',
                    borderRadius: 6,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <Space>
                      <Tag
                        color={
                          restoreProgress.status === 'failed'
                            ? 'error'
                            : restoreProgress.status === 'completed'
                              ? 'success'
                              : 'processing'
                        }
                        icon={
                          <ReloadOutlined
                            spin={restoreProgress.status === 'running'}
                          />
                        }
                      >
                        복원
                      </Tag>
                      <Text strong>{restoreProgress.connection_name}</Text>
                    </Space>
                    <Text type='secondary'>
                      시작:{' '}
                      {restoreProgress.started_at
                        ? new Date(restoreProgress.started_at).toLocaleString(
                            'ko-KR'
                          )
                        : '-'}
                    </Text>
                  </div>
                  <Progress
                    percent={restoreProgress.progress_percent}
                    status={
                      restoreProgress.status === 'failed'
                        ? 'exception'
                        : restoreProgress.status === 'completed'
                          ? 'success'
                          : 'active'
                    }
                    strokeColor={
                      restoreProgress.status === 'running'
                        ? { from: '#108ee9', to: '#87d068' }
                        : restoreProgress.status === 'completed'
                          ? '#52c41a'
                          : undefined
                    }
                    format={percent => `${percent}%`}
                  />
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {restoreProgress.status === 'running' && (
                      <>
                        복원 파일:{' '}
                        <Text code>
                          {restoreProgress.backup_file.split('/').pop()}
                        </Text>
                      </>
                    )}
                    {restoreProgress.status === 'completed' && (
                      <Text type='success'>복원이 완료되었습니다.</Text>
                    )}
                    {restoreProgress.status === 'failed' && (
                      <Text type='danger'>
                        오류: {restoreProgress.error_message}
                      </Text>
                    )}
                  </Text>
                </div>
              </div>
            )}

            {/* 툴바 */}
            <div className='tab-toolbar'>
              <div className='tab-toolbar-left'>
                <Text type='secondary'>
                  총 {syncHistory.filter(h => h.backup_created).length}개 백업
                </Text>
              </div>
              <div className='tab-toolbar-right'>
                <Button icon={<ReloadOutlined />} onClick={loadSyncHistory}>
                  새로고침
                </Button>
              </div>
            </div>

            <Card className='section-card'>
              {syncHistory.filter(h => h.backup_created).length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span>
                      생성된 백업이 없습니다.
                      <br />
                      <Text type='secondary'>
                        동기화 또는 마이그레이션 작업 시 &apos;백업&apos; 옵션을
                        활성화하면 백업이 생성됩니다.
                      </Text>
                    </span>
                  }
                />
              ) : (
                <Table
                  dataSource={syncHistory.filter(h => h.backup_created)}
                  rowKey='id'
                  pagination={{ pageSize: 10 }}
                  columns={[
                    {
                      title: '작업명',
                      dataIndex: 'job_name',
                      key: 'job_name',
                      render: (name: string) => (
                        <Text strong>{name || '-'}</Text>
                      ),
                    },
                    {
                      title: '유형',
                      dataIndex: 'sync_type',
                      key: 'sync_type',
                      width: 110,
                      render: (syncType: string) => {
                        if (syncType === 'data') {
                          return (
                            <Tag color='blue' icon={<SyncOutlined />}>
                              동기화
                            </Tag>
                          );
                        } else if (
                          syncType === 'schema' ||
                          syncType === 'full'
                        ) {
                          return (
                            <Tag color='purple' icon={<SwapOutlined />}>
                              마이그레이션
                            </Tag>
                          );
                        }
                        return <Tag>-</Tag>;
                      },
                    },
                    {
                      title: '상태',
                      dataIndex: 'status',
                      key: 'status',
                      width: 100,
                      render: (status: string) => (
                        <Tag color={getSyncStatusColor(status)}>
                          {getSyncStatusText(status)}
                        </Tag>
                      ),
                    },
                    {
                      title: '백업 생성 시간',
                      dataIndex: 'started_at',
                      key: 'started_at',
                      width: 180,
                      render: (time: string) =>
                        time ? new Date(time).toLocaleString('ko-KR') : '-',
                    },
                    {
                      title: '작업',
                      key: 'actions',
                      width: 120,
                      render: (_: unknown, record: DBSyncHistory) => {
                        const job = syncJobs.find(
                          j => j.id === record.sync_job_id
                        );
                        const canRestore =
                          record.backup_path && job?.target_connection_id;

                        return (
                          <Space>
                            <Tooltip
                              title={
                                canRestore
                                  ? '백업에서 데이터 복원'
                                  : '백업 파일 없음'
                              }
                            >
                              <Popconfirm
                                title='백업 복원'
                                description={
                                  <div style={{ maxWidth: 300 }}>
                                    <p>
                                      이 백업을 사용하여 타겟 DB를
                                      복원하시겠습니까?
                                    </p>
                                    <p
                                      style={{ color: '#ff4d4f', fontSize: 12 }}
                                    >
                                      ⚠️ 현재 타겟 DB의 데이터가 백업 시점으로
                                      덮어씌워집니다.
                                    </p>
                                  </div>
                                }
                                onConfirm={async () => {
                                  if (
                                    !job?.target_connection_id ||
                                    !record.backup_path
                                  ) {
                                    message.error(
                                      '복원에 필요한 정보가 없습니다.'
                                    );
                                    return;
                                  }
                                  const targetConn = connections.find(
                                    c => c.id === job.target_connection_id
                                  );
                                  await handleSyncHistoryRestore(
                                    job.target_connection_id,
                                    record.backup_path,
                                    job.target_name ||
                                      targetConn?.name ||
                                      `Connection #${job.target_connection_id}`,
                                    targetConn?.database_name || '',
                                    record.id
                                  );
                                }}
                                okText='복원'
                                cancelText='취소'
                                disabled={
                                  !canRestore ||
                                  restoringSyncHistoryId === record.id
                                }
                              >
                                <Button
                                  size='small'
                                  disabled={!canRestore}
                                  loading={restoringSyncHistoryId === record.id}
                                  icon={<ReloadOutlined />}
                                >
                                  복원
                                </Button>
                              </Popconfirm>
                            </Tooltip>
                          </Space>
                        );
                      },
                    },
                  ]}
                />
              )}
            </Card>

            {/* 백업 통계 */}
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col xs={24} sm={8}>
                <div className='stat-card backup-stat-card'>
                  <Statistic
                    title='총 백업 수'
                    value={syncHistory.filter(h => h.backup_created).length}
                    prefix={
                      <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
                    }
                    suffix='개'
                  />
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div className='stat-card backup-stat-card'>
                  <Statistic
                    title='동기화 백업'
                    value={
                      syncHistory.filter(
                        h => h.backup_created && h.sync_type === 'data'
                      ).length
                    }
                    prefix={<SyncOutlined style={{ color: '#1890ff' }} />}
                    suffix='개'
                  />
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div className='stat-card backup-stat-card'>
                  <Statistic
                    title='마이그레이션 백업'
                    value={
                      syncHistory.filter(
                        h =>
                          h.backup_created &&
                          (h.sync_type === 'schema' || h.sync_type === 'full')
                      ).length
                    }
                    prefix={<SwapOutlined style={{ color: '#722ed1' }} />}
                    suffix='개'
                  />
                </div>
              </Col>
            </Row>
          </TabPane>

          {/* 실행 이력 탭 */}
          <TabPane
            tab={
              <span>
                <HistoryOutlined />
                실행 이력
                <Badge
                  count={syncHistory.filter(h => h.status === 'running').length}
                  style={{ marginLeft: 8 }}
                />
              </span>
            }
            key='history'
          >
            {/* 정보 안내 박스 */}
            <div className='info-box'>
              <HistoryOutlined className='info-box-icon' />
              <div className='info-box-content'>
                <div className='info-box-title'>실행 이력</div>
                <div className='info-box-description'>
                  동기화 및 마이그레이션 작업의 실행 이력을 확인할 수 있습니다.
                  각 항목을 펼치면 상세 로그를 볼 수 있습니다.
                </div>
              </div>
            </div>

            {/* 실행 중인 작업 표시 */}
            {runningJobs.length > 0 && (
              <div className='sync-progress'>
                <div className='sync-progress-title'>
                  <SyncOutlined spin />
                  {runningJobs.length}개 작업 실행 중
                </div>
                <Space
                  direction='vertical'
                  style={{ width: '100%' }}
                  size='small'
                >
                  {runningJobs.map(job => (
                    <div
                      key={job.id}
                      style={{
                        padding: '12px 16px',
                        background: '#fff',
                        borderRadius: 6,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <Space>
                          <Tag color='processing' icon={<SyncOutlined spin />}>
                            {job.sync_type === 'data'
                              ? '동기화'
                              : job.sync_type === 'schema'
                                ? '마이그레이션'
                                : '전체 동기화'}
                          </Tag>
                          <Text strong>
                            {job.job_name || `작업 #${job.sync_job_id}`}
                          </Text>
                        </Space>
                        <Text type='secondary'>
                          시작:{' '}
                          {job.started_at
                            ? new Date(job.started_at).toLocaleString('ko-KR')
                            : '-'}
                        </Text>
                      </div>
                      <Progress
                        percent={job.progress_percent || 0}
                        status='active'
                        strokeColor={{ from: '#108ee9', to: '#87d068' }}
                        format={percent => `${percent}%`}
                      />
                      {job.current_table && (
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          처리 중: <Text code>{job.current_table}</Text>
                        </Text>
                      )}
                    </div>
                  ))}
                </Space>
              </div>
            )}

            {/* 유형별 필터 탭 */}
            <Tabs
              defaultActiveKey='all'
              size='small'
              style={{ marginBottom: 16 }}
              items={[
                {
                  key: 'all',
                  label: <span>전체 ({syncHistory.length})</span>,
                  children:
                    syncHistory.length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description='실행 이력이 없습니다.'
                      />
                    ) : (
                      <Table
                        columns={historyColumns}
                        dataSource={syncHistory}
                        rowKey='id'
                        loading={loading}
                        pagination={{ pageSize: 15, showSizeChanger: true }}
                        size='small'
                        expandable={{
                          expandedRowRender: (record: DBSyncHistory) => {
                            const detail = historyDetails.get(record.id);
                            const isLoading = loadingHistoryDetail.has(
                              record.id
                            );

                            return (
                              <div
                                style={{
                                  padding: '12px 24px',
                                  background: '#fafafa',
                                }}
                              >
                                {isLoading ? (
                                  <div
                                    style={{
                                      textAlign: 'center',
                                      padding: '20px',
                                    }}
                                  >
                                    <Spin size='small' />
                                    <Text
                                      type='secondary'
                                      style={{ marginLeft: 8 }}
                                    >
                                      상세 정보 로딩 중...
                                    </Text>
                                  </div>
                                ) : (
                                  <Space
                                    direction='vertical'
                                    style={{ width: '100%' }}
                                    size='middle'
                                  >
                                    {/* 실행 로그 */}
                                    {detail?.execution_log &&
                                    detail.execution_log.length > 0 ? (
                                      <Alert
                                        type='info'
                                        message={
                                          <span>
                                            실행 로그 (
                                            {detail.execution_log.length}개
                                            항목)
                                            {record.sync_type === 'schema' ||
                                            record.sync_type === 'full'
                                              ? ' - DDL 쿼리 포함'
                                              : ''}
                                          </span>
                                        }
                                        description={
                                          <div
                                            style={{
                                              maxHeight: 350,
                                              overflow: 'auto',
                                            }}
                                          >
                                            {detail.execution_log.map(
                                              (log, idx) => (
                                                <div
                                                  key={idx}
                                                  style={{
                                                    padding: '6px 10px',
                                                    marginBottom: 6,
                                                    background:
                                                      log.level === 'error'
                                                        ? '#fff1f0'
                                                        : log.level === 'warn'
                                                          ? '#fffbe6'
                                                          : '#f0f5ff',
                                                    borderLeft: `3px solid ${
                                                      log.level === 'error'
                                                        ? '#ff4d4f'
                                                        : log.level === 'warn'
                                                          ? '#faad14'
                                                          : '#1890ff'
                                                    }`,
                                                    borderRadius: '0 4px 4px 0',
                                                  }}
                                                >
                                                  <div
                                                    style={{
                                                      display: 'flex',
                                                      justifyContent:
                                                        'space-between',
                                                      marginBottom: log.sql
                                                        ? 4
                                                        : 0,
                                                    }}
                                                  >
                                                    <Text
                                                      type='secondary'
                                                      style={{ fontSize: 11 }}
                                                    >
                                                      [
                                                      {new Date(
                                                        log.timestamp
                                                      ).toLocaleString('ko-KR')}
                                                      ]
                                                    </Text>
                                                    {log.sql && (
                                                      <Tag
                                                        color='blue'
                                                        style={{
                                                          fontSize: 10,
                                                          margin: 0,
                                                        }}
                                                      >
                                                        SQL
                                                      </Tag>
                                                    )}
                                                  </div>
                                                  <Text
                                                    type={
                                                      log.level === 'error'
                                                        ? 'danger'
                                                        : log.level === 'warn'
                                                          ? 'warning'
                                                          : undefined
                                                    }
                                                    style={{
                                                      fontFamily: 'monospace',
                                                      fontSize: 12,
                                                    }}
                                                  >
                                                    {log.message}
                                                  </Text>
                                                  {/* SQL 쿼리 표시 (마이그레이션 시 DDL 등) */}
                                                  {log.sql && (
                                                    <div
                                                      style={{
                                                        marginTop: 6,
                                                        padding: '8px 10px',
                                                        background: '#1e1e1e',
                                                        borderRadius: 4,
                                                        overflow: 'auto',
                                                        maxHeight: 120,
                                                      }}
                                                    >
                                                      <pre
                                                        style={{
                                                          margin: 0,
                                                          color: '#d4d4d4',
                                                          fontSize: 11,
                                                          whiteSpace:
                                                            'pre-wrap',
                                                          wordBreak:
                                                            'break-all',
                                                          fontFamily:
                                                            "'Fira Code', 'Consolas', monospace",
                                                        }}
                                                      >
                                                        {log.sql}
                                                      </pre>
                                                    </div>
                                                  )}
                                                </div>
                                              )
                                            )}
                                          </div>
                                        }
                                      />
                                    ) : (
                                      <Alert
                                        type='warning'
                                        message='실행 로그 없음'
                                        description={
                                          detail
                                            ? '이 작업의 실행 로그가 기록되지 않았습니다.'
                                            : '상세 정보를 불러오는 중 오류가 발생했거나, 데이터가 없습니다.'
                                        }
                                      />
                                    )}

                                    {/* 백업 정보 */}
                                    {detail?.backup_created &&
                                      detail.backup_path && (
                                        <Alert
                                          type='success'
                                          message='백업 정보'
                                          description={
                                            <div>
                                              <Text strong>백업 경로:</Text>{' '}
                                              <Text
                                                code
                                                style={{ fontSize: 11 }}
                                              >
                                                {detail.backup_path}
                                              </Text>
                                            </div>
                                          }
                                          icon={<SafetyCertificateOutlined />}
                                        />
                                      )}

                                    <Row gutter={16}>
                                      <Col span={12}>
                                        <Card size='small' title='실행 정보'>
                                          <Space direction='vertical' size={4}>
                                            <Text type='secondary'>
                                              작업 ID: {record.sync_job_id}
                                            </Text>
                                            <Text type='secondary'>
                                              실행자 ID: {record.executed_by}
                                            </Text>
                                            <Text type='secondary'>
                                              테이블:{' '}
                                              {record.tables_synced || 0}개
                                            </Text>
                                            {record.error_message && (
                                              <Alert
                                                type='error'
                                                message={record.error_message}
                                                style={{
                                                  padding: '4px 12px',
                                                  marginTop: 8,
                                                }}
                                              />
                                            )}
                                          </Space>
                                        </Card>
                                      </Col>
                                      <Col span={12}>
                                        <Card
                                          size='small'
                                          title={
                                            record.sync_type === 'schema' ||
                                            record.sync_type === 'full'
                                              ? '스키마 변경 통계'
                                              : '데이터 처리 통계'
                                          }
                                        >
                                          {record.sync_type === 'schema' ||
                                          record.sync_type === 'full' ? (
                                            /* 마이그레이션(스키마 동기화) 통계 */
                                            <Row gutter={8}>
                                              <Col span={12}>
                                                <Statistic
                                                  title='테이블 생성'
                                                  value={
                                                    detail?.tables_synced ||
                                                    record.tables_synced ||
                                                    0
                                                  }
                                                  valueStyle={{
                                                    fontSize: 16,
                                                    color: '#52c41a',
                                                  }}
                                                  suffix='개'
                                                />
                                              </Col>
                                              <Col span={12}>
                                                <Statistic
                                                  title='컬럼 추가'
                                                  value={
                                                    detail?.rows_updated ||
                                                    record.rows_updated ||
                                                    0
                                                  }
                                                  valueStyle={{
                                                    fontSize: 16,
                                                    color: '#1890ff',
                                                  }}
                                                  suffix='개'
                                                />
                                              </Col>
                                            </Row>
                                          ) : (
                                            /* 데이터 동기화 통계 */
                                            <Row gutter={8}>
                                              <Col span={8}>
                                                <Statistic
                                                  title='삽입'
                                                  value={
                                                    detail?.rows_inserted ||
                                                    record.rows_inserted ||
                                                    0
                                                  }
                                                  valueStyle={{
                                                    fontSize: 16,
                                                    color: '#52c41a',
                                                  }}
                                                />
                                              </Col>
                                              <Col span={8}>
                                                <Statistic
                                                  title='수정'
                                                  value={
                                                    detail?.rows_updated ||
                                                    record.rows_updated ||
                                                    0
                                                  }
                                                  valueStyle={{
                                                    fontSize: 16,
                                                    color: '#faad14',
                                                  }}
                                                />
                                              </Col>
                                              <Col span={8}>
                                                <Statistic
                                                  title='삭제'
                                                  value={
                                                    detail?.rows_deleted ||
                                                    record.rows_deleted ||
                                                    0
                                                  }
                                                  valueStyle={{
                                                    fontSize: 16,
                                                    color: '#ff4d4f',
                                                  }}
                                                />
                                              </Col>
                                            </Row>
                                          )}
                                        </Card>
                                      </Col>
                                    </Row>
                                  </Space>
                                )}
                              </div>
                            );
                          },
                          expandedRowKeys: expandedHistoryKeys,
                          onExpand: (expanded, record) => {
                            if (expanded) {
                              loadHistoryDetail(record.id);
                              setExpandedHistoryKeys(prev => [
                                ...prev,
                                record.id,
                              ]);
                            } else {
                              setExpandedHistoryKeys(prev =>
                                prev.filter(k => k !== record.id)
                              );
                            }
                          },
                          rowExpandable: () => true,
                        }}
                      />
                    ),
                },
                {
                  key: 'sync',
                  label: (
                    <span>
                      <SyncOutlined /> 동기화 (
                      {syncHistory.filter(h => h.sync_type === 'data').length})
                    </span>
                  ),
                  children:
                    syncHistory.filter(h => h.sync_type === 'data').length ===
                    0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description='동기화 이력이 없습니다.'
                      />
                    ) : (
                      <Table
                        columns={historyColumns}
                        dataSource={syncHistory.filter(
                          h => h.sync_type === 'data'
                        )}
                        rowKey='id'
                        loading={loading}
                        pagination={{ pageSize: 15 }}
                        size='small'
                        expandable={{
                          expandedRowKeys: expandedHistoryKeys,
                          onExpand: (expanded, record) => {
                            if (expanded) {
                              loadHistoryDetail(record.id);
                              setExpandedHistoryKeys(prev => [
                                ...prev,
                                record.id,
                              ]);
                            } else {
                              setExpandedHistoryKeys(prev =>
                                prev.filter(k => k !== record.id)
                              );
                            }
                          },
                          rowExpandable: () => true,
                        }}
                      />
                    ),
                },
                {
                  key: 'migration',
                  label: (
                    <span>
                      <SwapOutlined /> 마이그레이션 ({migrationHistory.length})
                    </span>
                  ),
                  children:
                    migrationHistory.length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description='마이그레이션 이력이 없습니다.'
                      />
                    ) : (
                      <Table
                        columns={historyColumns}
                        dataSource={migrationHistory}
                        rowKey='id'
                        loading={loading}
                        pagination={{ pageSize: 15 }}
                        size='small'
                        expandable={{
                          expandedRowRender: (record: DBSyncHistory) => {
                            const detail = historyDetails.get(record.id);
                            const isLoading = loadingHistoryDetail.has(
                              record.id
                            );

                            return (
                              <div
                                style={{
                                  padding: '12px 24px',
                                  background: '#f9f0ff',
                                }}
                              >
                                <Text strong style={{ color: '#722ed1' }}>
                                  마이그레이션 상세
                                </Text>

                                {isLoading ? (
                                  <div
                                    style={{
                                      textAlign: 'center',
                                      padding: '20px',
                                    }}
                                  >
                                    <Spin size='small' />
                                    <Text
                                      type='secondary'
                                      style={{ marginLeft: 8 }}
                                    >
                                      로그 로딩 중...
                                    </Text>
                                  </div>
                                ) : detail ? (
                                  <Space
                                    direction='vertical'
                                    style={{ width: '100%', marginTop: 8 }}
                                    size='middle'
                                  >
                                    {/* 실행 로그 */}
                                    {detail.execution_log &&
                                    detail.execution_log.length > 0 ? (
                                      <Alert
                                        type='info'
                                        message='SQL 실행 로그'
                                        description={
                                          <div
                                            style={{
                                              maxHeight: 300,
                                              overflow: 'auto',
                                            }}
                                          >
                                            {detail.execution_log.map(
                                              (log, idx) => (
                                                <div
                                                  key={idx}
                                                  style={{
                                                    padding: '4px 8px',
                                                    marginBottom: 4,
                                                    background:
                                                      log.level === 'error'
                                                        ? '#fff1f0'
                                                        : '#f0f5ff',
                                                    borderLeft: `3px solid ${
                                                      log.level === 'error'
                                                        ? '#ff4d4f'
                                                        : log.level === 'warn'
                                                          ? '#faad14'
                                                          : '#1890ff'
                                                    }`,
                                                    fontFamily: 'monospace',
                                                    fontSize: 12,
                                                  }}
                                                >
                                                  <Text
                                                    type='secondary'
                                                    style={{ fontSize: 11 }}
                                                  >
                                                    [
                                                    {new Date(
                                                      log.timestamp
                                                    ).toLocaleString('ko-KR')}
                                                    ]
                                                  </Text>{' '}
                                                  <Text
                                                    type={
                                                      log.level === 'error'
                                                        ? 'danger'
                                                        : log.level === 'warn'
                                                          ? 'warning'
                                                          : undefined
                                                    }
                                                    style={{
                                                      fontFamily: 'monospace',
                                                    }}
                                                  >
                                                    {log.message}
                                                  </Text>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        }
                                      />
                                    ) : (
                                      <Alert
                                        type='info'
                                        message='실행 정보'
                                        description={
                                          record.error_message ? (
                                            <Text type='danger'>
                                              {record.error_message}
                                            </Text>
                                          ) : (
                                            <div>
                                              <Text type='secondary'>
                                                스키마 마이그레이션 완료
                                                <br />- 테이블 동기화:{' '}
                                                {record.tables_synced || 0}개
                                                <br />- 행 삽입:{' '}
                                                {record.rows_inserted || 0}개
                                                <br />- 행 수정:{' '}
                                                {record.rows_updated || 0}개
                                                <br />- 행 삭제:{' '}
                                                {record.rows_deleted || 0}개
                                              </Text>
                                            </div>
                                          )
                                        }
                                      />
                                    )}

                                    {/* 백업 정보 */}
                                    {detail.backup_created &&
                                      detail.backup_path && (
                                        <Alert
                                          type='success'
                                          message='백업 정보'
                                          description={
                                            <div>
                                              <Text strong>백업 경로:</Text>{' '}
                                              <Text
                                                code
                                                style={{ fontSize: 11 }}
                                              >
                                                {detail.backup_path}
                                              </Text>
                                            </div>
                                          }
                                          icon={<SafetyCertificateOutlined />}
                                        />
                                      )}

                                    {/* 처리 통계 */}
                                    <Card
                                      size='small'
                                      style={{ background: '#fff' }}
                                    >
                                      <Row gutter={16}>
                                        <Col span={6}>
                                          <Statistic
                                            title='테이블'
                                            value={detail.tables_synced || 0}
                                            suffix='개'
                                            valueStyle={{ fontSize: 16 }}
                                          />
                                        </Col>
                                        <Col span={6}>
                                          <Statistic
                                            title='삽입'
                                            value={detail.rows_inserted || 0}
                                            suffix='행'
                                            valueStyle={{
                                              fontSize: 16,
                                              color: '#52c41a',
                                            }}
                                          />
                                        </Col>
                                        <Col span={6}>
                                          <Statistic
                                            title='수정'
                                            value={detail.rows_updated || 0}
                                            suffix='행'
                                            valueStyle={{
                                              fontSize: 16,
                                              color: '#faad14',
                                            }}
                                          />
                                        </Col>
                                        <Col span={6}>
                                          <Statistic
                                            title='삭제'
                                            value={detail.rows_deleted || 0}
                                            suffix='행'
                                            valueStyle={{
                                              fontSize: 16,
                                              color: '#ff4d4f',
                                            }}
                                          />
                                        </Col>
                                      </Row>
                                    </Card>
                                  </Space>
                                ) : (
                                  <Alert
                                    type='info'
                                    message='기본 정보'
                                    description={
                                      record.error_message ? (
                                        <Text type='danger'>
                                          {record.error_message}
                                        </Text>
                                      ) : (
                                        <Text type='secondary'>
                                          스키마 마이그레이션 완료
                                          <br />- 테이블 동기화:{' '}
                                          {record.tables_synced || 0}개
                                        </Text>
                                      )
                                    }
                                    style={{ marginTop: 8 }}
                                  />
                                )}
                              </div>
                            );
                          },
                          expandedRowKeys: expandedHistoryKeys,
                          onExpand: (expanded, record) => {
                            if (expanded) {
                              loadHistoryDetail(record.id);
                              setExpandedHistoryKeys(prev => [
                                ...prev,
                                record.id,
                              ]);
                            } else {
                              setExpandedHistoryKeys(prev =>
                                prev.filter(k => k !== record.id)
                              );
                            }
                          },
                          rowExpandable: () => true,
                        }}
                      />
                    ),
                },
                {
                  key: 'backup',
                  label: (
                    <span>
                      <SafetyCertificateOutlined /> 백업 생성 (
                      {backupHistory.length})
                    </span>
                  ),
                  children:
                    backupHistory.length === 0 ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description='백업 이력이 없습니다.'
                      />
                    ) : (
                      <Table
                        columns={historyColumns}
                        dataSource={backupHistory}
                        rowKey='id'
                        loading={loading}
                        pagination={{ pageSize: 15 }}
                        size='small'
                      />
                    ),
                },
              ]}
            />
          </TabPane>
        </Tabs>
      </div>

      {/* DB 연결 모달 */}
      <Modal
        title={
          <Space>
            <DatabaseOutlined />
            {editingConnection ? 'DB 연결 수정' : '새 DB 연결 추가'}
          </Space>
        }
        open={connectionModalOpen}
        onCancel={() => {
          setConnectionModalOpen(false);
          setEditingConnection(null);
          setShowSSHOptions(false);
          setShowJumpOptions(false);
        }}
        footer={null}
        width={700}
      >
        <Form
          form={connectionForm}
          layout='vertical'
          onFinish={handleSaveConnection}
        >
          {/* 서비스 선택 (새 연결 추가 시에만 표시) */}
          {!editingConnection && (
            <Form.Item label='서비스에서 SSH 정보 가져오기 (선택사항)'>
              <Select
                placeholder='서비스를 선택하면 SSH 정보가 자동으로 채워집니다'
                allowClear
                value={selectedServiceId}
                onChange={handleServiceSelect}
                style={{ width: '100%' }}
                loading={loadingServices}
                notFoundContent={
                  loadingServices
                    ? '서비스 정보를 로드 중...'
                    : servicesLoaded && servicesWithSSH.length === 0
                      ? '서비스가 없거나 SSH 정보가 설정되지 않았습니다'
                      : null
                }
                disabled={loadingServices}
              >
                {servicesWithSSH.map(service => (
                  <Option key={service.service_id} value={service.service_id}>
                    <Space>
                      <span>{service.service_name}</span>
                      {service.infra_name && (
                        <Tag color='blue' style={{ fontSize: '11px' }}>
                          {service.infra_name}
                        </Tag>
                      )}
                      {service.ssh_hops && service.ssh_hops.length > 0 && (
                        <Tag color='green' style={{ fontSize: '11px' }}>
                          SSH {service.ssh_hops.length}홉
                        </Tag>
                      )}
                    </Space>
                  </Option>
                ))}
              </Select>
              {selectedServiceId &&
                servicesWithSSH.find(s => s.service_id === selectedServiceId)
                  ?.ssh_hops && (
                  <Alert
                    type='info'
                    message='SSH 정보가 자동으로 채워졌습니다'
                    description={
                      <div style={{ fontSize: '12px' }}>
                        {servicesWithSSH
                          .find(s => s.service_id === selectedServiceId)
                          ?.ssh_hops?.map((hop, idx) => (
                            <div key={idx}>
                              홉 {idx + 1}: {hop.username}@{hop.host}:{hop.port}
                            </div>
                          ))}
                      </div>
                    }
                    style={{ marginTop: 8 }}
                    showIcon
                  />
                )}
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name='name'
                label='연결 이름'
                rules={[{ required: true, message: '연결 이름을 입력하세요' }]}
              >
                <Input
                  placeholder='예: Production Database'
                  prefix={<DatabaseOutlined />}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name='db_type'
                label='DB 타입'
                rules={[{ required: true }]}
              >
                <Select
                  onChange={(value: string) => {
                    connectionForm.setFieldsValue({
                      port: getDefaultPort(value),
                    });
                  }}
                >
                  <Option value='mariadb'>MariaDB</Option>
                  <Option value='mysql'>MySQL</Option>
                  <Option value='postgresql'>PostgreSQL</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name='description' label='설명 (선택사항)'>
            <Input.TextArea
              rows={2}
              placeholder='이 연결에 대한 설명을 입력하세요'
            />
          </Form.Item>

          <Divider orientation='left'>연결 정보</Divider>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name='host'
                label='호스트 주소'
                rules={[{ required: true, message: '호스트를 입력하세요' }]}
              >
                <Input placeholder='예: localhost, 192.168.1.100, db.example.com' />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name='port' label='포트' rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} max={65535} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='database_name'
                label='데이터베이스 이름'
                rules={[
                  { required: true, message: '데이터베이스 이름을 입력하세요' },
                ]}
              >
                <Input placeholder='예: mydb' />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='username'
                label='사용자명'
                rules={[{ required: true }]}
              >
                <Input placeholder='DB 사용자명' />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name='password'
            label='비밀번호'
            rules={[
              {
                required: !editingConnection,
                message: '비밀번호를 입력하세요',
              },
            ]}
          >
            <Input.Password
              placeholder={
                editingConnection
                  ? '변경하지 않으려면 비워두세요'
                  : 'DB 비밀번호'
              }
            />
          </Form.Item>

          <Collapse
            ghost
            activeKey={showSSHOptions ? ['ssh'] : []}
            onChange={keys => setShowSSHOptions(keys.includes('ssh'))}
          >
            <Panel
              header={
                <Space>
                  <ApiOutlined />
                  SSH 터널 설정
                  <Form.Item name='ssh_enabled' valuePropName='checked' noStyle>
                    <Switch
                      size='small'
                      onChange={checked => setShowSSHOptions(checked)}
                    />
                  </Form.Item>
                </Space>
              }
              key='ssh'
            >
              <Alert
                message='SSH 터널을 통해 보안 네트워크 내의 DB에 접속할 수 있습니다.'
                type='info'
                showIcon
                style={{ marginBottom: 16 }}
              />

              {/* 서비스 선택 시: hop별 순차 입력 UI */}
              {selectedServiceId &&
              servicesWithSSH.find(s => s.service_id === selectedServiceId)
                ?.ssh_hops?.length > 0 ? (
                <div>
                  {servicesWithSSH
                    .find(s => s.service_id === selectedServiceId)
                    ?.ssh_hops?.map((hop, idx, hops) => {
                      const isJumpHost = hops.length > 1 && idx === 0;
                      const isTargetHost =
                        hops.length === 1 || idx === hops.length - 1;

                      return (
                        <div
                          key={`hop-${idx}`}
                          style={{
                            marginBottom: idx < hops.length - 1 ? 16 : 0,
                          }}
                        >
                          {idx > 0 && <Divider style={{ margin: '16px 0' }} />}
                          <Space
                            direction='vertical'
                            style={{ width: '100%' }}
                            size='small'
                          >
                            <div
                              style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: '#1890ff',
                              }}
                            >
                              <GlobalOutlined /> SSH Hop {idx + 1}{' '}
                              {isJumpHost
                                ? '(Jump Host)'
                                : isTargetHost
                                  ? '(Target)'
                                  : ''}
                            </div>
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#666',
                                marginLeft: 24,
                                padding: '8px 12px',
                                backgroundColor: '#f5f5f5',
                                borderRadius: 4,
                              }}
                            >
                              <div>
                                <strong>Host:</strong> {hop.host}
                              </div>
                              <div>
                                <strong>Port:</strong> {hop.port}
                              </div>
                            </div>

                            {isJumpHost ? (
                              // Jump Host 필드
                              <>
                                <Form.Item name='ssh_jump_host' hidden>
                                  <Input />
                                </Form.Item>
                                <Form.Item name='ssh_jump_port' hidden>
                                  <InputNumber />
                                </Form.Item>
                                <Row gutter={16}>
                                  <Col span={12}>
                                    <Form.Item
                                      name='ssh_jump_username'
                                      label='Username'
                                      rules={[
                                        {
                                          required: true,
                                          message: 'Username을 입력해주세요',
                                        },
                                      ]}
                                    >
                                      <Input
                                        prefix={<UserOutlined />}
                                        placeholder='SSH 사용자명'
                                        autoComplete='off'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col span={12}>
                                    <Form.Item
                                      name='ssh_jump_password'
                                      label='Password'
                                      rules={[
                                        {
                                          required: true,
                                          message: 'Password를 입력해주세요',
                                        },
                                      ]}
                                    >
                                      <Input.Password
                                        prefix={<LockOutlined />}
                                        placeholder='SSH 비밀번호'
                                        autoComplete='new-password'
                                      />
                                    </Form.Item>
                                  </Col>
                                </Row>
                              </>
                            ) : (
                              // Target Host 필드
                              <>
                                <Form.Item name='ssh_host' hidden>
                                  <Input />
                                </Form.Item>
                                <Form.Item name='ssh_port' hidden>
                                  <InputNumber />
                                </Form.Item>
                                <Row gutter={16}>
                                  <Col span={12}>
                                    <Form.Item
                                      name='ssh_username'
                                      label='Username'
                                      rules={[
                                        {
                                          required: true,
                                          message: 'Username을 입력해주세요',
                                        },
                                      ]}
                                    >
                                      <Input
                                        prefix={<UserOutlined />}
                                        placeholder='SSH 사용자명'
                                        autoComplete='off'
                                      />
                                    </Form.Item>
                                  </Col>
                                  <Col span={12}>
                                    <Form.Item
                                      name='ssh_password'
                                      label='Password'
                                      rules={[
                                        {
                                          required: true,
                                          message: 'Password를 입력해주세요',
                                        },
                                      ]}
                                    >
                                      <Input.Password
                                        prefix={<LockOutlined />}
                                        placeholder='SSH 비밀번호'
                                        autoComplete='new-password'
                                      />
                                    </Form.Item>
                                  </Col>
                                </Row>
                              </>
                            )}
                          </Space>
                        </div>
                      );
                    })}
                  {/* Jump Host 활성화를 위한 hidden 필드 */}
                  <Form.Item name='ssh_jump_enabled' hidden>
                    <Switch />
                  </Form.Item>
                </div>
              ) : (
                // 수동 입력 UI (서비스 미선택 시)
                <>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name='ssh_host' label='SSH 호스트'>
                        <Input placeholder='SSH 서버 주소' />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        name='ssh_port'
                        label='SSH 포트'
                        initialValue={22}
                      >
                        <InputNumber style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item name='ssh_username' label='SSH 사용자'>
                        <Input placeholder='사용자명' />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item name='ssh_password' label='SSH 비밀번호'>
                    <Input.Password placeholder='SSH 비밀번호' />
                  </Form.Item>

                  <Form.Item name='ssh_jump_enabled' valuePropName='checked'>
                    <Switch
                      checkedChildren='Jump Host 사용'
                      unCheckedChildren='Jump Host 미사용'
                      onChange={checked => setShowJumpOptions(checked)}
                    />
                  </Form.Item>

                  {showJumpOptions && (
                    <>
                      <Divider orientation='left' plain>
                        Jump Host (Bastion) 설정
                      </Divider>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item name='ssh_jump_host' label='Jump Host'>
                            <Input placeholder='Jump 서버 주소' />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item
                            name='ssh_jump_port'
                            label='포트'
                            initialValue={22}
                          >
                            <InputNumber style={{ width: '100%' }} />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item name='ssh_jump_username' label='사용자'>
                            <Input placeholder='사용자명' />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.Item
                        name='ssh_jump_password'
                        label='Jump Host 비밀번호'
                      >
                        <Input.Password placeholder='Jump Host 비밀번호' />
                      </Form.Item>
                    </>
                  )}
                </>
              )}
            </Panel>
          </Collapse>

          <Divider />

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setConnectionModalOpen(false)}>
                취소
              </Button>
              <Button type='primary' htmlType='submit' loading={loading}>
                {editingConnection ? '수정' : '추가'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 동기화 작업 모달 */}
      <Modal
        title={
          <Space>
            <SyncOutlined />
            {editingSyncJob ? '동기화 작업 수정' : '새 동기화 작업 추가'}
          </Space>
        }
        open={syncJobModalOpen}
        onCancel={() => {
          setSyncJobModalOpen(false);
          setEditingSyncJob(null);
          setSyncJobSchemaValidation({ validated: false, isCompatible: false });
        }}
        footer={null}
        width={700}
      >
        <Alert
          message='동기화 작업 안내'
          description='소스 DB의 데이터를 타겟 DB로 복제합니다. 데이터 동기화를 위해서는 두 DB의 스키마가 동일해야 합니다.'
          type='info'
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form
          form={syncJobForm}
          layout='vertical'
          onFinish={handleSaveSyncJob}
          onValuesChange={changedValues => {
            // 소스 또는 타겟 DB가 변경되면 스키마 검증 실행
            if (
              changedValues.source_connection_id ||
              changedValues.target_connection_id
            ) {
              const sourceId =
                changedValues.source_connection_id ??
                syncJobForm.getFieldValue('source_connection_id');
              const targetId =
                changedValues.target_connection_id ??
                syncJobForm.getFieldValue('target_connection_id');
              if (sourceId && targetId) {
                validateSyncJobSchema(sourceId, targetId);
              }
            }
          }}
        >
          <Form.Item
            name='name'
            label='작업 이름'
            rules={[{ required: true, message: '작업 이름을 입력하세요' }]}
          >
            <Input
              placeholder='예: Daily Production Sync'
              prefix={<SyncOutlined />}
            />
          </Form.Item>

          <Form.Item name='description' label='설명 (선택사항)'>
            <Input.TextArea rows={2} placeholder='이 동기화 작업에 대한 설명' />
          </Form.Item>

          <Row gutter={16}>
            <Col span={11}>
              <Form.Item
                name='source_connection_id'
                label={
                  <span>
                    <span style={{ color: '#52c41a' }}>●</span> 소스 DB (원본)
                  </span>
                }
                rules={[{ required: true, message: '소스 DB를 선택하세요' }]}
              >
                <Select placeholder='데이터를 가져올 DB'>
                  {connectedDBs.map(conn => (
                    <Option key={conn.id} value={conn.id}>
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        {conn.name}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={2} style={{ textAlign: 'center', paddingTop: 38 }}>
              <SwapOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            </Col>
            <Col span={11}>
              <Form.Item
                name='target_connection_id'
                label={
                  <span>
                    <span style={{ color: '#1890ff' }}>●</span> 타겟 DB (대상)
                  </span>
                }
                rules={[{ required: true, message: '타겟 DB를 선택하세요' }]}
              >
                <Select placeholder='데이터를 넣을 DB'>
                  {connectedDBs.map(conn => (
                    <Option key={conn.id} value={conn.id}>
                      <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        {conn.name}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* 스키마 검증 결과 표시 */}
          {validatingSchema && (
            <Alert
              message={
                <Space>
                  <Spin size='small' /> 스키마 호환성 검증 중...
                </Space>
              }
              type='info'
              style={{ marginBottom: 16 }}
            />
          )}
          {!validatingSchema && syncJobSchemaValidation.validated && (
            <Alert
              message={
                syncJobSchemaValidation.isCompatible
                  ? '스키마 호환'
                  : '스키마 불일치'
              }
              description={
                <div>
                  <div>{syncJobSchemaValidation.message}</div>
                  {!syncJobSchemaValidation.isCompatible &&
                    syncJobSchemaValidation.differences && (
                      <div style={{ marginTop: 8 }}>
                        {(syncJobSchemaValidation.differences.only_in_source
                          ?.length || 0) > 0 && (
                          <div>
                            <Text type='secondary'>소스에만 있는 테이블: </Text>
                            {syncJobSchemaValidation.differences.only_in_source
                              ?.slice(0, 5)
                              .map(t => (
                                <Tag
                                  key={t}
                                  color='blue'
                                  style={{ marginRight: 4 }}
                                >
                                  {t}
                                </Tag>
                              ))}
                            {(syncJobSchemaValidation.differences.only_in_source
                              ?.length || 0) > 5 && (
                              <Text type='secondary'>
                                외{' '}
                                {(syncJobSchemaValidation.differences
                                  .only_in_source?.length || 0) - 5}
                                개
                              </Text>
                            )}
                          </div>
                        )}
                        {(syncJobSchemaValidation.differences.only_in_target
                          ?.length || 0) > 0 && (
                          <div style={{ marginTop: 4 }}>
                            <Text type='secondary'>타겟에만 있는 테이블: </Text>
                            {syncJobSchemaValidation.differences.only_in_target
                              ?.slice(0, 5)
                              .map(t => (
                                <Tag
                                  key={t}
                                  color='orange'
                                  style={{ marginRight: 4 }}
                                >
                                  {t}
                                </Tag>
                              ))}
                            {(syncJobSchemaValidation.differences.only_in_target
                              ?.length || 0) > 5 && (
                              <Text type='secondary'>
                                외{' '}
                                {(syncJobSchemaValidation.differences
                                  .only_in_target?.length || 0) - 5}
                                개
                              </Text>
                            )}
                          </div>
                        )}
                        <Button
                          type='link'
                          size='small'
                          style={{ padding: 0, marginTop: 8 }}
                          onClick={() => {
                            setSyncJobModalOpen(false);
                            setActiveTab('migration');
                          }}
                        >
                          마이그레이션 탭으로 이동 →
                        </Button>
                      </div>
                    )}
                </div>
              }
              type={
                syncJobSchemaValidation.isCompatible ? 'success' : 'warning'
              }
              showIcon
              icon={
                syncJobSchemaValidation.isCompatible ? (
                  <CheckCircleOutlined />
                ) : (
                  <ExclamationCircleOutlined />
                )
              }
              style={{ marginBottom: 16 }}
            />
          )}

          {/* sync_type은 데이터 동기화로 고정 (스키마는 마이그레이션 탭에서 처리) */}
          <Form.Item name='sync_type' initialValue='data' hidden>
            <Input />
          </Form.Item>

          <Form.Item
            name='backup_before_sync'
            label='동기화 전 백업'
            valuePropName='checked'
            tooltip='타겟 DB를 동기화 전에 백업합니다'
          >
            <Switch checkedChildren='백업함' unCheckedChildren='백업 안함' />
          </Form.Item>

          <Divider />

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setSyncJobModalOpen(false)}>취소</Button>
              <Button
                type='primary'
                htmlType='submit'
                loading={loading}
                disabled={
                  !editingSyncJob &&
                  syncJobSchemaValidation.validated &&
                  !syncJobSchemaValidation.isCompatible
                }
              >
                {editingSyncJob ? '수정' : '추가'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 동기화 실행 미리보기 모달 */}
      <Modal
        title={
          <Space>
            <EyeOutlined style={{ color: '#1890ff' }} />
            <span>동기화 실행 미리보기</span>
          </Space>
        }
        open={syncPreviewModalOpen}
        onCancel={() => {
          setSyncPreviewModalOpen(false);
          setSyncPreviewData(null);
        }}
        width={800}
        footer={
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              onClick={() => {
                setSyncPreviewModalOpen(false);
                setSyncPreviewData(null);
              }}
            >
              취소
            </Button>
            {syncPreviewData?.compareResult && (
              <Button
                type='primary'
                icon={<PlayCircleOutlined />}
                onClick={() => {
                  if (syncPreviewData?.job) {
                    handleExecuteSyncJob(syncPreviewData.job.id);
                  }
                }}
                disabled={
                  // 스키마 차이가 있으면 실행 불가
                  (syncPreviewData.compareResult.schema_diff?.only_in_source
                    ?.length || 0) > 0 ||
                  (syncPreviewData.compareResult.schema_diff?.only_in_target
                    ?.length || 0) > 0 ||
                  (syncPreviewData.compareResult.schema_diff?.column_differences
                    ?.length || 0) > 0
                }
              >
                동기화 실행
              </Button>
            )}
          </Space>
        }
      >
        {loadingPreview ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin size='large' />
            <div style={{ marginTop: 16, marginBottom: 8 }}>
              <Text strong>데이터 비교 중입니다...</Text>
            </div>
            <Progress
              type='line'
              percent={Math.min(previewElapsedTime * 3, 95)}
              status='active'
              strokeColor={{ from: '#108ee9', to: '#87d068' }}
              style={{ maxWidth: 250, margin: '0 auto' }}
            />
            <div style={{ marginTop: 12 }}>
              <Text type='secondary'>
                경과 시간: {previewElapsedTime}초
                {previewElapsedTime > 10 &&
                  ' (테이블 수에 따라 시간이 소요될 수 있습니다)'}
              </Text>
            </div>
          </div>
        ) : syncPreviewData?.compareResult ? (
          <Space direction='vertical' style={{ width: '100%' }} size='large'>
            {/* 작업 정보 */}
            <Card size='small'>
              <Space direction='vertical' style={{ width: '100%' }}>
                <div>
                  <Text strong>작업명:</Text>{' '}
                  <Text>{syncPreviewData.job.name}</Text>
                </div>
                {syncPreviewData.job.description && (
                  <div>
                    <Text strong>설명:</Text>{' '}
                    <Text type='secondary'>
                      {syncPreviewData.job.description}
                    </Text>
                  </div>
                )}
                <div>
                  <Text strong>데이터 흐름:</Text>{' '}
                  <Tag color='green'>
                    {
                      connections.find(
                        c => c.id === syncPreviewData.job.source_connection_id
                      )?.name
                    }
                  </Tag>
                  <SwapOutlined />
                  <Tag color='blue'>
                    {
                      connections.find(
                        c => c.id === syncPreviewData.job.target_connection_id
                      )?.name
                    }
                  </Tag>
                </div>
              </Space>
            </Card>

            {/* 스키마 검증 결과 */}
            {syncPreviewData.compareResult.schema_diff && (
              <Card
                title={
                  <Space>
                    <SettingOutlined /> 스키마 검증
                  </Space>
                }
                size='small'
              >
                {(syncPreviewData.compareResult.schema_diff.only_in_source
                  ?.length || 0) === 0 &&
                (syncPreviewData.compareResult.schema_diff.only_in_target
                  ?.length || 0) === 0 &&
                (syncPreviewData.compareResult.schema_diff.column_differences
                  ?.length || 0) === 0 ? (
                  <Alert
                    type='success'
                    message='스키마가 동일합니다'
                    description='데이터 동기화를 안전하게 수행할 수 있습니다.'
                    showIcon
                  />
                ) : (
                  <Alert
                    type='error'
                    message='스키마 불일치 감지'
                    description={
                      <div>
                        <p>
                          스키마가 다르므로 동기화를 실행할 수 없습니다. 먼저
                          마이그레이션을 수행해주세요.
                        </p>
                        {(syncPreviewData.compareResult.schema_diff
                          .only_in_source?.length || 0) > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <Text strong>소스에만 있는 테이블:</Text>{' '}
                            {syncPreviewData.compareResult.schema_diff.only_in_source
                              ?.slice(0, 3)
                              .map(t => (
                                <Tag key={t} color='blue'>
                                  {t}
                                </Tag>
                              ))}
                            {(syncPreviewData.compareResult.schema_diff
                              .only_in_source?.length || 0) > 3 && (
                              <Text type='secondary'>
                                {' '}
                                외{' '}
                                {(syncPreviewData.compareResult.schema_diff
                                  .only_in_source?.length || 0) - 3}
                                개
                              </Text>
                            )}
                          </div>
                        )}
                        {(syncPreviewData.compareResult.schema_diff
                          .only_in_target?.length || 0) > 0 && (
                          <div style={{ marginTop: 4 }}>
                            <Text strong>타겟에만 있는 테이블:</Text>{' '}
                            {syncPreviewData.compareResult.schema_diff.only_in_target
                              ?.slice(0, 3)
                              .map(t => (
                                <Tag key={t} color='orange'>
                                  {t}
                                </Tag>
                              ))}
                            {(syncPreviewData.compareResult.schema_diff
                              .only_in_target?.length || 0) > 3 && (
                              <Text type='secondary'>
                                {' '}
                                외{' '}
                                {(syncPreviewData.compareResult.schema_diff
                                  .only_in_target?.length || 0) - 3}
                                개
                              </Text>
                            )}
                          </div>
                        )}
                        <Button
                          type='link'
                          size='small'
                          style={{ padding: 0, marginTop: 8 }}
                          onClick={() => {
                            setSyncPreviewModalOpen(false);
                            setActiveTab('migration');
                          }}
                        >
                          마이그레이션 탭으로 이동 →
                        </Button>
                      </div>
                    }
                    showIcon
                  />
                )}
              </Card>
            )}

            {/* 데이터 변경 예상 결과 */}
            {syncPreviewData.compareResult.data_diff && (
              <Card
                title={
                  <Space>
                    <DatabaseOutlined /> 데이터 변경 예상
                  </Space>
                }
                size='small'
              >
                <Table
                  size='small'
                  pagination={false}
                  dataSource={syncPreviewData.compareResult.data_diff.tables}
                  rowKey='name'
                  columns={[
                    {
                      title: '테이블명',
                      dataIndex: 'name',
                      key: 'name',
                      render: (name: string) => <Text strong>{name}</Text>,
                    },
                    {
                      title: '소스 레코드',
                      dataIndex: 'source_count',
                      key: 'source_count',
                      width: 120,
                      render: (count: number) => (
                        <Tag color='green'>{count.toLocaleString()}개</Tag>
                      ),
                    },
                    {
                      title: '타겟 레코드',
                      dataIndex: 'target_count',
                      key: 'target_count',
                      width: 120,
                      render: (count: number) => (
                        <Tag color='blue'>{count.toLocaleString()}개</Tag>
                      ),
                    },
                    {
                      title: '동기화 방식',
                      dataIndex: 'sync_mode',
                      key: 'sync_mode',
                      width: 100,
                      render: (
                        _: string,
                        record: { will_sync: boolean; sync_mode?: string }
                      ) => {
                        if (!record.will_sync) {
                          return <Tag>변경 없음</Tag>;
                        }
                        return record.sync_mode === 'incremental' ? (
                          <Tag color='processing'>증분</Tag>
                        ) : (
                          <Tag color='warning'>전체교체</Tag>
                        );
                      },
                    },
                    {
                      title: '예상 작업',
                      key: 'expected_changes',
                      width: 180,
                      render: (
                        _: unknown,
                        record: {
                          will_sync: boolean;
                          expected_insert?: number;
                          expected_delete?: number;
                        }
                      ) => {
                        if (!record.will_sync) {
                          return <Text type='secondary'>-</Text>;
                        }
                        const insertCount = record.expected_insert || 0;
                        const deleteCount = record.expected_delete || 0;
                        return (
                          <Space direction='vertical' size={0}>
                            {deleteCount > 0 && (
                              <Text type='danger' style={{ fontSize: 12 }}>
                                삭제: {deleteCount.toLocaleString()}건
                              </Text>
                            )}
                            {insertCount > 0 && (
                              <Text type='success' style={{ fontSize: 12 }}>
                                삽입: {insertCount.toLocaleString()}건
                              </Text>
                            )}
                          </Space>
                        );
                      },
                    },
                  ]}
                  summary={data => {
                    // 동기화 대상 테이블만 계산 (will_sync 기반)
                    const syncTargets = data.filter(row => row.will_sync);
                    const totalInsert = syncTargets.reduce(
                      (sum, row) => sum + (row.expected_insert || 0),
                      0
                    );
                    const totalDelete = syncTargets.reduce(
                      (sum, row) => sum + (row.expected_delete || 0),
                      0
                    );
                    const syncCount = syncTargets.length;

                    return (
                      <Table.Summary fixed>
                        <Table.Summary.Row style={{ background: '#fafafa' }}>
                          <Table.Summary.Cell index={0} colSpan={3}>
                            <Text strong>
                              예상 총 작업 ({syncCount}개 테이블):
                            </Text>
                          </Table.Summary.Cell>
                          <Table.Summary.Cell index={1} colSpan={2}>
                            <Space>
                              {totalDelete > 0 && (
                                <Tag color='error'>
                                  삭제 {totalDelete.toLocaleString()}건
                                </Tag>
                              )}
                              {totalInsert > 0 && (
                                <Tag color='success'>
                                  삽입 {totalInsert.toLocaleString()}건
                                </Tag>
                              )}
                              {totalInsert === 0 && totalDelete === 0 && (
                                <Tag>변경 없음</Tag>
                              )}
                            </Space>
                          </Table.Summary.Cell>
                        </Table.Summary.Row>
                      </Table.Summary>
                    );
                  }}
                />
              </Card>
            )}

            {/* 백업 설정 안내 */}
            {syncPreviewData.job.backup_before_sync && (
              <Alert
                type='info'
                message='백업 설정'
                description='동기화 실행 전에 타겟 DB를 자동으로 백업합니다.'
                showIcon
                icon={<SafetyCertificateOutlined />}
              />
            )}
          </Space>
        ) : null}
      </Modal>

      {/* 백업 관리 모달 */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined />
            <span>백업 관리 - {selectedConnectionForBackup?.name}</span>
          </Space>
        }
        open={backupModalOpen}
        onCancel={() => {
          setBackupModalOpen(false);
          setSelectedConnectionForBackup(null);
          setBackups([]);
        }}
        footer={[
          <Button
            key='refresh'
            icon={<ReloadOutlined />}
            onClick={() =>
              selectedConnectionForBackup &&
              loadBackups(selectedConnectionForBackup)
            }
            loading={loadingBackups}
          >
            새로고침
          </Button>,
          <Button
            key='close'
            onClick={() => {
              setBackupModalOpen(false);
              setSelectedConnectionForBackup(null);
              setBackups([]);
            }}
          >
            닫기
          </Button>,
        ]}
        width={700}
      >
        {loadingBackups ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin size='large' />
            <p style={{ marginTop: 16 }}>백업 목록을 불러오는 중...</p>
          </div>
        ) : backups.length === 0 ? (
          <Empty
            description={
              <span>
                백업 파일이 없습니다.
                <br />
                동기화 작업 실행 시 자동 백업이 생성됩니다.
              </span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            dataSource={backups}
            rowKey='file_name'
            pagination={false}
            size='small'
            columns={[
              {
                title: '파일명',
                dataIndex: 'file_name',
                key: 'file_name',
                render: (text: string) => (
                  <Text code style={{ fontSize: 12 }}>
                    {text}
                  </Text>
                ),
              },
              {
                title: '크기',
                dataIndex: 'file_size',
                key: 'file_size',
                width: 100,
                render: (size: number) => formatFileSize(size),
              },
              {
                title: '생성일시',
                dataIndex: 'created_at',
                key: 'created_at',
                width: 160,
                render: (date: string) =>
                  new Date(date).toLocaleString('ko-KR'),
              },
              {
                title: '작업',
                key: 'actions',
                width: 100,
                render: (_: unknown, record: BackupInfo) => (
                  <Button
                    type='primary'
                    size='small'
                    icon={<PlayCircleOutlined />}
                    loading={restoringBackup === record.file_path}
                    onClick={() => handleRestoreBackup(record.file_path)}
                  >
                    복원
                  </Button>
                ),
              },
            ]}
          />
        )}

        {/* 복원 진행률 표시 */}
        {restoreProgress && !restoringSyncHistoryId && (
          <div className='sync-progress' style={{ marginBottom: 16 }}>
            <div className='sync-progress-title'>
              <ReloadOutlined
                spin={
                  restoreProgress.status === 'running' ||
                  restoreProgress.status === 'pending'
                }
              />
              백업 복원{' '}
              {restoreProgress.status === 'running'
                ? '진행 중'
                : restoreProgress.status === 'completed'
                  ? '완료'
                  : restoreProgress.status === 'failed'
                    ? '실패'
                    : '대기 중'}
            </div>
            <div
              style={{
                padding: '12px 16px',
                background: '#fff',
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <Space>
                  <Tag
                    color={
                      restoreProgress.status === 'failed'
                        ? 'error'
                        : restoreProgress.status === 'completed'
                          ? 'success'
                          : 'processing'
                    }
                    icon={
                      <ReloadOutlined
                        spin={restoreProgress.status === 'running'}
                      />
                    }
                  >
                    복원
                  </Tag>
                  <Text strong>{restoreProgress.connection_name}</Text>
                </Space>
                <Text type='secondary'>
                  시작:{' '}
                  {restoreProgress.started_at
                    ? new Date(restoreProgress.started_at).toLocaleString(
                        'ko-KR'
                      )
                    : '-'}
                </Text>
              </div>
              <Progress
                percent={restoreProgress.progress_percent}
                status={
                  restoreProgress.status === 'failed'
                    ? 'exception'
                    : restoreProgress.status === 'completed'
                      ? 'success'
                      : 'active'
                }
                strokeColor={
                  restoreProgress.status === 'running'
                    ? { from: '#108ee9', to: '#87d068' }
                    : restoreProgress.status === 'completed'
                      ? '#52c41a'
                      : undefined
                }
                format={percent => `${percent}%`}
              />
              <Text type='secondary' style={{ fontSize: 12 }}>
                {restoreProgress.status === 'running' && (
                  <>
                    복원 파일:{' '}
                    <Text code>
                      {restoreProgress.backup_file.split('/').pop()}
                    </Text>
                  </>
                )}
                {restoreProgress.status === 'completed' && (
                  <Text type='success'>복원이 완료되었습니다.</Text>
                )}
                {restoreProgress.status === 'failed' && (
                  <Text type='danger'>
                    오류: {restoreProgress.error_message}
                  </Text>
                )}
              </Text>
            </div>
          </div>
        )}

        <Alert
          type='info'
          message='백업 파일 정보'
          description={
            <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
              <li>백업 파일은 서버의 /tmp/db_backups 경로에 저장됩니다.</li>
              <li>
                동기화 작업 실행 시 &quot;백업 후 동기화&quot; 옵션이 활성화되면
                자동으로 백업됩니다.
              </li>
              <li>복원 시 현재 데이터가 백업 시점의 데이터로 대체됩니다.</li>
            </ul>
          }
          style={{ marginTop: 16 }}
        />
      </Modal>
    </div>
  );
};

export default DatabaseManagement;
