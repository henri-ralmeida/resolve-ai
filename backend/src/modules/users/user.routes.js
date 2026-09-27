const express = require('express');
const { requireRole } = require('../../http/auth');

function makeUserRoutes({ db, requireAuth }) {
  const router = express.Router();
  router.get('/managers', requireAuth(), requireRole('Gestor'), async (req, res) => {
    const managers = await db.user.findMany({
      where: { role: 'Gestor' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
    res.json(managers);
  });
  return router;
}

module.exports = { makeUserRoutes };
