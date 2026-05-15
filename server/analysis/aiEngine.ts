import { invokeLLM } from "../_core/llm";
import { updateAgentLog, createIOC, updateInvestigationStatus } from "../db";

export interface AnalysisResult {
  iocs: Array<{
    type: string;
    value: string;
    severity: string;
    description: string;
  }>;
  findings: string;
  riskScore: number;
  riskBreakdown: {
    dataExfiltration: number;
    credentialHarvesting: number;
    c2Communication: number;
    bankingTrojan: number;
  };
  threatSummary: string;
  mitigations: string[];
}

const AGENTS = [
  "APK Reverse Engineering",
  "Static Malware Analysis",
  "Dynamic Threat Investigation",
  "Threat Intelligence Correlation",
  "AI Malware Reasoning",
  "Risk Scoring",
  "Executive Report Generation",
];

async function runAgent(
  agentName: string,
  investigationId: number,
  context: string,
  previousFindings: string
): Promise<string> {
  try {
    await updateAgentLog(investigationId, agentName, "running", 10);

    const systemPrompt = getAgentSystemPrompt(agentName);
    const userPrompt = getAgentUserPrompt(agentName, context, previousFindings);

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    const findings =
      typeof content === "string" ? content : "No findings generated";

    await updateAgentLog(
      investigationId,
      agentName,
      "completed",
      100,
      findings as string
    );

    return findings;
  } catch (error) {
    console.error(`Agent ${agentName} failed:`, error);
    await updateAgentLog(
      investigationId,
      agentName,
      "error",
      0,
      undefined
    );
    throw error;
  }
}

function getAgentSystemPrompt(agentName: string): string {
  const prompts: Record<string, string> = {
    "APK Reverse Engineering":
      "You are an expert Android security researcher specializing in APK reverse engineering. Analyze the APK structure, extract manifest information, identify libraries, and detect obfuscation techniques. Provide technical details about the app's architecture and suspicious components.",

    "Static Malware Analysis":
      "You are a malware analyst expert in static code analysis. Examine the decompiled code for malicious patterns, dangerous API calls, suspicious permissions, and known malware signatures. Identify potential data exfiltration, credential harvesting, and C2 communication code.",

    "Dynamic Threat Investigation":
      "You are a security researcher specializing in dynamic analysis. Based on the static findings, predict runtime behavior, network communications, and system interactions. Identify potential command and control (C2) servers, data exfiltration endpoints, and malicious activities.",

    "Threat Intelligence Correlation":
      "You are a threat intelligence analyst. Correlate findings with known malware families, APT groups, and threat campaigns. Identify indicators of compromise (IOCs), compare against threat databases, and provide context about the threat landscape.",

    "AI Malware Reasoning":
      "You are an AI security expert specializing in malware behavior analysis. Synthesize all previous findings into a coherent threat narrative. Explain the attack chain, identify MITRE ATT&CK techniques, and provide explainable reasoning about the malware's intent and capabilities.",

    "Risk Scoring":
      "You are a risk assessment specialist. Based on all findings, calculate a composite risk score (0-100) with breakdown across: data exfiltration, credential harvesting, C2 communication, and banking trojan indicators. Justify each score component.",

    "Executive Report Generation":
      "You are a security report writer. Create an executive summary suitable for C-level stakeholders. Include risk verdict, recommended mitigations, key findings, and timeline. Use clear, non-technical language while maintaining accuracy.",
  };

  return (
    prompts[agentName] ||
    "You are a security analysis agent. Provide detailed findings."
  );
}

function getAgentUserPrompt(
  agentName: string,
  context: string,
  previousFindings: string
): string {
  const basePrompt = `
APK Analysis Context:
${context}

${previousFindings ? `Previous Agent Findings:\n${previousFindings}\n` : ""}

Please provide your analysis for the "${agentName}" phase.
Focus on actionable insights and specific technical details.
`;

  if (agentName === "Risk Scoring") {
    return `${basePrompt}

Calculate risk scores as JSON with this structure:
{
  "overallScore": <0-100>,
  "dataExfiltration": <0-100>,
  "credentialHarvesting": <0-100>,
  "c2Communication": <0-100>,
  "bankingTrojan": <0-100>,
  "justification": "<explanation>"
}`;
  }

  return basePrompt;
}

export async function runAnalysisPipeline(
  investigationId: number,
  apkFileName: string,
  apkContext: string
): Promise<AnalysisResult> {
  let allFindings = "";
  const iocs: AnalysisResult["iocs"] = [];
  let riskScores = {
    dataExfiltration: 0,
    credentialHarvesting: 0,
    c2Communication: 0,
    bankingTrojan: 0,
  };
  let threatSummary = "";
  let mitigations: string[] = [];

  try {
    // Run agents sequentially
    for (const agentName of AGENTS) {
      console.log(`Running agent: ${agentName}`);

      const findings = await runAgent(
        agentName,
        investigationId,
        `APK: ${apkFileName}\n${apkContext}`,
        allFindings
      );

      allFindings += `\n\n[${agentName}]\n${findings}`;

      // Extract risk scores from Risk Scoring agent
      if (agentName === "Risk Scoring") {
        try {
          const scoreMatch = findings.match(/\{[\s\S]*\}/);
          if (scoreMatch) {
            const scoreData = JSON.parse(scoreMatch[0]);
            riskScores = {
              dataExfiltration: scoreData.dataExfiltration || 0,
              credentialHarvesting: scoreData.credentialHarvesting || 0,
              c2Communication: scoreData.c2Communication || 0,
              bankingTrojan: scoreData.bankingTrojan || 0,
            };
          }
        } catch (e) {
          console.error("Failed to parse risk scores:", e);
        }
      }

      // Extract threat summary from Executive Report
      if (agentName === "Executive Report Generation") {
        threatSummary = findings;
      }
    }

    // Calculate overall risk score
    const overallScore = Math.min(
      100,
      Math.round(
        (riskScores.dataExfiltration +
          riskScores.credentialHarvesting +
          riskScores.c2Communication +
          riskScores.bankingTrojan) /
          4
      )
    );

    // Determine risk level
    const riskLevel =
      overallScore >= 80
        ? "critical"
        : overallScore >= 60
          ? "high"
          : overallScore >= 40
            ? "medium"
            : "low";

    // Update investigation with results
    await updateInvestigationStatus(
      investigationId,
      "completed",
      overallScore,
      threatSummary,
      allFindings
    );

    // Extract IOCs from findings (simplified extraction)
    const iocsFromFindings = extractIOCsFromFindings(allFindings);
    for (const ioc of iocsFromFindings) {
      await createIOC(
        investigationId,
        ioc.type,
        ioc.value,
        ioc.severity,
        ioc.description
      );
      iocs.push(ioc);
    }

    // Generate mitigations based on findings
    mitigations = generateMitigations(threatSummary, riskScores);

    return {
      iocs,
      findings: allFindings,
      riskScore: overallScore,
      riskBreakdown: riskScores,
      threatSummary,
      mitigations,
    };
  } catch (error) {
    console.error("Analysis pipeline failed:", error);
    await updateInvestigationStatus(investigationId, "failed");
    throw error;
  }
}

function extractIOCsFromFindings(findings: string): AnalysisResult["iocs"] {
  const iocs: AnalysisResult["iocs"] = [];

  // Extract permissions (simplified)
  const permRegex = /permission[s]?:?\s*([A-Z_\.]+)/gi;
  let match;
  while ((match = permRegex.exec(findings)) !== null) {
    iocs.push({
      type: "permission",
      value: match[1],
      severity: "medium",
      description: `Requested permission: ${match[1]}`,
    });
  }

  // Extract IP addresses
  const ipRegex =
    /\b(?:\d{1,3}\.){3}\d{1,3}\b|(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}\b/gi;
  while ((match = ipRegex.exec(findings)) !== null) {
    iocs.push({
      type: "network_endpoint",
      value: match[0],
      severity: "high",
      description: `Network endpoint: ${match[0]}`,
    });
  }

  // Extract URLs
  const urlRegex =
    /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&/=]*)/gi;
  while ((match = urlRegex.exec(findings)) !== null) {
    iocs.push({
      type: "network_endpoint",
      value: match[0],
      severity: "high",
      description: `C2 or data exfiltration endpoint: ${match[0]}`,
    });
  }

  // Extract API calls (simplified)
  const apiRegex = /api[_\.]call[s]?:?\s*([a-zA-Z0-9_\.]+)/gi;
  while ((match = apiRegex.exec(findings)) !== null) {
    iocs.push({
      type: "api_call",
      value: match[1],
      severity: "medium",
      description: `Suspicious API call: ${match[1]}`,
    });
  }

  return iocs;
}

function generateMitigations(
  threatSummary: string,
  riskScores: Record<string, number>
): string[] {
  const mitigations: string[] = [];

  if (riskScores.dataExfiltration > 50) {
    mitigations.push(
      "Restrict app permissions for contacts, files, and location"
    );
    mitigations.push("Monitor network traffic for suspicious data transfers");
  }

  if (riskScores.credentialHarvesting > 50) {
    mitigations.push("Do not enter sensitive credentials in this app");
    mitigations.push("Use credential manager with strong authentication");
  }

  if (riskScores.c2Communication > 50) {
    mitigations.push("Block identified C2 domains at network level");
    mitigations.push("Monitor for command and control communications");
  }

  if (riskScores.bankingTrojan > 50) {
    mitigations.push("Do not use this app for banking or financial transactions");
    mitigations.push("Update banking app to latest version");
  }

  if (mitigations.length === 0) {
    mitigations.push("Keep app and OS updated");
    mitigations.push("Monitor app behavior for suspicious activity");
  }

  return mitigations;
}
