// 用前端默认参数和默认seed测试
const code = require('fs').readFileSync('./echo_simulation.js', 'utf8');
eval(code);

const model = new EchoModel({ nCreators: 6, nUsers: 20, durationDays: 30, seed: 42 });
const result = model.run();

const createEvents = model.events.filter(e => e.type === 'create');
console.log('默认参数 (seed=42):');
console.log('总事件:', model.events.length);
console.log('创作事件:', createEvents.length);

if (createEvents.length > 0) {
  console.log('创作事件天数分布:');
  const dayCounts = {};
  createEvents.forEach(e => {
    dayCounts[e.day] = (dayCounts[e.day] || 0) + 1;
  });
  Object.entries(dayCounts).sort((a,b) => a[0]-b[0]).forEach(([day, count]) => {
    console.log(`  第${day}天: ${count}次`);
  });
} else {
  console.log('没有创作事件');
  
  // 检查原因
  let eligibleCount = 0;
  model.users.forEach(u => {
    const events = u.memory.eventLog.length;
    const meetsCriteria = events >= 3 && u.mood > 0 && u.wallet >= 5 && u.personality.openness > 0.3;
    if (meetsCriteria) eligibleCount++;
  });
  console.log('满足条件的用户:', eligibleCount);
}
