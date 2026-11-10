import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import MoodEntry from '../models/MoodEntry.js';
import JournalEntry from '../models/JournalEntry.js';
import QuestionnaireResponse from '../models/QuestionnaireResponse.js';
import Questionnaire from '../models/Questionnaire.js';
import Alert from '../models/Alert.js';
import connectDB from '../config/database.js';

async function seed() {
  await connectDB();
  console.log('Clearing existing test data...');
  
  // Clean test accounts
  const emails = ['aarav.sharma@teenmind.edu', 'rajesh.sharma@teenmind.edu', 'ananya.iyer@teenmind.edu'];
  const existingUsers = await User.find({ email: { $in: emails } });
  const userIds = existingUsers.map(u => u._id);

  const existingStudents = await Student.find({ userId: { $in: userIds } });
  const studentIds = existingStudents.map(s => s._id);

  await Alert.deleteMany({ studentId: { $in: studentIds } });
  await MoodEntry.deleteMany({ studentId: { $in: studentIds } });
  await JournalEntry.deleteMany({ studentId: { $in: studentIds } });
  await QuestionnaireResponse.deleteMany({ studentId: { $in: studentIds } });
  await Student.deleteMany({ userId: { $in: userIds } });
  await Parent.deleteMany({ userId: { $in: userIds } });
  await User.deleteMany({ _id: { $in: userIds } });

  console.log('Creating student account: Aarav Sharma...');
  const studentUser = await User.create({
    email: 'aarav.sharma@teenmind.edu',
    password: 'Password123!',
    role: 'student',
    profile: {
      firstName: 'Aarav',
      lastName: 'Sharma',
      phone: '+91 98765 43210',
      gender: 'male',
      dateOfBirth: new Date('2008-04-15'),
    },
    isActive: true,
    isEmailVerified: true,
  });

  const studentProfile = await Student.create({
    userId: studentUser._id,
    studentId: 'STU94201',
    academicInfo: {
      grade: '11th Grade (Science)',
      school: 'Delhi Public School, R.K. Puram',
      graduationYear: 2026,
      gpa: 3.85,
    },
    personalInfo: {
      dateOfBirth: new Date('2008-04-15'),
      gender: 'male',
      emergencyContacts: [
        {
          name: 'Rajesh Sharma',
          relationship: 'parent',
          phone: '+91 98765 43211',
          isPrimary: true,
        },
      ],
    },
    mentalHealthProfile: {
      currentRiskLevel: 'low',
      lastAssessmentDate: new Date(),
      medications: [],
      mentalHealthHistory: {
        previousDiagnoses: [],
        allergies: [],
      },
      crisisProtocol: {
        warningSigns: ['Irregular sleep schedule', 'Heightened exam anxiety'],
        copingStrategies: ['Guided breathing meditation', 'Listening to classical instrumental music', 'Journaling thoughts'],
        safetyPlan: 'Contact school counselor or reach out to parent if feeling overwhelmed.',
      },
    },
    appUsage: {
      onboardingCompleted: true,
      lastActive: new Date(),
      totalSessions: 48,
      averageSessionDuration: 12,
      completedAssessments: 4,
    },
  });

  console.log('Creating parent account: Rajesh Sharma...');
  const parentUser = await User.create({
    email: 'rajesh.sharma@teenmind.edu',
    password: 'Password123!',
    role: 'parent',
    profile: {
      firstName: 'Rajesh',
      lastName: 'Sharma',
      phone: '+91 98765 43211',
      gender: 'male',
    },
    isActive: true,
    isEmailVerified: true,
  });

  const parentProfile = await Parent.create({
    userId: parentUser._id,
    parentInfo: {
      relationshipType: 'parent',
      occupation: 'Senior Technology Director',
    },
    linkedStudents: [
      {
        studentId: studentProfile._id,
        relationshipType: 'parent',
        isPrimary: true,
        canViewReports: true,
        canReceiveAlerts: true,
        consentGiven: true,
        consentDate: new Date(),
      },
    ],
    alertSettings: {
      lowRiskAlerts: true,
      moderateRiskAlerts: true,
      highRiskAlerts: true,
      criticalRiskAlerts: true,
      alertMethods: {
        email: true,
        push: true,
        sms: false,
      },
    },
  });

  // Link student to parent
  await Student.findByIdAndUpdate(studentProfile._id, {
    $addToSet: { parentIds: parentUser._id }
  });

  console.log('Seeding mood entries...');
  const moodHistory = [
    { mood: { primary: 'happy', intensity: 8 }, context: { triggers: ['Friends', 'Sport'], activities: ['Exercise', 'Socializing'], notes: 'Great football match with classmates after school!' }, daysAgo: 0, sentiment: 0.8 },
    { mood: { primary: 'hopeful', intensity: 7 }, context: { triggers: ['School work'], activities: ['Study', 'Reading'], notes: 'Completed the physics assignment ahead of schedule.' }, daysAgo: 1, sentiment: 0.65 },
    { mood: { primary: 'neutral', intensity: 6 }, context: { triggers: ['Exams'], activities: ['Study', 'Music'], notes: 'Steady revision day. Listened to lo-fi music while studying.' }, daysAgo: 2, sentiment: 0.2 },
    { mood: { primary: 'stressed', intensity: 6 }, context: { triggers: ['Academic pressure', 'Exams'], activities: ['Meditation'], notes: 'Math mock test was tough, took a 15-minute walk.' }, daysAgo: 3, sentiment: -0.1 },
    { mood: { primary: 'excited', intensity: 9 }, context: { triggers: ['Friends', 'School work'], activities: ['Gaming', 'Socializing'], notes: 'Robotics club project won 1st prize in the regional fest!' }, daysAgo: 4, sentiment: 0.85 },
    { mood: { primary: 'happy', intensity: 7 }, context: { triggers: ['Family', 'Sleep'], activities: ['Nature walk', 'Cooking'], notes: 'Family dinner and restful 8 hours of sleep.' }, daysAgo: 5, sentiment: 0.7 },
    { mood: { primary: 'hopeful', intensity: 8 }, context: { triggers: ['Future'], activities: ['Journaling', 'Reading'], notes: 'Feeling confident about the upcoming semester.' }, daysAgo: 6, sentiment: 0.75 },
    { mood: { primary: 'anxious', intensity: 5 }, context: { triggers: ['Exams'], activities: ['Meditation'], notes: 'Mild nervousness before chemistry practicals.' }, daysAgo: 7, sentiment: -0.15 },
    { mood: { primary: 'happy', intensity: 8 }, context: { triggers: ['Friends'], activities: ['Art', 'Music'], notes: 'Jam session with friends over the weekend.' }, daysAgo: 8, sentiment: 0.7 },
  ];

  for (const m of moodHistory) {
    const entryDate = new Date(Date.now() - m.daysAgo * 24 * 60 * 60 * 1000);
    await MoodEntry.create({
      studentId: studentProfile._id,
      mood: m.mood,
      context: m.context,
      aiAnalysis: {
        sentimentPolarity: m.sentiment,
        emotionalStability: 0.85,
        crisisIndicators: [],
      },
      createdAt: entryDate,
      updatedAt: entryDate,
    });
  }

  console.log('Seeding journal entries...');
  const journals = [
    {
      title: 'Overcoming Physics Olympiad Pre-Exam Jitters',
      content: 'Today I woke up feeling slightly anxious about the upcoming state olympiad. Instead of spiraling, I spent 10 minutes doing box breathing, reviewed my formula notebook, and talked with my study group. I realized consistent preparation matters more than last-minute panic.',
      moodTag: 'hopeful',
      sentiment: 0.55,
      daysAgo: 1,
    },
    {
      title: 'Reflections on Teamwork at the Robotics Club',
      content: 'Our team finally got the autonomous navigation sensor working properly. It was great collaborating with Rohan and Sneha. When everyone contributes their strength, complex problems become manageable and exciting.',
      moodTag: 'happy',
      sentiment: 0.78,
      daysAgo: 3,
    },
    {
      title: 'Mindful Evening Walk & Disconnecting from Screens',
      content: 'Took an hour off all social media and went for a brisk walk at the colony park. The fresh air and quiet sunset helped clear mental fatigue from a 6-hour continuous study stretch.',
      moodTag: 'neutral',
      sentiment: 0.42,
      daysAgo: 5,
    },
    {
      title: 'Setting Goals for CBSE Term Exams',
      content: 'Organized my weekly calendar into manageable 45-minute study blocks. Prioritizing consistent 8-hour sleep over late-night cramming. Feeling much more grounded and in control of my schedule.',
      moodTag: 'hopeful',
      sentiment: 0.62,
      daysAgo: 7,
    },
  ];

  for (const j of journals) {
    const entryDate = new Date(Date.now() - j.daysAgo * 24 * 60 * 60 * 1000);
    const entry = new JournalEntry({
      studentId: studentProfile._id,
      title: j.title,
      moodTag: j.moodTag,
      aiAnalysis: {
        sentimentPolarity: j.sentiment,
        keyThemes: ['academics', 'growth', 'mindfulness', 'friendship'],
        emotionalState: 'balanced',
      },
      createdAt: entryDate,
      updatedAt: entryDate,
    });
    entry.content = entry.encryptContent(j.content);
    await entry.save();
  }

  console.log('Seeding questionnaire assessment response...');
  const questionnaire = await Questionnaire.findOne({ name: 'Teen Mental Health Screening' });
  if (questionnaire) {
    await QuestionnaireResponse.create({
      studentId: studentProfile._id,
      questionnaireId: questionnaire._id,
      sessionId: `session-screen-${Date.now()}`,
      status: 'completed',
      responses: questionnaire.questions.map(q => ({
        questionId: q.questionId,
        category: q.category,
        questionText: q.questionText,
        answer: 2,
        answerLabel: 'Rarely',
      })),
      scores: {
        totalScore: 24,
        maxScore: 100,
        normalized: {
          total: 24,
          stress: 22,
          anxiety: 20,
          sleep: 18,
          social: 15,
          academic: 28,
          emotional: 18,
        },
      },
      mlAnalysis: {
        prediction: 'Normal',
        riskLevel: 'low',
        confidence: 0.94,
        categoryBreakdown: {
          stress: 'Low',
          anxiety: 'Low',
          sleep: 'Optimal',
          social: 'Strong',
          academic: 'Moderate',
          emotional: 'Stable',
        },
      },
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });
  }

  console.log('Seeding parent alerts...');
  await Alert.create({
    studentId: studentProfile._id,
    parentId: parentProfile._id,
    riskLevel: 'low',
    title: 'Weekly Wellness Summary',
    message: 'Aarav has maintained consistent emotional balance this week with positive mood logs and regular sleep patterns.',
    status: 'new',
    alertTypes: ['push_notification', 'parent_dashboard_warning'],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  });

  await Alert.create({
    studentId: studentProfile._id,
    parentId: parentProfile._id,
    riskLevel: 'low',
    title: 'Assessment Completed',
    message: 'Aarav completed the Teen Mental Health Screening. Result: Normal (Low Risk) with 94% confidence.',
    status: 'read',
    alertTypes: ['push_notification'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  });

  console.log('==============================================');
  console.log('✅ Dummy Data Seeded Successfully!');
  console.log('Student Account:');
  console.log('  Name: Aarav Sharma');
  console.log('  Email: aarav.sharma@teenmind.edu');
  console.log('  Password: Password123!');
  console.log('  Student ID: STU94201');
  console.log('Parent Account:');
  console.log('  Name: Rajesh Sharma');
  console.log('  Email: rajesh.sharma@teenmind.edu');
  console.log('  Password: Password123!');
  console.log('==============================================');

  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
