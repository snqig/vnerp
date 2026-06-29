CREATE TABLE `bom_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`bom_id` int NOT NULL,
	`material_id` int NOT NULL,
	`quantity` decimal(15,6) NOT NULL,
	`unit` varchar(20),
	`loss_rate` decimal(5,2) DEFAULT '0',
	`sequence` int DEFAULT 0,
	`remarks` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `bom_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `boms` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`version` varchar(20) DEFAULT 'V1.0',
	`status` varchar(20) DEFAULT 'active',
	`effective_date` datetime,
	`remarks` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `boms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`short_name` varchar(100),
	`contact` varchar(50),
	`phone` varchar(50),
	`address` varchar(500),
	`credit_limit` decimal(15,2) DEFAULT '0',
	`credit_used` decimal(15,2) DEFAULT '0',
	`status` varchar(20) DEFAULT 'active',
	`remarks` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `customers_id` PRIMARY KEY(`id`),
	CONSTRAINT `customers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `cutting_details` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`record_id` int NOT NULL,
	`new_label_id` int NOT NULL,
	`new_label_no` varchar(50) NOT NULL,
	`cut_width` decimal(18,2),
	`sequence` int DEFAULT 0,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `cutting_details_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cutting_records` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`record_no` varchar(50) NOT NULL,
	`source_label_id` int NOT NULL,
	`source_label_no` varchar(50) NOT NULL,
	`cut_width_str` varchar(200),
	`original_width` decimal(18,2),
	`cut_total_width` decimal(18,2),
	`remain_width` decimal(18,2),
	`operator_id` int,
	`operator_name` varchar(50),
	`cut_time` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`remark` text,
	`status` varchar(20) DEFAULT 'active',
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `cutting_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `cutting_records_record_no_unique` UNIQUE(`record_no`)
);
--> statement-breakpoint
CREATE TABLE `defect_records` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`inspection_id` int,
	`batch_id` int,
	`defect_type` varchar(50),
	`defect_qty` decimal(15,4),
	`disposition` varchar(20),
	`status` varchar(20) DEFAULT 'pending',
	`handler_id` int,
	`handled_at` datetime,
	`remarks` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `defect_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`delivery_id` int NOT NULL,
	`batch_id` int NOT NULL,
	`quantity` decimal(15,4) NOT NULL,
	`pallet_no` varchar(50),
	`loaded_at` datetime,
	`confirmed_at` datetime,
	`status` varchar(20) DEFAULT 'pending',
	`remarks` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `delivery_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery_orders` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`delivery_no` varchar(50) NOT NULL,
	`vehicle_id` int,
	`sales_order_id` int,
	`customer_id` int,
	`delivery_address` varchar(500),
	`delivery_window` varchar(50),
	`plan_date` datetime,
	`actual_date` datetime,
	`status` varchar(20) DEFAULT 'planned',
	`total_weight` decimal(10,2),
	`total_volume` decimal(10,2),
	`remarks` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `delivery_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_orders_delivery_no_unique` UNIQUE(`delivery_no`)
);
--> statement-breakpoint
CREATE TABLE `delivery_receipts` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`delivery_id` int NOT NULL,
	`receiver_name` varchar(50),
	`receiver_phone` varchar(20),
	`received_at` datetime,
	`signature` text,
	`photos` json,
	`remarks` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `delivery_receipts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(50) NOT NULL,
	`department` varchar(50),
	`position` varchar(50),
	`phone` varchar(50),
	`status` varchar(20) DEFAULT 'active',
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `employees_id` PRIMARY KEY(`id`),
	CONSTRAINT `employees_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `equipments` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`model` varchar(100),
	`workshop` varchar(50),
	`commission_date` datetime,
	`maintenance_cycle` int,
	`last_maintenance` datetime,
	`next_maintenance` datetime,
	`status` varchar(20) DEFAULT 'active',
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `equipments_id` PRIMARY KEY(`id`),
	CONSTRAINT `equipments_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `inspection_records` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`inspection_no` varchar(50) NOT NULL,
	`type` varchar(20) NOT NULL,
	`standard_id` int,
	`batch_id` int,
	`work_order_id` int,
	`product_id` int,
	`material_id` int,
	`sample_qty` int,
	`pass_qty` int,
	`fail_qty` int,
	`result` varchar(20),
	`inspector_id` int,
	`inspected_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`inspection_data` json,
	`remarks` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `inspection_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `inspection_records_inspection_no_unique` UNIQUE(`inspection_no`)
);
--> statement-breakpoint
CREATE TABLE `inspection_standards` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`type` varchar(20) NOT NULL,
	`product_id` int,
	`material_id` int,
	`inspection_items` json,
	`status` varchar(20) DEFAULT 'active',
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `inspection_standards_id` PRIMARY KEY(`id`),
	CONSTRAINT `inspection_standards_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `inventory_batches` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`batch_no` varchar(50) NOT NULL,
	`qr_code` varchar(100),
	`material_id` int,
	`product_id` int,
	`warehouse_id` int NOT NULL,
	`location_id` int,
	`quantity` decimal(15,4) NOT NULL,
	`available_qty` decimal(15,4) NOT NULL,
	`reserved_qty` decimal(15,4) DEFAULT '0',
	`unit` varchar(20),
	`source_type` varchar(50),
	`source_no` varchar(50),
	`parent_batch_no` varchar(50),
	`expiry_date` datetime,
	`production_date` datetime,
	`status` varchar(20) DEFAULT 'available',
	`alert_level` varchar(20) DEFAULT 'normal',
	`last_alert_time` datetime,
	`inspection_status` varchar(20) DEFAULT 'pending',
	`quarantine_status` varchar(20) DEFAULT 'none',
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `inventory_batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_batches_batch_no_unique` UNIQUE(`batch_no`),
	CONSTRAINT `inventory_batches_qr_code_unique` UNIQUE(`qr_code`)
);
--> statement-breakpoint
CREATE TABLE `inventory_transactions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`trans_no` varchar(50) NOT NULL,
	`trans_type` varchar(50) NOT NULL,
	`batch_id` int NOT NULL,
	`warehouse_id` int NOT NULL,
	`location_id` int,
	`quantity` decimal(15,4) NOT NULL,
	`before_qty` decimal(15,4),
	`after_qty` decimal(15,4),
	`source_type` varchar(50),
	`source_no` varchar(50),
	`operator_id` int,
	`operated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`remarks` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `inventory_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_transactions_trans_no_unique` UNIQUE(`trans_no`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`warehouse_id` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`zone` varchar(50),
	`shelf` varchar(50),
	`layer` varchar(50),
	`status` varchar(20) DEFAULT 'active',
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `locations_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `maintenance_plans` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`equipment_id` int NOT NULL,
	`plan_date` datetime NOT NULL,
	`maintenance_type` varchar(20),
	`status` varchar(20) DEFAULT 'planned',
	`executor_id` int,
	`executed_at` datetime,
	`remarks` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `maintenance_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `material_labels` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`label_no` varchar(50) NOT NULL,
	`qr_code` text,
	`purchase_order_no` varchar(50),
	`supplier_name` varchar(200),
	`receive_date` datetime,
	`material_code` varchar(50) NOT NULL,
	`material_name` varchar(200),
	`specification` varchar(200),
	`unit` varchar(20),
	`batch_no` varchar(50),
	`quantity` decimal(18,4) DEFAULT '0',
	`package_qty` decimal(18,4) DEFAULT '0',
	`width` decimal(18,2),
	`length_per_roll` decimal(18,2),
	`remark` text,
	`color_code` varchar(50),
	`mix_remark` text,
	`warehouse_id` int,
	`location_id` int,
	`is_main_material` boolean DEFAULT false,
	`is_used` boolean DEFAULT false,
	`is_cut` boolean DEFAULT false,
	`parent_label_id` int,
	`status` varchar(20) DEFAULT 'active',
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `material_labels_id` PRIMARY KEY(`id`),
	CONSTRAINT `material_labels_label_no_unique` UNIQUE(`label_no`)
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`specification` varchar(200),
	`unit` varchar(20),
	`category` varchar(50),
	`safety_stock` decimal(15,4) DEFAULT '0',
	`status` varchar(20) DEFAULT 'active',
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `materials_id` PRIMARY KEY(`id`),
	CONSTRAINT `materials_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `outsource_orders` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`order_no` varchar(50) NOT NULL,
	`qr_code` varchar(100),
	`supplier_id` int NOT NULL,
	`work_order_id` int,
	`process_id` int,
	`send_qty` decimal(15,4) NOT NULL,
	`return_qty` decimal(15,4) DEFAULT '0',
	`scrap_qty` decimal(15,4) DEFAULT '0',
	`allowed_loss_rate` decimal(5,2) DEFAULT '0',
	`send_date` datetime NOT NULL,
	`expected_return_date` datetime,
	`actual_return_date` datetime,
	`status` varchar(20) DEFAULT 'sent',
	`amount` decimal(15,2),
	`payment_status` varchar(20) DEFAULT 'unpaid',
	`remarks` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `outsource_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `outsource_orders_order_no_unique` UNIQUE(`order_no`),
	CONSTRAINT `outsource_orders_qr_code_unique` UNIQUE(`qr_code`)
);
--> statement-breakpoint
CREATE TABLE `process_card_materials` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`card_id` int NOT NULL,
	`card_no` varchar(50),
	`label_id` int NOT NULL,
	`label_no` varchar(50) NOT NULL,
	`material_type` varchar(20) DEFAULT 'auxiliary',
	`material_code` varchar(50),
	`material_name` varchar(200),
	`specification` varchar(200),
	`batch_no` varchar(50),
	`quantity` decimal(18,4) DEFAULT '0',
	`unit` varchar(20),
	`remark` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `process_card_materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `process_cards` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`card_no` varchar(50) NOT NULL,
	`qr_code` text,
	`work_order_id` int,
	`work_order_no` varchar(50),
	`product_code` varchar(50),
	`product_name` varchar(200),
	`material_spec` varchar(200),
	`work_order_date` datetime,
	`plan_qty` decimal(18,4) DEFAULT '0',
	`main_label_id` int,
	`main_label_no` varchar(50),
	`burdening_status` varchar(20) DEFAULT 'pending',
	`lock_status` varchar(20) DEFAULT 'unlocked',
	`create_user_id` int,
	`create_user_name` varchar(50),
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `process_cards_id` PRIMARY KEY(`id`),
	CONSTRAINT `process_cards_card_no_unique` UNIQUE(`card_no`)
);
--> statement-breakpoint
CREATE TABLE `processes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`sequence` int NOT NULL,
	`workcenter` varchar(50),
	`standard_time` decimal(10,2),
	`setup_time` decimal(10,2),
	`status` varchar(20) DEFAULT 'active',
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `processes_id` PRIMARY KEY(`id`),
	CONSTRAINT `processes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `production_reports` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`report_no` varchar(50) NOT NULL,
	`work_order_id` int NOT NULL,
	`work_order_process_id` int,
	`process_id` int NOT NULL,
	`equipment_id` int,
	`employee_id` int NOT NULL,
	`good_qty` decimal(15,4) NOT NULL,
	`scrap_qty` decimal(15,4) DEFAULT '0',
	`batch_no` varchar(50),
	`work_date` datetime NOT NULL,
	`start_time` datetime,
	`end_time` datetime,
	`work_minutes` int,
	`efficiency` decimal(5,2),
	`status` varchar(20) DEFAULT 'normal',
	`remarks` text,
	`reported_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `production_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `production_reports_report_no_unique` UNIQUE(`report_no`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`specification` varchar(200),
	`unit` varchar(20),
	`category` varchar(50),
	`bom_version` varchar(20) DEFAULT 'V1.0',
	`customer_id` int,
	`status` varchar(20) DEFAULT 'active',
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`material_id` int NOT NULL,
	`quantity` decimal(15,4) NOT NULL,
	`received_qty` decimal(15,4) DEFAULT '0',
	`unit` varchar(20),
	`unit_price` decimal(15,4),
	`amount` decimal(15,4),
	`status` varchar(20) DEFAULT 'pending',
	`remarks` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`order_no` varchar(50) NOT NULL,
	`supplier_id` int NOT NULL,
	`order_date` datetime NOT NULL,
	`expected_date` datetime,
	`status` varchar(20) DEFAULT 'draft',
	`total_amount` decimal(15,2) DEFAULT '0',
	`remarks` text,
	`created_by` int,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_orders_order_no_unique` UNIQUE(`order_no`)
);
--> statement-breakpoint
CREATE TABLE `purchase_request_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`request_id` int NOT NULL,
	`material_id` int NOT NULL,
	`quantity` decimal(15,4) NOT NULL,
	`unit` varchar(20),
	`required_date` datetime,
	`status` varchar(20) DEFAULT 'pending',
	`remarks` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `purchase_request_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_requests` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`request_no` varchar(50) NOT NULL,
	`request_type` varchar(20),
	`requester_id` int,
	`request_date` datetime NOT NULL,
	`status` varchar(20) DEFAULT 'draft',
	`remarks` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `purchase_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `purchase_requests_request_no_unique` UNIQUE(`request_no`)
);
--> statement-breakpoint
CREATE TABLE `sales_order_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` int NOT NULL,
	`quantity` decimal(15,4) NOT NULL,
	`unit` varchar(20),
	`unit_price` decimal(15,4),
	`amount` decimal(15,4),
	`delivery_date` datetime,
	`status` varchar(20) DEFAULT 'pending',
	`remarks` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `sales_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sales_orders` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`order_no` varchar(50) NOT NULL,
	`customer_id` int NOT NULL,
	`order_date` datetime NOT NULL,
	`delivery_date` datetime,
	`status` varchar(20) DEFAULT 'draft',
	`total_amount` decimal(15,2) DEFAULT '0',
	`remarks` text,
	`created_by` int,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `sales_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `sales_orders_order_no_unique` UNIQUE(`order_no`)
);
--> statement-breakpoint
CREATE TABLE `sample_requests` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`request_no` varchar(50) NOT NULL,
	`customer_id` int NOT NULL,
	`product_id` int,
	`product_name` varchar(200),
	`specification` varchar(200),
	`quantity` decimal(15,4),
	`unit` varchar(20),
	`request_date` datetime NOT NULL,
	`required_date` datetime,
	`status` varchar(20) DEFAULT 'draft',
	`cost` decimal(15,2),
	`qr_code` varchar(100),
	`remarks` text,
	`requester_id` int,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `sample_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `sample_requests_request_no_unique` UNIQUE(`request_no`),
	CONSTRAINT `sample_requests_qr_code_unique` UNIQUE(`qr_code`)
);
--> statement-breakpoint
CREATE TABLE `scan_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`scan_type` varchar(50) NOT NULL,
	`qr_content` text,
	`label_no` varchar(50),
	`operation` varchar(50),
	`result` varchar(20) DEFAULT 'success',
	`message` text,
	`operator_id` int,
	`operator_name` varchar(50),
	`scan_time` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`ip_address` varchar(50),
	CONSTRAINT `scan_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(200) NOT NULL,
	`contact` varchar(50),
	`phone` varchar(50),
	`address` varchar(500),
	`status` varchar(20) DEFAULT 'active',
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`),
	CONSTRAINT `suppliers_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `trace_records` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`trace_no` varchar(50) NOT NULL,
	`card_id` int,
	`card_no` varchar(50),
	`work_order_no` varchar(50),
	`product_code` varchar(50),
	`main_label_id` int,
	`trace_type` varchar(20) DEFAULT 'forward',
	`operator_id` int,
	`operator_name` varchar(50),
	`trace_time` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`remark` text,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `trace_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `trace_records_trace_no_unique` UNIQUE(`trace_no`)
);
--> statement-breakpoint
CREATE TABLE `vehicles` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`plate_no` varchar(20) NOT NULL,
	`vehicle_type` varchar(50),
	`volume` decimal(10,2),
	`load_weight` decimal(10,2),
	`driver` varchar(50),
	`driver_phone` varchar(20),
	`status` varchar(20) DEFAULT 'available',
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `vehicles_id` PRIMARY KEY(`id`),
	CONSTRAINT `vehicles_plate_no_unique` UNIQUE(`plate_no`)
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` varchar(20) NOT NULL,
	`manager` varchar(50),
	`status` varchar(20) DEFAULT 'active',
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `warehouses_id` PRIMARY KEY(`id`),
	CONSTRAINT `warehouses_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `work_order_processes` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`work_order_id` int NOT NULL,
	`process_id` int NOT NULL,
	`equipment_id` int,
	`plan_qty` decimal(15,4) NOT NULL,
	`completed_qty` decimal(15,4) DEFAULT '0',
	`scrap_qty` decimal(15,4) DEFAULT '0',
	`status` varchar(20) DEFAULT 'pending',
	`start_time` datetime,
	`end_time` datetime,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `work_order_processes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `work_orders` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`order_no` varchar(50) NOT NULL,
	`qr_code` varchar(100),
	`sales_order_id` int,
	`sales_order_item_id` int,
	`product_id` int NOT NULL,
	`bom_id` int,
	`quantity` decimal(15,4) NOT NULL,
	`completed_qty` decimal(15,4) DEFAULT '0',
	`scrap_qty` decimal(15,4) DEFAULT '0',
	`plan_start_date` datetime,
	`plan_end_date` datetime,
	`actual_start_date` datetime,
	`actual_end_date` datetime,
	`status` varchar(20) DEFAULT 'created',
	`priority` int DEFAULT 5,
	`workshop` varchar(50),
	`remarks` text,
	`created_by` int,
	`created_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `work_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `work_orders_order_no_unique` UNIQUE(`order_no`),
	CONSTRAINT `work_orders_qr_code_unique` UNIQUE(`qr_code`)
);
--> statement-breakpoint
ALTER TABLE `bom_items` ADD CONSTRAINT `bom_items_bom_id_boms_id_fk` FOREIGN KEY (`bom_id`) REFERENCES `boms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bom_items` ADD CONSTRAINT `bom_items_material_id_materials_id_fk` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boms` ADD CONSTRAINT `boms_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cutting_details` ADD CONSTRAINT `cutting_details_record_id_cutting_records_id_fk` FOREIGN KEY (`record_id`) REFERENCES `cutting_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cutting_details` ADD CONSTRAINT `cutting_details_new_label_id_material_labels_id_fk` FOREIGN KEY (`new_label_id`) REFERENCES `material_labels`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cutting_records` ADD CONSTRAINT `cutting_records_source_label_id_material_labels_id_fk` FOREIGN KEY (`source_label_id`) REFERENCES `material_labels`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cutting_records` ADD CONSTRAINT `cutting_records_operator_id_employees_id_fk` FOREIGN KEY (`operator_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `defect_records` ADD CONSTRAINT `defect_records_inspection_id_inspection_records_id_fk` FOREIGN KEY (`inspection_id`) REFERENCES `inspection_records`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `defect_records` ADD CONSTRAINT `defect_records_batch_id_inventory_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `inventory_batches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `defect_records` ADD CONSTRAINT `defect_records_handler_id_employees_id_fk` FOREIGN KEY (`handler_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_items` ADD CONSTRAINT `delivery_items_delivery_id_delivery_orders_id_fk` FOREIGN KEY (`delivery_id`) REFERENCES `delivery_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_items` ADD CONSTRAINT `delivery_items_batch_id_inventory_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `inventory_batches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD CONSTRAINT `delivery_orders_vehicle_id_vehicles_id_fk` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD CONSTRAINT `delivery_orders_sales_order_id_sales_orders_id_fk` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD CONSTRAINT `delivery_orders_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_receipts` ADD CONSTRAINT `delivery_receipts_delivery_id_delivery_orders_id_fk` FOREIGN KEY (`delivery_id`) REFERENCES `delivery_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspection_records` ADD CONSTRAINT `inspection_records_standard_id_inspection_standards_id_fk` FOREIGN KEY (`standard_id`) REFERENCES `inspection_standards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspection_records` ADD CONSTRAINT `inspection_records_batch_id_inventory_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `inventory_batches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspection_records` ADD CONSTRAINT `inspection_records_work_order_id_work_orders_id_fk` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspection_records` ADD CONSTRAINT `inspection_records_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspection_records` ADD CONSTRAINT `inspection_records_material_id_materials_id_fk` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspection_records` ADD CONSTRAINT `inspection_records_inspector_id_employees_id_fk` FOREIGN KEY (`inspector_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspection_standards` ADD CONSTRAINT `inspection_standards_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspection_standards` ADD CONSTRAINT `inspection_standards_material_id_materials_id_fk` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_material_id_materials_id_fk` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_batches` ADD CONSTRAINT `inventory_batches_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_batch_id_inventory_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `inventory_batches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_transactions` ADD CONSTRAINT `inventory_transactions_operator_id_employees_id_fk` FOREIGN KEY (`operator_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `locations` ADD CONSTRAINT `locations_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_plans` ADD CONSTRAINT `maintenance_plans_equipment_id_equipments_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenance_plans` ADD CONSTRAINT `maintenance_plans_executor_id_employees_id_fk` FOREIGN KEY (`executor_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_labels` ADD CONSTRAINT `material_labels_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_labels` ADD CONSTRAINT `material_labels_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `outsource_orders` ADD CONSTRAINT `outsource_orders_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `outsource_orders` ADD CONSTRAINT `outsource_orders_work_order_id_work_orders_id_fk` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `outsource_orders` ADD CONSTRAINT `outsource_orders_process_id_processes_id_fk` FOREIGN KEY (`process_id`) REFERENCES `processes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `process_card_materials` ADD CONSTRAINT `process_card_materials_card_id_process_cards_id_fk` FOREIGN KEY (`card_id`) REFERENCES `process_cards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `process_card_materials` ADD CONSTRAINT `process_card_materials_label_id_material_labels_id_fk` FOREIGN KEY (`label_id`) REFERENCES `material_labels`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `process_cards` ADD CONSTRAINT `process_cards_work_order_id_work_orders_id_fk` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `process_cards` ADD CONSTRAINT `process_cards_main_label_id_material_labels_id_fk` FOREIGN KEY (`main_label_id`) REFERENCES `material_labels`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `process_cards` ADD CONSTRAINT `process_cards_create_user_id_employees_id_fk` FOREIGN KEY (`create_user_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_reports` ADD CONSTRAINT `production_reports_work_order_id_work_orders_id_fk` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_reports` ADD CONSTRAINT `production_reports_work_order_process_id_work_order_processes_id_fk` FOREIGN KEY (`work_order_process_id`) REFERENCES `work_order_processes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_reports` ADD CONSTRAINT `production_reports_process_id_processes_id_fk` FOREIGN KEY (`process_id`) REFERENCES `processes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_reports` ADD CONSTRAINT `production_reports_equipment_id_equipments_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_reports` ADD CONSTRAINT `production_reports_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `products` ADD CONSTRAINT `products_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_order_id_purchase_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_material_id_materials_id_fk` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplier_id_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_request_items` ADD CONSTRAINT `purchase_request_items_request_id_purchase_requests_id_fk` FOREIGN KEY (`request_id`) REFERENCES `purchase_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_request_items` ADD CONSTRAINT `purchase_request_items_material_id_materials_id_fk` FOREIGN KEY (`material_id`) REFERENCES `materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD CONSTRAINT `purchase_requests_requester_id_employees_id_fk` FOREIGN KEY (`requester_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_order_items` ADD CONSTRAINT `sales_order_items_order_id_sales_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `sales_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_order_items` ADD CONSTRAINT `sales_order_items_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sales_orders` ADD CONSTRAINT `sales_orders_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sample_requests` ADD CONSTRAINT `sample_requests_customer_id_customers_id_fk` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sample_requests` ADD CONSTRAINT `sample_requests_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sample_requests` ADD CONSTRAINT `sample_requests_requester_id_employees_id_fk` FOREIGN KEY (`requester_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scan_logs` ADD CONSTRAINT `scan_logs_operator_id_employees_id_fk` FOREIGN KEY (`operator_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trace_records` ADD CONSTRAINT `trace_records_card_id_process_cards_id_fk` FOREIGN KEY (`card_id`) REFERENCES `process_cards`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trace_records` ADD CONSTRAINT `trace_records_main_label_id_material_labels_id_fk` FOREIGN KEY (`main_label_id`) REFERENCES `material_labels`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `trace_records` ADD CONSTRAINT `trace_records_operator_id_employees_id_fk` FOREIGN KEY (`operator_id`) REFERENCES `employees`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_order_processes` ADD CONSTRAINT `work_order_processes_work_order_id_work_orders_id_fk` FOREIGN KEY (`work_order_id`) REFERENCES `work_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_order_processes` ADD CONSTRAINT `work_order_processes_process_id_processes_id_fk` FOREIGN KEY (`process_id`) REFERENCES `processes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_order_processes` ADD CONSTRAINT `work_order_processes_equipment_id_equipments_id_fk` FOREIGN KEY (`equipment_id`) REFERENCES `equipments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_sales_order_id_sales_orders_id_fk` FOREIGN KEY (`sales_order_id`) REFERENCES `sales_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_sales_order_item_id_sales_order_items_id_fk` FOREIGN KEY (`sales_order_item_id`) REFERENCES `sales_order_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_orders` ADD CONSTRAINT `work_orders_bom_id_boms_id_fk` FOREIGN KEY (`bom_id`) REFERENCES `boms`(`id`) ON DELETE no action ON UPDATE no action;