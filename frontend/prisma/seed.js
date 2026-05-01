const fs = require('fs');
const path = require('path');
const { PrismaClient, Role, CoursePurchaseStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

if (!process.env.DATABASE_URL) {
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envText = fs.readFileSync(envPath, 'utf8');
    const dbLine = envText
      .split(/\r?\n/)
      .find((line) => line.trim().startsWith('DATABASE_URL='));
    if (dbLine) {
      const raw = dbLine.slice(dbLine.indexOf('=') + 1).trim();
      process.env.DATABASE_URL = raw.replace(/^['"]|['"]$/g, '');
    }
  }
}

const prisma = new PrismaClient();

// async function hash(pw) {
//   return argon2.hash(pw, {
//     type: argon2.argon2id,
//     memoryCost: 65536,
//     timeCost: 3,
//     parallelism: 1,
//   });
// }

async function hash(pw) {
  return bcrypt.hash(pw, 10);
}

async function upsertUser({ email, password, firstName, lastName, role, phone }) {
  const passwordHash = await hash(password);
  return prisma.user.upsert({
    where: { email },
    update: { firstName, lastName, phone: phone ?? null, role, isActive: true, passwordHash, emailVerified: true },
    create: { email, passwordHash, firstName, lastName, phone: phone ?? null, role, isActive: true, emailVerified: true },
  });
}

async function main() {
  console.log('Seeding frontend auth + paid learner fixtures...');

  const admin = await upsertUser({
    email: 'alisamuel325@gmail.com',
    password: 'Admin123!',
    firstName: 'Kemi',
    lastName: 'Adeyemi',
    role: Role.ADMIN,
  });

  const facilitator = await upsertUser({
    email: 'tobi.adeyemi@adhara.edu.ng',
    password: 'Tutor123!',
    firstName: 'Tobi',
    lastName: 'Adeyemi',
    role: Role.FACILITATOR,
    phone: '+2348031112222',
  });

  const learner = await upsertUser({
    email: 'paid.learner@adharaedu.com',
    password: 'Learner123!',
    firstName: 'Paid',
    lastName: 'Learner',
    role: Role.LEARNER,
    phone: '+2348123334444',
  });

  await prisma.facilitatorProfile.upsert({
    where: { userId: facilitator.id },
    update: { bio: 'Facilitator test profile' },
    create: { userId: facilitator.id, bio: 'Facilitator test profile', specialties: ['Web', 'Data'] },
  });

  await prisma.learnerProfile.upsert({
    where: { userId: learner.id },
    update: { learnerType: 'CAREER_SWITCHER', currentStage: 'Testing', source: 'Seed script' },
    create: {
      userId: learner.id,
      learnerType: 'CAREER_SWITCHER',
      currentStage: 'Testing',
      source: 'Seed script',
      streak: 2,
      lastActive: new Date(),
    },
  });

  let course = await prisma.course.findFirst({
    where: { isPublished: true },
    orderBy: { createdAt: 'asc' },
    include: {
      modules: { where: { isPublished: true }, orderBy: { order: 'asc' } },
      bundles: { where: { isPublished: true }, orderBy: { createdAt: 'asc' } },
    },
  });

  if (!course) {
    const created = await prisma.course.create({
      data: {
        slug: 'seed-web-dev-track',
        title: 'Seed Web Development Track',
        description: 'Fixture course for local testing checkout and access.',
        mode: 'SELF_PACED',
        price: 45000,
        currency: 'NGN',
        isPublished: true,
      },
    });

    const mod1 = await prisma.courseModule.create({
      data: {
        courseId: created.id,
        order: 1,
        title: 'HTML and CSS Foundations',
        description: 'Build your first landing page.',
        isFree: false,
        price: 10000,
        currency: 'NGN',
        isPublished: true,
      },
    });

    const mod2 = await prisma.courseModule.create({
      data: {
        courseId: created.id,
        order: 2,
        title: 'JavaScript for Beginners',
        description: 'Variables, functions, and DOM basics.',
        isFree: false,
        price: 12000,
        currency: 'NGN',
        isPublished: true,
      },
    });

    const bundle = await prisma.courseBundle.create({
      data: {
        courseId: created.id,
        name: 'Starter Bundle',
        description: 'Module 1 + Module 2',
        price: 18000,
        currency: 'NGN',
        isPublished: true,
        items: { create: [{ moduleId: mod1.id }, { moduleId: mod2.id }] },
      },
    });

    course = {
      ...created,
      modules: [mod1, mod2],
      bundles: [bundle],
    };
    console.log('Created seed published course: seed-web-dev-track');
  }

  await prisma.coursePurchase.upsert({
    where: { userId_courseId: { userId: learner.id, courseId: course.id } },
    update: {
      amount: course.price,
      currency: course.currency,
      status: CoursePurchaseStatus.SUCCESS,
      paidAt: new Date(),
    },
    create: {
      userId: learner.id,
      courseId: course.id,
      amount: course.price,
      currency: course.currency,
      status: CoursePurchaseStatus.SUCCESS,
      paidAt: new Date(),
    },
  });

  if (course.modules.length > 0) {
    const mod = course.modules[0];
    if (!mod.isFree && mod.price != null) {
      await prisma.courseModulePurchase.upsert({
        where: { userId_moduleId: { userId: learner.id, moduleId: mod.id } },
        update: {
          amount: mod.price,
          currency: mod.currency,
          status: CoursePurchaseStatus.SUCCESS,
          paidAt: new Date(),
        },
        create: {
          userId: learner.id,
          moduleId: mod.id,
          amount: mod.price,
          currency: mod.currency,
          status: CoursePurchaseStatus.SUCCESS,
          paidAt: new Date(),
        },
      });
    }
  }

  if (course.bundles.length > 0) {
    const bundle = course.bundles[0];
    await prisma.courseBundlePurchase.upsert({
      where: { userId_bundleId: { userId: learner.id, bundleId: bundle.id } },
      update: {
        amount: bundle.price,
        currency: bundle.currency,
        status: CoursePurchaseStatus.SUCCESS,
        paidAt: new Date(),
      },
      create: {
        userId: learner.id,
        bundleId: bundle.id,
        amount: bundle.price,
        currency: bundle.currency,
        status: CoursePurchaseStatus.SUCCESS,
        paidAt: new Date(),
      },
    });
  }

  // Reuse media links already used in cohort seed fixtures.
  const cohortVideoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  const cohortNotesUrl = 'https://docs.google.com/document/d/example';
  for (const [idx, m] of course.modules.entries()) {
    await prisma.lesson.upsert({
      where: { moduleId_order: { moduleId: m.id, order: 1 } },
      update: {
        title: `${m.title} — Lesson 1`,
        description: m.description ?? null,
        videoUrl: cohortVideoUrl,
        notesUrl: cohortNotesUrl,
        durationMins: 20 + idx * 5,
        isPublished: true,
      },
      create: {
        moduleId: m.id,
        order: 1,
        title: `${m.title} — Lesson 1`,
        description: m.description ?? null,
        videoUrl: cohortVideoUrl,
        notesUrl: cohortNotesUrl,
        durationMins: 20 + idx * 5,
        isPublished: true,
      },
    });
  }

  console.log('Seed complete.');
  console.log('Admin:', admin.email, ' / Admin123!');
  console.log('Facilitator:', facilitator.email, ' / Tutor123!');
  console.log('Paid learner:', learner.email, ' / Learner123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
