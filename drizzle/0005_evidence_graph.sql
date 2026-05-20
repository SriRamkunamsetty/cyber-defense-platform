CREATE TABLE `evidenceEntities` (
  `id` int AUTO_INCREMENT NOT NULL,
  `investigationId` int NOT NULL,
  `entityKey` varchar(191) NOT NULL,
  `entityType` enum(
    'package',
    'permission',
    'ioc',
    'method',
    'component',
    'certificate',
    'embedded_string',
    'native_library',
    'static_finding',
    'behavioral_finding',
    'attack_stage',
    'malware_family'
  ) NOT NULL,
  `displayName` varchar(255) NOT NULL,
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'low',
  `confidence` int NOT NULL DEFAULT 0,
  `sourceType` varchar(64),
  `sourceRef` varchar(255),
  `lineageJson` text,
  `metadataJson` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `evidenceEntities_id` PRIMARY KEY(`id`),
  CONSTRAINT `evidence_entity_key_unique` UNIQUE(`investigationId`,`entityKey`)
);

CREATE TABLE `evidenceEdges` (
  `id` int AUTO_INCREMENT NOT NULL,
  `investigationId` int NOT NULL,
  `edgeKey` varchar(255) NOT NULL,
  `fromEntityId` int NOT NULL,
  `toEntityId` int NOT NULL,
  `relationshipType` enum(
    'declares',
    'contains',
    'supports',
    'derives_to',
    'indicates',
    'classified_as',
    'references'
  ) NOT NULL,
  `metadataJson` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `evidenceEdges_id` PRIMARY KEY(`id`),
  CONSTRAINT `evidence_edge_key_unique` UNIQUE(`investigationId`,`edgeKey`)
);
