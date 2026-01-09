import React, { useState, useRef, useEffect } from 'react';
import {
  FloatButton,
  Drawer,
  Input,
  Button,
  Avatar,
  Space,
  Typography,
  Card,
  List,
  Empty,
  Spin,
  Badge,
} from 'antd';
import {
  RobotOutlined,
  SendOutlined,
  ThunderboltOutlined,
  CloseOutlined,
  QuestionCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import {
  AIConversation,
  AIAction,
  mockAIConversations,
  getCriticalAIInsights,
} from '../../data/mockAIDevOpsData';

const { Text } = Typography;
const { TextArea } = Input;

interface AIAssistantProps {
  currentContext?: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  currentContext = 'dashboard',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] =
    useState<AIConversation[]>(mockAIConversations);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2); // AI에서 새로운 인사이트
  const inputRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 대화창이 열릴 때 스크롤을 맨 아래로
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, conversations]);

  // 열릴 때 미읽음 카운트 리셋
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsTyping(true);

    // 사용자 메시지 추가
    const newUserConversation: AIConversation = {
      id: `conv-${Date.now()}`,
      timestamp: '방금 전',
      userMessage,
      aiResponse: '',
      context: currentContext,
    };

    setConversations(prev => [...prev, newUserConversation]);

    // AI 응답 시뮬레이션 (실제로는 API 호출)
    setTimeout(() => {
      const aiResponse = generateAIResponse(userMessage);
      const updatedConversation: AIConversation = {
        ...newUserConversation,
        aiResponse: aiResponse.response,
        actions: aiResponse.actions,
        followUpQuestions: aiResponse.followUpQuestions,
      };

      setConversations(prev => [...prev.slice(0, -1), updatedConversation]);
      setIsTyping(false);
    }, 1500);
  };

  const generateAIResponse = (userMessage: string) => {
    const message = userMessage.toLowerCase();

    if (message.includes('테스트') || message.includes('test')) {
      return {
        response:
          '현재 테스트 환경에서 리소스 부족으로 인한 성능 저하가 발생하고 있습니다. 테스트 클러스터를 확장하거나 테스트 병렬화를 통해 개선할 수 있습니다.',
        actions: [
          {
            id: 'scale-test-env',
            title: '테스트 환경 확장',
            description: '테스트 클러스터 노드를 2개에서 4개로 확장',
            type: 'automated' as const,
            estimatedTime: '5분',
            riskLevel: 'low' as const,
            automationAvailable: true,
          },
        ],
        followUpQuestions: [
          '테스트 병렬화는 어떻게 구현하나요?',
          '테스트 커버리지를 개선하려면?',
        ],
      };
    }

    if (message.includes('배포') || message.includes('deploy')) {
      return {
        response:
          '현재 배포 성공률은 94.2%로 양호한 상태입니다. 자동화된 롤백 시스템과 단계별 검증이 잘 작동하고 있습니다.',
        followUpQuestions: [
          '배포 속도를 더 높이려면?',
          '롤백 시나리오는 어떻게 되나요?',
        ],
      };
    }

    if (message.includes('보안') || message.includes('security')) {
      return {
        response:
          '현재 2개의 Critical 취약점이 발견되었습니다. 모두 의존성 관련 문제로 자동 패치가 가능합니다.',
        actions: [
          {
            id: 'auto-security-patch',
            title: '자동 보안 패치',
            description: 'Critical 취약점에 대한 자동 패치 적용',
            type: 'automated' as const,
            estimatedTime: '15분',
            riskLevel: 'medium' as const,
            automationAvailable: true,
          },
        ],
        followUpQuestions: [
          '보안 스캔 주기를 조정하려면?',
          '제로데이 대응 절차는?',
        ],
      };
    }

    if (message.includes('비용') || message.includes('cost')) {
      return {
        response:
          '현재 월 $8,750의 인프라 비용이 발생하고 있으며, $2,100의 절약 기회가 있습니다. 주로 개발 환경 스케줄링과 Spot 인스턴스 활용을 통해 절약할 수 있습니다.',
        actions: [
          {
            id: 'cost-optimization',
            title: '비용 최적화 실행',
            description: '개발 환경 스케줄링 및 리소스 최적화',
            type: 'guided' as const,
            estimatedTime: '30분',
            riskLevel: 'low' as const,
            automationAvailable: true,
          },
        ],
        followUpQuestions: [
          'Spot 인스턴스 마이그레이션 방법은?',
          '비용 알림을 설정하려면?',
        ],
      };
    }

    // 기본 응답
    return {
      response:
        '현재 시스템 상태는 전반적으로 양호합니다. 구체적인 질문이나 특정 영역에 대해 문의주시면 더 정확한 분석과 제안을 드릴 수 있습니다.',
      followUpQuestions: [
        '시스템 헬스 체크를 실행하시겠습니까?',
        '최근 이슈들을 요약해 주세요',
      ],
    };
  };

  const handleQuickAction = (action: AIAction) => {
    // 실제 구현에서는 해당 액션을 실행

    // 성공 메시지 시뮬레이션
    const successConversation: AIConversation = {
      id: `conv-action-${Date.now()}`,
      timestamp: '방금 전',
      userMessage: `"${action.title}" 실행`,
      aiResponse: `${action.title}이(가) 성공적으로 실행되었습니다. ${action.estimatedTime} 소요되었습니다.`,
      context: currentContext,
    };

    setConversations(prev => [...prev, successConversation]);
  };

  const handleFollowUpQuestion = (question: string) => {
    setInputValue(question);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const criticalInsights = getCriticalAIInsights();

  return (
    <>
      {/* 플로팅 AI 어시스턴트 버튼 */}
      <Badge count={unreadCount} offset={[-5, 5]}>
        <FloatButton
          icon={<RobotOutlined />}
          type='primary'
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
            border: 'none',
            boxShadow: '0 6px 20px rgba(114, 46, 209, 0.3)',
          }}
          onClick={() => setIsOpen(true)}
          tooltip='AI 어시스턴트'
        />
      </Badge>

      {/* AI 어시스턴트 대화창 */}
      <Drawer
        title={
          <Space>
            <Avatar
              style={{
                background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
              }}
              icon={<RobotOutlined />}
            />
            <div>
              <Text strong>AI DevOps 어시스턴트</Text>
              <br />
              <Text type='secondary' style={{ fontSize: '12px' }}>
                실시간 분석 및 최적화 제안
              </Text>
            </div>
          </Space>
        }
        placement='right'
        closable={true}
        onClose={() => setIsOpen(false)}
        open={isOpen}
        width={420}
        styles={{
          body: {
            padding: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        closeIcon={<CloseOutlined />}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: '#fafafa',
          }}
        >
          {/* 중요 알림 섹션 */}
          {criticalInsights.length > 0 && (
            <Card
              size='small'
              style={{
                margin: '12px 16px 0 16px',
                border: '1px solid #ff4d4f',
                background: 'linear-gradient(135deg, #fff2f0 0%, #ffffff 100%)',
              }}
            >
              <Space
                direction='vertical'
                size='small'
                style={{ width: '100%' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ThunderboltOutlined style={{ color: '#ff4d4f' }} />
                  <Text strong style={{ color: '#ff4d4f' }}>
                    긴급 알림
                  </Text>
                </div>
                {criticalInsights.slice(0, 2).map(insight => (
                  <div key={insight.id} style={{ fontSize: '12px' }}>
                    <Text>{insight.title}</Text>
                  </div>
                ))}
              </Space>
            </Card>
          )}

          {/* 대화 영역 */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              paddingTop: criticalInsights.length > 0 ? '12px' : '16px',
            }}
          >
            {conversations.length === 0 ? (
              <Empty
                image={
                  <RobotOutlined style={{ fontSize: 48, color: '#722ed1' }} />
                }
                description={
                  <div>
                    <Text>안녕하세요! AI DevOps 어시스턴트입니다.</Text>
                    <br />
                    <Text type='secondary' style={{ fontSize: '12px' }}>
                      시스템 상태, 성능 최적화, 보안 등<br />
                      무엇이든 문의해 주세요.
                    </Text>
                  </div>
                }
              />
            ) : (
              <List
                dataSource={conversations}
                renderItem={conversation => (
                  <div style={{ marginBottom: 16 }}>
                    {/* 사용자 메시지 */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          background: '#1890ff',
                          color: 'white',
                          padding: '8px 12px',
                          borderRadius: '12px 12px 4px 12px',
                          maxWidth: '80%',
                        }}
                      >
                        <Text style={{ color: 'white' }}>
                          {conversation.userMessage}
                        </Text>
                      </div>
                    </div>

                    {/* AI 응답 */}
                    {conversation.aiResponse && (
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-start',
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                          }}
                        >
                          <Avatar
                            size='small'
                            style={{
                              background:
                                'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
                              marginTop: 4,
                            }}
                            icon={<RobotOutlined />}
                          />
                          <div
                            style={{
                              background: 'white',
                              border: '1px solid #e8e8e8',
                              padding: '8px 12px',
                              borderRadius: '12px 12px 12px 4px',
                              maxWidth: '80%',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            }}
                          >
                            <Text>{conversation.aiResponse}</Text>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 액션 버튼들 */}
                    {conversation.actions &&
                      conversation.actions.length > 0 && (
                        <div style={{ marginLeft: 36, marginBottom: 8 }}>
                          <Space
                            direction='vertical'
                            size='small'
                            style={{ width: '100%' }}
                          >
                            {conversation.actions.map(action => (
                              <Button
                                key={action.id}
                                size='small'
                                type={
                                  action.type === 'automated'
                                    ? 'primary'
                                    : 'default'
                                }
                                icon={<PlayCircleOutlined />}
                                onClick={() => handleQuickAction(action)}
                                style={{
                                  width: '100%',
                                  textAlign: 'left',
                                  height: 'auto',
                                  padding: '4px 12px',
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 500 }}>
                                    {action.title}
                                  </div>
                                  <div
                                    style={{ fontSize: '11px', opacity: 0.7 }}
                                  >
                                    {action.estimatedTime} • {action.riskLevel}{' '}
                                    위험
                                  </div>
                                </div>
                              </Button>
                            ))}
                          </Space>
                        </div>
                      )}

                    {/* 추천 질문들 */}
                    {conversation.followUpQuestions &&
                      conversation.followUpQuestions.length > 0 && (
                        <div style={{ marginLeft: 36, marginBottom: 8 }}>
                          <Text
                            type='secondary'
                            style={{
                              fontSize: '11px',
                              marginBottom: 4,
                              display: 'block',
                            }}
                          >
                            💡 추천 질문:
                          </Text>
                          <Space
                            direction='vertical'
                            size={4}
                            style={{ width: '100%' }}
                          >
                            {conversation.followUpQuestions.map(
                              (question, index) => (
                                <Button
                                  key={index}
                                  size='small'
                                  type='text'
                                  icon={<QuestionCircleOutlined />}
                                  onClick={() =>
                                    handleFollowUpQuestion(question)
                                  }
                                  style={{
                                    fontSize: '11px',
                                    height: 'auto',
                                    padding: '2px 8px',
                                    color: '#722ed1',
                                    textAlign: 'left',
                                    width: '100%',
                                  }}
                                >
                                  {question}
                                </Button>
                              )
                            )}
                          </Space>
                        </div>
                      )}

                    <div style={{ textAlign: 'right', marginTop: 4 }}>
                      <Text type='secondary' style={{ fontSize: '10px' }}>
                        {conversation.timestamp}
                      </Text>
                    </div>
                  </div>
                )}
              />
            )}

            {/* 타이핑 인디케이터 */}
            {isTyping && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 8,
                }}
              >
                <Avatar
                  size='small'
                  style={{
                    background:
                      'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
                  }}
                  icon={<RobotOutlined />}
                />
                <div
                  style={{
                    background: 'white',
                    border: '1px solid #e8e8e8',
                    padding: '8px 12px',
                    borderRadius: '12px 12px 12px 4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  <Spin size='small' />
                  <Text style={{ marginLeft: 8 }}>분석 중...</Text>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 입력 영역 */}
          <div
            style={{
              padding: '16px',
              background: 'white',
              borderTop: '1px solid #e8e8e8',
            }}
          >
            <Space.Compact style={{ width: '100%' }}>
              <TextArea
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder='AI에게 질문하세요... (예: 테스트 실패율이 왜 높아졌나요?)'
                autoSize={{ minRows: 1, maxRows: 3 }}
                onPressEnter={e => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
                style={{ resize: 'none' }}
              />
              <Button
                type='primary'
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                style={{
                  background:
                    'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
                  border: 'none',
                }}
              />
            </Space.Compact>
            <Text
              type='secondary'
              style={{ fontSize: '10px', marginTop: 4, display: 'block' }}
            >
              Shift + Enter로 줄바꿈, Enter로 전송
            </Text>
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default AIAssistant;
