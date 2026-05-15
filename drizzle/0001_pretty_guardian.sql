CREATE TABLE `agentLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investigationId` int NOT NULL,
	`agentName` varchar(255) NOT NULL,
	`status` enum('pending','running','completed','error') DEFAULT 'pending',
	`progress` int DEFAULT 0,
	`findings` text,
	`errorMessage` text,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agentLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investigationId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `investigations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(255) NOT NULL,
	`fileSize` int,
	`riskScore` int DEFAULT 0,
	`riskLevel` enum('low','medium','high','critical') DEFAULT 'low',
	`status` enum('pending','analyzing','completed','failed') DEFAULT 'pending',
	`dataExfiltrationScore` int DEFAULT 0,
	`credentialHarvestingScore` int DEFAULT 0,
	`c2CommunicationScore` int DEFAULT 0,
	`bankingTrojanScore` int DEFAULT 0,
	`threatSummary` text,
	`aiReasoning` text,
	`mitigationRecommendations` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `investigations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `iocs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`investigationId` int NOT NULL,
	`type` enum('permission','network_endpoint','api_call','obfuscation_pattern','hardcoded_string') NOT NULL,
	`value` text NOT NULL,
	`severity` enum('low','medium','high','critical') DEFAULT 'medium',
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `iocs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agentLogs` ADD CONSTRAINT `agentLogs_investigationId_investigations_id_fk` FOREIGN KEY (`investigationId`) REFERENCES `investigations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chatMessages` ADD CONSTRAINT `chatMessages_investigationId_investigations_id_fk` FOREIGN KEY (`investigationId`) REFERENCES `investigations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chatMessages` ADD CONSTRAINT `chatMessages_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `investigations` ADD CONSTRAINT `investigations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `iocs` ADD CONSTRAINT `iocs_investigationId_investigations_id_fk` FOREIGN KEY (`investigationId`) REFERENCES `investigations`(`id`) ON DELETE no action ON UPDATE no action;