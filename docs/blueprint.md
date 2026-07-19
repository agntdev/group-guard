# Telegram Group Guard — Bot specification

**Archetype:** community

**Voice:** professional and clear — write every user-facing message, button label, error, and empty state in this voice.

A moderation bot for Telegram groups that automates newcomer verification, spam detection, and admin actions (warn/mute/kick/ban) with transparent explanations, configurable thresholds, and action logging. Prioritizes fairness and transparency while reducing manual moderation workload.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Group owners
- Telegram community admins

## Success criteria

- Reduces manual moderation workload by 50% through automated spam detection and verification
- Achieves 95% user satisfaction with automated action explanations
- Maintains 100% admin exemption compliance

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Open admin dashboard or user help menu based on user role
- **I'm human** (button, actor: user, callback: verify:confirm) — Newcomer verification button
  - inputs: Telegram user ID
  - outputs: Verification status update
- **/warn @user** (command, actor: admin, command: /warn) — Issue warning to user with optional reason
- **/summary** (command, actor: admin, command: /summary) — Show daily moderation summary report

## Flows

### Newcomer Verification
_Trigger:_ User joins group

1. Send welcome message with verification button
2. Enforce message restrictions until verification
3. Remove user if verification timeout expires

_Data touched:_ Member, Verification

### Spam Moderation
_Trigger:_ Message posted in group

1. Check for new-account links
2. Detect duplicate messages
3. Monitor message flood patterns
4. Apply configured moderation actions
5. Post explanation message

_Data touched:_ SpamEvent, ActionLog

### Admin Configuration
_Trigger:_ /setauto or /setthreshold commands

1. Validate admin permissions
2. Update spam moderation thresholds
3. Store configuration changes

_Data touched:_ AdminSettings

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **Member** _(retention: persistent)_ — Telegram user in group with status tracking
  - fields: user_id, join_time, trust_status, verification_status
- **Verification** _(retention: session)_ — Newcomer verification state
  - fields: user_id, timeout_timer, verification_result
- **RuleSet** _(retention: persistent)_ — Configurable moderation rules
  - fields: welcome_message, rules_text, spam_thresholds
- **TrustList** _(retention: persistent)_ — Manually exempted users
  - fields: user_id, exemption_reason
- **SpamEvent** _(retention: persistent)_ — Detected spam instance
  - fields: user_id, spam_type, severity, timestamp
- **ActionLog** _(retention: persistent)_ — Moderation action history
  - fields: action_type, user_id, actor, reason, timestamp
- **AdminSettings** _(retention: persistent)_ — Moderation configuration
  - fields: verification_timeout, spam_response_rules, notification_preferences

## Integrations

- **Telegram** (required) — Bot API messaging and group moderation
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- /warn @user [reason]
- /mute @user [duration]
- /kick @user [reason]
- /ban @user [duration/reason]
- /trust add|remove @user
- /setwelcome "..."
- /setrules "..."
- /setauto <spam_type> <action>
- /setthreshold <spam_type> <value>
- /logs [last N]
- /summary [period]
- /stats [period]

## Notifications

- Admin alerts for automated actions
- Daily moderation summary reports
- Verification timeout notifications

## Permissions & privacy

- Never acts on admin users or pinned content
- Stores only essential moderation data
- Provides appeal information with automated actions

## Edge cases

- Multiple spam triggers on single message
- Verification timeout during bot downtime
- Admin and trusted user exemption conflicts
- Overlapping moderation actions from different triggers

## Required tests

- Verify newcomer verification flow with timeout handling
- Test spam detection thresholds and action sequences
- Validate admin command permissions and logging
- Confirm trust list exemptions work across all moderation types

## Assumptions

- Admins will configure spam thresholds appropriately for their community
- Users will read and follow posted rules
- Moderation actions will be appealed through admin contact handle
