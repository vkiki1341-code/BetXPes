export type DepositRequest = {
  id: number;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export type WithdrawRequest = {
  id: number;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export type Database = {
  deposit_requests: DepositRequest[];
  withdraw_requests: WithdrawRequest[];
};
