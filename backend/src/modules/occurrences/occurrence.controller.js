function makeOccurrenceController(service) {
  return {
    async create(req, res) {
      const item = await service.create(req.validated, req.file, req.user);
      res.location(`/api/occurrences/${item.id}`).status(201).json(item);
    },
    async list(req, res) {
      res.json(await service.list(req.validated, req.user));
    },
    async detail(req, res) {
      res.json(await service.detail(req.params.id, req.user));
    },
    async history(req, res) {
      res.json(await service.history(req.params.id, req.user));
    },
    async addComment(req, res) {
      res.json(await service.addComment(req.params.id, req.validated, req.user));
    },
    async changePriority(req, res) {
      await service.changePriority(req.params.id, req.validated);
      res.sendStatus(204);
    },
    async assign(req, res) {
      await service.assign(req.params.id, req.validated);
      res.sendStatus(204);
    },
    async changeStatus(req, res) {
      await service.changeStatus(req.params.id, req.validated, req.user);
      res.sendStatus(204);
    },
    async setSolution(req, res) {
      await service.setSolution(req.params.id, req.validated);
      res.sendStatus(204);
    },
    async evaluate(req, res) {
      await service.evaluate(req.params.id, req.validated, req.user);
      res.sendStatus(204);
    },
  };
}

module.exports = { makeOccurrenceController };
