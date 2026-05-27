const User = require('../models/User');
const Customer = require('../models/Customer');
const Service = require('../models/Service');
const Appointment = require('../models/Appointment');
const Tenant = require('../models/Tenant');
const sequelize = require('../config/db');
const { QueryTypes } = require('sequelize');

let completedAppointmentsTableReady = false;

const ensureCompletedAppointmentsTable = async () => {
  if (completedAppointmentsTableReady) return;

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS completed_appointments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenant_id INT NOT NULL,
      appointment_id INT NULL,
      service_id INT NULL,
      professional_id INT NULL,
      customer_phone VARCHAR(20) NULL,
      appointment_date DATE NULL,
      appointment_time TIME NULL,
      revenue_value DECIMAL(10,2) NOT NULL DEFAULT 0,
      completed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_completed_tenant_month (tenant_id, completed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  completedAppointmentsTableReady = true;
};

const toMinutes = (timeValue) => {
  const [h, m] = String(timeValue || '').split(':');
  if (h == null || m == null) return null;
  return (Number(h) * 60) + Number(m);
};

const formatDateTime = (dateValue, timeValue) => {
  const date = String(dateValue || '');
  const time = String(timeValue || '').slice(0, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return `${date} ${time}`.trim();
  const [year, month, day] = date.split('-');
  return `${day}/${month} ${time}`.trim();
};

const formatBirthday = (dateValue) => {
  const date = String(dateValue || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
};

exports.getStats = async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant nao identificado.' });
    }

    const now = new Date();
    // Usar hora local (TZ=America/Sao_Paulo no container) para evitar desvio UTC
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const nowMinutes = (now.getHours() * 60) + now.getMinutes();
    const currentMonth = now.getMonth() + 1;

    const [totalClients, customerRows, monthAppointments, allAppointments] = await Promise.all([
      Customer.count({ where: { tenantId } }),
      sequelize.query(
        'SELECT phone, name, DATE_FORMAT(birth_date, \'%Y-%m-%d\') AS birthDate FROM customers WHERE tenant_id = :tenantId',
        { replacements: { tenantId }, type: QueryTypes.SELECT }
      ),
      Appointment.findAll({
        where: { tenantId },
        include: [{ model: Service, as: 'service', attributes: ['name', 'price'] }]
      }),
      Appointment.findAll({
        where: { tenantId },
        include: [
          { model: Customer, as: 'customer', attributes: ['name'] },
          { model: Service, as: 'service', attributes: ['name', 'price'] }
        ],
        order: [['appointmentDate', 'ASC'], ['appointmentTime', 'ASC']]
      })
    ]);

    const todaysAppointments = allAppointments.filter((appointment) => {
      const plain = typeof appointment.get === 'function' ? appointment.get({ plain: true }) : appointment;
      return String(plain.appointmentDate) === today;
    });

    const upcomingAppointments = allAppointments
      .map((appointment) => (typeof appointment.get === 'function' ? appointment.get({ plain: true }) : appointment))
      .filter((appointment) => {
        const date = String(appointment.appointmentDate || '');
        if (date > today) return true;
        if (date < today) return false;

        const appointmentMinutes = toMinutes(appointment.appointmentTime);
        return appointmentMinutes !== null && appointmentMinutes >= nowMinutes;
      })
      .slice(0, 8)
      .map((appointment) => ({
        id: appointment.id,
        client: appointment.customer?.name || 'Cliente',
        service: appointment.service?.name || 'Servico',
        time: formatDateTime(appointment.appointmentDate, appointment.appointmentTime),
        status: 'confirmed'
      }));

    const fallbackRecentAppointments = allAppointments
      .map((appointment) => (typeof appointment.get === 'function' ? appointment.get({ plain: true }) : appointment))
      .sort((a, b) => {
        const aDateTime = `${a.appointmentDate || ''} ${String(a.appointmentTime || '').slice(0, 5)}`;
        const bDateTime = `${b.appointmentDate || ''} ${String(b.appointmentTime || '').slice(0, 5)}`;
        return bDateTime.localeCompare(aDateTime);
      })
      .slice(0, 8)
      .map((appointment) => ({
        id: appointment.id,
        client: appointment.customer?.name || 'Cliente',
        service: appointment.service?.name || 'Servico',
        time: formatDateTime(appointment.appointmentDate, appointment.appointmentTime),
        status: 'confirmed'
      }));

    let monthlyRevenue = 0;
    try {
      await ensureCompletedAppointmentsTable();

      const monthlyRevenueResult = await sequelize.query(
        `
          SELECT COALESCE(SUM(revenue_value), 0) AS monthlyRevenue, COUNT(*) AS totalCompleted
          FROM completed_appointments
          WHERE tenant_id = :tenantId
            AND YEAR(completed_at) = :year
            AND MONTH(completed_at) = :month
        `,
        {
          replacements: {
            tenantId,
            year: now.getFullYear(),
            month: currentMonth
          },
          type: QueryTypes.SELECT
        }
      );

      const totalCompleted = Number(monthlyRevenueResult?.[0]?.totalCompleted || 0);
      monthlyRevenue = Number(monthlyRevenueResult?.[0]?.monthlyRevenue || 0);
      if (Number.isNaN(monthlyRevenue)) {
        monthlyRevenue = 0;
      }
    } catch (error) {
      // Em caso de erro na consulta de concluídos, mantém faturamento zerado.
      monthlyRevenue = 0;
    }

    const appointmentsForServiceMetrics = allAppointments
      .map((appointment) => (typeof appointment.get === 'function' ? appointment.get({ plain: true }) : appointment));

    const topServicesMap = appointmentsForServiceMetrics.reduce((acc, appointment) => {
      const serviceName = appointment.service?.name || 'Servico';
      const current = acc.get(serviceName) || { name: serviceName, count: 0, revenueValue: 0 };
      const price = Number(appointment.service?.price || 0);
      current.count += 1;
      current.revenueValue += Number.isNaN(price) ? 0 : price;
      acc.set(serviceName, current);
      return acc;
    }, new Map());

    const topServices = Array.from(topServicesMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((service) => ({
        name: service.name,
        count: service.count,
        revenue: `R$ ${service.revenueValue.toFixed(2)}`
      }));

    const birthdays = customerRows
      .filter((customer) => {
        if (!customer.birthDate) return false;
        const date = new Date(`${customer.birthDate}T00:00:00`);
        return !Number.isNaN(date.getTime()) && (date.getMonth() + 1) === currentMonth;
      })
      .slice(0, 8)
      .map((customer) => ({
        name: customer.name,
        phone: customer.phone,
        date: formatBirthday(customer.birthDate)
      }));

    const tenant = await Tenant.findByPk(tenantId, { attributes: ['name', 'companyName'] });
    const tenantName = tenant?.companyName || tenant?.name || 'nossa barbearia';

    res.json({
      totalClients,
      totalAppointments: todaysAppointments.length,
      monthlyRevenue,
      tenantName,
      servicesPerformed: allAppointments
        .map(a => (typeof a.get === 'function' ? a.get({ plain: true }) : a))
        .filter(a => a.status === 'concluido').length,
      recentAppointments: upcomingAppointments.length ? upcomingAppointments : fallbackRecentAppointments,
      topServices,
      birthdays
    });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar estatísticas', error: err.message });
  }
};