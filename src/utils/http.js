// Định dạng phản hồi chung: { success, message?, data?, pagination? }
function sendOk(res, data, { status = 200, message, pagination } = {}) {
  const body = { success: true };
  if (message) body.message = message;
  if (data !== undefined) body.data = data;
  if (pagination) body.pagination = pagination;
  return res.status(status).json(body);
}

function parsePagination(query, { defaultLimit = 10, maxLimit = 50 } = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

function buildPagination({ page, limit }, total) {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

module.exports = { sendOk, parsePagination, buildPagination, round2 };
