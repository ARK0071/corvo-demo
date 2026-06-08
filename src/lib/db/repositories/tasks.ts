import { prisma } from "../client";
import { Task as PrismaTask, Prisma } from "@/generated/prisma";

export type TaskStatus = "not_started" | "in_progress" | "blocked" | "in_review" | "submitted" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskSource = "manual" | "template" | "ai";
export type ComplianceArea =
  | "financial_reporting"
  | "buy_america"
  | "dbe"
  | "environmental"
  | "davis_bacon"
  | "ffata"
  | "single_audit"
  | "closeout"
  | "performance_reporting"
  | "subrecipient_monitoring"
  | "general";

export interface TaskWithRelations {
  id: string;
  portProfileId: string;
  awardId: string | null;
  pipelineGrantId: string | null;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeEmail: string | null;
  area: string | null;
  phase: string | null;
  parentTaskId: string | null;
  source: TaskSource;
  deliverableRef: string | null;
  deliverableType: string | null;
  deliverableId: string | null;
  sortOrder: number;
  createdBy: string | null;
  creatorName: string | null;
  createdAt: string;
  updatedAt: string;
  subtaskCount: number;
  subtasksDone: number;
  commentCount: number;
  awardTitle: string | null;
  awardProgram: string | null;
}

export interface CreateTaskInput {
  portProfileId: string;
  awardId?: string;
  pipelineGrantId?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string;
  dueDate?: string;
  assigneeId?: string;
  area?: string;
  phase?: string;
  parentTaskId?: string;
  source?: TaskSource;
  deliverableRef?: string;
  deliverableType?: string;
  deliverableId?: string;
  sortOrder?: number;
  createdBy?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string | null;
  dueDate?: string | null;
  assigneeId?: string | null;
  area?: string | null;
  phase?: string | null;
  sortOrder?: number;
  deliverableRef?: string | null;
  deliverableType?: string | null;
  deliverableId?: string | null;
}

export interface TaskFilters {
  portProfileId: string;
  awardId?: string;
  pipelineGrantId?: string;
  assigneeId?: string;
  status?: TaskStatus | TaskStatus[];
  area?: string;
  phase?: string;
  priority?: TaskPriority;
  parentTaskId?: string | null; // null = top-level only
  dueBefore?: string;
  dueAfter?: string;
  search?: string;
}

const taskInclude = {
  assignee: { select: { id: true, name: true, email: true } },
  creator: { select: { id: true, name: true } },
  award: { select: { id: true, title: true, program: true } },
  _count: { select: { subtasks: true, comments: true } },
} satisfies Prisma.TaskInclude;

type TaskWithIncludes = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

function toTaskWithRelations(t: TaskWithIncludes, subtasksDone?: number): TaskWithRelations {
  return {
    id: t.id,
    portProfileId: t.portProfileId,
    awardId: t.awardId,
    pipelineGrantId: t.pipelineGrantId,
    title: t.title,
    description: t.description,
    status: t.status as TaskStatus,
    priority: t.priority as TaskPriority,
    startDate: t.startDate?.toISOString().split("T")[0] ?? null,
    dueDate: t.dueDate?.toISOString().split("T")[0] ?? null,
    assigneeId: t.assigneeId,
    assigneeName: t.assignee?.name ?? null,
    assigneeEmail: t.assignee?.email ?? null,
    area: t.area,
    phase: t.phase,
    parentTaskId: t.parentTaskId,
    source: t.source as TaskSource,
    deliverableRef: t.deliverableRef,
    deliverableType: t.deliverableType,
    deliverableId: t.deliverableId,
    sortOrder: t.sortOrder,
    createdBy: t.createdBy,
    creatorName: t.creator?.name ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    subtaskCount: t._count.subtasks,
    subtasksDone: subtasksDone ?? 0,
    commentCount: t._count.comments,
    awardTitle: t.award?.title ?? null,
    awardProgram: t.award?.program ?? null,
  };
}

export async function listTasks(filters: TaskFilters): Promise<TaskWithRelations[]> {
  const where: Prisma.TaskWhereInput = {
    portProfileId: filters.portProfileId,
  };

  if (filters.awardId) where.awardId = filters.awardId;
  if (filters.pipelineGrantId) where.pipelineGrantId = filters.pipelineGrantId;
  if (filters.assigneeId) where.assigneeId = filters.assigneeId;
  if (filters.area) where.area = filters.area;
  if (filters.phase) where.phase = filters.phase;
  if (filters.priority) where.priority = filters.priority;

  if (filters.status) {
    where.status = Array.isArray(filters.status)
      ? { in: filters.status }
      : filters.status;
  }

  if (filters.parentTaskId !== undefined) {
    where.parentTaskId = filters.parentTaskId;
  }

  if (filters.dueBefore || filters.dueAfter) {
    where.dueDate = {};
    if (filters.dueBefore) where.dueDate.lte = new Date(filters.dueBefore);
    if (filters.dueAfter) where.dueDate.gte = new Date(filters.dueAfter);
  }

  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const tasks = await prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: [{ dueDate: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return tasks.map((t: TaskWithIncludes) => toTaskWithRelations(t));
}

export async function getMyTasks(
  userId: string,
  portProfileId: string,
  includeCompleted = false
): Promise<TaskWithRelations[]> {
  const statusFilter = includeCompleted
    ? undefined
    : { notIn: ["done" as const] };

  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      portProfileId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: taskInclude,
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
  });

  return tasks.map((t: TaskWithIncludes) => toTaskWithRelations(t));
}

export async function getTaskById(id: string): Promise<TaskWithRelations | null> {
  const task = await prisma.task.findUnique({
    where: { id },
    include: taskInclude,
  });

  if (!task) return null;

  // Count done subtasks
  const subtasksDone = await prisma.task.count({
    where: { parentTaskId: id, status: "done" },
  });

  return toTaskWithRelations(task, subtasksDone);
}

export async function createTask(input: CreateTaskInput): Promise<TaskWithRelations> {
  const task = await prisma.task.create({
    data: {
      portProfileId: input.portProfileId,
      awardId: input.awardId || null,
      pipelineGrantId: input.pipelineGrantId || null,
      title: input.title,
      description: input.description || "",
      status: input.status || "not_started",
      priority: input.priority || "medium",
      startDate: input.startDate ? new Date(input.startDate) : null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      assigneeId: input.assigneeId || null,
      area: input.area || null,
      phase: input.phase || null,
      parentTaskId: input.parentTaskId || null,
      source: input.source || "manual",
      deliverableRef: input.deliverableRef || null,
      deliverableType: input.deliverableType || null,
      deliverableId: input.deliverableId || null,
      sortOrder: input.sortOrder || 0,
      createdBy: input.createdBy || null,
    },
    include: taskInclude,
  });

  return toTaskWithRelations(task);
}

export async function updateTask(id: string, input: UpdateTaskInput): Promise<TaskWithRelations | null> {
  const data: Prisma.TaskUpdateInput = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.status !== undefined) data.status = input.status;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
  if (input.deliverableRef !== undefined) data.deliverableRef = input.deliverableRef;
  if (input.deliverableType !== undefined) data.deliverableType = input.deliverableType;
  if (input.deliverableId !== undefined) data.deliverableId = input.deliverableId;

  if (input.startDate !== undefined) {
    data.startDate = input.startDate ? new Date(input.startDate) : null;
  }
  if (input.dueDate !== undefined) {
    data.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  }
  if (input.assigneeId !== undefined) {
    data.assignee = input.assigneeId
      ? { connect: { id: input.assigneeId } }
      : { disconnect: true };
  }
  if (input.area !== undefined) {
    data.area = input.area;
  }
  if (input.phase !== undefined) {
    data.phase = input.phase;
  }

  const task = await prisma.task.update({
    where: { id },
    data,
    include: taskInclude,
  });

  return toTaskWithRelations(task);
}

export async function deleteTask(id: string): Promise<boolean> {
  await prisma.task.delete({ where: { id } });
  return true;
}

export async function getTasksByDueDate(
  portProfileId: string,
  startDate: string,
  endDate: string
): Promise<TaskWithRelations[]> {
  const tasks = await prisma.task.findMany({
    where: {
      portProfileId,
      OR: [
        { dueDate: { gte: new Date(startDate), lte: new Date(endDate) } },
        { startDate: { gte: new Date(startDate), lte: new Date(endDate) } },
      ],
      parentTaskId: null,
    },
    include: taskInclude,
    orderBy: [{ dueDate: "asc" }],
  });

  return tasks.map((t: TaskWithIncludes) => toTaskWithRelations(t));
}

export async function getOverdueTasks(portProfileId: string): Promise<TaskWithRelations[]> {
  const tasks = await prisma.task.findMany({
    where: {
      portProfileId,
      dueDate: { lt: new Date() },
      status: { notIn: ["done", "submitted"] },
      parentTaskId: null,
    },
    include: taskInclude,
    orderBy: [{ dueDate: "asc" }],
  });

  return tasks.map((t: TaskWithIncludes) => toTaskWithRelations(t));
}

export async function getTaskStats(portProfileId: string, awardId?: string) {
  const where: Prisma.TaskWhereInput = {
    portProfileId,
    parentTaskId: null,
    ...(awardId ? { awardId } : {}),
  };

  const [total, notStarted, inProgress, blocked, inReview, submitted, done, overdue] =
    await Promise.all([
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...where, status: "not_started" } }),
      prisma.task.count({ where: { ...where, status: "in_progress" } }),
      prisma.task.count({ where: { ...where, status: "blocked" } }),
      prisma.task.count({ where: { ...where, status: "in_review" } }),
      prisma.task.count({ where: { ...where, status: "submitted" } }),
      prisma.task.count({ where: { ...where, status: "done" } }),
      prisma.task.count({
        where: { ...where, dueDate: { lt: new Date() }, status: { notIn: ["done", "submitted"] } },
      }),
    ]);

  return { total, notStarted, inProgress, blocked, inReview, submitted, done, overdue };
}

export async function bulkCreateTasks(inputs: CreateTaskInput[]): Promise<number> {
  const result = await prisma.task.createMany({
    data: inputs.map((input) => ({
      portProfileId: input.portProfileId,
      awardId: input.awardId || null,
      pipelineGrantId: input.pipelineGrantId || null,
      title: input.title,
      description: input.description || "",
      status: input.status || "not_started",
      priority: input.priority || "medium",
      startDate: input.startDate ? new Date(input.startDate) : null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      assigneeId: input.assigneeId || null,
      area: input.area || null,
      phase: input.phase || null,
      parentTaskId: input.parentTaskId || null,
      source: input.source || "manual",
      deliverableRef: input.deliverableRef || null,
      deliverableType: input.deliverableType || null,
      deliverableId: input.deliverableId || null,
      sortOrder: input.sortOrder || 0,
      createdBy: input.createdBy || null,
    })),
  });

  return result.count;
}
