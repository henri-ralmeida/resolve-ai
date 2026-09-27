const express = require('express');
const { requireRole } = require('../../http/auth');

function indicators(groups, key) {
  return groups.map((group) => ({ label: group[key], count: group._count._all }));
}

function makeDashboardRoutes({ db, requireAuth }) {
  const router = express.Router();
  router.get('/', requireAuth(), requireRole('Gestor'), async (req, res) => {
    const [total, byStatus, byPriority, byCategory] = await Promise.all([
      db.occurrence.count(),
      db.occurrence.groupBy({ by: ['status'], _count: { _all: true } }),
      db.occurrence.groupBy({ by: ['priority'], _count: { _all: true } }),
      db.occurrence.groupBy({ by: ['category'], _count: { _all: true } }),
    ]);
    res.json({
      total,
      byStatus: indicators(byStatus, 'status'),
      byPriority: indicators(byPriority, 'priority'),
      byCategory: indicators(byCategory, 'category').sort((a, b) => b.count - a.count),
    });
  });
  return router;
}

module.exports = { makeDashboardRoutes };
