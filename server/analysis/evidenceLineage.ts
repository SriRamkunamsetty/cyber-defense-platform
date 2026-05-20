import type {
  EvidenceLineageEdge,
  EvidenceLineageEntity,
  InvestigationEvidenceLineage,
  ValidatedForensicBundle,
} from "../../shared/forensics";

type DraftEntity = Omit<EvidenceLineageEntity, "id">;
type DraftEdge = Omit<EvidenceLineageEdge, "id" | "fromEntityId" | "toEntityId"> & {
  fromEntityKey: string;
  toEntityKey: string;
};

function makeEntityKey(prefix: string, value: string): string {
  return `${prefix}:${value}`.slice(0, 191);
}

export function buildInvestigationEvidenceLineage(
  investigationId: number,
  bundle: ValidatedForensicBundle
): {
  entities: DraftEntity[];
  edges: DraftEdge[];
} {
  const entityMap = new Map<string, DraftEntity>();
  const edgeMap = new Map<string, DraftEdge>();
  const evidence = bundle.evidence;

  const addEntity = (entity: DraftEntity) => {
    entityMap.set(entity.entityKey, entity);
  };

  const addEdge = (edge: DraftEdge) => {
    const edgeKey = `${edge.relationshipType}:${edge.fromEntityKey}->${edge.toEntityKey}`;
    if (!edgeMap.has(edgeKey)) {
      edgeMap.set(edgeKey, edge);
    }
  };

  const packageKey = makeEntityKey("package", evidence.packageName || evidence.sha256);
  addEntity({
    entityKey: packageKey,
    entityType: "package",
    displayName: evidence.packageName || "unknown-package",
    severity: "low",
    confidence: bundle.forensicConfidence,
    sourceType: "manifest",
    sourceRef: evidence.packageName || evidence.sha256,
    lineage: {
      sha256: evidence.sha256,
      checkpoint: "forensic_bundle_ready",
    },
    metadata: {
      fileSize: evidence.fileSize,
      dexFileCount: evidence.dexFileCount ?? 0,
      versionName: evidence.versionName ?? null,
      versionCode: evidence.versionCode ?? null,
    },
  });

  for (const permission of evidence.permissions) {
    const entityKey = makeEntityKey("permission", permission.name);
    addEntity({
      entityKey,
      entityType: "permission",
      displayName: permission.name,
      severity: permission.riskLevel,
      confidence: 95,
      sourceType: "manifest",
      sourceRef: permission.name,
      lineage: {
        abuseDescription: permission.abuseDescription,
        bankingRelevance: permission.bankingRelevance ?? null,
      },
      metadata: {
        abuseDescription: permission.abuseDescription,
        bankingRelevance: permission.bankingRelevance ?? null,
      },
    });
    addEdge({
      fromEntityKey: packageKey,
      toEntityKey: entityKey,
      relationshipType: "declares",
      metadata: { source: "manifest" },
    });
  }

  const componentGroups = [
    { kind: "activity", values: evidence.activities },
    { kind: "service", values: evidence.services },
    { kind: "receiver", values: evidence.receivers },
    { kind: "provider", values: evidence.providers },
  ] as const;

  for (const group of componentGroups) {
    for (const component of group.values) {
      const entityKey = makeEntityKey(`component:${group.kind}`, component);
      addEntity({
        entityKey,
        entityType: "component",
        displayName: component,
        severity: "low",
        confidence: 85,
        sourceType: "manifest",
        sourceRef: component,
        lineage: { componentType: group.kind },
        metadata: { componentType: group.kind },
      });
      addEdge({
        fromEntityKey: packageKey,
        toEntityKey: entityKey,
        relationshipType: "contains",
        metadata: { componentType: group.kind },
      });
    }
  }

  for (const method of evidence.suspiciousMethods) {
    const entityKey = makeEntityKey(
      "method",
      `${method.filePath}:${method.methodName}:${method.threatCategory}`
    );
    addEntity({
      entityKey,
      entityType: "method",
      displayName: method.methodName,
      severity: method.severity,
      confidence: 90,
      sourceType: "decompiled_code",
      sourceRef: method.filePath,
      lineage: {
        className: method.className,
        filePath: method.filePath,
        threatCategory: method.threatCategory,
      },
      metadata: {
        className: method.className,
        filePath: method.filePath,
        threatCategory: method.threatCategory,
      },
    });
    addEdge({
      fromEntityKey: packageKey,
      toEntityKey: entityKey,
      relationshipType: "contains",
      metadata: { source: "decompiled_code" },
    });
  }

  for (const ioc of evidence.iocs) {
    const entityKey = makeEntityKey("ioc", `${ioc.type}:${ioc.value}`);
    addEntity({
      entityKey,
      entityType: "ioc",
      displayName: ioc.value,
      severity: ioc.severity,
      confidence: ioc.severity === "critical" ? 92 : 80,
      sourceType: ioc.source,
      sourceRef: ioc.value.slice(0, 255),
      lineage: {
        iocType: ioc.type,
        description: ioc.description,
        source: ioc.source,
      },
      metadata: {
        iocType: ioc.type,
        description: ioc.description,
        source: ioc.source,
      },
    });
    addEdge({
      fromEntityKey: packageKey,
      toEntityKey: entityKey,
      relationshipType: "contains",
      metadata: { iocType: ioc.type, source: ioc.source },
    });

    if (ioc.type === "permission") {
      const matchingPermission = evidence.permissions.find((permission) =>
        permission.name.endsWith(ioc.value) || permission.name === ioc.value
      );
      if (matchingPermission) {
        addEdge({
          fromEntityKey: makeEntityKey("permission", matchingPermission.name),
          toEntityKey: entityKey,
          relationshipType: "derives_to",
          metadata: { derivation: "permission_ioc_projection" },
        });
      }
    }
  }

  for (const certificate of evidence.certificates || []) {
    const entityKey = makeEntityKey(
      "certificate",
      certificate.fingerprint || certificate.subject
    );
    addEntity({
      entityKey,
      entityType: "certificate",
      displayName: certificate.subject,
      severity: "low",
      confidence: 85,
      sourceType: "META-INF",
      sourceRef: certificate.subject.slice(0, 255),
      lineage: {
        issuer: certificate.issuer,
        fingerprint: certificate.fingerprint ?? null,
      },
      metadata: {
        issuer: certificate.issuer,
        fingerprint: certificate.fingerprint ?? null,
      },
    });
    addEdge({
      fromEntityKey: packageKey,
      toEntityKey: entityKey,
      relationshipType: "contains",
      metadata: { source: "META-INF" },
    });
  }

  for (const entry of evidence.embeddedStrings || []) {
    const entityKey = makeEntityKey("string", `${entry.source}:${entry.value}`);
    addEntity({
      entityKey,
      entityType: "embedded_string",
      displayName: entry.value.slice(0, 255),
      severity: entry.flagged ? "medium" : "low",
      confidence: entry.flagged ? 80 : 55,
      sourceType: entry.source,
      sourceRef: entry.source,
      lineage: {
        category: entry.category ?? null,
        flagged: entry.flagged,
      },
      metadata: {
        category: entry.category ?? null,
        flagged: entry.flagged,
      },
    });
    addEdge({
      fromEntityKey: packageKey,
      toEntityKey: entityKey,
      relationshipType: "contains",
      metadata: { source: entry.source },
    });
  }

  for (const library of evidence.nativeLibraries || []) {
    const entityKey = makeEntityKey("native", library.path);
    addEntity({
      entityKey,
      entityType: "native_library",
      displayName: library.name,
      severity: "medium",
      confidence: 75,
      sourceType: "apk_archive",
      sourceRef: library.path,
      lineage: {
        architecture: library.architecture ?? null,
      },
      metadata: {
        path: library.path,
        architecture: library.architecture ?? null,
      },
    });
    addEdge({
      fromEntityKey: packageKey,
      toEntityKey: entityKey,
      relationshipType: "contains",
      metadata: { source: "apk_archive" },
    });
  }

  for (const finding of bundle.staticFindings) {
    const entityKey = makeEntityKey("static_finding", finding.id);
    addEntity({
      entityKey,
      entityType: "static_finding",
      displayName: finding.title,
      severity: finding.severity,
      confidence: finding.confidence,
      sourceType: "forensic_validation",
      sourceRef: finding.category,
      lineage: {
        category: finding.category,
        mitreTechnique: finding.mitreTechnique ?? null,
      },
      metadata: {
        category: finding.category,
        description: finding.description,
        mitreTechnique: finding.mitreTechnique ?? null,
      },
    });
    addEdge({
      fromEntityKey: packageKey,
      toEntityKey: entityKey,
      relationshipType: "indicates",
      metadata: { source: "static_finding" },
    });
  }

  for (const finding of bundle.behavioralFindings) {
    const entityKey = makeEntityKey("behavioral_finding", finding.id);
    addEntity({
      entityKey,
      entityType: "behavioral_finding",
      displayName: finding.title,
      severity: finding.severity,
      confidence: finding.confidence,
      sourceType: "behavioral_inference",
      sourceRef: finding.category,
      lineage: {
        category: finding.category,
        mitreTechnique: finding.mitreTechnique ?? null,
      },
      metadata: {
        category: finding.category,
        description: finding.description,
        mitreTechnique: finding.mitreTechnique ?? null,
      },
    });
    addEdge({
      fromEntityKey: packageKey,
      toEntityKey: entityKey,
      relationshipType: "indicates",
      metadata: { source: "behavioral_finding" },
    });
  }

  for (const stage of bundle.attackChain) {
    const entityKey = makeEntityKey("attack_stage", `${stage.id}:${stage.stage}`);
    addEntity({
      entityKey,
      entityType: "attack_stage",
      displayName: stage.stage,
      severity: stage.severity,
      confidence: 85,
      sourceType: "attack_chain",
      sourceRef: stage.id,
      lineage: {
        description: stage.description,
      },
      metadata: {
        description: stage.description,
      },
    });
    addEdge({
      fromEntityKey: packageKey,
      toEntityKey: entityKey,
      relationshipType: "indicates",
      metadata: { source: "attack_chain" },
    });
  }

  for (const match of bundle.malwareDna.familyMatches) {
    const entityKey = makeEntityKey("malware_family", match.family);
    addEntity({
      entityKey,
      entityType: "malware_family",
      displayName: match.family,
      severity: match.similarity >= 70 ? "high" : "medium",
      confidence: match.similarity,
      sourceType: "malware_dna",
      sourceRef: bundle.malwareDna.fingerprintId,
      lineage: {
        profileHash: bundle.malwareDna.profileHash,
        similarity: match.similarity,
      },
      metadata: {
        similarity: match.similarity,
        description: match.description,
        indicators: match.indicators,
      },
    });
    addEdge({
      fromEntityKey: packageKey,
      toEntityKey: entityKey,
      relationshipType: "classified_as",
      metadata: { fingerprintId: bundle.malwareDna.fingerprintId },
    });
  }

  const referenceTargets = new Map<string, string>();
  for (const permission of evidence.permissions) {
    referenceTargets.set(permission.name, makeEntityKey("permission", permission.name));
  }
  for (const method of evidence.suspiciousMethods) {
    referenceTargets.set(
      method.methodName,
      makeEntityKey("method", `${method.filePath}:${method.methodName}:${method.threatCategory}`)
    );
  }
  for (const ioc of evidence.iocs) {
    referenceTargets.set(ioc.value, makeEntityKey("ioc", `${ioc.type}:${ioc.value}`));
  }
  for (const library of evidence.nativeLibraries || []) {
    referenceTargets.set(library.name, makeEntityKey("native", library.path));
  }

  for (const finding of [...bundle.staticFindings, ...bundle.behavioralFindings]) {
    const findingKey = makeEntityKey(
      bundle.staticFindings.includes(finding) ? "static_finding" : "behavioral_finding",
      finding.id
    );
    for (const ref of finding.evidenceRefs) {
      const target = Array.from(referenceTargets.entries()).find(([value]) =>
        ref.includes(value) || value.includes(ref)
      )?.[1];
      if (target) {
        addEdge({
          fromEntityKey: findingKey,
          toEntityKey: target,
          relationshipType: "supports",
          metadata: { evidenceRef: ref },
        });
      }
    }
  }

  for (const stage of bundle.attackChain) {
    const stageKey = makeEntityKey("attack_stage", `${stage.id}:${stage.stage}`);
    for (const ref of stage.evidence) {
      const target = Array.from(referenceTargets.entries()).find(([value]) =>
        ref.includes(value) || value.includes(ref)
      )?.[1];
      if (target) {
        addEdge({
          fromEntityKey: stageKey,
          toEntityKey: target,
          relationshipType: "references",
          metadata: { evidenceRef: ref },
        });
      }
    }
  }

  return {
    entities: Array.from(entityMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

export function rehydrateInvestigationEvidenceLineage(
  investigationId: number,
  entities: EvidenceLineageEntity[],
  edges: EvidenceLineageEdge[]
): InvestigationEvidenceLineage {
  return {
    investigationId,
    entities,
    edges,
  };
}
