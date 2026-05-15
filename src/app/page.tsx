"use client";

import { useEffect, useMemo, useState } from "react";
import {
  firebaseEnabled,
  firebaseSignIn,
  firebaseSignInWithGoogle,
  firebaseSignOut,
  firebaseSignUp,
  subscribeAuth,
} from "@/lib/firebase";
import { useFlatStore } from "@/store/useFlatStore";
import type { AuthUser, SplitMode } from "@/lib/types";

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export default function Home() {
  const {
    theme,
    setTheme,
    users,
    currentUser,
    group,
    expenses,
    settlements,
    tasks,
    notifications,
    setRealtimeTick,
    loginDemo,
    upsertUser,
    logout,
    createGroup,
    joinGroup,
    addExpense,
    addSettlement,
    addTask,
    toggleTask,
    deleteTask,
    clearNotification,
    notify,
  } = useFlatStore();

  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [amount, setAmount] = useState("0");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Groceries");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [splitMode, setSplitMode] = useState<SplitMode>("even");
  const [ratio, setRatio] = useState("40,30,30");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDue, setTaskDue] = useState(new Date().toISOString().slice(0, 10));
  const [settleFrom, setSettleFrom] = useState("");
  const [settleTo, setSettleTo] = useState("");
  const [settleAmount, setSettleAmount] = useState("0");
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTimestamp(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const channel = new BroadcastChannel("flat-tracker-realtime");
    const unsub = useFlatStore.subscribe(() => {
      channel.postMessage({ at: Date.now() });
    });
    channel.onmessage = () => {
      useFlatStore.persist.rehydrate();
      setRealtimeTick();
    };
    return () => {
      unsub();
      channel.close();
    };
  }, [setRealtimeTick]);

  useEffect(() => {
    const unsub = subscribeAuth((user) => {
      if (!user) return;
      const mapped: AuthUser = {
        id: user.uid,
        email: user.email ?? "",
        name: user.displayName ?? user.email?.split("@")[0] ?? "Flatmate",
        provider: "password",
      };
      upsertUser(mapped);
    });
    return unsub;
  }, [upsertUser]);

  const memberMap = useMemo(() => {
    return new Map(users.map((user) => [user.id, user]));
  }, [users]);

  const activeMembers = useMemo(() => {
    if (!group) return [];
    return group.members.map((id) => memberMap.get(id)).filter(Boolean) as AuthUser[];
  }, [group, memberMap]);

  const balances = useMemo(() => {
    const ledger = new Map<string, number>();
    activeMembers.forEach((m) => ledger.set(m.id, 0));

    const applyShare = (expenseAmount: number, split: Record<string, number>, paidBy: string) => {
      for (const [member, memberShare] of Object.entries(split)) {
        ledger.set(member, (ledger.get(member) ?? 0) - memberShare);
      }
      ledger.set(paidBy, (ledger.get(paidBy) ?? 0) + expenseAmount);
    };

    for (const exp of expenses) {
      if (exp.splitMode === "ratio") {
        const ratioTotal = Object.values(exp.splitRatio).reduce((sum, value) => sum + value, 0);
        const ratioSplit: Record<string, number> = {};
        if (ratioTotal > 0) {
          for (const [member, value] of Object.entries(exp.splitRatio)) {
            ratioSplit[member] = (exp.amount * value) / ratioTotal;
          }
        }
        applyShare(exp.amount, ratioSplit, exp.paidBy);
      } else {
        const evenSplit: Record<string, number> = {};
        const each = activeMembers.length ? exp.amount / activeMembers.length : 0;
        activeMembers.forEach((member) => {
          evenSplit[member.id] = each;
        });
        applyShare(exp.amount, evenSplit, exp.paidBy);
      }
    }

    for (const payment of settlements) {
      ledger.set(payment.from, (ledger.get(payment.from) ?? 0) + payment.amount);
      ledger.set(payment.to, (ledger.get(payment.to) ?? 0) - payment.amount);
    }

    return Array.from(ledger.entries())
      .map(([memberId, total]) => ({ member: memberMap.get(memberId), total }))
      .filter((entry) => entry.member);
  }, [activeMembers, expenses, settlements, memberMap]);

  const totalSpent = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const upcomingBills = useMemo(
    () =>
      expenses
        .filter((expense) => new Date(expense.dueDate).getTime() >= currentTimestamp)
        .slice(0, 5),
    [currentTimestamp, expenses]
  );

  async function handleAuth(event: React.FormEvent) {
    event.preventDefault();
    if (!authEmail || !authPassword) {
      notify("Email and password are required");
      return;
    }

    try {
      if (firebaseEnabled) {
        if (authMode === "signup") {
          await firebaseSignUp(authEmail, authPassword);
        } else {
          await firebaseSignIn(authEmail, authPassword);
        }
      } else {
        loginDemo(authEmail, authName || undefined, "demo");
      }
    } catch {
      notify("Auth provider failed, signed into local demo mode.");
      loginDemo(authEmail, authName || undefined, "demo");
    }
  }

  async function handleGoogleLogin() {
    try {
      if (!firebaseEnabled) {
        loginDemo("google-user@demo.local", "Google Demo", "google");
        return;
      }
      const result = await firebaseSignInWithGoogle();
      const user = result.user;
      upsertUser({
        id: user.uid,
        email: user.email ?? "",
        name: user.displayName ?? "Google User",
        provider: "google",
      });
    } catch {
      notify("Google login failed");
    }
  }

  function handleCreateGroup() {
    if (!groupName.trim()) {
      notify("Group name is required");
      return;
    }
    createGroup(groupName.trim());
    setGroupName("");
  }

  function handleJoinGroup() {
    if (!joinGroup(inviteCode.trim())) {
      notify("Invalid invite code");
      return;
    }
    setInviteCode("");
  }

  function handleAddExpense(event: React.FormEvent) {
    event.preventDefault();
    if (!currentUser || !group) return;

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0 || !description.trim()) {
      notify("Valid amount and description are required");
      return;
    }

    const ratioValues = ratio
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);

    const splitRatio: Record<string, number> = {};
    if (splitMode === "ratio") {
      if (ratioValues.length !== activeMembers.length) {
        notify("Ratio count must match total active members");
        return;
      }
      activeMembers.forEach((member, index) => {
        splitRatio[member.id] = ratioValues[index] || 0;
      });
    }

    addExpense({
      amount: numericAmount,
      description: description.trim(),
      category,
      dueDate,
      paidBy: currentUser.id,
      splitMode,
      splitRatio,
    });

    setAmount("0");
    setDescription("");
  }

  function handleAddTask(event: React.FormEvent) {
    event.preventDefault();
    const assignee = taskAssignee || activeMembers[0]?.id || "";
    if (!taskTitle.trim() || !assignee) {
      notify("Task title and assignee are required");
      return;
    }
    addTask({ title: taskTitle.trim(), assignee, dueDate: taskDue });
    setTaskTitle("");
  }

  function handleSettle(event: React.FormEvent) {
    event.preventDefault();
    const from = settleFrom || activeMembers[0]?.id || "";
    const to = settleTo || activeMembers[1]?.id || activeMembers[0]?.id || "";
    const numericAmount = Number(settleAmount);
    if (!from || !to || from === to || numericAmount <= 0) {
      notify("Select valid from/to members and amount");
      return;
    }
    addSettlement({ from, to, amount: numericAmount, note: "UPI" });
    setSettleAmount("0");
  }

  async function handleSignOut() {
    await firebaseSignOut();
    logout();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:px-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Next-gen flatmate manager</p>
            <h1 className="text-2xl font-bold">FlatTracker Next</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
            </button>
            {currentUser && (
              <button className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white dark:bg-slate-200 dark:text-slate-900" onClick={handleSignOut}>
                Sign out
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">● Real-time updates enabled (multi-tab sync)</p>
      </header>

      {!currentUser ? (
        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">Authentication</h2>
            <p className="mt-1 text-sm text-slate-500">Email/password + Google social login. Firebase-ready with demo fallback.</p>
            <form className="mt-4 space-y-3" onSubmit={handleAuth}>
              {authMode === "signup" && (
                <input
                  className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                  placeholder="Full name"
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                />
              )}
              <input
                className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                type="email"
                placeholder="you@flatmate.app"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
              />
              <input
                className="w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
              />
              <div className="flex gap-2">
                <button className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white" type="submit">
                  {authMode === "signin" ? "Sign in" : "Sign up"}
                </button>
                <button className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" type="button" onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}>
                  {authMode === "signin" ? "Create" : "Have account"}
                </button>
              </div>
              <button className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" type="button" onClick={handleGoogleLogin}>
                Continue with Google
              </button>
            </form>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold">What&apos;s included in this scaffold?</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
              <li>Group creation/join via invite code</li>
              <li>Shared bills split by even or ratio</li>
              <li>Settle-up transactions and history</li>
              <li>Task/chore assignment and completion</li>
              <li>Responsive dashboard + theming + dark mode</li>
              <li>Zustand state manager with local persistence</li>
            </ul>
          </article>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total spent" value={money(totalSpent)} hint={`${expenses.length} bills`} />
            <MetricCard
              label="You are"
              value={money(balances.find((item) => item.member?.id === currentUser.id)?.total ?? 0)}
              hint="Positive = owed back"
            />
            <MetricCard label="Upcoming bills" value={String(upcomingBills.length)} hint="Due soon" />
            <MetricCard label="Open chores" value={String(tasks.filter((task) => !task.done).length)} hint="Pending tasks" />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-semibold">Flat / Group management</h2>
              <p className="mt-1 text-sm text-slate-500">Invite and join flatmates via code.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                  placeholder="New group name"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                />
                <button className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white" onClick={handleCreateGroup}>
                  Create group
                </button>
                <input
                  className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                  placeholder="Invite code"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                />
                <button className="rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700" onClick={handleJoinGroup}>
                  Join group
                </button>
              </div>
              {group && (
                <div className="mt-4 rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">
                  <p className="font-medium">{group.name}</p>
                  <p className="text-xs text-slate-500">Invite code: {group.inviteCode}</p>
                  <p className="text-xs text-slate-500">
                    Invite link: https://flat-tracker.app/join/{group.inviteCode}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">Members: {activeMembers.map((member) => member.name).join(", ")}</p>
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-semibold">Settle up</h2>
              <p className="mt-1 text-sm text-slate-500">Record money transfer between flatmates.</p>
              <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={handleSettle}>
                <select className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" value={settleFrom || activeMembers[0]?.id || ""} onChange={(event) => setSettleFrom(event.target.value)}>
                  {activeMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} pays
                    </option>
                  ))}
                </select>
                <select className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" value={settleTo || activeMembers[1]?.id || activeMembers[0]?.id || ""} onChange={(event) => setSettleTo(event.target.value)}>
                  {activeMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} receives
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                  type="number"
                  min="0"
                  value={settleAmount}
                  onChange={(event) => setSettleAmount(event.target.value)}
                  placeholder="Amount"
                />
                <button className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white" type="submit">
                  Record settlement
                </button>
              </form>
            </article>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-semibold">Add shared expense</h2>
              <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={handleAddExpense}>
                <input
                  className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Amount"
                />
                <input
                  className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Category"
                />
                <input
                  className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700 sm:col-span-2"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Description"
                />
                <input
                  className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
                <select className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" value={splitMode} onChange={(event) => setSplitMode(event.target.value as SplitMode)}>
                  <option value="even">Split evenly</option>
                  <option value="ratio">Split by ratio</option>
                </select>
                {splitMode === "ratio" && (
                  <input
                    className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700 sm:col-span-2"
                    value={ratio}
                    onChange={(event) => setRatio(event.target.value)}
                    placeholder="Ratio list e.g. 40,30,30"
                  />
                )}
                <button className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white sm:col-span-2" type="submit">
                  Add bill
                </button>
              </form>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-semibold">Task / chore board</h2>
              <form className="mt-3 grid gap-2 sm:grid-cols-3" onSubmit={handleAddTask}>
                <input
                  className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700 sm:col-span-2"
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                  placeholder="Task title"
                />
                <select className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700" value={taskAssignee || activeMembers[0]?.id || ""} onChange={(event) => setTaskAssignee(event.target.value)}>
                  {activeMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <input
                  className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
                  type="date"
                  value={taskDue}
                  onChange={(event) => setTaskDue(event.target.value)}
                />
                <button className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white sm:col-span-2" type="submit">
                  Create task
                </button>
              </form>

              <ul className="mt-3 space-y-2">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
                    <input checked={task.done} onChange={() => toggleTask(task.id)} type="checkbox" />
                    <div className="flex-1">
                      <p className={task.done ? "line-through opacity-60" : ""}>{task.title}</p>
                      <p className="text-xs text-slate-500">
                        {memberMap.get(task.assignee)?.name} · due {task.dueDate}
                      </p>
                    </div>
                    <button className="text-xs text-rose-500" onClick={() => deleteTask(task.id)}>
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-semibold">Balances and overview</h2>
              <div className="mt-3 space-y-2">
                {balances.map((balance) => (
                  <div key={balance.member?.id} className="rounded-xl bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">
                    <div className="flex justify-between">
                      <span>{balance.member?.name}</span>
                      <strong className={balance.total >= 0 ? "text-emerald-600" : "text-rose-500"}>{money(balance.total)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-lg font-semibold">Transactions & history</h2>
              <div className="mt-3 space-y-2 text-sm">
                {expenses.slice(0, 5).map((expense) => (
                  <div key={expense.id} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-xs text-slate-500">
                      {memberMap.get(expense.paidBy)?.name} paid {money(expense.amount)} · {expense.splitMode} split · due {expense.dueDate}
                    </p>
                  </div>
                ))}
                {settlements.slice(0, 5).map((settlement) => (
                  <div key={settlement.id} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <p className="font-medium">Settlement</p>
                    <p className="text-xs">
                      {memberMap.get(settlement.from)?.name} → {memberMap.get(settlement.to)?.name}: {money(settlement.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}

      {notifications.length > 0 && (
        <aside className="fixed bottom-3 right-3 z-50 flex w-[min(92vw,340px)] flex-col gap-2">
          {notifications.map((note) => (
            <button
              key={note.id}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
              onClick={() => clearNotification(note.id)}
            >
              {note.message}
            </button>
          ))}
        </aside>
      )}
    </main>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </article>
  );
}
