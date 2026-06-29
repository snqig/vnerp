CREATE TABLE `inv_inbound_item` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`material_id` int,
	`material_name` varchar(200),
	`material_spec` varchar(200),
	`batch_no` varchar(50),
	`quantity` decimal(15,3),
	`unit` varchar(20),
	`unit_price` decimal(15,4),
	`total_price` decimal(15,4),
	`warehouse_location` varchar(50),
	`produce_date` datetime,
	`create_time` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `inv_inbound_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inv_inbound_order` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`order_no` varchar(30) NOT NULL,
	`order_type` varchar(20) DEFAULT 'purchase',
	`warehouse_id` int NOT NULL,
	`supplier_name` varchar(100),
	`inbound_date` datetime,
	`total_quantity` decimal(15,3) DEFAULT '0',
	`total_amount` decimal(15,2),
	`status` varchar(20) DEFAULT 'pending',
	`qc_status` varchar(20) DEFAULT 'pending',
	`remark` varchar(500),
	`deleted` boolean DEFAULT false,
	`create_time` datetime DEFAULT 'CURRENT_TIMESTAMP',
	`update_time` datetime DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `inv_inbound_order_id` PRIMARY KEY(`id`)
);
