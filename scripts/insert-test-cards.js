const mysql = require('mysql2/promise');

const dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: 'Snqig521223',
  database: 'vnerpdacahng',
};

async function cleanupAndInsert() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected');

    await connection.execute('DELETE FROM prd_standard_card WHERE card_no LIKE "SC20260317%"');
    console.log('Deleted old test data');

    const testData = [
      {
        card_no: 'SC20260317001',
        customer_name: '华为技术有限公司',
        customer_code: 'HW001',
        product_name: '手机保护膜',
        version: 'V1.0',
        date: '2026-03-17',
        document_code: 'DOC001',
        finished_size: '150mm x 80mm',
        tolerance: '±0.5mm',
        material_name: 'PET薄膜',
        material_type: '硬胶',
        layout_type: '排版方式1',
        spacing: '2mm',
        spacing_value: '2',
        sheet_width: '150',
        sheet_length: '300',
        core_type: '3#',
        paper_direction: '横向',
        roll_width: '150',
        paper_edge: '5mm',
        standard_usage: '1000片/卷',
        jump_distance: '2mm',
        process_flow1: '印刷->覆膜->模切',
        process_flow2: '印刷->覆膜->模切->包装',
        print_type: '胶印',
        first_jump_distance: '2mm',
        sequences: JSON.stringify([
          { id: 1, color: '黑色', inkCode: 'K001', linCode: 'L001', platePosition: 'A1', plateCode: 'P001', mesh: '300', storage: '仓库1' },
          { id: 2, color: '红色', inkCode: 'R001', linCode: 'L002', platePosition: 'A2', plateCode: 'P002', mesh: '300', storage: '仓库1' },
        ]),
        film_manufacturer: '杜邦公司',
        film_code: 'F001',
        film_size: '150mm x 80mm',
        process_method: '模切',
        stamping_method: '冲压成型',
        mold_code: 'M001',
        layout_method: '排版1',
        layout_way: '横排',
        jump_distance2: '2mm',
        mylar_material: '麦拉材料1',
        mylar_specs: '150x80',
        mylar_layout: '横排',
        mylar_jump: '2mm',
        adhesive_type: '背胶1',
        adhesive_manufacturer: '3M公司',
        adhesive_code: 'A001',
        adhesive_size: '150x80',
        dashed_knife: 1,
        slice_per_row: '10',
        slice_per_roll: '1000',
        slice_per_bundle: '100',
        slice_per_bag: '50',
        slice_per_box: '20',
        back_knife_mold: '仓库存放1',
        back_mylar_mold: '仓库存放2',
        release_paper_code: 'R001',
        release_paper_type: '离型纸1',
        release_paper_specs: '150x80',
        padding_material: '泡棉',
        packing_material: '纸箱',
        special_color: '专色1',
        color_formula: '配方1',
        file_path: 'D:/files/test1.pdf',
        sample_info: '样品信息1',
        notes: '注意事项1',
        creator: '张三',
        reviewer: '李四',
        factory_manager: '王五',
        quality_manager: '赵六',
        sales: '钱七',
        approver: '孙八',
        glue_type: '硬胶',
        packing_type: '包装',
        status: 1,
      },
      {
        card_no: 'SC20260317002',
        customer_name: '小米科技有限公司',
        customer_code: 'XM002',
        product_name: '平板电脑保护套',
        version: 'V2.0',
        date: '2026-03-17',
        document_code: 'DOC002',
        finished_size: '250mm x 180mm',
        tolerance: '±1mm',
        material_name: 'PU皮革',
        material_type: '软胶',
        layout_type: '排版方式2',
        spacing: '3mm',
        spacing_value: '3',
        sheet_width: '250',
        sheet_length: '350',
        core_type: '2#',
        paper_direction: '纵向',
        roll_width: '250',
        paper_edge: '8mm',
        standard_usage: '500片/卷',
        jump_distance: '3mm',
        process_flow1: '印刷->覆膜->冲压->包装',
        process_flow2: '印刷->覆膜->冲压->质检->包装',
        print_type: '片料丝印',
        first_jump_distance: '3mm',
        sequences: JSON.stringify([
          { id: 1, color: '蓝色', inkCode: 'B001', linCode: 'L003', platePosition: 'B1', plateCode: 'P003', mesh: '250', storage: '仓库2' },
          { id: 2, color: '白色', inkCode: 'W001', linCode: 'L004', platePosition: 'B2', plateCode: 'P004', mesh: '250', storage: '仓库2' },
          { id: 3, color: '金色', inkCode: 'G001', linCode: 'L005', platePosition: 'B3', plateCode: 'P005', mesh: '250', storage: '仓库2' },
        ]),
        film_manufacturer: '巴斯夫公司',
        film_code: 'F002',
        film_size: '250mm x 180mm',
        process_method: '冲压',
        stamping_method: '激光切割',
        mold_code: 'M002',
        layout_method: '排版2',
        layout_way: '竖排',
        jump_distance2: '3mm',
        mylar_material: '麦拉材料2',
        mylar_specs: '250x180',
        mylar_layout: '竖排',
        mylar_jump: '3mm',
        adhesive_type: '背胶2',
        adhesive_manufacturer: '德莎公司',
        adhesive_code: 'A002',
        adhesive_size: '250x180',
        dashed_knife: 0,
        slice_per_row: '8',
        slice_per_roll: '500',
        slice_per_bundle: '50',
        slice_per_bag: '25',
        slice_per_box: '10',
        back_knife_mold: '仓库存放3',
        back_mylar_mold: '仓库存放4',
        release_paper_code: 'R002',
        release_paper_type: '离型纸2',
        release_paper_specs: '250x180',
        padding_material: '海绵',
        packing_material: '塑料袋',
        special_color: '专色2',
        color_formula: '配方2',
        file_path: 'D:/files/test2.jpg',
        sample_info: '样品信息2',
        notes: '注意事项2',
        creator: '周九',
        reviewer: '吴十',
        factory_manager: '郑十一',
        quality_manager: '陈十二',
        sales: '刘十三',
        approver: '黄十四',
        glue_type: '软胶',
        packing_type: 'PCS/箱',
        status: 1,
      },
    ];

    const columns = [
      'card_no', 'customer_name', 'customer_code', 'product_name', 'version', 'date',
      'document_code', 'finished_size', 'tolerance', 'material_name', 'material_type',
      'layout_type', 'spacing', 'spacing_value', 'sheet_width', 'sheet_length',
      'core_type', 'paper_direction', 'roll_width', 'paper_edge', 'standard_usage',
      'jump_distance', 'process_flow1', 'process_flow2', 'print_type',
      'first_jump_distance', 'sequences', 'film_manufacturer', 'film_code', 'film_size',
      'process_method', 'stamping_method', 'mold_code', 'layout_method', 'layout_way',
      'jump_distance2', 'mylar_material', 'mylar_specs', 'mylar_layout', 'mylar_jump',
      'adhesive_type', 'adhesive_manufacturer', 'adhesive_code', 'adhesive_size',
      'dashed_knife', 'slice_per_row', 'slice_per_roll', 'slice_per_bundle',
      'slice_per_bag', 'slice_per_box', 'back_knife_mold', 'back_mylar_mold',
      'release_paper_code', 'release_paper_type', 'release_paper_specs',
      'padding_material', 'packing_material', 'special_color', 'color_formula',
      'file_path', 'sample_info', 'notes', 'creator', 'reviewer', 'factory_manager',
      'quality_manager', 'sales', 'approver', 'glue_type', 'packing_type', 'status'
    ];

    for (const data of testData) {
      const values = columns.map(col => {
        const val = data[col];
        if (col === 'dashed_knife') return val === undefined ? 0 : val;
        if (col === 'status') return val === undefined ? 1 : val;
        return val === undefined ? '' : val;
      });
      const placeholders = columns.map(() => '?').join(', ');
      
      const sql = `INSERT INTO prd_standard_card (${columns.join(', ')}, create_time, update_time, deleted) VALUES (${placeholders}, NOW(), NOW(), 0)`;
      
      await connection.execute(sql, values);
      console.log(`✅ Inserted: ${data.card_no} - ${data.product_name}`);
    }

    console.log('\n✅ Completed!');
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

cleanupAndInsert();
