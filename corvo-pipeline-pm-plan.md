# Corvo Pipeline: Project Management Layer

**Owner:** Amsh
**For:** Raj (technical)
**Status:** Draft for review

-----

## 1. One-line summary

Add an assignment and task-management layer on top of the existing pipeline so a grant team can assign owners to grants and to specific compliance areas, break a grant into tasks, and track those tasks to completion. The difference from a generic tool like Asana is that tasks are generated from the grant lifecycle itself, deadlines are computed from federal reporting rules, and each task links to the actual deliverable Corvo can already draft.

## 2. Why now

Right now Corvo touches a customer hard at two moments: pre-award drafting, and each reporting deadline. In between, the product is quiet. A task layer turns Corvo into a daily-use surface for the whole grants team, which does three things for the business:

- Increases stickiness and reduces churn, because the system holds the team’s working state, not just documents.
- Supports the move upmarket. Agencies paying $3,500 to $10,000 a month have multiple people touching a grant. Single-user document tooling does not fit them. Multi-user workflow does.
- Creates a natural reason for seat expansion inside an account, including external subrecipient users.

## 3. Goals and non-goals

**Goals (v1):**

- Assign a person to a grant, and assign owners to compliance areas within a grant.
- Create, assign, and track tasks against a grant.
- Give each user a clear “what is mine and when is it due” view.
- Surface upcoming federal deadlines so nothing is missed.

**Non-goals (for now):**

- A full Gantt / dependency engine. Simple blocked-by relationships only in early versions.
- Time tracking, billing, or resource-load balancing.
- A general-purpose task tool unrelated to grants. Every task lives under a grant.
- Real-time multiplayer cursors. Standard refresh is fine to start.

## 4. The core idea: tasks are born from the grant

This is the part that matters most and the part worth getting right before any UI work.

In a generic tool, a task starts blank and a human types everything. In Corvo, a grant has known structure, so tasks can be generated automatically:

1. **At award**, the system instantiates a full compliance task plan for the entire period of performance, keyed to the program. A four-year PIDP award produces the quarterly SF-425 tasks, performance report tasks, Buy America / BABA checkpoints, DBE goal reviews, FFATA filing reminders, Single Audit reminders, and closeout tasks, each with the correct federal deadline already set.
1. **Deadlines are computed, not typed.** For example, the federal financial report is generally due 30 days after the end of each reporting period for interim reports, and 90 days after the period of performance ends for the final report. The engine derives those dates from the award terms instead of asking a human to fill them in.
1. **Each task links to the real deliverable.** “Complete Q1 SF-425” opens the pre-filled SF-425 that Corvo drafted. The task layer and the compliance engine are the same system, so a task is not a sticky note that says “do the form,” it is the form. This is the thing no horizontal PM tool can copy.
1. **Subrecipient monitoring fits naturally.** Tasks can be assigned to external subrecipient users, and their reporting status rolls up to the prime recipient in one place, which maps directly to the subrecipient monitoring scope Corvo already covers.

The first version does not need full auto-generation. But the data model should be designed so that auto-generation drops in cleanly later (see open questions).

## 5. Data model

Building on the existing pipeline. The Grant / Opportunity entity already exists; tasks hang off it.

|Entity                      |Purpose                                        |Key fields                                                                                                                                                                                                                                      |
|----------------------------|-----------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Task**                    |A unit of work under a grant                   |id, grant_id, title, description, status, priority, due_date, assignee_id, area, parent_task_id (for subtasks), source (manual / template / ai), deliverable_ref (optional link to a Corvo form or document), created_by, created_at, updated_at|
|**Grant Assignment**        |Who owns a grant or a compliance area within it|id, grant_id, user_id, role (grant_lead / area_owner), area (nullable, e.g. financial_reporting, buy_america, dbe, environmental)                                                                                                               |
|**Task Template (Playbook)**|A reusable set of tasks for a program          |id, program (e.g. PIDP, FTA 5307, Low-No), name, items                                                                                                                                                                                          |
|**Task Template Item**      |One task in a playbook with a relative due date|id, template_id, title, area, due_rule (e.g. “30 days after reporting period end”)                                                                                                                                                              |
|**Comment / Activity**      |Discussion and audit trail on a task           |id, task_id, user_id, body, created_at                                                                                                                                                                                                          |
|**Notification**            |A reminder or assignment alert                 |id, user_id, task_id, type, read, created_at                                                                                                                                                                                                    |

**Status enum:** `not_started`, `in_progress`, `blocked`, `in_review`, `submitted`, `done`. Note `submitted` is grant-specific (filed with the funding agency, awaiting acceptance) and is distinct from `done`.

**Two levels of assignment** to cover “assign individuals to portions of grants”:

- **Grant level:** one grant lead who owns the whole opportunity.
- **Area level:** an owner per compliance area. When an area owner is set, new tasks tagged with that area default to that owner. This is how a team divides a grant into portions without hand-assigning every task.
- **Task level:** any task can be reassigned individually, overriding the default.

## 6. Feature breakdown by phase

**Phase 1 (MVP):**

- Create / edit / delete tasks under a grant.
- Assign a grant lead and area owners.
- Assign tasks to users, set due date, priority, status.
- Board view (status columns) and list view per grant.
- A cross-grant “My Tasks” view for each user.
- Email notification on assignment and on approaching due date.

**Phase 2:**

- Task templates / playbooks per program, applied manually to a grant (“apply PIDP playbook”).
- Due dates computed from relative rules in the playbook.
- Calendar / deadline view across all grants.
- Subtasks and simple blocked-by relationships.
- In-app notification center.

**Phase 3 (the differentiator):**

- Auto-instantiate the playbook when a grant moves to Awarded.
- Link each task to the Corvo-drafted deliverable so completing a task means reviewing and submitting the real form.
- AI / Porter generates a task plan for non-standard awards by reading the NOFO or award terms.
- External subrecipient users with scoped access, plus a roll-up monitoring view for the prime.
- Team dashboard: overdue, due this week, by area, by owner.

## 7. Views and UX

- **Grant detail, Tasks tab:** board and list toggle, filter by area / assignee / status.
- **My Tasks:** the personal landing surface, sorted by due date, across every grant.
- **Calendar / Deadlines:** the safety net. Federal deadlines are the highest-stakes thing in the product, so a clear forward-looking deadline view is worth building early even in a simple form.
- **Team / Admin dashboard (Phase 3):** workload and risk at a glance.

Keep the board interaction familiar (status columns, drag to move, click to open) so there is no learning curve for anyone who has used Asana or Trello.

## 8. Permissions and roles

- **Admin:** manage members, all grants, all tasks.
- **Member:** see and work grants they are assigned to or that are org-visible; create and complete tasks.
- **External / Subrecipient (Phase 3):** scoped to only the tasks and grants explicitly shared with them. This needs care because these users belong to a different organization than the prime recipient.

## 9. Notifications

Start simple and reliable rather than clever:

- On assignment.
- On a configurable lead time before a due date (e.g. 7 days, 1 day).
- On status change to `blocked`.

Federal deadlines should get a stronger reminder cadence than ordinary tasks given the stakes.

## 10. Open questions for Raj

1. **Pipeline schema.** Can tasks attach directly to the existing Opportunity / Grant record, or do we need an intermediate entity? What does the current grant record actually store about program, award date, and period of performance, since the deadline engine depends on those fields existing?
1. **Auth and multi-tenancy.** Does our current auth model cleanly support external users from a different org (subrecipients) with scoped access, or is that a meaningful lift?
1. **Notification infrastructure.** Do we already have transactional email set up, and what would in-app notifications take?
1. **Build vs. embed.** My strong lean is build native, because the value is in tasks being wired to compliance data, and an embedded third-party board cannot do that. Do you see any reason to embed for v1 to move faster?
1. **Refresh model.** Is standard request / refresh fine for the board to start, or is there a reason to invest in live updates early?
1. **Playbook storage.** Where should the program playbooks live so non-engineers (me) can edit the task lists and due-date rules without a deploy?

## 11. Suggested sequencing

1. Confirm the grant schema can carry program, award date, and period of performance.
1. Ship the Task entity, assignment, board and list, and My Tasks (Phase 1).
1. Add the deadline / calendar view and email reminders.
1. Build one playbook end to end (PIDP is the obvious first, given the June 1 PIDP pool work) to prove out templates and computed due dates.
1. Wire tasks to Corvo-drafted deliverables, then layer in AI generation and subrecipient access.

The fastest path to something demo-worthy is Phase 1 plus a single real playbook, because that is the moment a prospect sees “I won the grant and Corvo already built my four-year compliance plan,” which is the story that closes the larger agency deals.