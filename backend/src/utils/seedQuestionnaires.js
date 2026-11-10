import mongoose from 'mongoose';
import Questionnaire from '../models/Questionnaire.js';
import User from '../models/User.js';
import connectDB from '../config/database.js';

/**
 * Seed script for creating standard mental health questionnaires
 */

const seedQuestionnaires = async () => {
  try {
    // Create a system user for questionnaire creation
    let systemUser = await User.findOne({ email: 'system@teenmind.app' });
    if (!systemUser) {
      systemUser = await User.create({
        email: 'system@teenmind.app',
        password: 'system123',
        role: 'counselor',
        profile: {
          firstName: 'System',
          lastName: 'Administrator'
        }
      });
    }

    // Teen Mental Health Screening Questionnaire
    const teenScreeningQuestionnaire = {
      name: 'Teen Mental Health Screening',
      version: '1.0',
      description: 'Comprehensive mental health screening for teenagers covering stress, anxiety, sleep, social interaction, academic pressure, and emotional stability',
      category: 'screening',
      targetAgeGroup: {
        min: 13,
        max: 19
      },
      estimatedDuration: 8,
      createdBy: systemUser._id,
      approvedBy: systemUser._id,
      approvalDate: new Date(),
      questions: [
        // Stress Questions (1-4)
        {
          questionId: 'stress_level_general',
          questionText: 'Over the past two weeks, how often have you felt overwhelmed by stress?',
          category: 'stress',
          questionType: 'likert_5',
          options: [
            { value: 1, label: 'Never', description: 'I have not felt stressed at all' },
            { value: 2, label: 'Rarely', description: 'Only on very few occasions' },
            { value: 3, label: 'Sometimes', description: 'A few times a week' },
            { value: 4, label: 'Often', description: 'Most days of the week' },
            { value: 5, label: 'Always', description: 'Every day, multiple times' }
          ],
          weight: 1.2,
          order: 1
        },
        {
          questionId: 'stress_coping',
          questionText: 'How well do you feel you can handle stress in your daily life?',
          category: 'stress',
          questionType: 'likert_5',
          options: [
            { value: 5, label: 'Very well', description: 'I have effective coping strategies' },
            { value: 4, label: 'Well', description: 'I usually manage stress effectively' },
            { value: 3, label: 'Moderately', description: 'I cope okay with some difficulty' },
            { value: 2, label: 'Poorly', description: 'I struggle to handle stress' },
            { value: 1, label: 'Very poorly', description: 'I feel completely overwhelmed' }
          ],
          weight: 1.0,
          order: 2
        },
        {
          questionId: 'stress_physical',
          questionText: 'How often do you experience physical symptoms of stress (headaches, muscle tension, stomach problems)?',
          category: 'stress',
          questionType: 'likert_5',
          options: [
            { value: 1, label: 'Never', description: 'No physical symptoms' },
            { value: 2, label: 'Rarely', description: 'Very occasionally' },
            { value: 3, label: 'Sometimes', description: 'A few times a week' },
            { value: 4, label: 'Often', description: 'Most days' },
            { value: 5, label: 'Daily', description: 'Every day' }
          ],
          weight: 1.1,
          order: 3
        },

        // Anxiety Questions (4-7)
        {
          questionId: 'anxiety_worry',
          questionText: 'Over the past two weeks, how often have you been bothered by excessive worry?',
          category: 'anxiety',
          questionType: 'likert_5',
          options: [
            { value: 1, label: 'Not at all', description: 'I rarely worry excessively' },
            { value: 2, label: 'Several days', description: 'A few days in the past two weeks' },
            { value: 3, label: 'More than half the days', description: 'More than 7 days' },
            { value: 4, label: 'Nearly every day', description: '12-13 days' },
            { value: 5, label: 'Every day', description: 'All 14 days' }
          ],
          weight: 1.3,
          order: 4
        },
        {
          questionId: 'anxiety_panic',
          questionText: 'How often do you experience sudden feelings of fear or panic?',
          category: 'anxiety',
          questionType: 'likert_5',
          options: [
            { value: 1, label: 'Never', description: 'No panic episodes' },
            { value: 2, label: 'Rarely', description: 'Less than once a month' },
            { value: 3, label: 'Sometimes', description: 'Once or twice a month' },
            { value: 4, label: 'Often', description: 'Weekly' },
            { value: 5, label: 'Very often', description: 'Multiple times per week' }
          ],
          weight: 1.4,
          order: 5
        },
        {
          questionId: 'anxiety_social',
          questionText: 'How anxious do you feel in social situations or when meeting new people?',
          category: 'anxiety',
          questionType: 'likert_5',
          options: [
            { value: 1, label: 'Not anxious', description: 'I feel comfortable in social settings' },
            { value: 2, label: 'Slightly anxious', description: 'Some nervousness but manageable' },
            { value: 3, label: 'Moderately anxious', description: 'Noticeable anxiety that affects me' },
            { value: 4, label: 'Very anxious', description: 'Significant anxiety that limits my participation' },
            { value: 5, label: 'Extremely anxious', description: 'I avoid social situations due to anxiety' }
          ],
          weight: 1.0,
          order: 6
        },

        // Sleep Questions (7-9)
        {
          questionId: 'sleep_quality',
          questionText: 'How would you rate the overall quality of your sleep?',
          category: 'sleep',
          questionType: 'likert_5',
          options: [
            { value: 5, label: 'Excellent', description: 'I sleep very well and wake up refreshed' },
            { value: 4, label: 'Good', description: 'Generally good sleep with occasional issues' },
            { value: 3, label: 'Fair', description: 'Average sleep, sometimes tired' },
            { value: 2, label: 'Poor', description: 'Often have trouble sleeping' },
            { value: 1, label: 'Very poor', description: 'Consistently poor sleep, always tired' }
          ],
          weight: 1.0,
          order: 7
        },
        {
          questionId: 'sleep_duration',
          questionText: 'How many hours of sleep do you typically get on school nights?',
          category: 'sleep',
          questionType: 'likert_5',
          options: [
            { value: 1, label: 'Less than 5 hours', description: '4 hours or less' },
            { value: 2, label: '5-6 hours', description: 'Significantly less than recommended' },
            { value: 3, label: '6-7 hours', description: 'Somewhat less than recommended' },
            { value: 4, label: '7-8 hours', description: 'Adequate sleep duration' },
            { value: 5, label: '8+ hours', description: 'Optimal sleep duration' }
          ],
          weight: 0.9,
          order: 8
        },

        // Social Interaction Questions (9-11)
        {
          questionId: 'social_support',
          questionText: 'How satisfied are you with your social support system (friends, family)?',
          category: 'social',
          questionType: 'likert_5',
          options: [
            { value: 5, label: 'Very satisfied', description: 'Strong support network' },
            { value: 4, label: 'Satisfied', description: 'Good support from others' },
            { value: 3, label: 'Neutral', description: 'Adequate support' },
            { value: 2, label: 'Dissatisfied', description: 'Limited support available' },
            { value: 1, label: 'Very dissatisfied', description: 'Feel alone and unsupported' }
          ],
          weight: 1.1,
          order: 9
        },
        {
          questionId: 'social_isolation',
          questionText: 'How often do you feel lonely or isolated from others?',
          category: 'social',
          questionType: 'likert_5',
          options: [
            { value: 1, label: 'Never', description: 'I feel well connected to others' },
            { value: 2, label: 'Rarely', description: 'Only occasionally feel lonely' },
            { value: 3, label: 'Sometimes', description: 'Feel lonely a few times a week' },
            { value: 4, label: 'Often', description: 'Feel lonely most days' },
            { value: 5, label: 'Always', description: 'Feel constantly lonely and isolated' }
          ],
          weight: 1.2,
          order: 10
        },

        // Academic Pressure Questions (11-13)
        {
          questionId: 'academic_stress',
          questionText: 'How stressed do you feel about your academic performance?',
          category: 'academic',
          questionType: 'likert_5',
          options: [
            { value: 1, label: 'Not stressed', description: 'I feel confident about my academics' },
            { value: 2, label: 'Slightly stressed', description: 'Some concern but manageable' },
            { value: 3, label: 'Moderately stressed', description: 'Noticeable academic stress' },
            { value: 4, label: 'Very stressed', description: 'High levels of academic anxiety' },
            { value: 5, label: 'Extremely stressed', description: 'Overwhelming academic pressure' }
          ],
          weight: 1.3,
          order: 11
        },
        {
          questionId: 'academic_pressure_external',
          questionText: 'How much pressure do you feel from others (parents, teachers) about your grades?',
          category: 'academic',
          questionType: 'likert_5',
          options: [
            { value: 1, label: 'No pressure', description: 'Others are supportive regardless of grades' },
            { value: 2, label: 'Little pressure', description: 'Some expectations but reasonable' },
            { value: 3, label: 'Moderate pressure', description: 'Noticeable pressure to perform well' },
            { value: 4, label: 'High pressure', description: 'Significant pressure affecting my wellbeing' },
            { value: 5, label: 'Extreme pressure', description: 'Overwhelming pressure that causes distress' }
          ],
          weight: 1.1,
          order: 12
        },

        // Emotional Stability Questions (13-16)
        {
          questionId: 'emotional_mood_swings',
          questionText: 'How often do you experience sudden changes in mood?',
          category: 'emotional',
          questionType: 'likert_5',
          options: [
            { value: 1, label: 'Never', description: 'My mood is generally stable' },
            { value: 2, label: 'Rarely', description: 'Occasional mood changes' },
            { value: 3, label: 'Sometimes', description: 'Noticeable mood swings' },
            { value: 4, label: 'Often', description: 'Frequent mood changes' },
            { value: 5, label: 'Very often', description: 'Constant emotional ups and downs' }
          ],
          weight: 1.1,
          order: 13
        },
        {
          questionId: 'emotional_control',
          questionText: 'How well can you control your emotions when you are upset?',
          category: 'emotional',
          questionType: 'likert_5',
          options: [
            { value: 5, label: 'Very well', description: 'I can manage my emotions effectively' },
            { value: 4, label: 'Well', description: 'Usually good emotional control' },
            { value: 3, label: 'Moderately', description: 'Sometimes struggle with emotional control' },
            { value: 2, label: 'Poorly', description: 'Often have difficulty controlling emotions' },
            { value: 1, label: 'Very poorly', description: 'Emotions feel completely out of control' }
          ],
          weight: 1.2,
          order: 14
        },
        {
          questionId: 'emotional_hopelessness',
          questionText: 'How often do you feel hopeless about the future?',
          category: 'emotional',
          questionType: 'likert_5',
          options: [
            { value: 1, label: 'Never', description: 'I feel optimistic about the future' },
            { value: 2, label: 'Rarely', description: 'Occasionally feel uncertain' },
            { value: 3, label: 'Sometimes', description: 'Sometimes feel hopeless' },
            { value: 4, label: 'Often', description: 'Frequently feel hopeless' },
            { value: 5, label: 'Always', description: 'Constantly feel hopeless and despair' }
          ],
          weight: 1.5,
          order: 15
        }
      ],
      scoring: {
        method: 'weighted',
        maxScore: 100,
        riskThresholds: {
          low: 25,
          moderate: 45,
          high: 70
        },
        categoryWeights: {
          stress: 1.1,
          anxiety: 1.3,
          sleep: 0.8,
          social: 1.0,
          academic: 1.2,
          emotional: 1.4
        }
      }
    };

    // Check if questionnaire already exists
    const existingQuestionnaire = await Questionnaire.findOne({
      name: teenScreeningQuestionnaire.name,
      version: teenScreeningQuestionnaire.version
    });

    if (existingQuestionnaire) {
      console.log('✅ Teen Mental Health Screening questionnaire already exists');
      return existingQuestionnaire;
    }

    // Create the questionnaire
    const questionnaire = await Questionnaire.create(teenScreeningQuestionnaire);
    console.log('✅ Created Teen Mental Health Screening questionnaire');
    console.log(`📊 Total questions: ${questionnaire.questions.length}`);
    console.log(`🎯 Categories: ${[...new Set(questionnaire.questions.map(q => q.category))].join(', ')}`);

    return questionnaire;

  } catch (error) {
    console.error('❌ Error seeding questionnaires:', error);
    throw error;
  }
};

// Script execution
const runSeeder = async () => {
  try {
    console.log('🌱 Starting questionnaire seeding...');
    await connectDB();
    await seedQuestionnaires();
    console.log('✅ Questionnaire seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSeeder();
}

export { seedQuestionnaires };