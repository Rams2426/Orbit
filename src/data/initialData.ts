import { Task, TeamMember, Sprint, DocNote, TimeLog } from '../types';

export const initialTeamMembers: TeamMember[] = [
  {
    id: 'user_sarah',
    name: 'Sarah Chen',
    role: 'Engineering Lead',
    email: 'sarah.chen@kroma.internal',
    avatarUrl: '/src/assets/images/avatar_sarah_lead_1793431724598.jpg',
  },
  {
    id: 'user_marcus',
    name: 'Marcus Vance',
    role: 'Product Designer',
    email: 'marcus.vance@kroma.internal',
    avatarUrl: '/src/assets/images/avatar_marcus_designer_1793431725609.jpg',
  },
  {
    id: 'user_elena',
    name: 'Elena Rostova',
    role: 'Senior Frontend Dev',
    email: 'elena.rostova@kroma.internal',
    avatarUrl: '/src/assets/images/avatar_elena_dev_1793431727073.jpg',
  },
  {
    id: 'user_alex',
    name: 'Alex Rivera',
    role: 'Technical PM',
    email: 'alex.rivera@kroma.internal',
    avatarUrl: '/src/assets/images/avatar_alex_pm_1793431726949.jpg',
  },
];

export const initialSprints: Sprint[] = [
  {
    id: 'sprint_24',
    name: 'Sprint 24: Core Architecture & Edge Runtime',
    goal: 'Migrate session management to Edge KV and stabilize canvas render pipeline.',
    startDate: '2026-10-15',
    endDate: '2026-11-05',
    status: 'active',
  },
  {
    id: 'sprint_25',
    name: 'Sprint 25: Observability & Team Workflows',
    goal: 'Ship real-time distributed tracing, markdown workspace sync, and role permissions.',
    startDate: '2026-11-06',
    endDate: '2026-11-27',
    status: 'planning',
  },
];

export const initialTasks: Task[] = [
  {
    id: 'TASK-101',
    title: 'OAuth 2.0 Token Revocation Protocol',
    description: 'Implement distributed session invalidation across edge regions when a refresh token is revoked.',
    status: 'in_progress',
    priority: 'urgent',
    assigneeId: 'user_sarah',
    dueDate: '2026-11-02',
    tags: ['Security', 'Backend'],
    estimatedHours: 16,
    loggedHours: 11.5,
    subtasks: [
      { id: 'sub-1', title: 'Write token blacklisting logic in KV cache', completed: true },
      { id: 'sub-2', title: 'Add test suite for concurrent revocation', completed: true },
      { id: 'sub-3', title: 'Deploy security rules verification suite', completed: false },
    ],
    createdAt: '2026-10-16',
    sprintId: 'sprint_24',
  },
  {
    id: 'TASK-102',
    title: 'Dynamic Canvas Virtualization Pipeline',
    description: 'Render large data matrices with offscreen virtual DOM windowing to keep 60fps interaction during pan and zoom.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: 'user_elena',
    dueDate: '2026-11-04',
    tags: ['Frontend', 'Performance'],
    estimatedHours: 24,
    loggedHours: 18,
    subtasks: [
      { id: 'sub-4', title: 'Implement coordinate viewport intersection observer', completed: true },
      { id: 'sub-5', title: 'Benchmark 5,000 nodes scroll latency', completed: true },
      { id: 'sub-6', title: 'Add smooth pinch gesture interpolation', completed: false },
    ],
    createdAt: '2026-10-18',
    sprintId: 'sprint_24',
  },
  {
    id: 'TASK-103',
    title: 'Design System Color Tokens Sync',
    description: 'Standardize semantic design tokens across dark slate and light mode to prevent uncompensated low-contrast states.',
    status: 'done',
    priority: 'medium',
    assigneeId: 'user_marcus',
    dueDate: '2026-10-28',
    tags: ['Design', 'UI'],
    estimatedHours: 12,
    loggedHours: 10,
    subtasks: [
      { id: 'sub-7', title: 'Audit WCAG AA text contrast ratios across all buttons', completed: true },
      { id: 'sub-8', title: 'Export token JSON and generate CSS variables', completed: true },
    ],
    createdAt: '2026-10-17',
    sprintId: 'sprint_24',
  },
  {
    id: 'TASK-104',
    title: 'Distributed Webhook Retry Queue with Exponential Backoff',
    description: 'Design dead-letter routing and jittered exponential retry handler for 3rd-party webhook deliveries.',
    status: 'in_review',
    priority: 'high',
    assigneeId: 'user_sarah',
    dueDate: '2026-11-03',
    tags: ['Infrastructure', 'Reliability'],
    estimatedHours: 20,
    loggedHours: 19,
    subtasks: [
      { id: 'sub-9', title: 'Configurable jitter calculation formula', completed: true },
      { id: 'sub-10', title: 'SQS/Redis backplane fallback testing', completed: true },
      { id: 'sub-11', title: 'Peer review and staging rollout', completed: false },
    ],
    createdAt: '2026-10-19',
    sprintId: 'sprint_24',
  },
  {
    id: 'TASK-105',
    title: 'SOC-2 Audit Log Retention Pipeline',
    description: 'Automate immutable event stream archiving to cold storage with SHA-256 integrity verification.',
    status: 'backlog',
    priority: 'medium',
    assigneeId: 'user_alex',
    dueDate: '2026-11-12',
    tags: ['Compliance', 'Data'],
    estimatedHours: 18,
    loggedHours: 0,
    subtasks: [
      { id: 'sub-12', title: 'Define retention policy schema and partition keys', completed: false },
      { id: 'sub-13', title: 'Set up integrity verification checksum job', completed: false },
    ],
    createdAt: '2026-10-22',
    sprintId: 'sprint_25',
  },
  {
    id: 'TASK-106',
    title: 'Collaborative Markdown Real-time Cursor Indicators',
    description: 'Integrate lightweight cursor position broadcasting using operational transformation protocol for multi-user document edits.',
    status: 'backlog',
    priority: 'low',
    assigneeId: 'user_elena',
    dueDate: '2026-11-18',
    tags: ['Frontend', 'Realtime'],
    estimatedHours: 22,
    loggedHours: 2,
    subtasks: [
      { id: 'sub-14', title: 'Define caret index to viewport pixel coordinates converter', completed: false },
      { id: 'sub-15', title: 'Debounce presence heartbeat pings to 150ms', completed: false },
    ],
    createdAt: '2026-10-24',
    sprintId: 'sprint_25',
  },
  {
    id: 'TASK-107',
    title: 'Mobile Touch Navigation Audit',
    description: 'Enforce 44px touch targets on all interactive controls and verify mobile sticky cap under 15% viewport height.',
    status: 'done',
    priority: 'high',
    assigneeId: 'user_marcus',
    dueDate: '2026-10-30',
    tags: ['Mobile', 'QA'],
    estimatedHours: 8,
    loggedHours: 8.5,
    subtasks: [
      { id: 'sub-16', title: 'Measure bottom bar height across viewport dimensions', completed: true },
      { id: 'sub-17', title: 'Expand button tap areas without altering visual geometry', completed: true },
    ],
    createdAt: '2026-10-20',
    sprintId: 'sprint_24',
  },
];

export const initialDocNotes: DocNote[] = [
  {
    id: 'doc-1',
    title: 'Architecture RFC: Distributed Edge Session Store',
    category: 'architecture',
    updatedAt: '2026-10-29',
    tags: ['Security', 'Edge', 'RFC'],
    pinned: true,
    content: `# Architecture RFC: Distributed Edge Session Store

## Context & Motivation
As traffic scales across geographic regions, centralized authentication round-trips introduce a 90ms p99 latency overhead for read-heavy operations. This RFC outlines our transition to regional edge key-value caches with real-time revocation gossip.

## Architectural Requirements
- **Latency Budget**: Session resolution within 8ms at the edge.
- **Revocation Propagation**: Global invalidation within 450ms across all POP nodes.
- **Resilience**: Graceful fallback to secondary regional stores if primary fails.

## Data Schema
\`\`\`json
{
  "sessionId": "sess_89a0b1c2",
  "userId": "usr_4492",
  "issuedAt": 1793430000,
  "expiresAt": 1793516400,
  "roles": ["member", "deployer"]
}
\`\`\`

## Rollout Timeline
1. Dual-read validation against legacy auth cluster (Days 1–5).
2. Write-through cache priming (Days 6–8).
3. Primary traffic switchover with automated rollback circuit breaker.`,
  },
  {
    id: 'doc-2',
    title: 'Sprint 24 Retrospective & Velocity Analysis',
    category: 'retrospective',
    updatedAt: '2026-10-28',
    tags: ['Team', 'Retrospective', 'Process'],
    pinned: false,
    content: `# Sprint 24 Retrospective & Velocity Analysis

## Highlights
- Successfully completed design token refactoring ahead of schedule.
- Zero regression in automated test coverage across core routes.
- Average build times dropped from 38s to 14s after caching optimizations.

## Action Items
- **Documentation**: Finalize OpenAPI schemas for internal microservices.
- **Code Review**: Limit PR scope to under 400 lines for faster review cycles.
- **Observability**: Add distributed tracing tags to all webhook handlers.`,
  },
  {
    id: 'doc-3',
    title: 'Frontend Component Standards & Accessibility Rules',
    category: 'guidelines',
    updatedAt: '2026-10-25',
    tags: ['Frontend', 'Standards', 'WCAG'],
    pinned: true,
    content: `# Frontend Component Standards & Accessibility Rules

## 1. Zero-Pill & Metadata Cleanliness
- Informational tags and timestamps must be clean unboxed text separated by subtle typographic dots (\`·\`).
- Filter bars and segmented tabs are functional buttons with clear active states.

## 2. Tabular Numerals
- All metric tables, counters, and progress timers must specify \`font-variant-numeric: tabular-nums\` to prevent vertical jitter during updates.

## 3. Touch Targets & Focus
- Every interactive element must satisfy minimum 40px touch targets and have high-visibility \`focus-visible:ring-2\` states.`,
  },
];

export const initialTimeLogs: TimeLog[] = [
  {
    id: 'log-1',
    taskId: 'TASK-101',
    taskTitle: 'OAuth 2.0 Token Revocation Protocol',
    durationMinutes: 45,
    timestamp: '2026-10-30 14:15',
    notes: 'Benchmarked KV invalidation propagation time across 3 mock clusters.',
  },
  {
    id: 'log-2',
    taskId: 'TASK-102',
    taskTitle: 'Dynamic Canvas Virtualization Pipeline',
    durationMinutes: 50,
    timestamp: '2026-10-30 16:30',
    notes: 'Resolved viewport clipping jitter during high-velocity drag pans.',
  },
  {
    id: 'log-3',
    taskId: 'TASK-104',
    taskTitle: 'Distributed Webhook Retry Queue with Exponential Backoff',
    durationMinutes: 30,
    timestamp: '2026-10-31 09:10',
    notes: 'Unit tests for randomized jitter distribution.',
  },
];
