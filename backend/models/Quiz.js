// models/Quiz.js
const mongoose = require('mongoose');
 
const questionSchema = new mongoose.Schema({
  questionText: String,
  options: [String],
  correctAnswer: Number // index of the correct option
});
 
const quizSchema = new mongoose.Schema({
  title: String,
  description: String,
  questions: [questionSchema],
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
 
module.exports = mongoose.model('Quiz', quizSchema);