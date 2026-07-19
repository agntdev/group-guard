// Persistent storage for durable domain data (members, rules, logs, etc.).
// Uses Redis in production (REDIS_URL), in-memory otherwise.
// Must be initialized via initDurable() before use.

import type { StorageAdapter } from "grammy";
import { resolveSessionStorage } from "./toolkit/session/redis.js";

let storage: StorageAdapter<Record<string, unknown>> | null = null;

/**
 * Initialize (or re-initialize) the durable storage adapter.
 * Call once per bot instance (in makeBot for test isolation, at startup for prod).
 */
export function initDurable(): void {
  storage = resolveSessionStorage(undefined);
}

/** Get the storage adapter. Lazy-inits if initDurable() was not called yet. */
export function getStorage(): StorageAdapter<Record<string, unknown>> {
  if (!storage) initDurable();
  return storage!;
}

// ─── Typed helpers ──────────────────────────────────────────────────

export interface Member {
  userId: number;
  joinTime: number;
  trustStatus: "trusted" | "normal" | "flagged";
  verificationStatus: "pending" | "verified" | "expired";
}

export interface Verification {
  userId: number;
  expiresAt: number;
  result: "pending" | "verified" | "expired";
}

export interface SpamThresholds {
  linkCooldown: number;
  duplicateThreshold: number;
  floodThreshold: number;
  floodWindow: number;
}

export interface RuleSet {
  welcomeMessage: string;
  rulesText: string;
  spamThresholds: SpamThresholds;
}

export interface TrustEntry {
  userId: number;
  reason: string;
  addedAt: number;
}

export interface SpamEvent {
  userId: number;
  spamType: "new_account_link" | "duplicate" | "flood";
  severity: "low" | "medium" | "high";
  timestamp: number;
}

export interface ActionLogEntry {
  actionType: "warn" | "mute" | "kick" | "ban" | "verify" | "spam_detected";
  userId: number;
  actor: number;
  reason: string;
  timestamp: number;
}

export interface AdminSettings {
  verificationTimeout: number;
  autoActions: {
    newAccountLink: "warn" | "mute" | "kick" | "ban";
    duplicate: "warn" | "mute" | "kick" | "ban";
    flood: "warn" | "mute" | "kick" | "ban";
  };
  notifications: {
    adminAlerts: boolean;
    dailySummary: boolean;
  };
}

// ─── Storage key builders ───────────────────────────────────────────

export function memberKey(userId: number): string {
  return `member:${userId}`;
}

export function groupMemberIdsKey(groupId: number): string {
  return `group:memberIds:${groupId}`;
}

export function rulesKey(groupId: number): string {
  return `rules:${groupId}`;
}

export function trustKey(groupId: number, userId: number): string {
  return `trust:${groupId}:${userId}`;
}

export function groupTrustIdsKey(groupId: number): string {
  return `group:trustIds:${groupId}`;
}

export function spamKey(groupId: number, key: string): string {
  return `spam:${groupId}:${key}`;
}

export function groupSpamKeysKey(groupId: number): string {
  return `group:spamKeys:${groupId}`;
}

export function logKey(groupId: number, key: string): string {
  return `log:${groupId}:${key}`;
}

export function groupLogKeysKey(groupId: number): string {
  return `group:logKeys:${groupId}`;
}

export function adminSettingsKey(groupId: number): string {
  return `admin:${groupId}`;
}

// ─── CRUD helpers ───────────────────────────────────────────────────

export async function getMember(userId: number): Promise<Member | undefined> {
  const s = getStorage();
  return (await s.read(memberKey(userId))) as Member | undefined;
}

export async function setMember(member: Member): Promise<void> {
  const s = getStorage();
  await s.write(memberKey(member.userId), member as unknown as Record<string, unknown>);
}

export async function getGroupMemberIds(groupId: number): Promise<number[]> {
  const s = getStorage();
  const data = await s.read(groupMemberIdsKey(groupId));
  return (data as unknown as number[]) ?? [];
}

export async function addGroupMember(groupId: number, userId: number): Promise<void> {
  const ids = await getGroupMemberIds(groupId);
  if (!ids.includes(userId)) {
    ids.push(userId);
    const s = getStorage();
    await s.write(groupMemberIdsKey(groupId), ids as unknown as Record<string, unknown>);
  }
}

export async function getRules(groupId: number): Promise<RuleSet | undefined> {
  const s = getStorage();
  return (await s.read(rulesKey(groupId))) as RuleSet | undefined;
}

export async function setRules(groupId: number, rules: RuleSet): Promise<void> {
  const s = getStorage();
  await s.write(rulesKey(groupId), rules as unknown as Record<string, unknown>);
}

export async function getTrust(groupId: number, userId: number): Promise<TrustEntry | undefined> {
  const s = getStorage();
  return (await s.read(trustKey(groupId, userId))) as TrustEntry | undefined;
}

export async function setTrust(groupId: number, entry: TrustEntry): Promise<void> {
  const s = getStorage();
  await s.write(trustKey(groupId, entry.userId), entry as unknown as Record<string, unknown>);
  const ids = await getGroupTrustIds(groupId);
  if (!ids.includes(entry.userId)) {
    ids.push(entry.userId);
    await s.write(groupTrustIdsKey(groupId), ids as unknown as Record<string, unknown>);
  }
}

export async function removeTrust(groupId: number, userId: number): Promise<void> {
  const s = getStorage();
  await s.delete(trustKey(groupId, userId));
  const ids = await getGroupTrustIds(groupId);
  const filtered = ids.filter((id) => id !== userId);
  await s.write(groupTrustIdsKey(groupId), filtered as unknown as Record<string, unknown>);
}

export async function getGroupTrustIds(groupId: number): Promise<number[]> {
  const s = getStorage();
  const data = await s.read(groupTrustIdsKey(groupId));
  return (data as unknown as number[]) ?? [];
}

export async function addSpamEvent(groupId: number, event: SpamEvent): Promise<void> {
  const s = getStorage();
  const key = `${event.timestamp}:${event.userId}`;
  await s.write(spamKey(groupId, key), event as unknown as Record<string, unknown>);
  const ids = await getGroupSpamKeys(groupId);
  ids.push(key);
  await s.write(groupSpamKeysKey(groupId), ids as unknown as Record<string, unknown>);
}

export async function getGroupSpamKeys(groupId: number): Promise<string[]> {
  const s = getStorage();
  const data = await s.read(groupSpamKeysKey(groupId));
  return (data as unknown as string[]) ?? [];
}

export async function addActionLog(groupId: number, entry: ActionLogEntry): Promise<void> {
  const s = getStorage();
  const key = `${entry.timestamp}`;
  await s.write(logKey(groupId, key), entry as unknown as Record<string, unknown>);
  const ids = await getGroupLogKeys(groupId);
  ids.push(key);
  await s.write(groupLogKeysKey(groupId), ids as unknown as Record<string, unknown>);
}

export async function getGroupLogKeys(groupId: number): Promise<string[]> {
  const s = getStorage();
  const data = await s.read(groupLogKeysKey(groupId));
  return (data as unknown as string[]) ?? [];
}

export async function getActionLog(groupId: number, key: string): Promise<ActionLogEntry | undefined> {
  const s = getStorage();
  return (await s.read(logKey(groupId, key))) as ActionLogEntry | undefined;
}

export async function getAdminSettings(groupId: number): Promise<AdminSettings | undefined> {
  const s = getStorage();
  return (await s.read(adminSettingsKey(groupId))) as AdminSettings | undefined;
}

export async function setAdminSettings(groupId: number, settings: AdminSettings): Promise<void> {
  const s = getStorage();
  await s.write(adminSettingsKey(groupId), settings as unknown as Record<string, unknown>);
}

export function defaultAdminSettings(): AdminSettings {
  return {
    verificationTimeout: 10 * 60 * 1000, // 10 minutes
    autoActions: {
      newAccountLink: "warn",
      duplicate: "warn",
      flood: "mute",
    },
    notifications: {
      adminAlerts: true,
      dailySummary: true,
    },
  };
}

export function defaultRuleSet(): RuleSet {
  return {
    welcomeMessage: "Welcome to the group! Please verify you're human.",
    rulesText: "Be respectful. No spam. No links from new accounts.",
    spamThresholds: {
      linkCooldown: 60 * 1000,
      duplicateThreshold: 3,
      floodThreshold: 5,
      floodWindow: 10 * 1000,
    },
  };
}
