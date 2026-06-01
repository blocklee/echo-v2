// 用默认参数测试创作事件
const code = require('fs').readFileSync('./echo_simulation.js', 'utf8');
eval(code);

const model = new EchoModel({ nCreators: 6, nUsers: 20, durationDays: 30, seed: 42 });
const result = model.run();

const createEvents = model.events.filter(e => e.type === 'create');
console.log('默认参数: 6创作者/20用户/30天');
console.log('总事件:', model.events.length);
console.log('创作事件:', createEvents.length);

if (createEvents.length > 0) {
  console.log('第一个创作事件:', JSON.stringify(createEvents[0], null, 2));
} else {
  // 检查有多少用户满足创作条件
  let eligibleCount = 0;
  model.users.forEach(u => {
    const events = u.memory.eventLog.length;
    if (events >= 3 && u.mood > 0 && u.wallet >= 5 && u.personality.openness > 0.3) {
      eligibleCount++;
      console.log(`  ${u.name}: 满足条件 (events=${events}, mood=${u.mood.toFixed(2)}, wallet=${u.wallet.toFixed(1)}, openness=${u.personality.openness.toFixed(2)})`);
    }
  });
  console.log('满足创作条件的用户:', eligibleCount);
}

// 测试更多天数
const model2 = new EchoModel({ nCreators: 6, nUsers: 20, durationDays: 60, seed: 42 });
const result2 = model2.run();
const createEvents2 = model2.events.filter(e => e.type === 'create');
console.log('\n60天模拟:');
console.log('创作事件:', createEvents2.length);
