import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type LocalizedHotSaleText = {
  detectedLanguage: string;
  categoryKey:
    | "vegetables"
    | "fruits"
    | "berries"
    | "herbs"
    | "mushrooms"
    | "grains"
    | "eggs"
    | "dairy"
    | "meat"
    | "poultry"
    | "fish"
    | "bakery"
    | "honey"
    | "preserves"
    | "drinks"
    | "prepared-food"
    | "other";
  translations: Record<
    "en" | "fi" | "sv",
    { title: string; description: string; productionDetail: string | null }
  >;
  provider: "OPENAI";
  model: string;
};

@Injectable()
export class HotSaleTranslatorService {
  private readonly logger = new Logger(HotSaleTranslatorService.name);

  constructor(private readonly config: ConfigService) {}

  async translate(input: {
    languageHint: string;
    title: string;
    description: string;
    productionDetail?: string;
  }): Promise<LocalizedHotSaleText | null> {
    const apiKey = this.config.get<string>("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      this.logger.warn("OPENAI_API_KEY is not configured; saving original Hot Sale without translations");
      return null;
    }
    const model = this.config.get<string>("OPENAI_TRANSLATION_MODEL")?.trim() || "gpt-5.4-nano";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        model,
        store: false,
        reasoning: { effort: "none" },
        input: [
          {
            role: "system",
            content:
              "You translate and classify marketplace listings for locally produced food. Detect the source language using the full text and the optional hint. Select exactly one categoryKey from the supplied JSON schema enum; never create a category. Use other when no category clearly fits. Return faithful English, Finnish, and Swedish versions. Preserve product names, proper nouns, quantities, dates, allergens, measurements, and factual claims exactly. Do not add claims, marketing language, or information. The translation matching the detected source language must preserve the original meaning and wording.",
          },
          {
            role: "user",
            content: JSON.stringify({
              languageHint: input.languageHint,
              original: {
                title: input.title,
                description: input.description,
                productionDetail: input.productionDetail || null,
              },
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "hot_sale_translations",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                detectedLanguage: { type: "string", minLength: 2, maxLength: 12 },
                categoryKey: {
                  type: "string",
                  enum: [
                    "vegetables",
                    "fruits",
                    "berries",
                    "herbs",
                    "mushrooms",
                    "grains",
                    "eggs",
                    "dairy",
                    "meat",
                    "poultry",
                    "fish",
                    "bakery",
                    "honey",
                    "preserves",
                    "drinks",
                    "prepared-food",
                    "other",
                  ],
                },
                translations: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    en: { $ref: "#/$defs/translation" },
                    fi: { $ref: "#/$defs/translation" },
                    sv: { $ref: "#/$defs/translation" },
                  },
                  required: ["en", "fi", "sv"],
                },
              },
              required: ["detectedLanguage", "categoryKey", "translations"],
              $defs: {
                translation: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    title: { type: "string", minLength: 1, maxLength: 160 },
                    description: { type: "string", minLength: 1, maxLength: 1400 },
                    productionDetail: { type: ["string", "null"], maxLength: 400 },
                  },
                  required: ["title", "description", "productionDetail"],
                },
              },
            },
          },
        },
      }),
    });
    if (!response.ok) {
      const message = (await response.text()).slice(0, 500);
      throw new Error(`OpenAI translation failed (${response.status}): ${message}`);
    }
    const payload = (await response.json()) as {
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };
    const outputText = payload.output
      ?.flatMap((item) => item.content ?? [])
      .find((item) => item.type === "output_text")?.text;
    if (!outputText) throw new Error("OpenAI translation returned no structured output");
    const parsed = JSON.parse(outputText) as Omit<LocalizedHotSaleText, "provider" | "model">;
    for (const locale of ["en", "fi", "sv"] as const) {
      if (!parsed.translations?.[locale]?.title || !parsed.translations[locale].description) {
        throw new Error(`OpenAI translation omitted ${locale}`);
      }
    }
    return { ...parsed, provider: "OPENAI", model };
  }
}
