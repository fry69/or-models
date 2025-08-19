#!/usr/bin/env -S deno run --allow-env --allow-net=openrouter.ai --allow-read --allow-write

// -*- coding: utf-8 -*-

/**
 * OpenRouter Model Explorer CLI (Deno Version)
 *
 * A command-line tool to fetch, filter, sort, and display AI models from OpenRouter.
 */

import { parseArgs } from "@std/cli";
import { bold, dim, green, magenta, yellow } from "@std/fmt/colors";
import { z } from "npm:zod";

// --- Zod schemas for validating the OpenRouter API response ---
const ArchitectureSchema = z.object({
  modality: z.string(),
  input_modalities: z.array(z.string()),
  output_modalities: z.array(z.string()),
  tokenizer: z.string(),
  instruct_type: z.string().nullable(),
});

const PricingSchema = z.object({
  prompt: z.string(),
  completion: z.string(),
  request: z.string().optional(),
  image: z.string().optional(),
  web_search: z.string().optional(),
  internal_reasoning: z.string().optional(),
  input_cache_read: z.string().optional(),
  input_cache_write: z.string().optional(),
});

const TopProviderSchema = z.object({
  context_length: z.number().int().nullable(),
  max_completion_tokens: z.number().int().nullable(),
  is_moderated: z.boolean(),
});

const ModelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  context_length: z.number().int(),
  created: z.number().int(),
  hugging_face_id: z.string().nullable(),
  canonical_slug: z.string(),
  architecture: ArchitectureSchema,
  pricing: PricingSchema,
  top_provider: TopProviderSchema,
  per_request_limits: z.record(z.string(), z.unknown()).nullable(),
  supported_parameters: z.array(z.string()),
});

const OpenRouterModelsSchema = z.object({
  data: z.array(ModelSchema),
});

// Infer TypeScript types from schemas
type Model = z.infer<typeof ModelSchema>;

// --- Constants ---
const VERSION = "0.2.0"; // must match version in `deno.json`
const API_URL = "https://openrouter.ai/api/v1/models";
const CACHE_DIR = `${Deno.env.get("HOME")}/.cache/or-models`;
const CACHE_FILE = `${CACHE_DIR}/models.json`;
const CACHE_EXPIRATION_HOURS = 24;

// --- Helper Functions ---

function getEffectivePrice(priceStr: string, modelId: string): number {
  // Special handling for openrouter/auto model - treat as free
  if (modelId === "openrouter/auto") {
    return Number.MAX_SAFE_INTEGER;
  }
  return parseFloat(priceStr);
}

function getHumanReadableAge(createdTimestamp: number): string {
  if (!createdTimestamp) {
    return "Unknown";
  }
  const createdDate = new Date(createdTimestamp * 1000);
  const now = new Date();
  const deltaSeconds = (now.getTime() - createdDate.getTime()) / 1000;

  const deltaDays = deltaSeconds / (60 * 60 * 24);
  if (deltaDays > 365) {
    const years = Math.floor(deltaDays / 365);
    return `~${years} yr${years > 1 ? "s" : ""}`;
  }
  if (deltaDays > 30) {
    const months = Math.floor(deltaDays / 30);
    return `~${months} mn${months > 1 ? "s" : ""}`;
  }
  if (deltaDays >= 1) {
    return `${Math.floor(deltaDays)} day${
      Math.floor(deltaDays) > 1 ? "s" : ""
    }`;
  }
  const deltaHours = deltaSeconds / (60 * 60);
  if (deltaHours >= 1) {
    return `${Math.floor(deltaHours)} hr${
      Math.floor(deltaHours) > 1 ? "s" : ""
    }`;
  }
  const deltaMinutes = deltaSeconds / 60;
  return `${Math.floor(deltaMinutes)} min${
    Math.floor(deltaMinutes) > 1 ? "s" : ""
  }`;
}

async function fetchModels(forceRefresh: boolean): Promise<Model[]> {
  await Deno.mkdir(CACHE_DIR, { recursive: true });

  try {
    let ageHours = 30;
    const fileInfo = await Deno.stat(CACHE_FILE);
    if (fileInfo) {
      ageHours = (Date.now() - fileInfo.mtime!.getTime()) / (1000 * 60 * 60);
    }
    if (!forceRefresh && ageHours < CACHE_EXPIRATION_HOURS) {
      console.error(dim("Loading models from cache..."));
      const cachedData = await Deno.readTextFile(CACHE_FILE);
      const jsonData = JSON.parse(cachedData);
      return OpenRouterModelsSchema.parse(jsonData).data;
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      console.error(
        yellow(
          `Cache read error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
    }
  }

  console.error(dim("Fetching fresh model list from OpenRouter..."));
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const jsonData = await response.json();
    const validatedData = OpenRouterModelsSchema.parse(jsonData);
    await Deno.writeTextFile(
      CACHE_FILE,
      JSON.stringify(validatedData, null, 2),
    );
    return validatedData.data;
  } catch (error) {
    console.error(
      yellow(
        `Error fetching or validating data: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ),
    );
    if (error instanceof z.ZodError) {
      console.error(
        yellow("API data structure does not match expected schema. Details:"),
      );
      console.error(error.message);
    }
    try {
      console.error(dim("Using stale cache as a fallback."));
      const cachedData = await Deno.readTextFile(CACHE_FILE);
      return OpenRouterModelsSchema.parse(JSON.parse(cachedData)).data;
    } catch {
      console.error(yellow("Could not read fallback cache. Exiting."));
      Deno.exit(1);
    }
  }
}

// --- Filtering and Sorting ---

function filterModels(
  models: Model[],
  args: ReturnType<typeof parseArgs>,
): Model[] {
  let filtered = models;
  const searchTerm = args._[0]?.toString().toLowerCase();

  if (searchTerm) {
    filtered = filtered.filter(
      (m) =>
        m.id.toLowerCase().includes(searchTerm) ||
        m.name.toLowerCase().includes(searchTerm) ||
        m.description.toLowerCase().includes(searchTerm),
    );
  }

  if (args.free) {
    filtered = filtered.filter(
      (m) => getEffectivePrice(m.pricing.prompt, m.id) === 0,
    );
  }
  // ... (add other filters similarly)
  if (args["min-prompt-price"] != null) {
    filtered = filtered.filter(
      (m) =>
        getEffectivePrice(m.pricing.prompt, m.id) >= args["min-prompt-price"],
    );
  }
  if (args["max-prompt-price"] != null) {
    filtered = filtered.filter(
      (m) =>
        getEffectivePrice(m.pricing.prompt, m.id) <= args["max-prompt-price"],
    );
  }
  if (args["min-context"] != null) {
    filtered = filtered.filter((m) => m.context_length >= args["min-context"]);
  }
  if (args["max-context"] != null) {
    filtered = filtered.filter((m) => m.context_length <= args["max-context"]);
  }

  const checkParam = (p: string[]) => (m: Model) =>
    m.supported_parameters.some((sp) => p.includes(sp));
  if (args["supports-reasoning"]) {
    filtered = filtered.filter(checkParam(["reasoning", "include_reasoning"]));
  }
  if (args["supports-tools"]) {
    filtered = filtered.filter(checkParam(["tools", "tool_choice"]));
  }
  if (args["supports-structured-output"]) {
    filtered = filtered.filter(
      checkParam(["structured_outputs"]),
    );
  }
  if (args["supports-response-format"]) {
    filtered = filtered.filter(
      checkParam(["response_format"]),
    );
  }
  return filtered;
}

function sortModels(models: Model[], sortBy: string, desc: boolean): Model[] {
  const keyMap: Record<string, (m: Model) => number | string> = {
    prompt_price: (m) => getEffectivePrice(m.pricing.prompt, m.id),
    completion_price: (m) => getEffectivePrice(m.pricing.completion, m.id),
    context: (m) => m.context_length,
    created: (m) => m.created,
    name: (m) => m.name.toLowerCase(),
  };
  if (!keyMap[sortBy]) {
    return models;
  }
  return [...models].sort((a, b) => {
    const valA = keyMap[sortBy](a);
    const valB = keyMap[sortBy](b);
    if (valA < valB) {
      return desc ? 1 : -1;
    }
    if (valA > valB) {
      return desc ? -1 : 1;
    }
    return 0;
  });
}

// --- Output Formatters ---

const formatPrice = (
  priceStr: string,
  invert: boolean,
  modelId?: string,
): string => {
  // Special handling for openrouter/auto model
  if (modelId === "openrouter/auto") {
    return "n/a";
  }

  const price = parseFloat(priceStr);
  if (price === 0) {
    return invert ? "∞" : "0.00";
  }
  if (invert) {
    return `${
      (1 / price / 1_000_000).toLocaleString(undefined, {
        maximumFractionDigits: 0,
      })
    } M`;
  }
  return (price * 1_000_000).toFixed(2);
};

function outputAsTable(models: Model[], args: ReturnType<typeof parseArgs>) {
  const invert = !!args["invert-price"];
  const headers = [
    "ID",
    invert ? "Prompt (toks/$)" : "Prompt ($/M)",
    invert ? "Compl. (toks/$)" : "Compl. ($/M)",
    "Context",
    "Age",
    "Reason",
    "Tools",
    "JSON",
    "Schema",
  ].map((h) => bold(magenta(h)));

  console.log(headers.join(" | "));

  for (const model of models) {
    const params = model.supported_parameters;
    const row = [
      dim(model.id.substring(0, args["long"] ? 80 : 45).padEnd(45)),
      formatPrice(model.pricing.prompt, invert, model.id).padStart(6),
      formatPrice(model.pricing.completion, invert, model.id).padStart(6),
      model.context_length.toLocaleString().padStart(10),
      getHumanReadableAge(model.created).padStart(7),
      params.includes("reasoning") || params.includes("include_reasoning")
        ? green("✅")
        : "  ",
      params.includes("tools") || params.includes("tool_choice")
        ? green("✅")
        : "  ",
      params.includes("response_format") ? green("✅") : "  ",
      params.includes("structured_outputs") ? green("✅") : "  ",
    ];
    console.log(row.join(" | "));
  }
}

function outputAsJson(models: Model[]) {
  console.log(JSON.stringify(models, null, 2));
}

function outputAsCsv(models: Model[], args: ReturnType<typeof parseArgs>) {
  const invert = !!args["invert-price"];
  const headers = [
    "id",
    "name",
    invert ? "prompt_tokens_per_dollar" : "prompt_dollar_per_million",
    invert ? "completion_tokens_per_dollar" : "completion_dollar_per_million",
    "context_length",
    "created_unix",
    "supports_reasoning",
    "supports_tools",
    "supports_response_format",
    "supports_structured_output",
  ];
  console.log(headers.join(","));

  for (const model of models) {
    const params = model.supported_parameters;
    const row = [
      `"${model.id}"`,
      `"${model.name}"`,
      formatPrice(model.pricing.prompt, invert, model.id),
      formatPrice(model.pricing.completion, invert, model.id),
      model.context_length,
      model.created,
      params.includes("reasoning") || params.includes("include_reasoning"),
      params.includes("tools") || params.includes("tool_choice"),
      params.includes("response_format"),
      params.includes("structured_outputs"),
    ];
    console.log(row.join(","));
  }
}

function outputAsMarkdown(models: Model[], args: ReturnType<typeof parseArgs>) {
  const invert = !!args["invert-price"];
  const verbose = args.output === "md-verbose";
  const headers = [
    "ID",
    verbose ? "Name" : null,
    verbose ? (invert ? "Prompt (toks/$)" : "Prompt ($/M)") : null,
    invert ? "Completion (toks/$)" : "Completion ($/M)",
    "Context",
    "Age",
    "Reason",
    "Tools",
    "JSON",
    "Schema",
  ];

  console.log(`| ${headers.join(" | ")} |`);
  console.log(
    `| ${
      headers.filter((h) => h != null).map((h) => "-".repeat(h.length)).join(
        " | ",
      )
    } |`,
  );

  for (const model of models) {
    const params = model.supported_parameters;
    const row = [
      model.id,
      verbose ? model.name : null,
      verbose ? (formatPrice(model.pricing.prompt, invert, model.id)) : null,
      formatPrice(model.pricing.completion, invert, model.id),
      model.context_length.toLocaleString(),
      getHumanReadableAge(model.created),
      params.includes("reasoning") || params.includes("include_reasoning")
        ? "✅"
        : " ",
      params.includes("tools") || params.includes("tool_choice") ? "✅" : " ",
      params.includes("response_format") ? "✅" : " ",
      params.includes("structured_outputs") ? "✅" : " ",
    ];
    console.log(`| ${row.filter((r) => r != null).join(" | ")} |`);
  }
}

// --- Main Execution ---

async function main() {
  const args = parseArgs(Deno.args, {
    boolean: [
      "long",
      "free",
      "supports-reasoning",
      "supports-tools",
      "supports-structured-output",
      "desc",
      "group-by-provider",
      "force-refresh",
      "invert-price",
      "help",
      "version",
    ],
    string: ["sort-by", "output"],
    alias: { h: "help", v: "version" },
    default: {
      "sort-by": "created",
      output: "table",
    },
  });

  if (args.help) {
    console.log(`OpenRouter Model Explorer
Usage: ./or_models.ts [search_term] [options]

Options:
  --help, -h                       Show this help message.
  --version, -v                    Show version.
  --output <format>                Output format: table, json, csv, md, md-verbose (default: table).
  --sort-by <field>                Sort by: prompt_price, completion_price, context, created, name (default: created).
  --desc                           Sort in descending order.
  --invert-price                   Show price as tokens per dollar instead of dollar per million.
  --force-refresh                  Force a fresh download of the model list.
  --long                           Output long model names, possibly breaking terminal layout (default: off).

Filtering:
  --free                           Show only free models.
  --min-prompt-price <price>       Filter by minimum prompt price per token.
  --max-prompt-price <price>       Filter by maximum prompt price per token.
  --min-context <length>           Filter by minimum context length.
  --max-context <length>           Filter by maximum context length.
  --supports-reasoning             Filter for models that support reasoning.
  --supports-tools                 Filter for models that support tool use.
  --supports-structured-output     Filter for models that support structured output.
  --supports-response-format       Filter for models that support response format (JSON mode).
  `);
    return;
  }

  if (args.version) {
    console.log(VERSION);
    return;
  }

  const allModels = await fetchModels(args["force-refresh"]);
  const filtered = filterModels(allModels, args);
  const sorted = sortModels(filtered, args["sort-by"], args.desc);

  switch (args.output) {
    case "json":
      outputAsJson(sorted);
      break;
    case "csv":
      outputAsCsv(sorted, args);
      break;
    case "md":
    case "md-verbose":
      outputAsMarkdown(sorted, args);
      break;
    default:
      outputAsTable(sorted, args);
      break;
  }
}

if (import.meta.main) {
  await main();
}
