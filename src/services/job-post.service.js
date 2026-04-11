const HrModel = require('../models/hr.model');
const JobPostModel = require('../models/job-post.model');

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function createClientError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function splitCsv(value) {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === 'string') {
          return splitCsv(item);
        }

        return [];
      })
      .filter(Boolean);
  }

  return splitCsv(value);
}

function parseJsonObjectString(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }

    return null;
  } catch (_error) {
    return null;
  }
}

function parseInteger(value, fieldName) {
  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed)) {
    throw createClientError(`${fieldName} must be a valid integer.`, 400);
  }

  if (parsed < 0) {
    throw createClientError(`${fieldName} must be greater than or equal to 0.`, 400);
  }

  return parsed;
}

function parseBooleanFormValue(value, fieldName, defaultValue = true) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true' || normalized === '1') {
      return true;
    }

    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  throw createClientError(`${fieldName} must be a boolean.`, 400);
}

function hasOwnField(body, fieldName) {
  return Object.prototype.hasOwnProperty.call(body, fieldName);
}

function hasSalaryFields(body = {}) {
  return hasOwnField(body, 'salary')
    || hasOwnField(body, 'salary_min')
    || hasOwnField(body, 'salary_max')
    || hasOwnField(body, 'salary_currency')
    || hasOwnField(body, 'salary_period')
    || hasOwnField(body, 'salary[min]')
    || hasOwnField(body, 'salary[max]')
    || hasOwnField(body, 'salary[currency]')
    || hasOwnField(body, 'salary[period]')
    || hasOwnField(body, 'min_salary')
    || hasOwnField(body, 'max_salary');
}

function buildJobPostResponse(post) {
  return {
    _id: post._id,
    title: post.title,
    description: post.description,
    requirements: post.requirements,
    salary: post.salary,
    employment_type: post.employment_type,
    work_mode: post.work_mode,
    skills: post.skills,
    posted_at: post.posted_at,
    expire_at: post.expire_at,
    application_count: post.application_count,
    is_active: post.is_active
  };
}

function parseExpireAtDDMMYYYY(value) {
  const raw = toTrimmedString(value);

  if (!raw) {
    throw createClientError('expire_at is required.', 400);
  }

  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);

  if (!match) {
    throw createClientError('expire_at must be in DD-MM-YYYY format.', 400);
  }

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);

  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() + 1 !== month
    || date.getUTCDate() !== day
  ) {
    throw createClientError('expire_at is not a valid date.', 400);
  }

  return date;
}

function resolveSalarySource(body = {}) {
  if (body.salary && typeof body.salary === 'object' && !Array.isArray(body.salary)) {
    return body.salary;
  }

  const parsedSalary = parseJsonObjectString(body.salary);

  if (parsedSalary) {
    return parsedSalary;
  }

  return {
    min: body.salary_min ?? body['salary[min]'] ?? body.min_salary,
    max: body.salary_max ?? body['salary[max]'] ?? body.max_salary,
    currency: body.salary_currency ?? body['salary[currency]'],
    period: body.salary_period ?? body['salary[period]']
  };
}

function normalizeCreateJobPostPayload(body = {}) {
  const title = toTrimmedString(body.title);
  const description = toTrimmedString(body.description);
  const requirements = normalizeStringArray(body.requirements);
  const skills = normalizeStringArray(body.skills);
  const salarySource = resolveSalarySource(body);
  const salaryMin = parseInteger(salarySource.min, 'salary.min');
  const salaryMax = parseInteger(salarySource.max, 'salary.max');
  const salaryCurrency = toTrimmedString(salarySource.currency);
  const salaryPeriod = toTrimmedString(salarySource.period);
  const employmentType = toTrimmedString(body.employment_type);
  const workMode = toTrimmedString(body.work_mode);
  const expireAt = parseExpireAtDDMMYYYY(body.expire_at);
  const isActive = parseBooleanFormValue(body.is_active, 'is_active', true);

  if (!title) {
    throw createClientError('title is required.', 400);
  }

  if (!description) {
    throw createClientError('description is required.', 400);
  }

  if (requirements.length === 0) {
    throw createClientError('requirements is required.', 400);
  }

  if (skills.length === 0) {
    throw createClientError('skills is required.', 400);
  }

  if (!salaryCurrency) {
    throw createClientError('salary.currency is required.', 400);
  }

  if (!salaryPeriod) {
    throw createClientError('salary.period is required.', 400);
  }

  if (salaryMax < salaryMin) {
    throw createClientError('salary.max must be greater than or equal to salary.min.', 400);
  }

  if (!employmentType) {
    throw createClientError('employment_type is required.', 400);
  }

  if (!workMode) {
    throw createClientError('work_mode is required.', 400);
  }

  return {
    title,
    description,
    requirements,
    salary: {
      min: salaryMin,
      max: salaryMax,
      currency: salaryCurrency,
      period: salaryPeriod
    },
    employment_type: employmentType,
    work_mode: workMode,
    skills,
    expire_at: expireAt,
    is_active: isActive
  };
}

async function getActiveConfirmedHr({ accessToken, refreshToken }) {
  const hr = await HrModel.findOne({
    access_tokens: accessToken,
    refresh_tokens: refreshToken
  });

  if (!hr) {
    throw createClientError('unauth', 401);
  }

  if (hr.is_confirmed !== true) {
    throw createClientError('confirmation required', 400);
  }

  return hr;
}

async function addJobPost({ accessToken, refreshToken, rawPayload }) {
  await getActiveConfirmedHr({ accessToken, refreshToken });
  const payload = normalizeCreateJobPostPayload(rawPayload);

  const created = await JobPostModel.create({
    title: payload.title,
    description: payload.description,
    requirements: payload.requirements,
    salary: payload.salary,
    employment_type: payload.employment_type,
    work_mode: payload.work_mode,
    skills: payload.skills,
    expire_at: payload.expire_at,
    application_count: 0,
    is_active: payload.is_active
  });

  return buildJobPostResponse(created);
}

async function updateJobPost({ accessToken, refreshToken, rawPayload = {} }) {
  await getActiveConfirmedHr({ accessToken, refreshToken });

  const postId = toTrimmedString(rawPayload._id);

  if (!postId) {
    throw createClientError('_id is required.', 400);
  }

  const post = await JobPostModel.findById(postId);

  if (!post) {
    throw createClientError('there is no post with that id', 404);
  }

  const updates = {};

  if (hasOwnField(rawPayload, 'title')) {
    const title = toTrimmedString(rawPayload.title);

    if (!title) {
      throw createClientError('title cannot be empty.', 400);
    }

    updates.title = title;
  }

  if (hasOwnField(rawPayload, 'description')) {
    const description = toTrimmedString(rawPayload.description);

    if (!description) {
      throw createClientError('description cannot be empty.', 400);
    }

    updates.description = description;
  }

  if (hasOwnField(rawPayload, 'requirements')) {
    updates.requirements = normalizeStringArray(rawPayload.requirements);
  }

  if (hasOwnField(rawPayload, 'employment_type')) {
    const employmentType = toTrimmedString(rawPayload.employment_type);

    if (!employmentType) {
      throw createClientError('employment_type cannot be empty.', 400);
    }

    updates.employment_type = employmentType;
  }

  if (hasOwnField(rawPayload, 'work_mode')) {
    const workMode = toTrimmedString(rawPayload.work_mode);

    if (!workMode) {
      throw createClientError('work_mode cannot be empty.', 400);
    }

    updates.work_mode = workMode;
  }

  if (hasOwnField(rawPayload, 'skills')) {
    updates.skills = normalizeStringArray(rawPayload.skills);
  }

  if (hasOwnField(rawPayload, 'expire_at')) {
    updates.expire_at = parseExpireAtDDMMYYYY(rawPayload.expire_at);
  }

  if (hasOwnField(rawPayload, 'is_active')) {
    updates.is_active = parseBooleanFormValue(rawPayload.is_active, 'is_active', post.is_active);
  }

  if (hasSalaryFields(rawPayload)) {
    const salarySource = resolveSalarySource(rawPayload);
    const currentSalary = {
      min: post.salary?.min,
      max: post.salary?.max,
      currency: post.salary?.currency,
      period: post.salary?.period
    };

    if (salarySource.min !== undefined) {
      currentSalary.min = parseInteger(salarySource.min, 'salary.min');
    }

    if (salarySource.max !== undefined) {
      currentSalary.max = parseInteger(salarySource.max, 'salary.max');
    }

    if (salarySource.currency !== undefined) {
      const currency = toTrimmedString(salarySource.currency);

      if (!currency) {
        throw createClientError('salary.currency cannot be empty.', 400);
      }

      currentSalary.currency = currency;
    }

    if (salarySource.period !== undefined) {
      const period = toTrimmedString(salarySource.period);

      if (!period) {
        throw createClientError('salary.period cannot be empty.', 400);
      }

      currentSalary.period = period;
    }

    if (!Number.isInteger(currentSalary.min) || !Number.isInteger(currentSalary.max)) {
      throw createClientError('salary.min and salary.max must be valid integers.', 400);
    }

    if (!currentSalary.currency || !currentSalary.period) {
      throw createClientError('salary.currency and salary.period are required.', 400);
    }

    if (currentSalary.max < currentSalary.min) {
      throw createClientError('salary.max must be greater than or equal to salary.min.', 400);
    }

    updates.salary = currentSalary;
  }

  Object.assign(post, updates);
  await post.save();

  return buildJobPostResponse(post);
}

async function getJobPosts({ accessToken, refreshToken }) {
  await getActiveConfirmedHr({ accessToken, refreshToken });

  const posts = await JobPostModel.find({}).sort({ posted_at: -1 }).lean();
  return Array.isArray(posts) ? posts : [];
}

async function deactivateExpiredJobPosts() {
  const now = new Date();
  const posts = await JobPostModel.find({ is_active: true }).select('_id expire_at is_active');

  for (const post of posts) {
    if (post.expire_at && post.expire_at.getTime() <= now.getTime()) {
      post.is_active = false;
      await post.save();
    }
  }
}

function startJobPostExpiryScheduler() {
  const runSweep = async () => {
    try {
      await deactivateExpiredJobPosts();
    } catch (error) {
      console.error('Job post expiration sweep failed:', error);
    }
  };

  runSweep();
  const intervalId = setInterval(runSweep, DAY_IN_MS);

  return () => clearInterval(intervalId);
}

module.exports = {
  addJobPost,
  getJobPosts,
  updateJobPost,
  startJobPostExpiryScheduler
};
