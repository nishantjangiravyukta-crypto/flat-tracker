"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  AppNotification,
  AuthUser,
  Expense,
  FlatGroup,
  Settlement,
  TaskItem,
  ThemeMode,
} from "@/lib/types";

const today = new Date().toISOString().slice(0, 10);

const defaultUsers: AuthUser[] = [
  { id: "member-1", name: "Aarav", email: "aarav@flat.io", provider: "demo" },
  { id: "member-2", name: "Maya", email: "maya@flat.io", provider: "demo" },
  { id: "member-3", name: "Riya", email: "riya@flat.io", provider: "demo" },
];

const defaultGroup: FlatGroup = {
  id: "group-main",
  name: "Skyline Flat 5B",
  inviteCode: "SKY5B",
  members: defaultUsers.map((u) => u.id),
  createdBy: "member-1",
};

const defaultExpenses: Expense[] = [
  {
    id: "exp-1",
    amount: 3600,
    description: "Weekly groceries",
    category: "Groceries",
    dueDate: today,
    paidBy: "member-1",
    splitMode: "even",
    splitRatio: {},
    createdAt: new Date().toISOString(),
  },
  {
    id: "exp-2",
    amount: 1800,
    description: "Electricity bill",
    category: "Utilities",
    dueDate: today,
    paidBy: "member-2",
    splitMode: "ratio",
    splitRatio: { "member-1": 40, "member-2": 30, "member-3": 30 },
    createdAt: new Date().toISOString(),
  },
];

const defaultTasks: TaskItem[] = [
  {
    id: "task-1",
    title: "Take out trash",
    assignee: "member-3",
    dueDate: today,
    done: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "task-2",
    title: "Clean kitchen",
    assignee: "member-2",
    dueDate: today,
    done: true,
    createdAt: new Date().toISOString(),
  },
];

type FlatState = {
  theme: ThemeMode;
  realtimeTick: number;
  users: AuthUser[];
  currentUser: AuthUser | null;
  group: FlatGroup | null;
  expenses: Expense[];
  settlements: Settlement[];
  tasks: TaskItem[];
  notifications: AppNotification[];
  setTheme: (theme: ThemeMode) => void;
  setRealtimeTick: () => void;
  loginDemo: (email: string, name?: string, provider?: AuthUser["provider"]) => AuthUser;
  upsertUser: (user: AuthUser) => void;
  logout: () => void;
  createGroup: (name: string) => void;
  joinGroup: (inviteCode: string) => boolean;
  addExpense: (expense: Omit<Expense, "id" | "createdAt">) => void;
  addSettlement: (settlement: Omit<Settlement, "id" | "createdAt">) => void;
  addTask: (task: Omit<TaskItem, "id" | "createdAt" | "done">) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  notify: (message: string) => void;
  clearNotification: (id: string) => void;
};

export const useFlatStore = create<FlatState>()(
  persist(
    (set, get) => ({
      theme: "light",
      realtimeTick: Date.now(),
      users: defaultUsers,
      currentUser: null,
      group: defaultGroup,
      expenses: defaultExpenses,
      settlements: [],
      tasks: defaultTasks,
      notifications: [],
      setTheme: (theme) => set({ theme }),
      setRealtimeTick: () => set({ realtimeTick: Date.now() }),
      loginDemo: (email, name, provider = "demo") => {
        const existing = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        const user =
          existing ??
          ({
            id: `member-${crypto.randomUUID()}`,
            email,
            name: name || email.split("@")[0],
            provider,
          } satisfies AuthUser);

        if (!existing) {
          set((state) => ({ users: [...state.users, user] }));
        }

        if (get().group && !get().group?.members.includes(user.id)) {
          set((state) => ({
            group: state.group
              ? { ...state.group, members: [...state.group.members, user.id] }
              : state.group,
          }));
        }

        set({ currentUser: user });
        get().notify(`Signed in as ${user.name}`);
        return user;
      },
      upsertUser: (user) => {
        const users = get().users;
        const found = users.some((u) => u.id === user.id);
        set({
          users: found ? users.map((u) => (u.id === user.id ? user : u)) : [...users, user],
          currentUser: user,
        });
      },
      logout: () => set({ currentUser: null }),
      createGroup: (name) => {
        const current = get().currentUser;
        if (!current) return;
        const group: FlatGroup = {
          id: `group-${crypto.randomUUID()}`,
          name,
          inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
          members: [current.id],
          createdBy: current.id,
        };
        set({ group });
        get().notify(`Created group ${name}`);
      },
      joinGroup: (inviteCode) => {
        const { group, currentUser } = get();
        if (!group || !currentUser) return false;
        if (group.inviteCode.toUpperCase() !== inviteCode.toUpperCase()) return false;
        if (!group.members.includes(currentUser.id)) {
          set({ group: { ...group, members: [...group.members, currentUser.id] } });
        }
        get().notify(`Joined ${group.name}`);
        return true;
      },
      addExpense: (expense) => {
        set((state) => ({
          expenses: [
            {
              ...expense,
              id: `exp-${crypto.randomUUID()}`,
              createdAt: new Date().toISOString(),
            },
            ...state.expenses,
          ],
        }));
        get().notify(`Expense added: ${expense.description}`);
      },
      addSettlement: (settlement) => {
        set((state) => ({
          settlements: [
            {
              ...settlement,
              id: `set-${crypto.randomUUID()}`,
              createdAt: new Date().toISOString(),
            },
            ...state.settlements,
          ],
        }));
        get().notify("Settlement recorded");
      },
      addTask: (task) => {
        set((state) => ({
          tasks: [
            {
              ...task,
              id: `task-${crypto.randomUUID()}`,
              done: false,
              createdAt: new Date().toISOString(),
            },
            ...state.tasks,
          ],
        }));
        get().notify(`Task assigned: ${task.title}`);
      },
      toggleTask: (id) => {
        set((state) => ({ tasks: state.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)) }));
      },
      deleteTask: (id) => {
        set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) }));
      },
      notify: (message) =>
        set((state) => ({
          notifications: [
            {
              id: crypto.randomUUID(),
              message,
              createdAt: new Date().toISOString(),
            },
            ...state.notifications,
          ].slice(0, 6),
        })),
      clearNotification: (id) =>
        set((state) => ({ notifications: state.notifications.filter((note) => note.id !== id) })),
    }),
    {
      name: "flat-tracker-v3",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        users: state.users,
        currentUser: state.currentUser,
        group: state.group,
        expenses: state.expenses,
        settlements: state.settlements,
        tasks: state.tasks,
      }),
    }
  )
);
