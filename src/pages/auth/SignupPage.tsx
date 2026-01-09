import React from 'react';
import { Form, Input, Button, Card, message, Alert } from 'antd';
import {
  UserOutlined,
  LockOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

const SignupPage: React.FC = () => {
  const navigate = useNavigate();

  const onFinish = async (values: SignupFormData) => {
    try {
      // (2. 핵심) import한 authApi를 사용하여 signup 함수를 호출합니다.
      await api.auth.signup({
        email: values.email,
        password: values.password,
      });
      message.success(
        '회원가입이 완료되었습니다. 기관 초대를 받으면 시스템을 이용할 수 있습니다.'
      );
      navigate('/login'); // 회원가입 후 로그인 페이지로 이동
    } catch (error: unknown) {
      // API 에러와 일반 에러 모두 처리
      let errorMessage = '회원가입에 실패했습니다.';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response
          ?.data?.error === 'string'
      ) {
        errorMessage =
          (error as { response?: { data?: { error?: string } } }).response?.data
            ?.error || '회원가입에 실패했습니다.';
      }

      message.error(errorMessage);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f0f2f5',
      }}
    >
      <Card title='KIWI 회원가입' style={{ width: 400 }}>
        <Alert
          message='회원가입 안내'
          description={
            <div>
              <p>• 회원가입 후 바로 로그인할 수 있습니다.</p>
              <p>• 시스템 사용을 위해서는 기관 관리자의 초대가 필요합니다.</p>
              <p>• 초대를 받으면 알림을 통해 기관에 가입할 수 있습니다.</p>
            </div>
          }
          type='info'
          icon={<InfoCircleOutlined />}
          showIcon
          style={{ marginBottom: 24 }}
        />
        <Form name='signup' onFinish={onFinish} size='large'>
          <Form.Item
            name='email'
            rules={[
              {
                required: true,
                type: 'email',
                message: '올바른 이메일 형식을 입력해주세요!',
              },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder='사용할 이메일' />
          </Form.Item>
          <Form.Item
            name='password'
            rules={[
              { required: true, message: '비밀번호를 입력해주세요!' },
              { min: 8, message: '비밀번호는 최소 8자 이상이어야 합니다.' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder='비밀번호' />
          </Form.Item>
          <Form.Item
            name='confirm'
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: '비밀번호를 다시 한번 입력해주세요!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }

                  return Promise.reject(
                    new Error('비밀번호가 일치하지 않습니다!')
                  );
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder='비밀번호 확인'
            />
          </Form.Item>
          <Form.Item>
            <Button type='primary' htmlType='submit' style={{ width: '100%' }}>
              회원가입
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            이미 계정이 있으신가요? <Link to='/login'>로그인</Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default SignupPage;
