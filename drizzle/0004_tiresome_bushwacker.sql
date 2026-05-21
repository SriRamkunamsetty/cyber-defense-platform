CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(128) NOT NULL,
	`resourceType` varchar(64),
	`resourceId` varchar(64),
	`metadata` text,
	`ipAddress` varchar(45),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `evidenceEdges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investigationId` int NOT NULL,
	`edgeKey` varchar(255) NOT NULL,
	`fromEntityId` int NOT NULL,
	`toEntityId` int NOT NULL,
	`relationshipType` enum('declares','contains','supports','derives_to','indicates','classified_as','references') NOT NULL,
	`metadataJson` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `evidenceEdges_id` PRIMARY KEY(`id`),
	CONSTRAINT `evidence_edge_key_unique` UNIQUE(`investigationId`,`edgeKey`)
);
--> statement-breakpoint
CREATE TABLE `evidenceEntities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investigationId` int NOT NULL,
	`entityKey` varchar(191) NOT NULL,
	`entityType` enum('package','permission','ioc','method','component','certificate','embedded_string','native_library','static_finding','behavioral_finding','attack_stage','malware_family') NOT NULL,
	`displayName` varchar(255) NOT NULL,
	`severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'low',
	`confidence` int NOT NULL DEFAULT 0,
	`sourceType` varchar(64),
	`sourceRef` varchar(255),
	`lineageJson` longtext,
	`metadataJson` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `evidenceEntities_id` PRIMARY KEY(`id`),
	CONSTRAINT `evidence_entity_key_unique` UNIQUE(`investigationId`,`entityKey`)
);
--> statement-breakpoint
CREATE TABLE `investigationCheckpoints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investigationId` int NOT NULL,
	`checkpointKey` varchar(128) NOT NULL,
	`status` enum('active','superseded') NOT NULL DEFAULT 'active',
	`payload` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `investigationCheckpoints_id` PRIMARY KEY(`id`),
	CONSTRAINT `investigation_checkpoint_key_unique` UNIQUE(`investigationId`,`checkpointKey`)
);
--> statement-breakpoint
CREATE TABLE `investigationEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investigationId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`payload` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `investigationEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investigationJobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investigationId` int NOT NULL,
	`status` enum('queued','running','completed','failed') NOT NULL DEFAULT 'queued',
	`attempts` int NOT NULL DEFAULT 0,
	`maxAttempts` int NOT NULL DEFAULT 3,
	`lastError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`startedAt` timestamp,
	`completedAt` timestamp,
	CONSTRAINT `investigationJobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agentLogs` MODIFY COLUMN `findings` longtext;--> statement-breakpoint
ALTER TABLE `investigations` MODIFY COLUMN `updatedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `investigations` ADD `lifecycleState` enum('created','queued','downloading_artifact','reverse_engineering','forensic_validation','ai_processing','completed','failed') DEFAULT 'created' NOT NULL;--> statement-breakpoint
ALTER TABLE `investigations` ADD `currentCheckpoint` varchar(128);--> statement-breakpoint
ALTER TABLE `investigations` ADD `packageName` varchar(255);--> statement-breakpoint
ALTER TABLE `investigations` ADD `evidenceJson` longtext;--> statement-breakpoint
ALTER TABLE `investigations` ADD `fileTreeJson` longtext;--> statement-breakpoint
ALTER TABLE `investigations` ADD `attackChainJson` longtext;--> statement-breakpoint
ALTER TABLE `investigations` ADD `sha256Hash` varchar(64);--> statement-breakpoint
ALTER TABLE `investigations` ADD `consensusJson` longtext;--> statement-breakpoint
ALTER TABLE `auditLogs` ADD CONSTRAINT `auditLogs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evidenceEdges` ADD CONSTRAINT `evidenceEdges_investigationId_investigations_id_fk` FOREIGN KEY (`investigationId`) REFERENCES `investigations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evidenceEdges` ADD CONSTRAINT `evidenceEdges_fromEntityId_evidenceEntities_id_fk` FOREIGN KEY (`fromEntityId`) REFERENCES `evidenceEntities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evidenceEdges` ADD CONSTRAINT `evidenceEdges_toEntityId_evidenceEntities_id_fk` FOREIGN KEY (`toEntityId`) REFERENCES `evidenceEntities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `evidenceEntities` ADD CONSTRAINT `evidenceEntities_investigationId_investigations_id_fk` FOREIGN KEY (`investigationId`) REFERENCES `investigations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `investigationCheckpoints` ADD CONSTRAINT `investigationCheckpoints_investigationId_investigations_id_fk` FOREIGN KEY (`investigationId`) REFERENCES `investigations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `investigationEvents` ADD CONSTRAINT `investigationEvents_investigationId_investigations_id_fk` FOREIGN KEY (`investigationId`) REFERENCES `investigations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `investigationJobs` ADD CONSTRAINT `investigationJobs_investigationId_investigations_id_fk` FOREIGN KEY (`investigationId`) REFERENCES `investigations`(`id`) ON DELETE no action ON UPDATE no action;