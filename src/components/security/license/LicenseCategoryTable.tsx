/**
 * License Category Table Component
 *
 * 라이선스 분석 결과를 테이블 형태로 표시하는 컴포넌트
 * - 컴포넌트별 라이선스 정보
 * - 상태 관리 (검토/승인/거부)
 * - 필터링 및 검색
 */

import React, { useState, useMemo } from 'react';
import {
  Table,
  Input,
  Select,
  Tag,
  Space,
  Typography,
  Button,
  Tooltip,
  Badge,
  Modal,
  Form,
  message,
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type {
  LicenseAnalysisItem,
  LicenseCategory,
  LicenseRiskLevel,
  LicenseStatus,
} from '../../../types/securityAnalysis';
import {
  LICENSE_CATEGORY_INFO,
  LICENSE_RISK_COLORS,
  LICENSE_RISK_LABELS,
  LICENSE_STATUS_LABELS,
  LICENSE_STATUS_COLORS,
} from '../../../types/securityAnalysis';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface LicenseCategoryTableProps {
  licenses: LicenseAnalysisItem[];
  loading?: boolean;
  pageSize?: number;
  onResolve?: (params: {
    sbom_id: number;
    component_name: string;
    purl?: string;
    status: LicenseStatus;
    comment?: string;
  }) => Promise<void>;
}

/**
 * 라이선스 카테고리 태그
 */
const CategoryTag: React.FC<{ category: LicenseCategory }> = ({ category }) => {
  const info = LICENSE_CATEGORY_INFO[category];
  return (
    <Tooltip title={info?.description}>
      <Tag
        style={{
          backgroundColor: info?.bgColor,
          borderColor: info?.color,
          color: info?.color,
        }}
      >
        {info?.icon} {info?.labelKo || category}
      </Tag>
    </Tooltip>
  );
};

/**
 * 위험도 태그
 */
const RiskTag: React.FC<{ risk: LicenseRiskLevel }> = ({ risk }) => {
  return (
    <Tag color={LICENSE_RISK_COLORS[risk]}>{LICENSE_RISK_LABELS[risk]}</Tag>
  );
};

/**
 * 상태 태그
 */
const StatusTag: React.FC<{ status: LicenseStatus }> = ({ status }) => {
  const getIcon = () => {
    switch (status) {
      case 'approved':
        return <CheckCircleOutlined />;
      case 'rejected':
        return <CloseCircleOutlined />;
      case 'reviewed':
        return <ExclamationCircleOutlined />;
      default:
        return null;
    }
  };

  return (
    <Tag color={LICENSE_STATUS_COLORS[status]} icon={getIcon()}>
      {LICENSE_STATUS_LABELS[status]}
    </Tag>
  );
};

export const LicenseCategoryTable: React.FC<LicenseCategoryTableProps> = ({
  licenses,
  loading = false,
  pageSize = 20,
  onResolve,
}) => {
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<LicenseCategory | 'all'>(
    'all'
  );
  const [riskFilter, setRiskFilter] = useState<LicenseRiskLevel | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<LicenseStatus | 'all'>(
    'all'
  );
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LicenseAnalysisItem | null>(
    null
  );
  const [resolving, setResolving] = useState(false);
  const [form] = Form.useForm();

  // 필터링된 데이터
  const filteredData = useMemo(() => {
    return licenses.filter(item => {
      // 검색어 필터
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchesSearch =
          item.component_name.toLowerCase().includes(search) ||
          item.license_id.toLowerCase().includes(search) ||
          item.license_name?.toLowerCase().includes(search) ||
          item.purl.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // 카테고리 필터
      if (
        categoryFilter !== 'all' &&
        item.license_category !== categoryFilter
      ) {
        return false;
      }

      // 위험도 필터
      if (riskFilter !== 'all' && item.risk_level !== riskFilter) {
        return false;
      }

      // 상태 필터
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [licenses, searchText, categoryFilter, riskFilter, statusFilter]);

  // 상태 변경 핸들러
  const handleResolve = async () => {
    if (!selectedItem || !onResolve) return;

    try {
      setResolving(true);
      const values = await form.validateFields();
      await onResolve({
        sbom_id: selectedItem.sbom_id,
        component_name: selectedItem.component_name,
        purl: selectedItem.purl,
        status: values.status,
        comment: values.comment,
      });
      message.success('라이선스 상태가 업데이트되었습니다.');
      setResolveModalVisible(false);
      form.resetFields();
    } catch {
      message.error('상태 업데이트에 실패했습니다.');
    } finally {
      setResolving(false);
    }
  };

  // 상태 변경 모달 열기
  const openResolveModal = (item: LicenseAnalysisItem) => {
    setSelectedItem(item);
    form.setFieldsValue({
      status: item.status,
      comment: item.comment || '',
    });
    setResolveModalVisible(true);
  };

  // 컬럼 정의
  const columns: ColumnsType<LicenseAnalysisItem> = [
    {
      title: '컴포넌트',
      dataIndex: 'component_name',
      key: 'component_name',
      width: 180,
      ellipsis: true,
      sorter: (a, b) => a.component_name.localeCompare(b.component_name),
      render: (name: string, record) => (
        <Space direction='vertical' size={0}>
          <Text strong ellipsis style={{ maxWidth: 160 }}>
            <Tooltip title={name}>{name}</Tooltip>
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            v{record.component_version}
          </Text>
        </Space>
      ),
    },
    {
      title: '라이선스',
      dataIndex: 'license_id',
      key: 'license_id',
      width: 160,
      sorter: (a, b) => a.license_id.localeCompare(b.license_id),
      render: (id: string, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{id}</Text>
          {record.license_name && record.license_name !== id && (
            <Text type='secondary' style={{ fontSize: 12 }} ellipsis>
              {record.license_name}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '카테고리',
      dataIndex: 'license_category',
      key: 'license_category',
      width: 140,
      filters: Object.entries(LICENSE_CATEGORY_INFO).map(([key, info]) => ({
        text: `${info.icon} ${info.labelKo}`,
        value: key,
      })),
      onFilter: (value, record) => record.license_category === value,
      render: (category: LicenseCategory) => (
        <CategoryTag category={category} />
      ),
    },
    {
      title: '위험도',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 100,
      filters: (
        ['critical', 'high', 'medium', 'low'] as LicenseRiskLevel[]
      ).map(risk => ({
        text: LICENSE_RISK_LABELS[risk],
        value: risk,
      })),
      onFilter: (value, record) => record.risk_level === value,
      sorter: (a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a.risk_level] - order[b.risk_level];
      },
      render: (risk: LicenseRiskLevel) => <RiskTag risk={risk} />,
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: Object.entries(LICENSE_STATUS_LABELS).map(([key, label]) => ({
        text: label,
        value: key,
      })),
      onFilter: (value, record) => record.status === value,
      render: (status: LicenseStatus) => <StatusTag status={status} />,
    },
    {
      title: 'PURL',
      dataIndex: 'purl',
      key: 'purl',
      width: 180,
      ellipsis: true,
      render: (purl: string) => (
        <Tooltip title={purl}>
          <Text
            style={{ fontSize: 11, fontFamily: 'monospace' }}
            copyable
            ellipsis
          >
            {purl.length > 25 ? `${purl.slice(0, 25)}...` : purl}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: '검토자',
      dataIndex: 'reviewed_by',
      key: 'reviewed_by',
      width: 100,
      render: (reviewer: string | undefined, record) =>
        reviewer ? (
          <Tooltip
            title={`검토: ${record.reviewed_at ? new Date(record.reviewed_at).toLocaleString('ko-KR') : '-'}`}
          >
            <Text>{reviewer}</Text>
          </Tooltip>
        ) : (
          <Text type='secondary'>-</Text>
        ),
    },
    {
      title: '코멘트',
      dataIndex: 'comment',
      key: 'comment',
      width: 150,
      ellipsis: true,
      render: (comment: string | undefined) =>
        comment ? (
          <Tooltip title={comment}>
            <Text ellipsis style={{ maxWidth: 130 }}>
              {comment}
            </Text>
          </Tooltip>
        ) : (
          <Text type='secondary'>-</Text>
        ),
    },
    {
      title: '액션',
      key: 'action',
      width: 80,
      align: 'center',
      fixed: 'right',
      render: (_, record) =>
        onResolve ? (
          <Button
            type='text'
            size='small'
            icon={<EditOutlined />}
            onClick={() => openResolveModal(record)}
          >
            수정
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      {/* 필터 영역 */}
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }} size={12}>
        <Input
          placeholder='컴포넌트/라이선스 검색...'
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 220 }}
          allowClear
        />
        <Select
          value={categoryFilter}
          onChange={setCategoryFilter}
          style={{ width: 150 }}
        >
          <Option value='all'>모든 카테고리</Option>
          {Object.entries(LICENSE_CATEGORY_INFO).map(([key, info]) => (
            <Option key={key} value={key}>
              {info.icon} {info.labelKo}
            </Option>
          ))}
        </Select>
        <Select
          value={riskFilter}
          onChange={setRiskFilter}
          style={{ width: 120 }}
        >
          <Option value='all'>모든 위험도</Option>
          {(['critical', 'high', 'medium', 'low'] as LicenseRiskLevel[]).map(
            risk => (
              <Option key={risk} value={risk}>
                {LICENSE_RISK_LABELS[risk]}
              </Option>
            )
          )}
        </Select>
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 120 }}
        >
          <Option value='all'>모든 상태</Option>
          {Object.entries(LICENSE_STATUS_LABELS).map(([key, label]) => (
            <Option key={key} value={key}>
              {label}
            </Option>
          ))}
        </Select>
        <Badge count={filteredData.length} showZero color='#1890ff'>
          <Tag icon={<FilterOutlined />}>필터 결과</Tag>
        </Badge>
      </Space>

      {/* 테이블 */}
      <Table
        columns={columns}
        dataSource={filteredData}
        rowKey={record =>
          `${record.sbom_id}-${record.component_name}-${record.license_id}`
        }
        loading={loading}
        size='small'
        pagination={{
          pageSize,
          showSizeChanger: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} / 총 ${total}개`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        scroll={{ x: 1300 }}
        locale={{
          emptyText:
            searchText ||
            categoryFilter !== 'all' ||
            riskFilter !== 'all' ||
            statusFilter !== 'all'
              ? '검색 결과가 없습니다'
              : '라이선스 정보가 없습니다',
        }}
      />

      {/* 상태 변경 모달 */}
      <Modal
        title='라이선스 상태 변경'
        open={resolveModalVisible}
        onOk={handleResolve}
        onCancel={() => {
          setResolveModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={resolving}
        okText='저장'
        cancelText='취소'
      >
        {selectedItem && (
          <div style={{ marginBottom: 16 }}>
            <Space direction='vertical' size={4}>
              <Text strong>컴포넌트: {selectedItem.component_name}</Text>
              <Text>라이선스: {selectedItem.license_id}</Text>
              <Space>
                <CategoryTag category={selectedItem.license_category} />
                <RiskTag risk={selectedItem.risk_level} />
              </Space>
            </Space>
          </div>
        )}
        <Form form={form} layout='vertical'>
          <Form.Item
            name='status'
            label='상태'
            rules={[{ required: true, message: '상태를 선택해주세요' }]}
          >
            <Select>
              {Object.entries(LICENSE_STATUS_LABELS).map(([key, label]) => (
                <Option key={key} value={key}>
                  {label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name='comment' label='코멘트'>
            <TextArea rows={3} placeholder='검토 내용을 입력하세요...' />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LicenseCategoryTable;
