import { prisma } from "../client";
import { Prisma, TaskComment } from "@/generated/prisma";

export interface TaskCommentData {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userImage: string | null;
  body: string;
  createdAt: string;
}

const commentInclude = {
  user: { select: { id: true, name: true, image: true } },
} satisfies Prisma.TaskCommentInclude;

export async function getCommentsForTask(taskId: string): Promise<TaskCommentData[]> {
  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    include: commentInclude,
    orderBy: { createdAt: "asc" },
  });

  type CommentWithUser = Prisma.TaskCommentGetPayload<{ include: typeof commentInclude }>;
  return comments.map((c: CommentWithUser) => ({
    id: c.id,
    taskId: c.taskId,
    userId: c.userId,
    userName: c.user.name,
    userImage: c.user.image,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
  }));
}

export async function addComment(
  taskId: string,
  userId: string,
  body: string
): Promise<TaskCommentData> {
  const comment = await prisma.taskComment.create({
    data: { taskId, userId, body },
    include: commentInclude,
  });

  return {
    id: comment.id,
    taskId: comment.taskId,
    userId: comment.userId,
    userName: comment.user.name,
    userImage: comment.user.image,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  };
}

export async function deleteComment(id: string): Promise<boolean> {
  await prisma.taskComment.delete({ where: { id } });
  return true;
}
