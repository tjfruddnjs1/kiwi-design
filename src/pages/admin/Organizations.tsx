import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Card,
  Typography,
  Space,
  Row,
  Col,
  message,
  Table,
  Tag,
  Modal,
  Tooltip,
  Popconfirm,
  Form,
  Input,
  Select,
  Spin,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  SettingOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  ApartmentOutlined,
  SolutionOutlined,
  BankOutlined,
  CheckCircleOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import './Organizations.css';
import organizationApi, {
  OrganizationDTO,
  OrganizationRequest,
} from '../../lib/api/endpoints/organization';
import userApi, { UserDTO } from '../../lib/api/endpoints/user';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// 1. 기관 데이터 타입 정의 (백엔드 DTO 타입으로 변경)
// OrganizationItem 대신 OrganizationDTO를 사용하며, ownerUserId 대신 ownerEmail을 사용합니다.
type OrganizationItem = OrganizationDTO;

interface UserSelectionItem {
  id: number;
  email: string;
  name: string;
}

// 사용자 API 호출 함수 - Owner role 제외
const fetchUsersForSelection = async (): Promise<UserSelectionItem[]> => {
  try {
    // API 호출: StandardApiResponse<UserDTO[]> 타입의 응답을 받습니다.
    const response = await userApi.getAllUsers();

    if (response.success && response.data) {
      // DTO 데이터를 가져옵니다.
      const userList: UserDTO[] = response.data;

      // Owner role을 제외하고 Admin 또는 Manager만 필터링하여 UserSelectionItem으로 변환합니다.
      return userList
        .filter(user => user.role !== 'Admin') // Owner는 시스템 관리자이므로 기관 관리자로 선택 불가
        .map(user => ({
          id: user.id,
          email: user.email,
          name: user.name,
        }));
    } else {
      message.error(`관리자 목록 로드 실패: ${response.error || 'API 오류'}`);
      return [];
    }
  } catch {
    message.error('서버와의 통신에 실패했습니다.');
    return [];
  }
};

// 3. 필터 상태 타입
type FiltersState = {
  q: string; // 이름, 사업자 번호 검색을 위해 유지
  statuses: OrganizationItem['status'][];
  planTypes: OrganizationItem['planType'][];
};

const defaultFilters: FiltersState = {
  q: '',
  statuses: [],
  planTypes: [],
};

// 4. 상태 및 플랜 필터 옵션 (기존 유지)
const STATUS_OPTIONS = [
  { label: 'Active', value: 'Active' },
  { label: 'Pending', value: 'Pending' },
];

const PLAN_OPTIONS = [
  { label: 'Free', value: 'Free' },
  { label: 'Standard', value: 'Standard' },
  { label: 'Enterprise', value: 'Enterprise' },
];

// 5. 컴포넌트 시작
const OrganizationPage: React.FC = () => {
  // 상태 관리
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]); // 초기값 빈 배열
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);

  // 모달 상태
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentOrganization, setCurrentOrganization] =
    useState<OrganizationItem | null>(null);

  // --- API 연동 함수 ---

  // 데이터 로드 (GET ALL)
  const loadOrganizations = async () => {
    setIsLoading(true);
    try {
      const response = await organizationApi.getAllOrganizations();
      if (response.success && response.data) {
        setOrganizations(response.data);
      } else {
        message.error(
          `기관 목록 로드 실패: ${response.error || '알 수 없는 오류'}`
        );
        setOrganizations([]);
      }
    } catch {
      message.error('서버와의 통신에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadOrganizations();
  }, []);

  // 필터링된 데이터 계산 (기존 유지)
  const filteredOrganizations = useMemo(() => {
    const q = filters.q.trim().toLowerCase();

    return organizations.filter(org => {
      // 1. 검색어 필터링 (기관 이름, 사업자 등록 번호)
      const matchesQuery =
        !q ||
        org.name.toLowerCase().includes(q) ||
        (org.businessRegistrationNumber &&
          org.businessRegistrationNumber.toLowerCase().includes(q));

      // 2. 상태 필터링
      const matchesStatus =
        !filters.statuses.length || filters.statuses.includes(org.status);

      // 3. 플랜 유형 필터링
      const matchesPlan =
        !filters.planTypes.length || filters.planTypes.includes(org.planType);

      return matchesQuery && matchesStatus && matchesPlan;
    });
  }, [organizations, filters]);

  // CRUD 핸들러
  const handleCreate = () => {
    setCurrentOrganization(null);
    setIsModalVisible(true);
  };

  const handleEdit = (org: OrganizationItem) => {
    setCurrentOrganization(org);
    setIsModalVisible(true);
  };

  // 삭제 핸들러 (DELETE)
  const handleDelete = async (orgId: number) => {
    try {
      const response = await organizationApi.deleteOrganization(orgId);
      if (response.success) {
        setOrganizations(prev => prev.filter(org => org.id !== orgId));
        message.success(`기관 ID ${orgId}를 삭제했습니다.`);
      } else {
        message.error(`삭제 실패: ${response.error || '알 수 없는 오류'}`);
      }
    } catch {
      message.error('서버와의 통신에 실패했습니다.');
    }
  };

  // 모달 제출 핸들러 (CREATE/UPDATE)
  const handleModalSubmit = async (
    values: OrganizationRequest & { id?: number }
  ) => {
    try {
      let response;
      if (currentOrganization) {
        // 수정 (UPDATE)
        response = await organizationApi.updateOrganization(
          currentOrganization.id,
          values
        );
        if (response.success) {
          message.success(`${values.name} 기관 정보를 수정했습니다.`);
        }
      } else {
        // 생성 (CREATE)
        response = await organizationApi.createOrganization(values);
        if (response.success) {
          message.success(`${values.name} 기관을 새로 생성했습니다.`);
        }
      }

      if (response && response.success) {
        // 성공 시 목록 새로고침
        setIsModalVisible(false);
        await loadOrganizations();
      } else if (response) {
        message.error(`작업 실패: ${response.error || '알 수 없는 오류'}`);
      } else {
        message.error('요청 중 알 수 없는 오류가 발생했습니다.');
      }
    } catch {
      message.error('서버와의 통신에 실패했습니다.');
    }
  };

  // 상태에 따른 태그 색상 (기존 유지)
  const getStatusColor = (status: OrganizationItem['status']) => {
    switch (status) {
      case 'Active':
        return 'success';
      case 'Pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: '기관 이름',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '플랜 유형',
      dataIndex: 'planType',
      key: 'planType',
      render: (plan: OrganizationItem['planType']) => (
        <Tag
          color={
            plan === 'Enterprise'
              ? 'gold'
              : plan === 'Standard'
                ? 'blue'
                : 'default'
          }
        >
          {plan}
        </Tag>
      ),
    },
    {
      title: '관리자', // **소유자 -> 관리자로 변경**
      dataIndex: 'managerEmails',
      key: 'managerEmails',
      width: 250,
      render: (managerEmails: string[], record: OrganizationItem) => {
        const count = record.managerCount || 0;

        if (count === 0) {
          return <Text type='secondary'>관리자 없음</Text>;
        }

        // 최대 2명까지 표시, 나머지는 Tooltip으로
        const displayEmails = managerEmails.slice(0, 2);
        const remainingCount = count - displayEmails.length;

        return (
          <Space direction='vertical' size={2} style={{ width: '100%' }}>
            <Text strong style={{ fontSize: '12px', color: '#1890ff' }}>
              <SolutionOutlined /> 관리자 {count}명
            </Text>
            <Tooltip
              title={
                <div>
                  {managerEmails.map((email, idx) => (
                    <div key={idx} style={{ marginBottom: 4 }}>
                      • {email}
                    </div>
                  ))}
                </div>
              }
              placement='topLeft'
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}
              >
                {displayEmails.map((email, idx) => (
                  <Tag
                    key={idx}
                    color='blue'
                    style={{
                      maxWidth: '220px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'inline-block',
                    }}
                  >
                    {email}
                  </Tag>
                ))}
                {remainingCount > 0 && (
                  <Tag color='default'>+{remainingCount}명</Tag>
                )}
              </div>
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: '사업자 번호',
      dataIndex: 'businessRegistrationNumber',
      key: 'businessRegistrationNumber',
      render: (text: string | null) => text || '-',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: OrganizationItem['status']) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: '생성일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
      sorter: (a: OrganizationItem, b: OrganizationItem) =>
        dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: '작업',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: OrganizationItem) => (
        <Space size='small'>
          <Tooltip title='수정'>
            <Button
              size='small'
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title='삭제'>
            <Popconfirm
              title='기관을 삭제하시겠습니까?'
              description='이 작업은 되돌릴 수 없습니다. 관련된 모든 리소스가 삭제될 수 있습니다.'
              onConfirm={() => handleDelete(record.id)}
              okText='삭제'
              cancelText='취소'
              okButtonProps={{ danger: true }}
            >
              <Button size='small' danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 통계 계산
  const activeOrganizations = organizations.filter(
    org => org.status === 'Active'
  ).length;
  const enterprisePlan = organizations.filter(
    org => org.planType === 'Enterprise'
  ).length;
  const _totalManagers = organizations.reduce(
    (sum, org) => sum + (org.managerCount || 0),
    0
  );

  return (
    <div className='organizations-management management-page'>
      {/* 페이지 헤더 */}
      <Card className='page-header-card'>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space align='center'>
            <BankOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>
              기관 관리
            </Title>
          </Space>
          <Space className='header-actions' wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadOrganizations}
              loading={isLoading}
            >
              새로고침
            </Button>
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              새 기관 등록
            </Button>
          </Space>
        </div>
      </Card>

      {/* 통계 카드 */}
      <Row gutter={[16, 16]} className='stat-row' style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card size='small'>
            <Statistic
              title='전체 기관'
              value={organizations.length}
              suffix='개'
              prefix={<ApartmentOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size='small'>
            <Statistic
              title='활성 기관'
              value={activeOrganizations}
              suffix={`/ ${organizations.length}`}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size='small'>
            <Statistic
              title='Enterprise 플랜'
              value={enterprisePlan}
              suffix='개'
              prefix={<CrownOutlined style={{ color: '#faad14' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <ApartmentOutlined />
                <Title level={4} style={{ margin: 0 }}>
                  전체 기관 목록 ({filteredOrganizations.length}개)
                </Title>
              </Space>
            }
          >
            {/* 필터/검색 바 (기존 유지) */}
            <Card
              size='small'
              className='filter-card'
              style={{ marginBottom: 16 }}
            >
              <Space
                wrap
                align='center'
                size={[12, 12]}
                style={{ width: '100%' }}
              >
                <Input
                  allowClear
                  placeholder='기관 이름 또는 사업자 번호 검색'
                  value={filters.q}
                  onChange={e => setFilters({ ...filters, q: e.target.value })}
                  style={{ width: 280 }}
                />
                <Select
                  mode='multiple'
                  allowClear
                  placeholder='상태 필터'
                  value={filters.statuses}
                  options={STATUS_OPTIONS}
                  onChange={values =>
                    setFilters({ ...filters, statuses: values })
                  }
                  style={{ minWidth: 200 }}
                />
                <Select
                  mode='multiple'
                  allowClear
                  placeholder='플랜 유형 필터'
                  value={filters.planTypes}
                  options={PLAN_OPTIONS}
                  onChange={values =>
                    setFilters({ ...filters, planTypes: values })
                  }
                  style={{ minWidth: 200 }}
                />
                <Button
                  onClick={() => setFilters(defaultFilters)}
                  icon={<SettingOutlined />}
                >
                  필터 초기화
                </Button>
              </Space>
            </Card>

            {/* 기관 목록 테이블 */}
            <Table
              columns={columns}
              dataSource={filteredOrganizations}
              rowKey='id'
              loading={isLoading}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 1000 }}
            />
          </Card>
        </Col>
      </Row>

      {/* 기관 생성/수정 모달 */}
      <OrganizationFormModal
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onSubmit={handleModalSubmit}
        initialData={currentOrganization}
      />
    </div>
  );
};

export default OrganizationPage;

// --- 모달 컴포넌트 정의 ---

// OrganizationFormModalProps의 onSubmit 타입 및 initialData 타입을 OrganizationRequest와 OrganizationItem에 맞게 수정
interface OrganizationFormModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (values: OrganizationRequest) => void; // 제출 시 OrganizationRequest 타입만 전달
  initialData: OrganizationItem | null;
}

const OrganizationFormModal: React.FC<OrganizationFormModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  initialData,
}) => {
  const [form] = Form.useForm();
  const [ownerOptions, setOwnerOptions] = useState<UserSelectionItem[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // 사용자 목록 로드
  useEffect(() => {
    if (visible) {
      const loadOwnerOptions = async () => {
        setIsUsersLoading(true);
        // 수정된 fetchUsersForSelection 사용
        const users = await fetchUsersForSelection();
        setOwnerOptions(users);
        setIsUsersLoading(false);
      };
      loadOwnerOptions();
    }
  }, [visible]);

  // 폼 초기값 설정 (ownerOptions 로드 후 실행)
  useEffect(() => {
    if (!visible) {
      form.resetFields();
      return;
    }

    // ownerOptions가 로드되지 않았으면 대기
    if (isUsersLoading || ownerOptions.length === 0) {
      return;
    }

    if (initialData) {
      // 수정 모드: 기존 관리자 이메일을 ID로 변환
      const existingManagerIds = ownerOptions
        .filter(user => initialData.managerEmails?.includes(user.email))
        .map(user => user.id);

      form.setFieldsValue({
        id: initialData.id,
        name: initialData.name,
        status: initialData.status || 'Pending',
        planType: initialData.planType || 'Standard',
        managerUserIds: existingManagerIds, // 기존 관리자 ID 배열
        businessRegistrationNumber:
          initialData.businessRegistrationNumber || undefined,
        billingAddress: initialData.billingAddress || undefined,
      });
    } else {
      // 새로 생성 모드: 기본값
      form.setFieldsValue({
        name: '',
        status: 'Pending',
        planType: 'Standard',
        managerUserIds: [],
        businessRegistrationNumber: undefined,
        billingAddress: undefined,
      });
    }
  }, [visible, initialData, form, ownerOptions, isUsersLoading]);

  const onFinish = (values: any) => {
    const submitData: OrganizationRequest = {
      name: values.name,
      status: values.status,
      planType: values.planType,

      // Request에 맞게 필수 필드만 명시적으로 설정
      managerUserIds: values.managerUserIds || [], // 관리자 ID 배열
      businessRegistrationNumber: values.businessRegistrationNumber || null,
      billingAddress: values.billingAddress || null,
    };

    onSubmit(submitData);
  };

  return (
    <Modal
      title={initialData ? '기관 정보 수정' : '새 기관 등록'}
      visible={visible}
      onCancel={onCancel}
      footer={[
        <Button key='back' onClick={onCancel}>
          취소
        </Button>,
        <Button key='submit' type='primary' onClick={() => form.submit()}>
          {initialData ? '수정' : '등록'}
        </Button>,
      ]}
      destroyOnClose={true}
      width={500}
    >
      <Form form={form} layout='vertical' onFinish={onFinish}>
        <Form.Item
          name='name'
          label='기관 이름'
          rules={[{ required: true, message: '기관 이름을 입력하세요' }]}
        >
          <Input prefix={<ApartmentOutlined />} placeholder='예: Line World' />
        </Form.Item>

        <Form.Item
          name='managerUserIds'
          label='기관 관리자'
          rules={[
            {
              required: true,
              type: 'array',
              min: 1,
              message: '최소 1명 이상의 관리자를 선택하세요',
            },
          ]}
          tooltip='기관을 관리할 관리자를 선택하세요. 여러 명을 선택할 수 있습니다.'
        >
          <Select
            mode='multiple'
            placeholder={
              isUsersLoading
                ? '사용자 목록 로딩 중...'
                : '관리자 선택 (다중 선택 가능)'
            }
            notFoundContent={
              isUsersLoading ? (
                <Spin size='small' />
              ) : (
                '선택 가능한 사용자가 없습니다.'
              )
            }
            showSearch
            optionFilterProp='children'
            filterOption={(input, option) =>
              (option?.children as unknown as string)
                ?.toLowerCase()
                .includes(input.toLowerCase())
            }
          >
            {ownerOptions.map(user => (
              <Option key={user.id} value={user.id}>
                {`${user.email}`}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name='businessRegistrationNumber'
              label='사업자 등록 번호'
            >
              <Input
                prefix={<SolutionOutlined />}
                placeholder='예: 123-45-67890 (선택 사항)'
              />
            </Form.Item>
          </Col>
          <Col span={12}>{/* 빈 공간 또는 다른 필드 추가 가능 */}</Col>
        </Row>

        <Form.Item name='billingAddress' label='청구 주소'>
          <TextArea
            rows={2}
            placeholder='예: 서울시 강남구 테헤란로 123 (선택 사항)'
          />
        </Form.Item>

        <Form.Item
          name='planType'
          label='서비스 플랜'
          rules={[{ required: true, message: '플랜 유형을 선택하세요' }]}
        >
          <Select placeholder='플랜 선택'>
            {PLAN_OPTIONS.map(opt => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name='status'
          label='기관 상태'
          rules={[{ required: true, message: '상태를 선택하세요' }]}
        >
          {/* 생성 시에는 기본값(Pending)을 사용하고, 수정 시에만 변경 가능하도록 처리했습니다. */}
          <Select placeholder='상태 선택' disabled={!initialData}>
            {STATUS_OPTIONS.map(opt => (
              <Option key={opt.value} value={opt.value}>
                {opt.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        {initialData && (
          <Form.Item label='생성일시/최종 수정일시'>
            <Text type='secondary'>
              생성: {dayjs(initialData.createdAt).format('YYYY-MM-DD HH:mm:ss')}{' '}
              / 수정:{' '}
              {dayjs(initialData.lastModified).format('YYYY-MM-DD HH:mm:ss')}
            </Text>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};
