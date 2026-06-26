import { getDb } from '@/server/db';

export type ToolSource = { name: string; source: string };

export async function listConversations(userId: string) {
  return getDb().conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, updatedAt: true },
    take: 100,
  });
}

export async function getConversation(userId: string, id: string) {
  const convo = await getDb().conversation.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!convo) return null;
  return {
    id: convo.id,
    title: convo.title,
    messages: convo.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      sources: m.sources ? (JSON.parse(m.sources) as ToolSource[]) : undefined,
    })),
  };
}

export async function deleteConversation(userId: string, id: string) {
  await getDb().conversation.deleteMany({ where: { id, userId } });
}

/** Persists a user question + assistant reply, creating the conversation if needed. */
export async function saveTurn(params: {
  userId: string;
  conversationId?: string;
  question: string;
  reply: string;
  sources?: ToolSource[];
}): Promise<string> {
  const db = getDb();
  let conversationId = params.conversationId;

  if (conversationId) {
    const existing = await db.conversation.findFirst({
      where: { id: conversationId, userId: params.userId },
      select: { id: true },
    });
    if (!existing) conversationId = undefined;
  }

  if (!conversationId) {
    const title = params.question.length > 60 ? `${params.question.slice(0, 57)}…` : params.question;
    const created = await db.conversation.create({
      data: { userId: params.userId, title: title || 'New chat' },
      select: { id: true },
    });
    conversationId = created.id;
  }

  await db.message.create({
    data: { conversationId, role: 'user', content: params.question },
  });
  await db.message.create({
    data: {
      conversationId,
      role: 'assistant',
      content: params.reply,
      sources: params.sources ? JSON.stringify(params.sources) : null,
    },
  });
  await db.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return conversationId;
}
