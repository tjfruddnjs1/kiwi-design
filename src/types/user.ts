export interface UserInfo {
  id: number;
  username: string;
  email: string;
  role: string;
}

export interface UserGroupInfo {
  id: number;
  name: string;
  description: string;
}

// User 타입 정의 (메인 User 타입)
export interface User {
  id: number;
  username: string;
  email: string;
  role?: string;
  displayName?: string;
  createdAt: string;
  updatedAt: string;
}
