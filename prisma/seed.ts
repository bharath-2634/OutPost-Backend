import { PrismaClient, CampaignStatus, JobStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@reachinbox.ai' },
    update: {},
    create: {
      email: 'demo@reachinbox.ai',
      name: 'ReachInbox Demo User',
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-avatar',
      googleSubject: 'google-demo-sub-12345',
    },
  });

  console.log('✅ Demo user created:', user.email);

  // Create a demo campaign
  const campaign = await prisma.emailCampaign.create({
    data: {
      userId: user.id,
      title: 'Welcome Sequence 2026',
      subject: 'Transforming cold email outreach with AI',
      body: 'Hi {{name}}, ReachInbox springs into action to help you find and engage high-intent leads.',
      startTime: new Date(),
      delayBetweenSends: 2,
      hourlyLimit: 200,
      totalRecipients: 2,
      status: CampaignStatus.SCHEDULED,
      emailJobs: {
        create: [
          {
            idempotencyKey: `job-seed-1-${Date.now()}`,
            senderEmail: 'sender1@reachinbox.ethereal.email',
            recipientEmail: 'lead1@example.com',
            subject: 'Transforming cold email outreach with AI',
            body: 'Hi Lead 1, ReachInbox springs into action to help you find and engage high-intent leads.',
            scheduledFor: new Date(),
            status: JobStatus.PENDING,
          },
          {
            idempotencyKey: `job-seed-2-${Date.now()}`,
            senderEmail: 'sender1@reachinbox.ethereal.email',
            recipientEmail: 'lead2@example.com',
            subject: 'Transforming cold email outreach with AI',
            body: 'Hi Lead 2, ReachInbox springs into action to help you find and engage high-intent leads.',
            scheduledFor: new Date(Date.now() + 60000),
            status: JobStatus.PENDING,
          },
        ],
      },
    },
  });

  console.log('✅ Demo campaign and 2 email jobs seeded. Campaign ID:', campaign.id);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
