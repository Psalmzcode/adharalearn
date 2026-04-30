import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const hash = (pw: string) => bcrypt.hash(pw, 10);

async function main() {
  console.log('🌱 Seeding AdharaEdu Bootcamp...');

  // ── USERS ──────────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@adhara.edu.ng' },
    update: {},
    create: { email: 'admin@adhara.edu.ng', passwordHash: await hash('Admin123!'), firstName: 'Kemi', lastName: 'Adeyemi', role: 'ADMIN' },
  });

  const facilitatorUser = await prisma.user.upsert({
    where: { email: 'tobi.adeyemi@adhara.edu.ng' },
    update: {},
    create: { email: 'tobi.adeyemi@adhara.edu.ng', passwordHash: await hash('Tutor123!'), firstName: 'Tobi', lastName: 'Adeyemi', role: 'FACILITATOR', phone: '+234 803 111 2222' },
  });

  const learnerUser = await prisma.user.upsert({
    where: { email: 'aisha.okonkwo@gmail.com' },
    update: {},
    create: { email: 'aisha.okonkwo@gmail.com', passwordHash: await hash('Learner123!'), firstName: 'Aisha', lastName: 'Okonkwo', role: 'LEARNER', phone: '+234 812 333 4444' },
  });

  const learnerUser2 = await prisma.user.upsert({
    where: { email: 'chidi.nwosu@gmail.com' },
    update: {},
    create: { email: 'chidi.nwosu@gmail.com', passwordHash: await hash('Learner123!'), firstName: 'Chidi', lastName: 'Nwosu', role: 'LEARNER', phone: '+234 806 555 6666' },
  });

  const learnerUser3 = await prisma.user.upsert({
    where: { email: 'fatima.bello@gmail.com' },
    update: {},
    create: { email: 'fatima.bello@gmail.com', passwordHash: await hash('Learner123!'), firstName: 'Fatima', lastName: 'Bello', role: 'LEARNER', phone: '+234 801 777 8888' },
  });

  // ── PROFILES ───────────────────────────────────────────────────────────────
  const facilitator = await prisma.facilitatorProfile.upsert({
    where: { userId: facilitatorUser.id },
    update: {},
    create: { userId: facilitatorUser.id, bio: 'Senior full-stack developer with 7 years experience. Passionate about teaching web development.', specialties: ['React', 'Node.js', 'Python', 'MongoDB'] },
  });

  const learner = await prisma.learnerProfile.upsert({
    where: { userId: learnerUser.id }, update: {},
    create: { userId: learnerUser.id, streak: 12, lastActive: new Date() },
  });
  const learner2 = await prisma.learnerProfile.upsert({
    where: { userId: learnerUser2.id }, update: {},
    create: { userId: learnerUser2.id, streak: 3, lastActive: new Date() },
  });
  const learner3 = await prisma.learnerProfile.upsert({
    where: { userId: learnerUser3.id }, update: {},
    create: { userId: learnerUser3.id, streak: 7, lastActive: new Date() },
  });

  // ── TRACKS ─────────────────────────────────────────────────────────────────
  const webTrack = await prisma.track.upsert({
    where: { slug: 'web-dev' }, update: {},
    create: { name: 'Web Development', slug: 'web-dev', description: 'Full-stack web development from HTML to React + Node.js', duration: 12, price: 85000 },
  });
  const dataTrack = await prisma.track.upsert({
    where: { slug: 'data-analytics' }, update: {},
    create: { name: 'Data Analytics', slug: 'data-analytics', description: 'Data analytics with Python, SQL, and visualisation tools', duration: 10, price: 75000 },
  });
  const aiTrack = await prisma.track.upsert({
    where: { slug: 'ai-ml' }, update: {},
    create: { name: 'AI & Machine Learning', slug: 'ai-ml', description: 'Machine learning fundamentals with Python', duration: 12, price: 95000 },
  });

  // ── COHORT 4 (ACTIVE) ─────────────────────────────────────────────────────
  const cohort4 = await prisma.cohort.upsert({
    where: { trackId_name: { trackId: webTrack.id, name: 'Cohort 4' } }, update: {},
    create: {
      name: 'Cohort 4', trackId: webTrack.id, facilitatorId: facilitator.id,
      startDate: new Date('2026-04-07'), endDate: new Date('2026-06-27'),
      maxLearners: 30, status: 'ACTIVE', zoomLink: 'https://zoom.us/j/cohort4webdev',
    },
  });

  // Upcoming cohorts for other tracks
  const cohort5 = await prisma.cohort.upsert({
    where: { trackId_name: { trackId: webTrack.id, name: 'Cohort 5' } }, update: {},
    create: { name: 'Cohort 5', trackId: webTrack.id, startDate: new Date('2026-07-07'), endDate: new Date('2026-09-27'), maxLearners: 30, status: 'UPCOMING' },
  });
  await prisma.cohort.upsert({
    where: { trackId_name: { trackId: dataTrack.id, name: 'Cohort 2' } }, update: {},
    create: { name: 'Cohort 2', trackId: dataTrack.id, startDate: new Date('2026-05-05'), endDate: new Date('2026-07-11'), maxLearners: 25, status: 'UPCOMING' },
  });

  // ── MODULES ────────────────────────────────────────────────────────────────
  const modulesData = [
    { order: 1, title: 'HTML Fundamentals', description: 'Document structure, semantic elements, forms & inputs' },
    { order: 2, title: 'CSS Mastery', description: 'Box model, Flexbox & Grid, animations' },
    { order: 3, title: 'JavaScript Basics', description: 'Variables & types, functions, DOM manipulation' },
    { order: 4, title: 'React Fundamentals', description: 'Components, props & state, hooks' },
    { order: 5, title: 'APIs & Async JS', description: 'Fetch API, promises & async/await, REST basics' },
    { order: 6, title: 'Advanced CSS & Layouts', description: 'CSS variables, responsive design, CSS frameworks' },
    { order: 7, title: 'Node.js Basics', description: 'Server-side JS, Express.js, middleware' },
    { order: 8, title: 'Databases & MongoDB', description: 'NoSQL concepts, CRUD operations, Mongoose' },
  ];
  const modules: any[] = [];
  for (const mod of modulesData) {
    const m = await prisma.module.upsert({
      where: { trackId_order: { trackId: webTrack.id, order: mod.order } }, update: {},
      create: { ...mod, trackId: webTrack.id, isPublished: mod.order <= 6 },
    });
    modules.push(m);
  }

  // ── ENROLLMENTS ────────────────────────────────────────────────────────────
  const enrol1 = await prisma.enrollment.upsert({
    where: { learnerId_cohortId: { learnerId: learner.id, cohortId: cohort4.id } }, update: {},
    create: { learnerId: learner.id, cohortId: cohort4.id, status: 'ACTIVE', startedAt: new Date('2026-04-07'), progress: 67 },
  });
  const enrol2 = await prisma.enrollment.upsert({
    where: { learnerId_cohortId: { learnerId: learner2.id, cohortId: cohort4.id } }, update: {},
    create: { learnerId: learner2.id, cohortId: cohort4.id, status: 'ACTIVE', startedAt: new Date('2026-04-07'), progress: 34 },
  });
  const enrol3 = await prisma.enrollment.upsert({
    where: { learnerId_cohortId: { learnerId: learner3.id, cohortId: cohort4.id } }, update: {},
    create: { learnerId: learner3.id, cohortId: cohort4.id, status: 'ACTIVE', startedAt: new Date('2026-04-07'), progress: 80 },
  });

  // ── PAYMENTS ───────────────────────────────────────────────────────────────
  await prisma.payment.upsert({
    where: { id: 'seed-pay-1' }, update: {},
    create: { id: 'seed-pay-1', enrollmentId: enrol1.id, amount: 85000, type: 'FULL', status: 'SUCCESS', paidAt: new Date('2026-04-06') },
  });
  await prisma.payment.upsert({
    where: { id: 'seed-pay-2' }, update: {},
    create: { id: 'seed-pay-2', enrollmentId: enrol2.id, amount: 42500, type: 'INSTALMENT_1', status: 'SUCCESS', paidAt: new Date('2026-04-06') },
  });
  await prisma.payment.upsert({
    where: { id: 'seed-pay-3' }, update: {},
    create: { id: 'seed-pay-3', enrollmentId: enrol3.id, amount: 85000, type: 'FULL', status: 'SUCCESS', paidAt: new Date('2026-04-06') },
  });

  // ── SESSIONS ───────────────────────────────────────────────────────────────
  const sessionData = [
    { title: 'Orientation & Setup', scheduledAt: new Date('2026-04-07T09:00:00'), durationMins: 120 },
    { title: 'HTML Fundamentals', scheduledAt: new Date('2026-04-09T09:00:00'), durationMins: 90 },
    { title: 'CSS Box Model & Layouts', scheduledAt: new Date('2026-04-11T09:00:00'), durationMins: 90 },
    { title: 'Flexbox & Grid Deep Dive', scheduledAt: new Date('2026-04-14T09:00:00'), durationMins: 90 },
    { title: 'JavaScript Basics — Variables & Functions', scheduledAt: new Date('2026-04-16T09:00:00'), durationMins: 90 },
    { title: 'JavaScript — DOM Manipulation', scheduledAt: new Date('2026-04-18T09:00:00'), durationMins: 90 },
    { title: 'React Components & Props', scheduledAt: new Date('2026-04-23T09:00:00'), durationMins: 90 },
    { title: 'React State & useEffect', scheduledAt: new Date('2026-04-25T09:00:00'), durationMins: 90 },
    { title: 'Async JS & APIs', scheduledAt: new Date('2026-04-30T09:00:00'), durationMins: 90 },
    // Upcoming
    { title: 'Node.js & Express Intro', scheduledAt: new Date('2026-05-07T09:00:00'), durationMins: 90 },
    { title: 'REST APIs with Express', scheduledAt: new Date('2026-05-09T09:00:00'), durationMins: 90 },
    { title: 'MongoDB & Mongoose', scheduledAt: new Date('2026-05-14T09:00:00'), durationMins: 90 },
  ];

  const sessions: any[] = [];
  for (const s of sessionData) {
    const existing = await prisma.session.findFirst({ where: { cohortId: cohort4.id, title: s.title } });
    if (!existing) {
      const sess = await prisma.session.create({
        data: { ...s, cohortId: cohort4.id, facilitatorId: facilitator.id, type: 'LIVE', zoomLink: 'https://zoom.us/j/cohort4webdev' },
      });
      sessions.push(sess);
    } else {
      sessions.push(existing);
    }
  }

  // ── ATTENDANCE ─────────────────────────────────────────────────────────────
  const pastSessions = sessions.filter(s => new Date(s.scheduledAt) < new Date());
  for (const sess of pastSessions) {
    for (const [lp, present] of [[learner, true], [learner2, true], [learner3, true]] as [any, boolean][]) {
      await prisma.attendanceRecord.upsert({
        where: { learnerId_sessionId: { learnerId: lp.id, sessionId: sess.id } },
        update: {},
        create: { learnerId: lp.id, sessionId: sess.id, present, joinedAt: present ? new Date(sess.scheduledAt) : undefined },
      });
    }
  }
  // Chidi missed last 2 sessions (at-risk)
  if (pastSessions.length >= 2) {
    for (const sess of pastSessions.slice(-2)) {
      await prisma.attendanceRecord.upsert({
        where: { learnerId_sessionId: { learnerId: learner2.id, sessionId: sess.id } },
        update: { present: false },
        create: { learnerId: learner2.id, sessionId: sess.id, present: false },
      });
    }
  }

  // ── ASSIGNMENTS ────────────────────────────────────────────────────────────
  const assignmentsData = [
    { title: 'Build a Personal Portfolio Page', description: 'Create a responsive personal portfolio using only HTML & CSS. Must include a header, about section, skills, and contact form.', dueAt: new Date('2026-04-20'), maxScore: 100, moduleIdx: 1 },
    { title: 'JavaScript Calculator', description: 'Build a functional calculator with HTML, CSS, and vanilla JavaScript. Must support +, -, *, /, and clear operations.', dueAt: new Date('2026-04-28'), maxScore: 100, moduleIdx: 2 },
    { title: 'React Todo App', description: 'Build a todo app in React with add, complete, and delete functionality. Use useState and useEffect hooks.', dueAt: new Date('2026-05-05'), maxScore: 100, moduleIdx: 3 },
    { title: 'Fetch & Display API Data', description: 'Use the GitHub API to search for users and display their profile information and repositories.', dueAt: new Date('2026-05-12'), maxScore: 100, moduleIdx: 4 },
  ];

  const assignments: any[] = [];
  for (const a of assignmentsData) {
    const existing = await prisma.assignment.findFirst({ where: { cohortId: cohort4.id, title: a.title } });
    if (!existing) {
      const asn = await prisma.assignment.create({
        data: {
          cohortId: cohort4.id,
          moduleId: modules[a.moduleIdx]?.id,
          title: a.title,
          description: a.description,
          dueAt: a.dueAt,
          maxScore: a.maxScore,
          isPublished: true,
        },
      });
      assignments.push(asn);
    } else {
      assignments.push(existing);
    }
  }

  // ── SUBMISSIONS + GRADES ───────────────────────────────────────────────────
  if (assignments[0]) {
    const sub1 = await prisma.submission.upsert({
      where: { learnerId_assignmentId: { learnerId: learner.id, assignmentId: assignments[0].id } }, update: {},
      create: { learnerId: learner.id, assignmentId: assignments[0].id, repoUrl: 'https://github.com/aisha/portfolio', deployedUrl: 'https://aisha.netlify.app', status: 'GRADED', submittedAt: new Date('2026-04-19') },
    });
    await prisma.grade.upsert({
      where: { submissionId: sub1.id }, update: {},
      create: { submissionId: sub1.id, facilitatorId: facilitator.id, score: 88, feedback: 'Excellent responsive design! Consider adding a dark mode toggle.' },
    });

    const sub3 = await prisma.submission.upsert({
      where: { learnerId_assignmentId: { learnerId: learner3.id, assignmentId: assignments[0].id } }, update: {},
      create: { learnerId: learner3.id, assignmentId: assignments[0].id, repoUrl: 'https://github.com/fatima/portfolio', status: 'GRADED', submittedAt: new Date('2026-04-20') },
    });
    await prisma.grade.upsert({
      where: { submissionId: sub3.id }, update: {},
      create: { submissionId: sub3.id, facilitatorId: facilitator.id, score: 92, feedback: 'Beautiful design and clean code. Well done!' },
    });
  }
  if (assignments[1]) {
    const sub2 = await prisma.submission.upsert({
      where: { learnerId_assignmentId: { learnerId: learner.id, assignmentId: assignments[1].id } }, update: {},
      create: { learnerId: learner.id, assignmentId: assignments[1].id, repoUrl: 'https://github.com/aisha/js-calculator', deployedUrl: 'https://aisha-calc.netlify.app', status: 'SUBMITTED', submittedAt: new Date('2026-04-27') },
    });
  }

  // ── CBT SESSIONS ───────────────────────────────────────────────────────────
  if (modules[2]) {
    const existingCbt = await prisma.cbtSession.findFirst({ where: { cohortId: cohort4.id, title: 'JavaScript Basics Quiz' } });
    const cbtSession = existingCbt ?? await prisma.cbtSession.create({
      data: {
        cohortId: cohort4.id,
        moduleId: modules[2].id,
        title: 'JavaScript Basics Quiz',
        durationMins: 30,
        totalMarks: 10,
        passScore: 7,
        isPublished: true,
      },
    });

    const qCount = await prisma.cbtQuestion.count({ where: { sessionId: cbtSession.id } });
    if (qCount === 0) {
      await prisma.cbtQuestion.createMany({
        data: [
          { sessionId: cbtSession.id, order: 1, question: 'Which keyword declares a variable that cannot be reassigned?', optionA: 'var', optionB: 'let', optionC: 'const', optionD: 'def', correctOption: 'C', marks: 1 },
          { sessionId: cbtSession.id, order: 2, question: 'What does "=== " check in JavaScript?', optionA: 'Assignment', optionB: 'Value only', optionC: 'Value and type', optionD: 'Type only', correctOption: 'C', marks: 1 },
          { sessionId: cbtSession.id, order: 3, question: 'Which method adds an element to the end of an array?', optionA: 'push()', optionB: 'pop()', optionC: 'shift()', optionD: 'unshift()', correctOption: 'A', marks: 1 },
          { sessionId: cbtSession.id, order: 4, question: 'What is the output of typeof null?', optionA: '"null"', optionB: '"undefined"', optionC: '"object"', optionD: '"boolean"', correctOption: 'C', marks: 1 },
          { sessionId: cbtSession.id, order: 5, question: 'Which is NOT a valid way to declare a function?', optionA: 'function foo() {}', optionB: 'const foo = () => {}', optionC: 'foo function() {}', optionD: 'const foo = function() {}', correctOption: 'C', marks: 1 },
          { sessionId: cbtSession.id, order: 6, question: 'What does document.getElementById() return if element not found?', optionA: 'undefined', optionB: 'null', optionC: 'false', optionD: '0', correctOption: 'B', marks: 1 },
          { sessionId: cbtSession.id, order: 7, question: 'Which array method returns a new array?', optionA: 'push()', optionB: 'forEach()', optionC: 'map()', optionD: 'splice()', correctOption: 'C', marks: 1 },
          { sessionId: cbtSession.id, order: 8, question: 'What is the correct syntax for a JavaScript object?', optionA: 'var obj = []', optionB: 'var obj = {}', optionC: 'var obj = ()', optionD: 'var obj = <>', correctOption: 'B', marks: 1 },
          { sessionId: cbtSession.id, order: 9, question: 'Which event fires when a button is clicked?', optionA: 'onhover', optionB: 'onclick', optionC: 'onpress', optionD: 'onselect', correctOption: 'B', marks: 1 },
          { sessionId: cbtSession.id, order: 10, question: 'How do you access the length of a string "hello"?', optionA: '"hello".size', optionB: '"hello".count', optionC: '"hello".length', optionD: 'len("hello")', correctOption: 'C', marks: 1 },
        ],
      });
    }
  }

  // ── ANNOUNCEMENTS ──────────────────────────────────────────────────────────
  const announcementsData = [
    { title: 'Welcome to Cohort 4! 🎉', body: 'We\'re thrilled to have you here. Your journey starts today. Please check the curriculum and schedule on your dashboard. First live session is Monday April 7 at 9am WAT.', audience: 'ALL', cohortId: cohort4.id },
    { title: 'Assignment 1 — Portfolio Page Released', body: 'Your first assignment is now live on your dashboard. Build a personal portfolio page using only HTML & CSS. Due April 20. Remember: quality over quantity!', audience: 'LEARNERS', cohortId: cohort4.id },
    { title: 'Week 2 Recording Available', body: 'The recording for the CSS Mastery session is now available in your session history. Watch it at 1.5x speed if you\'re short on time.', audience: 'ALL', cohortId: cohort4.id },
    { title: 'Facilitator Report Reminder', body: 'Tobi, please submit your Week 3 report by Friday EOD. Payroll depends on it!', audience: 'FACILITATORS', cohortId: null },
    { title: 'Demo Day — June 28, 2026', body: 'Save the date: Cohort 4 Demo Day is June 28, 2026. All learners will present their final projects to industry guests. Start thinking about your project ideas!', audience: 'ALL', cohortId: cohort4.id },
  ];

  for (const ann of announcementsData) {
    const existing = await prisma.announcement.findFirst({ where: { title: ann.title } });
    if (!existing) {
      await prisma.announcement.create({ data: ann });
    }
  }

  // ── WEEKLY REPORT ──────────────────────────────────────────────────────────
  const repExists = await prisma.weeklyReport.findFirst({ where: { facilitatorId: facilitator.id, week: 'Week 1 · Apr 7–11' } });
  if (!repExists) {
    await prisma.weeklyReport.create({
      data: {
        facilitatorId: facilitator.id,
        cohortId: cohort4.id,
        week: 'Week 1 · Apr 7–11',
        sessionCount: 3,
        avgAttendance: '100%',
        summary: 'Excellent first week! All 3 learners attended all sessions. Covered HTML structure, semantic elements, and intro to CSS. Learners are enthusiastic and engaged. No major issues.',
        nextWeekPlan: 'Continue CSS — Flexbox and Grid. Introduce the first assignment.',
      },
    });
  }

  // ── SCHOLARSHIP ────────────────────────────────────────────────────────────
  const scholExists = await prisma.scholarship.findFirst({ where: { learnerId: learner2.id } });
  if (!scholExists) {
    await prisma.scholarship.create({
      data: {
        learnerId: learner2.id,
        trackId: webTrack.id,
        amount: 42500,
        reason: 'I come from a low-income family in Kano State. Web development is my path out of poverty. I have been self-studying for 6 months and this bootcamp will help me land my first job. I cannot afford the second instalment.',
        status: 'PENDING',
      },
    });
  }


  // ── Add videoUrl + notesUrl to first 3 modules ──────────────────────────────
  const allModules = await prisma.module.findMany({ orderBy: { order: 'asc' }, take: 3 });
  for (const mod of allModules) {
    await prisma.module.update({
      where: { id: mod.id },
      data: {
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        notesUrl: 'https://docs.google.com/document/d/example',
      },
    });
  }

  // ── Job listings ─────────────────────────────────────────────────────────────
  await prisma.jobListing.createMany({
    data: [
      {
        title: 'Junior Frontend Developer',
        company: 'Paystack',
        location: 'Lagos, Nigeria',
        type: 'HYBRID',
        description: 'Join our growing engineering team to build delightful payment interfaces used by millions of Nigerian businesses. You will work with React, TypeScript, and our design system.',
        applyUrl: 'https://paystack.com/careers',
        salary: '₦180k–₦280k/month',
        skills: ['React', 'TypeScript', 'CSS', 'REST APIs'],
      },
      {
        title: 'Data Analyst',
        company: 'Flutterwave',
        location: 'Remote (Nigeria)',
        type: 'REMOTE',
        description: 'Analyse transaction data to surface insights that drive product decisions. You will own dashboards, build reports, and work closely with the product and engineering teams.',
        applyUrl: 'https://flutterwave.com/ng/careers',
        salary: '₦150k–₦220k/month',
        skills: ['Python', 'SQL', 'Pandas', 'Tableau', 'Excel'],
      },
      {
        title: 'Backend Engineer (Node.js)',
        company: 'Cowrywise',
        location: 'Lagos / Remote',
        type: 'REMOTE',
        description: 'Build scalable financial APIs that power our savings and investment platform. Strong Node.js, PostgreSQL, and API design skills required.',
        applyUrl: 'https://cowrywise.com',
        salary: '₦200k–₦350k/month',
        skills: ['Node.js', 'PostgreSQL', 'Redis', 'REST', 'TypeScript'],
      },
      {
        title: 'Machine Learning Engineer',
        company: 'Zindi Africa',
        location: 'Remote',
        type: 'REMOTE',
        description: 'Work on real-world ML challenges across health, agriculture, and finance. Help African data scientists compete globally on our platform.',
        applyUrl: 'https://zindi.africa',
        salary: '₦250k–₦400k/month',
        skills: ['Python', 'TensorFlow', 'scikit-learn', 'SQL', 'Docker'],
      },
    ],
    skipDuplicates: true,
  });
  console.log('✅ 4 job listings created');

  // ── Alumni profile for Fatima (completed learner) ─────────────────────────
  const fatima = await prisma.user.findUnique({ where: { email: 'fatima.bello@gmail.com' } });
  if (fatima) {
    const fatimaEnrollment = await prisma.enrollment.findFirst({ where: { learner: { userId: fatima.id } }, include: { cohort: true } });
    if (fatimaEnrollment) {
      await prisma.alumniProfile.upsert({
        where: { userId: fatima.id },
        create: {
          userId: fatima.id,
          cohortId: fatimaEnrollment.cohortId,
          trackName: 'Full-Stack Web Development',
          jobTitle: 'Junior Frontend Developer',
          company: 'Paystack',
          bio: 'Full-stack developer passionate about building products that solve real Nigerian problems. AdharaEdu changed my life — I went from a fashion designer to a software developer in 12 weeks.',
          portfolioUrl: 'https://fatimabello.dev',
          githubUrl: 'https://github.com/fatimabello',
          linkedInUrl: 'https://linkedin.com/in/fatimabello',
          isHireable: false,
          isPublic: true,
        },
        update: {},
      });
      console.log('✅ Alumni profile created for Fatima');
    }
  }

  console.log('\n✅ Seed complete!');
  console.log('\n🔑 Login credentials:');
  console.log('   Admin:       admin@adhara.edu.ng         / Admin123!');
  console.log('   Facilitator: tobi.adeyemi@adhara.edu.ng  / Tutor123!');
  console.log('   Learner 1:   aisha.okonkwo@gmail.com     / Learner123!');
  console.log('   Learner 2:   chidi.nwosu@gmail.com       / Learner123!');
  console.log('   Learner 3:   fatima.bello@gmail.com      / Learner123!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
