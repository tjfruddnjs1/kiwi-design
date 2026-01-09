import React from 'react';
import { Tabs, Table, ColumnProps } from 'antd';
import { ServerStatus } from '../../types/server';

const { TabPane } = Tabs;

interface Node {
  id: string;
  nodeType: string;
  ip: string;
  port: string;
  server_name?: string;
  join_command?: string;
  certificate_key?: string;
  last_checked?: string;
  status: ServerStatus;
  hops: string;
  updated_at?: string;
  ha?: string;
}

interface NodeTablesSectionProps {
  haNodes: Node[];
  masterNodes: Node[];
  workerNodes: Node[];
  nodeColumns: ColumnProps<Node>[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

const NodeTablesSection: React.FC<NodeTablesSectionProps> = ({
  haNodes,
  masterNodes,
  workerNodes,
  nodeColumns,
  activeTab,
  onTabChange,
}) => {
  return (
    <Tabs
      defaultActiveKey='ha'
      style={{ marginBottom: 16 }}
      onChange={onTabChange}
      activeKey={activeTab}
    >
      <TabPane tab='HA 노드' key='ha'>
        <Table
          columns={nodeColumns.filter(col => col.key !== 'server_name')}
          dataSource={haNodes}
          rowKey='id'
          pagination={false}
          size='small'
          className='infra-node-table'
          locale={{
            emptyText:
              'HA 노드가 없습니다. 설정 버튼을 클릭하여 노드를 추가해주세요.',
          }}
        />
      </TabPane>

      <TabPane tab='마스터 노드' key='master'>
        <Table
          columns={nodeColumns}
          dataSource={masterNodes}
          rowKey='id'
          pagination={false}
          size='small'
          className='infra-node-table'
          locale={{
            emptyText:
              '마스터 노드가 없습니다. 설정 버튼을 클릭하여 노드를 추가해주세요.',
          }}
        />
      </TabPane>

      <TabPane tab='워커 노드' key='worker'>
        <Table
          columns={nodeColumns}
          dataSource={workerNodes}
          rowKey='id'
          pagination={false}
          size='small'
          className='infra-node-table'
          locale={{
            emptyText:
              '워커 노드가 없습니다. 설정 버튼을 클릭하여 노드를 추가해주세요.',
          }}
        />
      </TabPane>
    </Tabs>
  );
};

export default NodeTablesSection;
