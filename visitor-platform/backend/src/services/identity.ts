/**
 * Identity linking logic.
 * All email-to-visitor linking lives here.
 */

import prisma from '../db/prisma';

export async function linkEmailToSession(sessionId: string, email: string) {
  // Find the session
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { visitor: true },
  });

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  // Find or create visitor by email
  let visitor = await prisma.visitor.findFirst({
    where: { email },
  });

  if (!visitor) {
    visitor = await prisma.visitor.create({
      data: { email },
    });
  }

  // Link session to visitor
  await prisma.session.update({
    where: { id: sessionId },
    data: { visitorId: visitor.id },
  });

  // Store identity record
  const identity = await prisma.identity.create({
    data: {
      sessionId,
      email,
    },
  });

  // Update visitor lastSeen
  await prisma.visitor.update({
    where: { id: visitor.id },
    data: { lastSeen: new Date() },
  });

  return identity;
}

export async function getVisitorByEmail(email: string) {
  return prisma.visitor.findFirst({
    where: { email },
    include: {
      sessions: {
        include: { events: true },
        orderBy: { startTime: 'desc' },
      },
    },
  });
}