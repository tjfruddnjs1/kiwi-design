import React from 'react';
import { Form, Input, Divider } from 'antd';
import { CloudServerOutlined } from '@ant-design/icons';

// hops 정보의 타입을 정의합니다.
export interface Hop {
  host: string;
  port: number;
  username?: string; // username은 선택적일 수 있습니다.
}

interface AuthFieldsProps {
  hops: Hop[];
  namePrefix: string; //  namePrefix prop 추가
}

const AuthFields: React.FC<AuthFieldsProps> = ({ hops, namePrefix }) => {
  if (!hops || hops.length === 0) {
    return null; // hops 정보가 없으면 아무것도 렌더링하지 않습니다.
  }

  return (
    <>
      <Divider orientation='left' plain>
        <CloudServerOutlined /> 서버 접속 정보 (SSH)
      </Divider>
      {hops.map((hop, index) => (
        <div
          key={index}
          style={{
            marginBottom: '16px',
            padding: '12px',
            border: '1px solid #f0f0f0',
            borderRadius: '4px',
          }}
        >
          <p
            style={{
              fontWeight: 500,
              margin: '-12px -12px 12px -12px',
              padding: '8px 12px',
              background: '#fafafa',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            {`Hop ${index + 1}: ${hop.host}:${hop.port}`}
            {index === hops.length - 1 && ' (최종 목적지)'}
          </p>
          <Form.Item
            //  name 앞에 namePrefix를 붙여줍니다. (예: "minio_ssh_username_0")
            name={`${namePrefix}_ssh_username_${index}`}
            label={`사용자 이름`}
            rules={[{ required: true, message: '...' }]}
            initialValue={hop.username || ''}
          >
            <Input /* ... */ />
          </Form.Item>
          <Form.Item
            //  name 앞에 namePrefix를 붙여줍니다. (예: "minio_ssh_password_0")
            name={`${namePrefix}_ssh_password_${index}`}
            label={`비밀번호`}
            rules={[{ required: true, message: '...' }]}
          >
            <Input.Password /* ... */ />
          </Form.Item>
        </div>
      ))}
    </>
  );
};

export default AuthFields;
