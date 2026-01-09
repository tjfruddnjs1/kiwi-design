import { awxApiClient } from './client';
import type { StandardApiResponse, SshHop } from './types';

/** AWX 요청 파라미터 타입 */
export interface AWXRequestParameters {
  hops?: SshHop[];
  lbHops?: SshHop[];
  playbook_to_run?: string;
  playbook_target_host?: string;
  ansible_become_pass?: string;
  server_id?: number;
  infra_id?: number;
  master_ip?: string;
  main_id?: number;
  lb_ip?: string;
  lb_password?: string;
  node_type?: string;
  awxTemplate?: number;
  bucket_name?: string;
  minio_endpoint?: string;
  minio_bucket_name?: string;
  storage_location?: string;
  backup_name?: string;
  namespace?: string;
  schedule?: string;
  retention?: string;
  access_key?: string;
  secret_key?: string;
  minio_port?: number;
  console_port?: number;
  images_to_delete?: string[];
}

export interface AWXRequest {
  action: string;
  parameters?: AWXRequestParameters;
}

// AWX API 클라이언트
export const awxApi = {
  // 호스트 추가
  addHost: async (
    hops: SshHop[],
    awxInventory: number,
    awxTemplate: number
  ): Promise<StandardApiResponse> => {
    return awxApiClient.post('/awx', {
      action: 'addHost',
      parameters: {
        hops: hops,
        awxInventory: awxInventory,
        awxTemplate: awxTemplate,
      },
    });
  },

  removeHost: async (awxHostId: number): Promise<StandardApiResponse> => {
    return awxApiClient.post('/awx', {
      action: 'removeHost',
      parameters: {
        awxHostId: awxHostId,
      },
    });
  },

  runPlaybook: async (
    parameters: AWXRequestParameters
  ): Promise<StandardApiResponse> => {
    /*
    parameters: {
      "hops": [],                              // (필수) 플레이북 실행 대상 호스트
      "lbHops": [],                            // (선택)
      "playbook_to_run": "init_k8s_master",    // (필수) 실행 시킬 플레이북
      "playbook_target_host": "0.0.0.0",       // (필수) 플레이북 실행 대상 호스트
      "ansible_become_pass": "password",       // (필수) 플레이북 실행 대상 호스트 ssh 비밀번호
      "lb_ip": "1.1.1.1"                       // (선택) 마스터 노드 설정 시 파라미터
      "node_type": "master,worker"             // (선택) 노드 상태 조회 시 파라미터 (master, worker, ha)
      "awxTemplate": awxTemplate               // (필수) 플레이북을 실행하는 계정의 AWX 템플릿 ID
    }
    */

    const hops = parameters.hops;
    const lb_ip = parameters.lbHops
      ? parameters.lbHops[parameters.lbHops.length - 1].host
      : '';
    const lb_password = parameters.lbHops
      ? parameters.lbHops[parameters.lbHops.length - 1].password
      : '';
    let target_host;
    let ansibleBecomePass;
    if (parameters.playbook_target_host === 'all') {
      target_host = 'all';
      ansibleBecomePass = '';
    } else {
      target_host = hops[hops.length - 1].host;
      ansibleBecomePass = hops[hops.length - 1].password;
    }

    return awxApiClient.post('/awx', {
      action: 'runPlaybook',
      parameters: {
        playbook_to_run: parameters.playbook_to_run,
        playbook_target_host: target_host,
        ansible_become_pass: ansibleBecomePass,
        server_id: parameters.server_id,
        infra_id: parameters.infra_id,
        master_ip: parameters.master_ip,
        main_id: parameters.main_id,
        lb_ip: lb_ip,
        lb_password: lb_password,
        node_type: parameters.node_type ? parameters.node_type : '',
        awxTemplate: parameters.awxTemplate,
        bucket_name: parameters.bucket_name ? parameters.bucket_name : '',
        minio_endpoint: parameters.minio_endpoint
          ? parameters.minio_endpoint
          : '',
        minio_bucket_name: parameters.minio_bucket_name
          ? parameters.minio_bucket_name
          : '',
        storage_location: parameters.storage_location
          ? parameters.storage_location
          : '',
        backup_name: parameters.backup_name ? parameters.backup_name : '',
        namespace: parameters.namespace ? parameters.namespace : '',
        backup_schedule: parameters.schedule ? parameters.schedule : '',
        backup_retention: parameters.retention ? parameters.retention : '',
        access_key: parameters.access_key,
        secret_key: parameters.secret_key,
        minio_port: parameters.minio_port,
        console_port: parameters.console_port,
        images_to_delete: parameters.images_to_delete,
      },
    });
  },
};
