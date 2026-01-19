const User = require('../models/User');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');

exports.getStats = async (req, res) => {
  try {
    const [users, customers, services, appointments] = await Promise.all([
      User.count(),
      Customer.count(),
      Service.count(),
      Appointment.count()
    ]);
    res.json({
      users,
      customers,
      services,
      appointments
    });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar estatísticas', error: err.message });
  }
};