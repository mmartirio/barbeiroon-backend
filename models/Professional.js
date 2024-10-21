const mongoose = require('mongoose');

const professionalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialty: { type: String, required: true },
});

module.exports = mongoose.model('Professional', professionalSchema);
