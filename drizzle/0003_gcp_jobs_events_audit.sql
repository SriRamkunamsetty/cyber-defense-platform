CREATE TABLE `investigationJobs` (
  `id` int AUTO_INCREMENT NOT NULL,
  `investigationId` int NOT NULL,
  `status` enum('queued','running','completed','failed') NOT NULL DEFAULT 'queued',
  `attempts` int NOT NULL DEFAULT 0,
  `maxAttempts` int NOT NULL DEFAULT 3,
  `lastError` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  `startedAt` timestamp NULL,
  `completedAt` timestamp NULL,
  CONSTRAINT `investigationJobs_id` PRIMARY KEY(`id`)
);

CREATE TABLE `investigationEvents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `investigationId` int NOT NULL,
  `eventType` varchar(64) NOT NULL,
  `payload` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `investigationEvents_id` PRIMARY KEY(`id`)
);

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

ALTER TABLE `investigations` ADD `consensusJson` text;
