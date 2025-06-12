const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const QuizAnswer = require('../models/QuizAnswer');
const { authenticateToken } = require('../middleware/middleware');

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

router.post('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  try {
    const quiz = new Quiz({ ...req.body, creator: req.user.userId });
    await quiz.save();
    res.status(201).json({ message: 'Quiz created', quiz });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create quiz', error: err.message });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    const { title, questions } = req.body;

    if (title !== undefined) quiz.title = title;

    if (questions !== undefined) {
      if (!Array.isArray(questions)) {
        return res.status(400).json({ message: 'Questions must be an array' });
      }

      for (const q of questions) {
        if (
          typeof q.questionText !== 'string' ||
          !Array.isArray(q.options) ||
          typeof q.correctAnswer !== 'number' ||
          q.correctAnswer < 0 ||
          q.correctAnswer >= q.options.length
        ) {
          return res.status(400).json({ message: 'Invalid question format' });
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
  if (req.user.role !== 'admin') 
    return res.status(403).json({ message: 'Forbidden' });

  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) 
      return res.status(404).json({ message: 'Quiz not found' });

    await Quiz.findByIdAndDelete(req.params.id);
    res.json({ message: 'Quiz deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete quiz', error: err.message });
  }
});

router.post('/:id/questions', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

  const { questionText, options, correctAnswer } = req.body;
  if (
    typeof questionText !== 'string' ||
    !Array.isArray(options) ||
    typeof correctAnswer !== 'number' ||
    correctAnswer < 0 ||
    correctAnswer >= options.length
  ) {
    return res.status(400).json({ message: 'Invalid question format' });
  }

  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    quiz.questions.push({ questionText, options, correctAnswer });
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


 
// ✅ ADMIN: Get quiz results with user populated
router.get('/:id/answers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can view quiz results' });
    }
 
    const results = await QuizAnswer.find({ quiz: req.params.id })
      .populate('user', 'name email') // ✅ This will now work properly
      .populate('quiz', 'title');
 
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
 
// ✅ Optional debug route
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
      const lastAttempt = await QuizAnswer.findOne({
        quiz: quizId,
        user: userId,
      }).sort({ createdAt: -1 });

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
      if (answers[i] === q.correctAnswer) score++;
    });

    const newAnswer = new QuizAnswer({
      quiz: quizId,
      user: userId,
      answers,
      score,
    });

    await newAnswer.save();
    res.status(201).json({ message: 'Quiz submitted successfully', score });

  } catch (error) {
    console.error('Quiz submission error:', error);
    res.status(500).json({ message: 'Failed to submit quiz', error: error.message });
  }
}

// ✅ Route 1: With restriction (recommended route)
router.post('/quiz/:id/submit', authenticateToken, (req, res) => {
  handleQuizSubmission(req, res, true); // true = restrict within 24 hrs
});

// ✅ Route 2: Legacy/no restriction (optional or admin/internal use)
router.post('/:id/answer', authenticateToken, (req, res) => {
  handleQuizSubmission(req, res, false); // false = allow anytime
});

router.get('/quiz/:id/last-submission', authenticateToken, async (req, res) => {
  const quizId = req.params.id;
  const userId = req.user.userId;

  try {
    const lastSubmission = await QuizAnswer.findOne({
      quiz: quizId,
      user: userId,
    }).sort({ createdAt: -1 });

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
    const lastAttempt = await QuizAnswer.findOne({
      quiz: quizId,
      user: userId,
    }).sort({ createdAt: -1 });

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

module.exports = router;
