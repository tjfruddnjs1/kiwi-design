import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Spin, List, Button, Typography, Result, Card } from 'antd';
import {
  HddOutlined,
  CloudServerOutlined,
  PlusOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { infraApi } from '../../lib/api';
import type { Infrastructure, InfraItem } from '../../types';
import { useAuth } from '../../context/AuthContext';

const { Text } = Typography;
const { confirm } = Modal;

interface InfraSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (infraId: number, infraName: string) => void;
  title?: string;
  currentInfraName?: string; //  현재 인프라 이름 (변경 확인 메시지용)
}

const InfraSelectorModal: React.FC<InfraSelectorModalProps> = ({
  visible,
  onClose,
  onSelect,
  title = '인프라 선택',
  currentInfraName,
}) => {
  const [loading, setLoading] = useState(false);
  const [infras, setInfras] = useState<Infrastructure[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchInfras = useCallback(async () => {
    if (!visible) return;

    setLoading(true);
    setError(null);
    try {
      const response = await infraApi.getInfrasByUserId(user.id);
      if (response.success && Array.isArray(response.data)) {
        // 'docker', 'podman', 'kubernetes' 타입만 필터링
        const filteredInfras = response.data.filter(infra =>
          ['docker', 'podman', 'kubernetes'].includes(infra.type.toLowerCase())
        ) as InfraItem[];
        setInfras(filteredInfras);
      } else {
        window.alert(
          '서비스 인프라가 등록되어 있지 않습니다.\n[인프라 서비스 설정]에서 인프라를 먼저 등록해주시기 바랍니다.'
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [visible]);

  useEffect(() => {
    fetchInfras();
  }, [fetchInfras]);

  const handleSelect = (infra: Infrastructure) => {
    //  인프라 변경 확인 모달 표시
    const confirmMessage = currentInfraName
      ? `현재 서비스의 인프라를 "${currentInfraName}"에서 "${infra.name}"으로 변경하시겠습니까?\n\n이 작업은 서비스의 배포 대상 인프라를 변경합니다.`
      : `이 서비스의 인프라를 "${infra.name}"으로 설정하시겠습니까?`;

    confirm({
      title: '인프라 변경 확인',
      icon: <ExclamationCircleOutlined />,
      content: confirmMessage,
      okText: '변경',
      cancelText: '취소',
      onOk: () => {
        onSelect(infra.id, infra.name);
        onClose();
      },
    });
  };

  const handleGoToCreate = () => {
    // 인프라 서비스 설정 페이지로 이동
    navigate('/runtimes');
    onClose();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size='large' />
          <p style={{ marginTop: '16px' }}>
            인프라 목록을 불러오는 중입니다...
          </p>
        </div>
      );
    }

    if (error) {
      return <Result status='error' title='오류 발생' subTitle={error} />;
    }

    if (infras.length === 0) {
      return (
        <Result
          icon={<HddOutlined />}
          title='사용 가능한 인프라가 없습니다.'
          subTitle='먼저 인프라 서비스 설정 페이지에서 사용할 인프라(Kubernetes, Docker 등)를 등록해주세요.'
          extra={
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={handleGoToCreate}
            >
              인프라 생성 페이지로 이동
            </Button>
          }
        />
      );
    }

    return (
      <List
        itemLayout='horizontal'
        dataSource={infras}
        renderItem={item => (
          <List.Item
            actions={[
              <Button
                key={`select-infra-${item.id}`}
                type='primary'
                onClick={() => handleSelect(item)}
              >
                선택
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={<Text strong>{item.name}</Text>}
              description={`타입: ${item.type.charAt(0).toUpperCase() + item.type.slice(1)} | 생성일: ${new Date(item.created_at).toLocaleDateString()}`}
            />
          </List.Item>
        )}
        style={{ maxHeight: '60vh', overflowY: 'auto' }}
      />
    );
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CloudServerOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
          <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{title}</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key='close' onClick={onClose}>
          취소
        </Button>,
      ]}
      width={800}
      destroyOnClose
    >
      <Card variant='borderless'>{renderContent()}</Card>
    </Modal>
  );
};

export default InfraSelectorModal;
