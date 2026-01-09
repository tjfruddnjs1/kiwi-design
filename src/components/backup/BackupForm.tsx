import React from 'react';
import { Form, Select, TimePicker, Radio, Button } from 'antd';

const { Option } = Select;

interface BackupFormProps {
  namespaces: string[];
  isFetchingNamespaces: boolean;
  onFetchNamespaces: () => void;
  scheduleType: 'daily' | 'weekly' | 'monthly';
  onScheduleTypeChange: (value: 'daily' | 'weekly' | 'monthly') => void;
}

const BackupForm: React.FC<BackupFormProps> = ({
  namespaces,
  isFetchingNamespaces,
  onFetchNamespaces,
  scheduleType,
  onScheduleTypeChange,
}) => {
  return (
    <div className='backup-form-content'>
      <Form.Item
        name='namespace'
        label={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>네임스페이스</span>
            <Button
              type='link'
              size='small'
              onClick={onFetchNamespaces}
              loading={isFetchingNamespaces}
              style={{ padding: 0, height: 'auto' }}
            >
              네임스페이스 가져오기
            </Button>
          </div>
        }
        rules={[
          { required: true, message: '백업할 네임스페이스를 선택해주세요' },
        ]}
      >
        <Select
          placeholder='네임스페이스 선택'
          size='large'
          loading={isFetchingNamespaces}
          notFoundContent={
            isFetchingNamespaces ? '로딩 중...' : '네임스페이스가 없습니다'
          }
        >
          {namespaces.map(namespace => (
            <Option key={namespace} value={namespace}>
              {namespace}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <div className='schedule-section'>
        <Form.Item
          name='scheduleType'
          label='백업 주기'
          rules={[{ required: true, message: '백업 주기를 선택해주세요' }]}
        >
          <Radio.Group
            onChange={e => onScheduleTypeChange(e.target.value)}
            size='large'
          >
            <Radio.Button value='daily'>매일</Radio.Button>
            <Radio.Button value='weekly'>매주</Radio.Button>
            <Radio.Button value='monthly'>매월</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name='time'
          label='백업 시간'
          rules={[{ required: true, message: '백업 시간을 선택해주세요' }]}
        >
          <TimePicker
            format='HH:mm'
            size='large'
            placeholder='백업 시작 시간 선택'
          />
        </Form.Item>

        {scheduleType === 'weekly' && (
          <Form.Item
            name='dayOfWeek'
            label='요일 선택'
            rules={[
              {
                required: scheduleType === 'weekly',
                message: '요일을 선택해주세요',
              },
            ]}
          >
            <Select size='large' placeholder='백업 요일 선택'>
              <Option value='0'>일요일</Option>
              <Option value='1'>월요일</Option>
              <Option value='2'>화요일</Option>
              <Option value='3'>수요일</Option>
              <Option value='4'>목요일</Option>
              <Option value='5'>금요일</Option>
              <Option value='6'>토요일</Option>
            </Select>
          </Form.Item>
        )}

        {scheduleType === 'monthly' && (
          <Form.Item
            name='dayOfMonth'
            label='날짜 선택'
            rules={[
              {
                required: scheduleType === 'monthly',
                message: '날짜를 선택해주세요',
              },
            ]}
          >
            <Select size='large' placeholder='백업 날짜 선택'>
              {Array.from({ length: 31 }, (_, i) => (
                <Option key={i + 1} value={i + 1}>
                  {i + 1}일
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}
      </div>

      <Form.Item
        name='retention'
        label='보관 기간'
        rules={[{ required: true, message: '보관 기간을 선택해주세요' }]}
      >
        <Select size='large' placeholder='백업 보관 기간 선택'>
          <Option value='7d'>7일</Option>
          <Option value='14d'>14일</Option>
          <Option value='30d'>30일</Option>
          <Option value='90d'>90일</Option>
          <Option value='180d'>180일</Option>
          <Option value='365d'>1년</Option>
        </Select>
      </Form.Item>
    </div>
  );
};

export default BackupForm;
