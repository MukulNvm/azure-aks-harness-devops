import { Router, type IRouter } from "express";
import {
  CreateUserBody,
  DeleteUserParams,
  GetUserParams,
  GetUserResponse,
  ListUsersResponse,
  ListUsersResponseItem,
  UpdateUserBody,
  UpdateUserParams,
  UpdateUserResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

interface ActivityEntry {
  timestamp: string;
  action: string;
  detail: string;
}

interface TeamUser {
  id: number;
  name: string;
  role: string;
  email: string;
  lastLogin: string | null;
  createdAt: string;
  activityLog: ActivityEntry[];
}

const MAX_ACTIVITY_ENTRIES = 50;

function normalizeRole(role: string | undefined): string {
  const normalized = role?.trim().toLowerCase();
  if (!normalized) return "developer";
  return normalized;
}

function pushActivity(user: TeamUser, action: string, detail: string): void {
  user.activityLog.unshift({
    timestamp: new Date().toISOString(),
    action,
    detail,
  });

  if (user.activityLog.length > MAX_ACTIVITY_ENTRIES) {
    user.activityLog.splice(MAX_ACTIVITY_ENTRIES);
  }
}

function parseTeamMembersFromJson(raw: string): Array<{ name: string; email: string; role: string }> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const record = item as Record<string, unknown>;
        const name = typeof record["name"] === "string" ? record["name"].trim() : "";
        const email = typeof record["email"] === "string" ? record["email"].trim() : "";
        const role = typeof record["role"] === "string" ? record["role"] : "developer";
        if (!name || !email) return null;
        return { name, email, role: normalizeRole(role) };
      })
      .filter((value): value is { name: string; email: string; role: string } => Boolean(value));
  } catch {
    return [];
  }
}

function parseTeamMembersFromCsv(raw: string): Array<{ name: string; email: string; role: string }> {
  // Format: Name|email|role,Name2|email2|role2
  return raw
    .split(/[;,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [nameRaw, emailRaw, roleRaw] = entry.split("|").map((part) => part?.trim() ?? "");
      if (!nameRaw || !emailRaw) {
        return null;
      }
      return {
        name: nameRaw,
        email: emailRaw,
        role: normalizeRole(roleRaw || "developer"),
      };
    })
    .filter((value): value is { name: string; email: string; role: string } => Boolean(value));
}

function getSeedUsers(): TeamUser[] {
  const ownerName =
    process.env.DASHBOARD_OWNER_NAME ??
    process.env.TEAM_OWNER_NAME ??
    process.env.PRIMARY_TEAM_MEMBER_NAME ??
    "Mukul Saini";
  const ownerEmail =
    process.env.DASHBOARD_OWNER_EMAIL ??
    process.env.TEAM_OWNER_EMAIL ??
    process.env.PRIMARY_TEAM_MEMBER_EMAIL ??
    "mukul.saini@local.team";
  const ownerRole = normalizeRole(
    process.env.DASHBOARD_OWNER_ROLE ?? process.env.TEAM_OWNER_ROLE ?? "admin",
  );

  const teamJson =
    process.env.DASHBOARD_TEAM_MEMBERS_JSON ?? process.env.TEAM_MEMBERS_JSON ?? "";
  const teamCsv = process.env.DASHBOARD_TEAM_MEMBERS ?? process.env.TEAM_MEMBERS ?? "";

  const configuredMembers = [
    ...parseTeamMembersFromJson(teamJson),
    ...parseTeamMembersFromCsv(teamCsv),
  ];

  const deduped = new Map<string, { name: string; email: string; role: string }>();
  const baseMembers = [
    {
      name: ownerName,
      email: ownerEmail,
      role: ownerRole,
    },
    ...configuredMembers,
  ];

  for (const member of baseMembers) {
    const emailKey = member.email.toLowerCase();
    if (!emailKey || deduped.has(emailKey)) continue;
    deduped.set(emailKey, {
      name: member.name,
      email: member.email,
      role: normalizeRole(member.role),
    });
  }

  const createdAt = new Date().toISOString();

  return Array.from(deduped.values()).map((member, index) => ({
    id: index + 1,
    name: member.name,
    role: member.role,
    email: member.email,
    lastLogin: null,
    createdAt,
    activityLog: [
      {
        timestamp: createdAt,
        action: "account_created",
        detail: index === 0 ? "Primary owner account initialized" : "Imported from team configuration",
      },
    ],
  }));
}

let users: TeamUser[] = getSeedUsers();
let nextUserId = users.reduce((max, user) => Math.max(max, user.id), 0) + 1;

function findUserById(id: number): TeamUser | undefined {
  return users.find((user) => user.id === id);
}

router.get("/users", (_req, res): void => {
  const list = users
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((user) => ({ id: user.id, name: user.name, role: user.role }));

  res.json(ListUsersResponse.parse(list));
});

router.post("/users", (req, res): void => {
  const body = CreateUserBody.parse(req.body);

  const newUser: TeamUser = {
    id: nextUserId,
    name: body.name,
    role: normalizeRole(body.role),
    email: body.email,
    lastLogin: null,
    createdAt: new Date().toISOString(),
    activityLog: [],
  };

  pushActivity(newUser, "account_created", "User created from dashboard");

  users.push(newUser);
  nextUserId += 1;

  res.status(201).json(
    ListUsersResponseItem.parse({
      id: newUser.id,
      name: newUser.name,
      role: newUser.role,
    }),
  );
});

router.get("/users/:id", (req, res): void => {
  const { id } = GetUserParams.parse(req.params);
  const user = findUserById(id);

  if (!user) {
    res.status(404).json({ error: `User ${id} not found` });
    return;
  }

  user.lastLogin = new Date().toISOString();
  pushActivity(user, "login", "User profile viewed in dashboard");

  res.json(GetUserResponse.parse(user));
});

router.put("/users/:id", (req, res): void => {
  const { id } = UpdateUserParams.parse(req.params);
  const updates = UpdateUserBody.parse(req.body);
  const user = findUserById(id);

  if (!user) {
    res.status(404).json({ error: `User ${id} not found` });
    return;
  }

  const changes: string[] = [];

  if (typeof updates.name === "string" && updates.name !== user.name) {
    changes.push(`name: ${user.name} -> ${updates.name}`);
    user.name = updates.name;
  }

  if (typeof updates.role === "string" && normalizeRole(updates.role) !== user.role) {
    const normalizedRole = normalizeRole(updates.role);
    changes.push(`role: ${user.role} -> ${normalizedRole}`);
    user.role = normalizedRole;
  }

  if (typeof updates.email === "string" && updates.email !== user.email) {
    changes.push(`email: ${user.email} -> ${updates.email}`);
    user.email = updates.email;
  }

  pushActivity(
    user,
    "config_change",
    changes.length > 0 ? `Profile updated (${changes.join(", ")})` : "Profile updated with no field changes",
  );

  res.json(
    UpdateUserResponse.parse({
      id: user.id,
      name: user.name,
      role: user.role,
    }),
  );
});

router.delete("/users/:id", (req, res): void => {
  const { id } = DeleteUserParams.parse(req.params);
  const index = users.findIndex((user) => user.id === id);

  if (index < 0) {
    res.status(404).json({ error: `User ${id} not found` });
    return;
  }

  users.splice(index, 1);
  res.status(204).send();
});

export default router;
