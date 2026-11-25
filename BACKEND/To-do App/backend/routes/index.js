const router = require('express').Router();
const tasks = require('../controllers/taskController');

router.get('/tasks', tasks.list);
router.get('/tasks/today', tasks.today);
router.get('/tasks/:id', tasks.getOne);
router.post('/tasks', tasks.create);
router.put('/tasks/:id', tasks.update);
router.patch('/tasks/:id/status', tasks.patchStatus);
router.delete('/tasks/:id', tasks.remove);

router.get('/categories', tasks.categories);
router.get('/statistics', tasks.statistics);

module.exports = router;
