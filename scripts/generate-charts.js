const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// 读取数据库关系数据
const data = JSON.parse(fs.readFileSync('d:/dcprint/erp-project/scripts/db-relations.json', 'utf8'));

// 准备网络图数据
const nodes = [];
const edges = [];

// 模块颜色映射
const moduleColors = {
  system: '#5B8FF9',
  order: '#5AD8A6',
  product: '#F6BD16',
  partner: '#E864FF',
  production: '#6DC8EC',
  inventory: '#FF9845',
  finance: '#FF99C3',
  sample: '#00FF00',
  other: '#95DE64'
};

// 添加节点（表）
for (const [module, tables] of Object.entries(data.modules)) {
  tables.forEach(table => {
    nodes.push({
      id: table.name,
      label: table.name,
      comment: table.comment,
      module: module,
      rows: table.rows,
      style: {
        fill: moduleColors[module] || moduleColors.other,
        stroke: '#333',
        lineWidth: 1
      }
    });
  });
}

// 添加边（关系）
const relationTypes = {
  foreign_key: { color: '#FF4D4F', width: 3, label: '外键' },
  logical: { color: '#1890FF', width: 1.5, label: '逻辑关联' }
};

// 添加外键关系
data.foreignKeys.forEach(fk => {
  edges.push({
    source: fk.fromTable,
    target: fk.toTable,
    label: `${fk.fromColumn} → ${fk.toColumn}`,
    type: 'foreign_key',
    style: {
      stroke: relationTypes.foreign_key.color,
      lineWidth: relationTypes.foreign_key.width
    }
  });
});

// 添加逻辑关联关系
data.logicalRelations.forEach(rel => {
  edges.push({
    source: rel.fromTable,
    target: rel.toTable,
    label: `${rel.fromColumn} → ${rel.toColumn}`,
    type: 'logical',
    style: {
      stroke: relationTypes.logical.color,
      lineWidth: relationTypes.logical.width
    }
  });
});

const skillPath = 'C:/Users/snqig/.trae-cn/skills/chart-visualization';
const tempDir = 'd:/dcprint/erp-project/scripts/temp';

// 确保临时目录存在
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 生成网络图
const networkGraphPayload = {
  tool: 'generate_network_graph',
  args: {
    data: {
      nodes: nodes.slice(0, 50),
      edges: edges.slice(0, 50)
    },
    title: 'ERP 数据库表关系图',
    description: '展示数据库表之间的外键和逻辑关联关系',
    layout: 'force',
    nodeSize: 30,
    fontSize: 10,
    theme: 'default',
    width: 1200,
    height: 800
  }
};

console.log('生成网络图...');
const networkFile = path.join(tempDir, 'network-graph.json');
fs.writeFileSync(networkFile, JSON.stringify(networkGraphPayload), 'utf8');

try {
  const result = execSync(
    `node ./scripts/generate.js "${networkFile}"`,
    { cwd: skillPath, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  );
  console.log('网络图结果:', result);
} catch (error) {
  console.error('生成网络图失败:', error.message);
}

// 生成模块统计饼图
const moduleStats = Object.entries(data.modules).map(([module, tables]) => ({
  label: module,
  value: tables.length
}));

const pieChartPayload = {
  tool: 'generate_pie_chart',
  args: {
    data: moduleStats,
    title: '数据库表模块分布',
    innerRadius: 0.4,
    radius: 0.8,
    theme: 'default',
    width: 800,
    height: 600
  }
};

console.log('\n生成模块分布饼图...');
const pieFile = path.join(tempDir, 'pie-chart.json');
fs.writeFileSync(pieFile, JSON.stringify(pieChartPayload), 'utf8');

try {
  const result = execSync(
    `node ./scripts/generate.js "${pieFile}"`,
    { cwd: skillPath, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  );
  console.log('饼图结果:', result);
} catch (error) {
  console.error('生成饼图失败:', error.message);
}

// 生成关系数量柱状图
const tableRelationCount = {};

edges.forEach(edge => {
  tableRelationCount[edge.source] = (tableRelationCount[edge.source] || 0) + 1;
  tableRelationCount[edge.target] = (tableRelationCount[edge.target] || 0) + 1;
});

const topTables = Object.entries(tableRelationCount)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

const barChartPayload = {
  tool: 'generate_bar_chart',
  args: {
    data: topTables.map(([name, count]) => ({
      label: name,
      value: count
    })),
    title: '表关联数量 TOP 20',
    xField: 'label',
    yField: 'value',
    theme: 'default',
    width: 1000,
    height: 500
  }
};

console.log('\n生成关联数量柱状图...');
const barFile = path.join(tempDir, 'bar-chart.json');
fs.writeFileSync(barFile, JSON.stringify(barChartPayload), 'utf8');

try {
  const result = execSync(
    `node ./scripts/generate.js "${barFile}"`,
    { cwd: skillPath, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  );
  console.log('柱状图结果:', result);
} catch (error) {
  console.error('生成柱状图失败:', error.message);
}

console.log('\n分析完成！');
