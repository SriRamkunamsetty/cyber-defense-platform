ALTER TABLE `investigations` ADD `packageName` varchar(255);
--> statement-breakpoint
ALTER TABLE `investigations` ADD `evidenceJson` text;
--> statement-breakpoint
ALTER TABLE `investigations` ADD `fileTreeJson` text;
--> statement-breakpoint
ALTER TABLE `investigations` ADD `attackChainJson` text;
