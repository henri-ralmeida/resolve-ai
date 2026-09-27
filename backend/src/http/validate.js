const { problem } = require('./errors');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (result.success) {
      req.validated = result.data;
      return next();
    }

    const errors = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || source;
      (errors[key] ||= []).push(issue.message);
    }
    return problem(res, 400, 'Dados inválidos.', undefined, errors);
  };
}

module.exports = { validate };
