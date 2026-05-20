ALTER TABLE `investigations`
  ADD `lifecycleState` enum(
    'created',
    'queued',
    'downloading_artifact',
    'reverse_engineering',
    'forensic_validation',
    'ai_processing',
    'completed',
    'failed'
  ) NOT NULL DEFAULT 'created',
  ADD `currentCheckpoint` varchar(128);

CREATE TABLE `investigationCheckpoints` (
  `id` int AUTO_INCREMENT NOT NULL,
  `investigationId` int NOT NULL,
  `checkpointKey` varchar(128) NOT NULL,
  `status` enum('active','superseded') NOT NULL DEFAULT 'active',
  `payload` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `investigationCheckpoints_id` PRIMARY KEY(`id`),
  CONSTRAINT `investigation_checkpoint_key_unique` UNIQUE(`investigationId`,`checkpointKey`)
);
