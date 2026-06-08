import { prisma } from "../client";
import { Prisma, TaskTemplate, TaskTemplateItem } from "@/generated/prisma";
import type { CreateTaskInput, TaskPriority } from "./tasks";

export interface TaskTemplateWithItems {
  id: string;
  program: string;
  name: string;
  description: string;
  active: boolean;
  items: TaskTemplateItemData[];
  createdAt: string;
}

export interface TaskTemplateItemData {
  id: string;
  templateId: string;
  title: string;
  description: string;
  area: string | null;
  priority: string;
  dueRule: string | null;
  dueOffsetDays: number | null;
  dueReference: string | null;
  deliverableType: string | null;
  sortOrder: number;
  recurring: boolean;
  recurrenceRule: string | null;
  parentItemId: string | null;
}

const templateInclude = {
  items: { orderBy: { sortOrder: "asc" as const } },
} satisfies Prisma.TaskTemplateInclude;

export async function listTemplates(program?: string): Promise<TaskTemplateWithItems[]> {
  const where: Prisma.TaskTemplateWhereInput = { active: true };
  if (program) where.program = program;

  const templates = await prisma.taskTemplate.findMany({
    where,
    include: templateInclude,
    orderBy: { program: "asc" },
  });

  type TemplateWithItems = TaskTemplate & { items: TaskTemplateItem[] };
  return templates.map((t: TemplateWithItems) => ({
    id: t.id,
    program: t.program,
    name: t.name,
    description: t.description,
    active: t.active,
    items: t.items.map((item: TaskTemplateItem) => ({
      id: item.id,
      templateId: item.templateId,
      title: item.title,
      description: item.description,
      area: item.area,
      priority: item.priority,
      dueRule: item.dueRule,
      dueOffsetDays: item.dueOffsetDays,
      dueReference: item.dueReference,
      deliverableType: item.deliverableType,
      sortOrder: item.sortOrder,
      recurring: item.recurring,
      recurrenceRule: item.recurrenceRule,
      parentItemId: item.parentItemId,
    })),
    createdAt: t.createdAt.toISOString(),
  }));
}

export async function getTemplateById(id: string): Promise<TaskTemplateWithItems | null> {
  const t = await prisma.taskTemplate.findUnique({
    where: { id },
    include: templateInclude,
  });

  if (!t) return null;

  return {
    id: t.id,
    program: t.program,
    name: t.name,
    description: t.description,
    active: t.active,
    items: t.items.map((item: TaskTemplateItem) => ({
      id: item.id,
      templateId: item.templateId,
      title: item.title,
      description: item.description,
      area: item.area,
      priority: item.priority,
      dueRule: item.dueRule,
      dueOffsetDays: item.dueOffsetDays,
      dueReference: item.dueReference,
      deliverableType: item.deliverableType,
      sortOrder: item.sortOrder,
      recurring: item.recurring,
      recurrenceRule: item.recurrenceRule,
      parentItemId: item.parentItemId,
    })),
    createdAt: t.createdAt.toISOString(),
  };
}

/**
 * Apply a playbook to an award: instantiate all template items as tasks.
 * Computes due dates from award performance period + template due rules.
 */
export function instantiatePlaybook(
  template: TaskTemplateWithItems,
  awardId: string,
  portProfileId: string,
  performancePeriodStart: Date,
  performancePeriodEnd: Date,
  createdBy?: string
): CreateTaskInput[] {
  const tasks: CreateTaskInput[] = [];

  for (const item of template.items) {
    if (item.recurring && item.recurrenceRule) {
      // Generate recurring tasks across the performance period
      const dates = generateRecurringDates(
        performancePeriodStart,
        performancePeriodEnd,
        item.recurrenceRule
      );

      for (let i = 0; i < dates.length; i++) {
        const periodEnd = dates[i];
        const dueDate = item.dueOffsetDays
          ? addDays(periodEnd, item.dueOffsetDays)
          : periodEnd;

        const periodLabel = `Q${i + 1}`;
        const fiscalYear = periodEnd.getFullYear();

        tasks.push({
          portProfileId,
          awardId,
          title: `${item.title} - ${periodLabel} FY${fiscalYear}`,
          description: item.description,
          priority: item.priority as TaskPriority,
          dueDate: dueDate.toISOString().split("T")[0],
          area: item.area || undefined,
          source: "template",
          deliverableType: item.deliverableType || undefined,
          sortOrder: item.sortOrder * 100 + i,
          createdBy,
        });
      }
    } else {
      // One-time task
      let dueDate: Date | undefined;
      if (item.dueOffsetDays !== null && item.dueReference) {
        const ref =
          item.dueReference === "period_start"
            ? performancePeriodStart
            : item.dueReference === "period_end"
              ? performancePeriodEnd
              : performancePeriodStart;
        dueDate = addDays(ref, item.dueOffsetDays!);
      }

      tasks.push({
        portProfileId,
        awardId,
        title: item.title,
        description: item.description,
        priority: item.priority as TaskPriority,
        dueDate: dueDate?.toISOString().split("T")[0],
        area: item.area || undefined,
        source: "template",
        deliverableType: item.deliverableType || undefined,
        sortOrder: item.sortOrder,
        createdBy,
      });
    }
  }

  return tasks;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function generateRecurringDates(
  start: Date,
  end: Date,
  rule: string
): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);

  const monthIncrement =
    rule === "quarterly" ? 3
    : rule === "semi_annually" ? 6
    : rule === "annually" ? 12
    : 3;

  // Advance to end of first period
  current.setMonth(current.getMonth() + monthIncrement);

  while (current <= end) {
    dates.push(new Date(current));
    current.setMonth(current.getMonth() + monthIncrement);
  }

  return dates;
}
