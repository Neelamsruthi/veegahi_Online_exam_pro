// routes/quiz.js
const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const QuizAnswer = require('../models/QuizAnswer');
const { authenticateToken, authorizeRoles } = require('../middleware/middleware');
const User = require('../models/User');



// routes/userRoutes.js or wherever this is
router.get('/distinct', async (req, res) => {
  try {
    console.log("GET /distinct hit");

    // Get all users with college and branch defined
    const users = await User.find({
      collegeName: { $ne: null },
      branch: { $ne: null }
    });

    const collegeMap = {};

    users.forEach(user => {
      const college = user.collegeName;
      const branch = user.branch;

      if (!collegeMap[college]) {
        collegeMap[college] = new Set();
      }
      collegeMap[college].add(branch);
    });

    const result = Object.keys(collegeMap).map(college => ({
      name: college,
      branches: Array.from(collegeMap[college])
    }));

    res.json({ colleges: result });

  } catch (err) {
    console.error("Error fetching distinct values:", err);
    res.status(500).json({ message: "Server error while fetching distinct values" });
  }
});
router.post('/assign', authenticateToken, async (req, res) => {
  const { quizId, collegeName, branch } = req.body;

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const alreadyAssigned = quiz.assignedTargets.some(
      (target) => target.collegeName === collegeName && target.branch === branch
    );

    if (!alreadyAssigned) {
      quiz.assignedTargets.push({ collegeName, branch });
      await quiz.save();
    }

    res.json({ message: 'Quiz assigned successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});


// ---------- PUBLIC: Get all quizzes ----------
router.get('/', async (req, res) => {
  try {
    const quizzes = await Quiz.find();
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch quizzes', error: err.message });
  }
});


// ---------- ADMIN ROUTES ----------
router.get('/admin', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  try {
    const quizzes = await Quiz.find();

    const quizzesWithCounts = await Promise.all(
      quizzes.map(async (quiz) => {
        const count = await QuizAnswer.countDocuments({ quiz: quiz._id });
        return { ...quiz.toObject(), submissionsCount: count };
      })
    );

    res.json(quizzesWithCounts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch quizzes', error: err.message });
  }
});

// Create Quiz (Admin Only)
router.post('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const { title, description, category, subcategory, questions } = req.body;

    // Basic Validation
    if (!title || !description || !category || !subcategory || !Array.isArray(questions)) {
      return res.status(400).json({ message: 'All fields are required including category, subcategory, and questions.' });
    }

    const formattedQuestions = questions.map((q) => {
      if (q.type === 'mcq') {
        if (
          !q.questionText ||
          !Array.isArray(q.options) ||
          q.correctAnswer === undefined ||
          q.correctAnswer === null
        ) {
          throw new Error('Missing fields in MCQ question');
        }

        // Optional: Validate correctAnswer index range
        if (q.correctAnswer <= 0 || q.correctAnswer > q.options.length) {
          throw new Error('Correct answer index out of range');
        }

        return {
          questionText: q.questionText,
          type: 'mcq',
          options: q.options,
          correctAnswer: q.correctAnswer
        };
      } else if (q.type === 'fill_blank') {
        if (!q.questionText || !q.correctAnswer) {
          throw new Error('Missing fields in fill_blank question');
        }

        return {
          questionText: q.questionText,
          type: 'fill_blank',
          correctAnswer: q.correctAnswer
        };
      } else {
        throw new Error('Invalid question type');
      }
    });

    const quiz = new Quiz({
      title,
      description,
      category,
      subcategory,
      questions: formattedQuestions,
      creator: req.user.userId
    });

    await quiz.save();

    res.status(201).json({ message: 'Quiz created successfully', quiz });
  } catch (err) {
    console.error('Error creating quiz:', err.message);
    res.status(500).json({ message: 'Failed to create quiz', error: err.message });
  }
});




router.put('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    const { title, questions, category, subcategory } = req.body;

    if (title !== undefined) quiz.title = title;
    if (category !== undefined) quiz.category = category;
    if (subcategory !== undefined) quiz.subcategory = subcategory;

    if (questions !== undefined) {
      if (!Array.isArray(questions)) {
        return res.status(400).json({ message: 'Questions must be an array' });
      }

      for (const q of questions) {
        if (typeof q.questionText !== 'string' || typeof q.type !== 'string') {
          return res.status(400).json({ message: 'Invalid question format' });
        }
        if (q.type === 'mcq') {
          if (!Array.isArray(q.options) || typeof q.correctAnswer !== 'number') {
            return res.status(400).json({ message: 'Invalid MCQ format' });
          }
        } else if (q.type === 'fill_blank') {
          if (typeof q.correctAnswer !== 'string') {
            return res.status(400).json({ message: 'Invalid Fill-in-the-Blank format' });
          }
        } else {
          return res.status(400).json({ message: 'Unsupported question type' });
        }
      }

      quiz.questions = questions;
    }

    await quiz.save();
    res.json({ message: 'Quiz updated', quiz });

  } catch (err) {
    res.status(500).json({ message: 'Failed to update quiz', error: err.message });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    await Quiz.findByIdAndDelete(req.params.id);
    res.json({ message: 'Quiz deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete quiz', error: err.message });
  }
});

router.post('/:id/questions', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  const { questionText, type, options, correctAnswer } = req.body;

  if (typeof questionText !== 'string' || typeof type !== 'string') {
    return res.status(400).json({ message: 'Invalid question format' });
  }

  if (type === 'mcq') {
    if (!Array.isArray(options) || typeof correctAnswer !== 'number') {
      return res.status(400).json({ message: 'Invalid MCQ format' });
    }
  } else if (type === 'fill_blank') {
    if (typeof correctAnswer !== 'string') {
      return res.status(400).json({ message: 'Invalid Fill-in-the-Blank format' });
    }
  } else {
    return res.status(400).json({ message: 'Unsupported question type' });
  }

  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    quiz.questions.push({ questionText, type, options, correctAnswer });
    await quiz.save();
    res.json({ message: 'Question added', quiz });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add question', error: err.message });
  }
});

router.delete('/:id/questions/:index', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  const index = parseInt(req.params.index);
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    if (index < 0 || index >= quiz.questions.length) {
      return res.status(400).json({ message: 'Invalid question index' });
    }

    quiz.questions.splice(index, 1);
    await quiz.save();
    res.json({ message: 'Question deleted', quiz });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete question', error: err.message });
  }
});


// ---------- STUDENT ROUTES ----------
router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get quiz', error: err.message });
  }
});

router.get('/:id/answers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view quiz results' });
    }

    const results = await QuizAnswer.find({ quiz: req.params.id })
      .populate('user', 'name email')
      .populate('quiz', 'title');

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/test-populate', async (req, res) => {
  try {
    const oneAnswer = await QuizAnswer.findOne().populate('user', 'name email');
    res.json(oneAnswer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function handleQuizSubmission(req, res, restrict = false) {
  const quizId = req.params.id;
  const userId = req.user.userId;

  try {
    if (restrict) {
      const lastAttempt = await QuizAnswer.findOne({ quiz: quizId, user: userId }).sort({ createdAt: -1 });
      if (lastAttempt) {
        const hoursSinceLastAttempt = (Date.now() - new Date(lastAttempt.createdAt)) / (1000 * 60 * 60);
        if (hoursSinceLastAttempt < 24) {
          return res.status(403).json({
            message: `You can attempt this quiz again after ${Math.ceil(24 - hoursSinceLastAttempt)} hours.`,
          });
        }
      }
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const { answers } = req.body;
    let score = 0;

    quiz.questions.forEach((q, i) => {
      const submittedAnswer = answers[i];
      const correctAnswer = q.correctAnswer;

      if (q.type === 'mcq' && submittedAnswer === correctAnswer) {
        score++;
      } else if (q.type === 'fill_blank' && typeof submittedAnswer === 'string') {
        if (submittedAnswer.trim().toLowerCase() === String(correctAnswer).trim().toLowerCase()) {
          score++;
        }
      }
    });

    const newAnswer = new QuizAnswer({
      quiz: quizId,
      user: userId,
      answers,
      score,
      terminated: false,
    });

    await newAnswer.save();
    res.status(201).json({ message: 'Quiz submitted successfully', score });
  } catch (error) {
    console.error('Quiz submission error:', error);
    res.status(500).json({ message: 'Failed to submit quiz', error: error.message });
  }
}




// ✅ BACKEND CHANGES (Express)
// In your quiz submission route (/api/quizzes/:id/submit), update this:
router.post('/:id/answer', authenticateToken, async (req, res) => {
  try {
    console.log('Received answers:', JSON.stringify(req.body.answers, null, 2));

    const quizId = req.params.id;
    const userId = req.user.userId;
    const { answers, terminated = false } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    // Check 24-hour restriction
    const lastAttempt = await QuizAnswer.findOne({ quiz: quizId, user: userId }).sort({ createdAt: -1 });
    if (lastAttempt && (Date.now() - lastAttempt.createdAt.getTime()) < 24 * 60 * 60 * 1000) {
      return res.status(400).json({ message: 'You can only attempt this quiz once every 24 hours.' });
    }

    // Basic validation
    if (!Array.isArray(answers) || answers.length !== quiz.questions.length) {
      return res.status(400).json({ message: 'Invalid answer format.' });
    }

    let score = 0;
answers.forEach((userAnswer, index) => {
  const question = quiz.questions[index];
  if (!question || !userAnswer) return;

  if (question.type === "mcq") {
    if (parseInt(userAnswer.answer) === parseInt(question.correctAnswer)) {
      score++;
    }
  } else if (question.type === "fill_blank") {
    const correct = String(question.correctAnswer || '').trim().toLowerCase();
    const submitted = String(userAnswer.answer || '').trim().toLowerCase();
    if (correct === submitted) {
      score++;
    }
  }
});


    const submission = new QuizAnswer({
      quiz: quizId,
      user: userId,
      answers,
      score,
      terminated
    });

    await submission.save();

    res.status(200).json({ message: 'Quiz submitted successfully', score });
  } catch (err) {
    console.error('Error in /quizzes/:id/submit:', err);
    res.status(500).json({ message: 'Server error during quiz submission' });
  }
});


router.get('/quiz/:id/last-submission', authenticateToken, async (req, res) => {
  const quizId = req.params.id;
  const userId = req.user.userId;

  try {
    const lastSubmission = await QuizAnswer.findOne({ quiz: quizId, user: userId }).sort({ createdAt: -1 });
    if (!lastSubmission) {
      return res.status(404).json({ message: 'No submission found' });
    }
    res.json(lastSubmission);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch last submission' });
  }
});

router.get('/:id/check-attempt', authenticateToken, async (req, res) => {
  const quizId = req.params.id;
  const userId = req.user.userId;

  try {
    const lastAttempt = await QuizAnswer.findOne({ quiz: quizId, user: userId }).sort({ createdAt: -1 });

    if (!lastAttempt || !lastAttempt.createdAt) {
      return res.json({ attempted: false });
    }

    const createdAt = new Date(lastAttempt.createdAt);
    const hoursSinceLastAttempt = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastAttempt < 24) {
      return res.json({
        attempted: true,
        message: `You can retake this quiz after ${Math.ceil(24 - hoursSinceLastAttempt)} hours.`,
      });
    } else {
      return res.json({ attempted: false });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error checking attempt status' });
  }
});
// PUT /api/quizzes/:id/assign
// POST /api/quizzes/assign
router.post('/assign', authenticateToken, async (req, res) => {
  console.log("🚀 /assign route hit");

  try {
    const { quizId, collegeName, branch } = req.body;
    console.log("📥 Request body:", req.body);
    console.log("👤 Authenticated user:", req.user);

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      console.log("⚠️ Quiz not found");
      return res.status(404).json({ message: "Quiz not found" });
    }

    quiz.assignedTargets.push({ collegeName, branch });
    await quiz.save();

    console.log("✅ Quiz assigned");
    res.json({ message: "Quiz assigned successfully" });
  } catch (error) {
    console.error("🔥 Error in /assign route:", error);
    res.status(500).json({ message: "Server error", error });
  }
});


router.get(
  '/student/assigned',
  authenticateToken,
  authorizeRoles('student'),
  async (req, res) => {
    try {
      // 1️⃣ Get student from DB
      const student = await User.findById(req.user.userId);
      if (!student || student.role !== 'student') {
        return res
          .status(403)
          .json({ message: 'Access denied. Not a student.' });
      }

      // 2️⃣ Normalize values
      const normalizedCollege = student.collegeName?.trim();
      const normalizedBranch = student.branch?.trim();

      if (!normalizedCollege || !normalizedBranch) {
        return res
          .status(400)
          .json({ message: 'Incomplete student profile.' });
      }

      // 3️⃣ Debug: Show all assignedTargets in DB
      const allQuizzes = await Quiz.find();
      console.log('🔍 All quizzes and assignedTargets:');
      allQuizzes.forEach((q) => {
        console.log(`- ${q.title}:`, q.assignedTargets);
      });

      console.log('🎯 Student info for matching:', {
        college: normalizedCollege,
        branch: normalizedBranch,
      });

      // 4️⃣ Query with flexible match
      const quizzes = await Quiz.find({
        assignedTargets: {
          $elemMatch: {
            collegeName: { $regex: normalizedCollege, $options: 'i' },
            branch: { $regex: normalizedBranch, $options: 'i' },
          },
        },
      });

      console.log('✅ Quizzes found for student:', quizzes);
      return res.status(200).json(quizzes);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error' });
    }
  }
);



module.exports = router;