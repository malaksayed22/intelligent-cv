const bcrypt = require('bcryptjs');
const HrModel = require('../models/hr.model');

function createClientError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function registerHr({ name, phone, email, password, is_comfirmed }) {
  const existing = await HrModel.findOne({ email: email.toLowerCase() }).lean();

  if (existing) {
    throw createClientError('Email is already registered.', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const created = await HrModel.create({
    name,
    phone,
    email,
    password: hashedPassword,
    access_token: [],
    refresh_token: [],
    is_comfirmed
  });

  return {
    _id: created._id,
    name: created.name,
    phone: created.phone,
    email: created.email,
    is_comfirmed: created.is_comfirmed
  };
}

module.exports = {
  registerHr
};
