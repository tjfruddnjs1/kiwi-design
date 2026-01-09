import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Tabs,
  Input,
  Select,
  DatePicker,
  Checkbox,
  Space,
  Button,
  Popover,
  Typography,
} from 'antd';
import {
  SafetyOutlined,
  HistoryOutlined,
  RollbackOutlined,
  SettingOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useBackupManagement } from '../../hooks/useBackupManagement';
import {
  BackupInfraHeader,
  BackupStatusSection,
  BackupListTable,
  RestoreListTable,
  InstallStatusDisplay,
  SetupWizardModal,
  DeleteBackupModal,
  RestoreBackupModal,
  NamespaceAuthModal,
} from '../../components/backup';
import dayjs, { Dayjs } from 'dayjs';

const { TabPane } = Tabs;
const { RangePicker } = DatePicker;
const { Text } = Typography;

// 상태 필터 옵션(표시용)
const STATUS_OPTIONS = [
  { label: 'creating', value: 'creating' },
  { label: 'inprogress', value: 'inprogress' },
  { label: 'running', value: 'running' },
  { label: 'completed', value: 'completed' },
  { label: 'failed', value: 'failed' },
];

type FiltersState = {
  q: string;
  statuses: string[];
  namespaces: string[];
  dateRange: [Dayjs | null, Dayjs | null];
};

const defaultFilters: FiltersState = {
  q: '',
  statuses: [],
  namespaces: [],
  dateRange: [null, null],
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

const BackupManage: React.FC = () => {
  const {
    // State
    backups,
    restores,
    infrastructures,
    selectedInfraId,
    installStatus,
    isLoadingStatus,
    isAdmin,
    selectedBackup,
    isSetupModalVisible,
    isBackupModalVisible: _isBackupModalVisible,
    isDeleteModalVisible,
    isRestoreModalVisible,
    isNamespaceAuthModalVisible,

    // Actions
    setIsSetupModalVisible,
    setIsBackupModalVisible: _setIsBackupModalVisible,
    setIsDeleteModalVisible,
    setIsRestoreModalVisible,
    setIsNamespaceAuthModalVisible,
    handleInfraChange,
    handleBackupModalOpen,
    handleDeleteBackup,
    checkInstallStatus,

    // Forms
    setupForm: _setupForm,
    backupForm: _backupForm,
    deleteForm: _deleteForm,
    restoreForm: _restoreForm,
    namespaceAuthForm: _namespaceAuthForm,
  } = useBackupManagement();

  // 필터 상태 및 파생 리스트 계산
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const debouncedQ = useDebouncedValue(filters.q, 300);

  // 네임스페이스 옵션 추출
  const namespaceOptions = useMemo(() => {
    const set = new Set<string>();
    backups?.forEach(b => {
      if (b?.namespace) set.add(b.namespace);
    });
    return Array.from(set)
      .sort()
      .map(ns => ({ label: ns, value: ns }));
  }, [backups]);

  // 인프라명 확보(검색 대상 포함)
  const currentInfraName = useMemo(() => {
    const infra = infrastructures?.find(i => i.id === Number(selectedInfraId));
    return infra?.name ? String(infra.name) : '';
  }, [infrastructures, selectedInfraId]);

  // 상태 정규화
  const normalizeStatus = (raw?: string): string => {
    if (!raw) return '';
    const s = raw.toLowerCase();
    if (s.includes('progress')) return 'inprogress';
    if (s === 'completed' || s === 'complete') return 'completed';
    if (s === 'failed' || s === 'fail') return 'failed';
    if (s === 'running') return 'running';
    if (s === 'creating' || s === 'created') return 'creating';
    return s;
  };

  // 파생 리스트 계산: 기간 → 상태 → 네임스페이스 → 검색 → 정렬
  const derivedBackups = useMemo(() => {
    const list = Array.isArray(backups) ? backups.slice() : [];

    const [start, end] = filters.dateRange;
    const hasDate = (item: any) => Boolean(item?.created_at);
    const inRange = (item: any) => {
      if (!start && !end) return true;
      if (!hasDate(item)) return false; // created_at 누락은 제외
      const ts = dayjs(item.created_at);
      if (start && ts.isBefore(start, 'second')) return false;
      if (end && ts.isAfter(end, 'second')) return false;
      return true;
    };

    const matchesStatus = (item: any) => {
      if (!filters.statuses?.length) return true;
      const s = normalizeStatus(item?.status);
      return filters.statuses.includes(s);
    };

    const matchesNamespace = (item: any) => {
      if (!filters.namespaces?.length) return true;
      return filters.namespaces.includes(item?.namespace);
    };

    const q = debouncedQ.trim().toLowerCase();
    const matchesQuery = (item: any) => {
      if (!q) return true;
      const name = String(item?.name ?? '').toLowerCase();
      const ns = String(item?.namespace ?? '').toLowerCase();
      const infra = currentInfraName.toLowerCase();
      return name.includes(q) || ns.includes(q) || infra.includes(q);
    };

    const filtered = list
      .filter(inRange)
      .filter(matchesStatus)
      .filter(matchesNamespace)
      .filter(matchesQuery);

    filtered.sort((a: any, b: any) => {
      const ta = a?.created_at ? dayjs(a.created_at).valueOf() : 0;
      const tb = b?.created_at ? dayjs(b.created_at).valueOf() : 0;
      return tb - ta; // desc
    });

    return filtered;
  }, [
    backups,
    filters.dateRange,
    filters.namespaces,
    filters.statuses,
    debouncedQ,
    currentInfraName,
  ]);

  // 필터 변경 시 테이블 초기 페이지로 리셋: key 변경
  const tableKey = useMemo(() => {
    const sig = JSON.stringify({
      q: debouncedQ,
      statuses: filters.statuses,
      namespaces: filters.namespaces,
      dateRange: filters.dateRange.map(d => (d ? d.valueOf() : null)),
    });
    return `backup-table-${sig}`;
  }, [debouncedQ, filters.statuses, filters.namespaces, filters.dateRange]);

  const handleRestore = (_backup: any) => {
    // Restore logic would be implemented here
  };

  const loadBackupStatus = () => {
    if (selectedInfraId) {
      checkInstallStatus(Number(selectedInfraId));
    }
  };

  return (
    <div className='backup-manage'>
      <Card
        title={
          <div className='card-title'>
            <SafetyOutlined /> 백업 관리
          </div>
        }
        extra={
          <BackupInfraHeader
            infrastructures={infrastructures}
            selectedInfraId={selectedInfraId}
            installStatus={installStatus}
            isAdmin={isAdmin}
            onInfraChange={handleInfraChange}
            onSetupClick={() => setIsSetupModalVisible(true)}
            onBackupClick={handleBackupModalOpen}
          />
        }
      >
        <Tabs defaultActiveKey='1'>
          <TabPane
            tab={
              <span>
                <HistoryOutlined /> 백업 목록
              </span>
            }
            key='1'
          >
            <div className='backup-header'>
              <div />
              <BackupStatusSection
                selectedInfraId={selectedInfraId}
                installStatus={installStatus}
              />
            </div>

            {!selectedInfraId ? (
              <div className='empty-status'>
                <div className='status-message'>
                  <InfoCircleOutlined
                    style={{
                      fontSize: '24px',
                      color: '#1890ff',
                      marginBottom: '16px',
                    }}
                  />
                  <h3>인프라를 선택해주세요</h3>
                  <p>백업 목록을 보려면 먼저 인프라를 선택해야 합니다.</p>
                </div>
              </div>
            ) : (
              <>
                {/* 필터/검색 바 */}
                <BackupFiltersBar
                  filters={filters}
                  namespaceOptions={namespaceOptions}
                  onChange={setFilters}
                />

                <BackupListTable
                  key={tableKey}
                  backups={derivedBackups}
                  isAdmin={isAdmin}
                  onRestore={handleRestore}
                  onDelete={handleDeleteBackup}
                />
              </>
            )}
          </TabPane>

          <TabPane
            tab={
              <span>
                <RollbackOutlined /> 복구 이력
              </span>
            }
            key='2'
          >
            {!selectedInfraId ? (
              <div className='empty-status'>
                <div className='status-message'>
                  <InfoCircleOutlined
                    style={{
                      fontSize: '24px',
                      color: '#1890ff',
                      marginBottom: '16px',
                    }}
                  />
                  <h3>인프라를 선택해주세요</h3>
                  <p>복구 이력을 보려면 먼저 인프라를 선택해야 합니다.</p>
                </div>
              </div>
            ) : (
              <RestoreListTable restores={restores} />
            )}
          </TabPane>

          <TabPane
            tab={
              <span>
                <SettingOutlined /> 설정 상태
              </span>
            }
            key='3'
          >
            <InstallStatusDisplay
              selectedInfraId={selectedInfraId}
              installStatus={installStatus}
              isLoadingStatus={isLoadingStatus}
              onRefresh={loadBackupStatus}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Modals */}
      <SetupWizardModal
        visible={isSetupModalVisible}
        onCancel={() => setIsSetupModalVisible(false)}
        onSubmit={() => {
          setIsSetupModalVisible(false);
          if (selectedInfraId) {
            checkInstallStatus(Number(selectedInfraId));
          }
        }}
        infrastructures={infrastructures}
        selectedInfraId={selectedInfraId}
        installStatus={installStatus}
      />

      {/* TODO: BackupForm을 적절한 모달 컴포넌트로 교체 필요 */}

      <DeleteBackupModal
        visible={isDeleteModalVisible}
        onCancel={() => setIsDeleteModalVisible(false)}
        selectedBackup={selectedBackup}
        isDeleting={false}
        onConfirm={async () => {
          setIsDeleteModalVisible(false);
          // Reload backups after successful deletion
          if (selectedInfraId) {
            // loadBackups(Number(selectedInfraId));
          }
        }}
      />

      <RestoreBackupModal
        visible={isRestoreModalVisible}
        onCancel={() => setIsRestoreModalVisible(false)}
        selectedBackup={selectedBackup}
        isRestoring={false}
        onRestore={() => {
          setIsRestoreModalVisible(false);
          // Handle restore success
        }}
      />

      <NamespaceAuthModal
        visible={isNamespaceAuthModalVisible}
        onCancel={() => setIsNamespaceAuthModalVisible(false)}
        isFetchingNamespaces={false}
        onFetch={() => {
          setIsNamespaceAuthModalVisible(false);
          // Handle namespace fetch
        }}
      />
    </div>
  );
};

export default BackupManage;

// ========== 내부 컴포넌트: 필터/검색 바 ==========
type BackupFiltersBarProps = {
  filters: FiltersState;
  namespaceOptions: Array<{ label: string; value: string }>;
  onChange: (next: FiltersState) => void;
};

const BackupFiltersBar: React.FC<BackupFiltersBarProps> = ({
  filters,
  namespaceOptions,
  onChange,
}) => {
  const [q, setQ] = useState<string>(filters.q);

  useEffect(() => {
    setQ(filters.q);
  }, [filters.q]);

  const handleReset = () => {
    onChange(defaultFilters);
  };

  const presets = [
    {
      label: '24h',
      value: [dayjs().subtract(24, 'hour'), dayjs()] as [Dayjs, Dayjs],
    },
    {
      label: '7d',
      value: [dayjs().subtract(7, 'day'), dayjs()] as [Dayjs, Dayjs],
    },
    {
      label: '30d',
      value: [dayjs().subtract(30, 'day'), dayjs()] as [Dayjs, Dayjs],
    },
  ];

  const advanced = (
    <div style={{ maxWidth: 320 }}>
      <Text type='secondary'>고급 필터는 이후 단계에서 확장 예정</Text>
    </div>
  );

  return (
    <Card size='small' style={{ marginBottom: 12 }}>
      <Space wrap align='center' size={[8, 8]} style={{ width: '100%' }}>
        {/* 검색 */}
        <Input
          allowClear
          placeholder='이름/네임스페이스/인프라명 검색'
          value={q}
          onChange={e => {
            setQ(e.target.value);
            onChange({ ...filters, q: e.target.value });
          }}
          style={{ width: 280 }}
        />

        {/* 상태 필터 */}
        <Checkbox.Group
          options={STATUS_OPTIONS}
          value={filters.statuses}
          onChange={values => onChange({ ...filters, statuses: values })}
        />

        {/* 네임스페이스 */}
        <Select
          mode='multiple'
          allowClear
          placeholder='네임스페이스'
          value={filters.namespaces}
          options={namespaceOptions}
          onChange={values => onChange({ ...filters, namespaces: values })}
          style={{ minWidth: 240 }}
          showSearch
        />

        {/* 기간 */}
        <RangePicker
          allowClear
          value={filters.dateRange}
          onChange={value =>
            onChange({
              ...filters,
              dateRange: (value as [Dayjs | null, Dayjs | null]) ?? [
                null,
                null,
              ],
            })
          }
          presets={presets}
          showTime={false}
        />

        {/* 고급 */}
        <Popover content={advanced} placement='bottom'>
          <Button>고급</Button>
        </Popover>

        {/* 초기화 */}
        <Button onClick={handleReset}>초기화</Button>
      </Space>
    </Card>
  );
};
