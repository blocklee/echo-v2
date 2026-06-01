const code = require('fs').readFileSync('./echo_simulation.js', 'utf8');
eval(code);

// 测试：增加创作者数量到12，看尾部是否被发现
const model = new EchoModel({ nCreators: 12, nUsers: 30, durationDays: 30, seed: 42 });
const result = model.run();

console.log('=== 12创作者 × 30用户 × 30天 ===');
console.log('总事件:', model.events.length);

// 统计每个创作者被发现的情况
const creatorDiscovery = {};
model.assets.forEach(a => {
  creatorDiscovery[a.name] = {
    events: Object.values(a.eventCounts).reduce((s, c) => s + c, 0),
    revenue: a.revenue,
    shi: a.shiLevel,
    relationships: a.relationships.length,
  };
});

console.log('\n创作者发现情况（按事件数排序）:');
const sorted = Object.entries(creatorDiscovery).sort((a, b) => b[1].events - a[1].events);
sorted.forEach(([name, data], i) => {
  const isTail = i >= sorted.length / 2;
  console.log(`${isTail ? '【尾】' : '【头】'} ${name}: ${data.events}事件, 收入${data.revenue.toFixed(1)}, L${data.shi}, ${data.relationships}关系`);
});

// 统计头部 vs 尾部
const headEvents = sorted.slice(0, 6).reduce((s, [,d]) => s + d.events, 0);
const tailEvents = sorted.slice(6).reduce((s, [,d]) => s + d.events, 0);
console.log(`\n头部6人事件: ${headEvents}, 尾部6人事件: ${tailEvents}`);
console.log(`头部占比: ${(headEvents / (headEvents + tailEvents) * 100).toFixed(1)}%`);

// 创作事件
const createEvents = model.events.filter(e => e.type === 'create');
console.log('\n创作事件:', createEvents.length);
