// models/QuizAnswer.js
const mongoose = require('mongoose');
 
const quizAnswerSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // ✅ this is important
  answers: [Number],
  score: Number,
  terminated:{type:String,default:false},
}, { timestamps: true });
 
module.exports = mongoose.model('QuizAnswer', quizAnswerSchema);
 
 