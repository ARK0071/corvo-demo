import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import {
  SSMClient,
  SendCommandCommand,
  GetCommandInvocationCommand,
} from "@aws-sdk/client-ssm";
import { parseNpz } from "./npz-parser";

// S3/SSM-based batch embedding using your Qwen3 EC2 instance
// Workflow: Upload CSV to S3 -> Trigger EC2 script via SSM -> Download NPZ from S3

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });
const ssm = new SSMClient({ region: process.env.AWS_REGION || "us-east-1" });

export interface EmbeddingItem {
  id: string;
  text: string;
}

export interface BatchEmbeddingResult {
  embeddings: Map<string, number[]>;
  processedCount: number;
  errors: string[];
}

// Generate CSV content for embedding job
function generateCsv(items: EmbeddingItem[]): string {
  const header = "id,text";
  const rows = items.map(({ id, text }) => {
    // Escape double quotes and wrap text in quotes
    const escapedText = text.replace(/"/g, '""').replace(/\n/g, " ");
    return `${id},"${escapedText}"`;
  });
  return [header, ...rows].join("\n");
}

// Poll SSM command until completion
async function pollCommandCompletion(
  commandId: string,
  instanceId: string,
  maxWaitMs: number = 300000, // 5 minutes default
  pollIntervalMs: number = 3000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const result = await ssm.send(
      new GetCommandInvocationCommand({
        CommandId: commandId,
        InstanceId: instanceId,
      })
    );

    switch (result.Status) {
      case "Success":
        return;
      case "Failed":
      case "Cancelled":
      case "TimedOut":
        throw new Error(
          `SSM command ${result.Status}: ${result.StandardErrorContent || "Unknown error"}`
        );
      case "Pending":
      case "InProgress":
      case "Delayed":
        // Continue polling
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        break;
      default:
        throw new Error(`Unknown SSM command status: ${result.Status}`);
    }
  }

  throw new Error(`SSM command timed out after ${maxWaitMs}ms`);
}

// Wait for S3 object to exist (with polling)
async function waitForS3Object(
  bucket: string,
  key: string,
  maxWaitMs: number = 60000,
  pollIntervalMs: number = 2000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      await s3.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );
      return; // Object exists
    } catch (error) {
      if ((error as { name?: string }).name === "NoSuchKey") {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      } else {
        throw error;
      }
    }
  }

  throw new Error(`S3 object ${key} not found after ${maxWaitMs}ms`);
}

// Main batch embedding function
export async function runBatchEmbedding(
  items: EmbeddingItem[]
): Promise<BatchEmbeddingResult> {
  if (items.length === 0) {
    return { embeddings: new Map(), processedCount: 0, errors: [] };
  }

  const bucket = process.env.S3_EMBEDDING_BUCKET;
  const instanceId = process.env.EC2_INSTANCE_ID;
  const modelPath =
    process.env.EC2_MODEL_PATH || "/models/qwen3-4b-embedding.gguf";

  if (!bucket || !instanceId) {
    throw new Error(
      "Missing required environment variables: S3_EMBEDDING_BUCKET, EC2_INSTANCE_ID"
    );
  }

  const jobId = `embed_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const inputKey = `embeddings/input/${jobId}.csv`;
  const outputKey = `embeddings/output/${jobId}.npz`;

  const errors: string[] = [];

  try {
    // 1. Generate and upload CSV to S3
    const csvContent = generateCsv(items);
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: inputKey,
        Body: csvContent,
        ContentType: "text/csv",
      })
    );

    // 2. Trigger EC2 script via SSM Run Command
    const command = await ssm.send(
      new SendCommandCommand({
        InstanceIds: [instanceId],
        DocumentName: "AWS-RunShellScript",
        Parameters: {
          commands: [
            `/home/ec2-user/embed.sh s3://${bucket}/${inputKey} s3://${bucket}/${outputKey} ${modelPath}`,
          ],
        },
        TimeoutSeconds: 600, // 10 minutes max
      })
    );

    const commandId = command.Command?.CommandId;
    if (!commandId) {
      throw new Error("Failed to get SSM command ID");
    }

    // 3. Poll for command completion
    await pollCommandCompletion(commandId, instanceId);

    // 4. Wait for output file and download
    await waitForS3Object(bucket, outputKey);

    const output = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: outputKey,
      })
    );

    const npzBytes = await output.Body?.transformToByteArray();
    if (!npzBytes) {
      throw new Error("Failed to download NPZ file from S3");
    }

    // 5. Parse NPZ and extract embeddings
    const embeddings = await parseNpz(npzBytes, items.map((i) => i.id));

    return {
      embeddings,
      processedCount: embeddings.size,
      errors,
    };
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : "Unknown embedding error"
    );
    return {
      embeddings: new Map(),
      processedCount: 0,
      errors,
    };
  }
}

// Helper to build embedding text for grants
export function buildGrantEmbeddingText(grant: {
  title: string;
  description?: string | null;
  fundingCategories?: string[];
  eligibility?: string[];
}): string {
  const parts = [
    grant.title,
    grant.description?.slice(0, 2000) || "",
    grant.fundingCategories?.join(", ") || "",
    grant.eligibility?.join(", ") || "",
  ];
  return parts.filter(Boolean).join(" | ");
}

// Helper to build embedding text for vendors
export function buildVendorEmbeddingText(vendor: {
  name: string;
  sector?: string | null;
  capabilities?: string[];
  certifications?: string[];
  description?: string | null;
}): string {
  const parts = [
    vendor.name,
    vendor.sector || "",
    vendor.capabilities?.join(", ") || "",
    vendor.certifications?.join(", ") || "",
    vendor.description?.slice(0, 1000) || "",
  ];
  return parts.filter(Boolean).join(" | ");
}

// Helper to build embedding text for profiles
export function buildProfileEmbeddingText(profile: {
  name: string;
  priorities?: string[];
  needs?: string[];
  capabilities?: string[];
  certifications?: string[];
}): string {
  const parts = [
    profile.name,
    profile.priorities?.join(", ") || "",
    profile.needs?.join(", ") || "",
    profile.capabilities?.join(", ") || "",
    profile.certifications?.join(", ") || "",
  ];
  return parts.filter(Boolean).join(" | ");
}
