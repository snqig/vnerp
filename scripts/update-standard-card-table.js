const mysql = require('mysql2/promise');

const dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
  charset: 'utf8mb4',
};

async function updateTable() {
  let connection;
  try {
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database successfully!');

    console.log('Adding columns to prd_standard_card table...');

    const columns = [
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `document_code` VARCHAR(50) COMMENT '文件编号' AFTER `date`", name: 'document_code' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `spacing` VARCHAR(20) COMMENT '间距' AFTER `layout_type`", name: 'spacing' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `spacing_value` VARCHAR(20) COMMENT '间距值' AFTER `spacing`", name: 'spacing_value' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `sheet_width` VARCHAR(20) COMMENT '片材宽' AFTER `spacing_value`", name: 'sheet_width' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `sheet_length` VARCHAR(20) COMMENT '片材长' AFTER `sheet_width`", name: 'sheet_length' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `core_type` VARCHAR(50) COMMENT '纸芯类型' AFTER `sheet_length`", name: 'core_type' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `paper_direction` VARCHAR(20) COMMENT '纸向' AFTER `core_type`", name: 'paper_direction' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `roll_width` VARCHAR(20) COMMENT '料宽' AFTER `paper_direction`", name: 'roll_width' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `paper_edge` VARCHAR(20) COMMENT '纸边' AFTER `roll_width`", name: 'paper_edge' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `standard_usage` VARCHAR(50) COMMENT '标准用量' AFTER `paper_edge`", name: 'standard_usage' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `jump_distance` VARCHAR(20) COMMENT '跳距' AFTER `standard_usage`", name: 'jump_distance' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `process_flow1` VARCHAR(100) COMMENT '工艺流程1' AFTER `jump_distance`", name: 'process_flow1' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `process_flow2` VARCHAR(100) COMMENT '工艺流程2' AFTER `process_flow1`", name: 'process_flow2' },
      { sql: "ALTER TABLE `prd_standard_card` MODIFY COLUMN `print_type` VARCHAR(50) COMMENT '表面处理'", name: 'print_type' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `first_jump_distance` VARCHAR(20) COMMENT '第一跳距' AFTER `print_type`", name: 'first_jump_distance' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `sequences` JSON COMMENT '印序数据' AFTER `first_jump_distance`", name: 'sequences' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `film_manufacturer` VARCHAR(100) COMMENT '膜厂商' AFTER `sequences`", name: 'film_manufacturer' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `film_code` VARCHAR(50) COMMENT '膜编号' AFTER `film_manufacturer`", name: 'film_code' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `film_size` VARCHAR(50) COMMENT '膜规格' AFTER `film_code`", name: 'film_size' },
      { sql: "ALTER TABLE `prd_standard_card` MODIFY COLUMN `process_method` VARCHAR(50) COMMENT '工艺方式'", name: 'process_method' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `stamping_method` VARCHAR(50) COMMENT '冲压方法' AFTER `process_method`", name: 'stamping_method' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `layout_method` VARCHAR(50) COMMENT '排版方式' AFTER `stamping_method`", name: 'layout_method' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `layout_way` VARCHAR(50) COMMENT '排版方向' AFTER `layout_method`", name: 'layout_way' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `jump_distance2` VARCHAR(20) COMMENT '跳距2' AFTER `layout_way`", name: 'jump_distance2' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `mylar_material` VARCHAR(100) COMMENT '麦拉材料' AFTER `jump_distance2`", name: 'mylar_material' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `mylar_specs` VARCHAR(50) COMMENT '麦拉规格' AFTER `mylar_material`", name: 'mylar_specs' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `mylar_layout` VARCHAR(50) COMMENT '麦拉排版' AFTER `mylar_specs`", name: 'mylar_layout' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `mylar_jump` VARCHAR(20) COMMENT '麦拉跳距' AFTER `mylar_layout`", name: 'mylar_jump' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `adhesive_type` VARCHAR(50) COMMENT '背胶种类' AFTER `mylar_jump`", name: 'adhesive_type' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `adhesive_manufacturer` VARCHAR(100) COMMENT '背胶厂商' AFTER `adhesive_type`", name: 'adhesive_manufacturer' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `adhesive_code` VARCHAR(50) COMMENT '背胶编号' AFTER `adhesive_manufacturer`", name: 'adhesive_code' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `adhesive_size` VARCHAR(50) COMMENT '背胶尺寸' AFTER `adhesive_code`", name: 'adhesive_size' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `dashed_knife` TINYINT DEFAULT 0 COMMENT '加虚线刀: 0-否, 1-是' AFTER `adhesive_size`", name: 'dashed_knife' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `slice_per_row` VARCHAR(20) COMMENT 'PCS/排' AFTER `dashed_knife`", name: 'slice_per_row' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `slice_per_roll` VARCHAR(20) COMMENT 'PCS/卷' AFTER `slice_per_row`", name: 'slice_per_roll' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `slice_per_bundle` VARCHAR(20) COMMENT 'PCS/扎' AFTER `slice_per_roll`", name: 'slice_per_bundle' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `slice_per_bag` VARCHAR(20) COMMENT 'PCS/袋' AFTER `slice_per_bundle`", name: 'slice_per_bag' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `slice_per_box` VARCHAR(20) COMMENT 'PCS/箱' AFTER `slice_per_bag`", name: 'slice_per_box' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `back_knife_mold` VARCHAR(50) COMMENT '背胶刀模存放' AFTER `slice_per_box`", name: 'back_knife_mold' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `back_mylar_mold` VARCHAR(50) COMMENT '背麦拉刀模存放' AFTER `back_knife_mold`", name: 'back_mylar_mold' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `release_paper_code` VARCHAR(50) COMMENT '离型纸编号' AFTER `back_mylar_mold`", name: 'release_paper_code' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `release_paper_type` VARCHAR(50) COMMENT '离型纸种类' AFTER `release_paper_code`", name: 'release_paper_type' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `release_paper_specs` VARCHAR(50) COMMENT '离型纸规格' AFTER `release_paper_type`", name: 'release_paper_specs' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `padding_material` VARCHAR(100) COMMENT '填充材料' AFTER `release_paper_specs`", name: 'padding_material' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `packing_material` VARCHAR(100) COMMENT '包装材料' AFTER `padding_material`", name: 'packing_material' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `special_color` VARCHAR(200) COMMENT '专色配比' AFTER `packing_material`", name: 'special_color' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `color_formula` VARCHAR(200) COMMENT '颜色配方' AFTER `special_color`", name: 'color_formula' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `file_path` VARCHAR(200) COMMENT '电脑图档存储路径' AFTER `color_formula`", name: 'file_path' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `sample_info` VARCHAR(200) COMMENT '样品信息' AFTER `file_path`", name: 'sample_info' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `notes` TEXT COMMENT '注意事项' AFTER `sample_info`", name: 'notes' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `creator` VARCHAR(50) COMMENT '制作' AFTER `notes`", name: 'creator' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `reviewer` VARCHAR(50) COMMENT '审核' AFTER `creator`", name: 'reviewer' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `factory_manager` VARCHAR(50) COMMENT '厂长' AFTER `reviewer`", name: 'factory_manager' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `quality_manager` VARCHAR(50) COMMENT '品管' AFTER `factory_manager`", name: 'quality_manager' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `sales` VARCHAR(50) COMMENT '业务' AFTER `quality_manager`", name: 'sales' },
      { sql: "ALTER TABLE `prd_standard_card` ADD COLUMN `approver` VARCHAR(50) COMMENT '核准' AFTER `sales`", name: 'approver' },
    ];

    for (const col of columns) {
      try {
        await connection.execute(col.sql);
        console.log(`✅ Added column: ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Column already exists: ${col.name}`);
        } else {
          console.log(`❌ Error adding column ${col.name}: ${err.message}`);
        }
      }
    }

    console.log('\n✅ Table update completed!');

    // 显示表结构
    console.log('\n📋 Current table structure:');
    const [columns_info] = await connection.execute('DESCRIBE prd_standard_card');
    console.log(`Total columns: ${columns_info.length}`);
    columns_info.forEach((col, index) => {
      console.log(`${index + 1}. ${col.Field} (${col.Type})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed.');
    }
  }
}

updateTable();
