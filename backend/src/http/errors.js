class HttpError extends Error {
  constructor(status, title, detail) {
    super(detail || title);
    this.status = status;
    this.title = title;
    this.detail = detail;
  }
}

function problem(res, status, title, detail, errors) {
  const body = { title, status };
  if (detail) body.detail = detail;
  if (errors) body.errors = errors;
  return res.status(status).json(body);
}

module.exports = { HttpError, problem };
