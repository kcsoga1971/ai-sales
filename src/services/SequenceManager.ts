import * as storage from './StorageService';

// Sequence schedule: step → days after campaign_contact was added
const SEQUENCE_SCHEDULE: { step: number; channel: 'linkedin' | 'email' | 'telegram'; day: number }[] = [
  { step: 1, channel: 'linkedin', day: 0 },
  { step: 2, channel: 'email',    day: 3 },
  { step: 3, channel: 'email',    day: 6 },
  { step: 4, channel: 'email',    day: 9 },
];

export async function initSequence(
  campaignContactId: string,
  messages: { linkedin: string; email1: string; email2: string; email3: string; email_subject1: string; email_subject2: string; email_subject3: string },
  startDate: Date = new Date()
): Promise<void> {
  const contents = [
    messages.linkedin,
    messages.email1,
    messages.email2,
    messages.email3,
  ];
  const subjects = [
    undefined,
    messages.email_subject1,
    messages.email_subject2,
    messages.email_subject3,
  ];

  for (const sched of SEQUENCE_SCHEDULE) {
    const scheduledAt = new Date(startDate);
    scheduledAt.setDate(scheduledAt.getDate() + sched.day);

    const content = sched.channel === 'email'
      ? `Subject: ${subjects[sched.step - 1]}\n\n${contents[sched.step - 1]}`
      : contents[sched.step - 1];

    await storage.createTouchpoint({
      campaign_contact_id: campaignContactId,
      channel: sched.channel,
      step: sched.step,
      scheduled_at: scheduledAt.toISOString(),
      content,
      status: 'pending',
    });
  }
}

export async function markContactReplied(campaignContactId: string): Promise<void> {
  // Cancel all pending/approved touchpoints for this contact
  const touchpoints = await storage.getTouchpoints(campaignContactId);
  for (const tp of touchpoints) {
    if (['pending', 'approved'].includes(tp.status)) {
      await storage.updateTouchpoint(tp.id, { status: 'cancelled' });
    }
  }
  await storage.updateCampaignContact(campaignContactId, { status: 'replied' });
}

export async function markContactConverted(campaignContactId: string): Promise<void> {
  await markContactReplied(campaignContactId);
  await storage.updateCampaignContact(campaignContactId, { status: 'converted' });
}

export async function markDemoBooked(campaignContactId: string): Promise<void> {
  await storage.updateCampaignContact(campaignContactId, { status: 'demo_booked' });
}

export async function getUpcomingTouchpoints(campaignId?: string) {
  const all = await storage.getQueuedTouchpoints();
  if (!campaignId) return all;
  return all.filter((tp: Record<string, Record<string, string>>) => tp.campaign_contact?.campaign_id === campaignId);
}
