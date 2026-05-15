export type ThemeMode = "light" | "dark";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  provider: "password" | "google" | "demo";
};

export type FlatGroup = {
  id: string;
  name: string;
  inviteCode: string;
  members: string[];
  createdBy: string;
};

export type SplitMode = "even" | "ratio";

export type Expense = {
  id: string;
  amount: number;
  description: string;
  category: string;
  dueDate: string;
  paidBy: string;
  splitMode: SplitMode;
  splitRatio: Record<string, number>;
  createdAt: string;
};

export type Settlement = {
  id: string;
  from: string;
  to: string;
  amount: number;
  note: string;
  createdAt: string;
};

export type TaskItem = {
  id: string;
  title: string;
  assignee: string;
  dueDate: string;
  done: boolean;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  message: string;
  createdAt: string;
};
