import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  HotSaleStatus,
  HotSaleTranslationStatus,
  HotSaleUnit,
  User,
  UserRole,
} from "@frsh/database";
import { PrismaService } from "../../prisma.module";
import {
  CreateHotSaleInput,
  HotSaleAvailabilityInput,
  HotSaleQuantityInput,
  UpdateHotSaleInput,
} from "./hot-sales.types";
import { HotSaleTranslatorService } from "./hot-sale-translator.service";

const include = {
  rekoRings: { include: { rekoRing: { include: { schedule: true } } } },
  translations: { orderBy: { locale: "asc" as const } },
} as const;

@Injectable()
export class HotSalesService {
  private readonly logger = new Logger(HotSalesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly translator: HotSaleTranslatorService,
  ) {}

  private requireSeller(user: User) {
    if (!user.roles.some((role) => role === UserRole.SIDE_HUSTLER || role === UserRole.BUSINESS)) {
      throw new ForbiddenException("A producer account is required");
    }
  }

  async availableRekoRings(user: User) {
    this.requireSeller(user);
    const rings = await this.prisma.rekoRing.findMany({
      where: { active: true, schedule: { is: { active: true } } },
      include: { schedule: true },
    });
    const city = user.city?.trim().toLocaleLowerCase("fi") ?? "";
    const exact = rings.find((ring) => ring.municipality.toLocaleLowerCase("fi") === city);
    const regionCode = exact?.regionCode;
    return rings
      .map((ring) => ({
        ...ring,
        priority: city && ring.municipality.toLocaleLowerCase("fi") === city ? 0 : regionCode && ring.regionCode === regionCode ? 1 : 2,
      }))
      .sort((a, b) => a.priority - b.priority || (a.regionName ?? "").localeCompare(b.regionName ?? "") || a.name.localeCompare(b.name));
  }

  async mine(user: User) {
    this.requireSeller(user);
    const sales = await this.prisma.hotSale.findMany({
      where: { sellerId: user.id, status: { not: HotSaleStatus.ARCHIVED } },
      include,
      orderBy: { createdAt: "desc" },
    });
    return sales.map((sale) => this.view(sale));
  }

  async search(user: User, search: string, limit: number) {
    const query = search.trim();
    if (query.length < 2) return [];
    const sales = await this.prisma.hotSale.findMany({
      where: {
        status: HotSaleStatus.ACTIVE,
        OR: [
          { originalTitle: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          {
            translations: {
              some: {
                status: HotSaleTranslationStatus.COMPLETED,
                OR: [
                  { title: { contains: query, mode: "insensitive" } },
                  { description: { contains: query, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      },
      include,
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 50),
    });
    return sales.map((sale) => this.view(sale));
  }

  async create(user: User, input: CreateHotSaleInput) {
    this.requireSeller(user);
    this.validateUnit(input);
    const image = this.image(input);
    await this.validateAvailability(input.availableAtFarm, input.rekoRingIds);
    const sale = await this.prisma.hotSale.create({
      data: {
        sellerId: user.id,
        categoryKey: "other",
        originalLanguage: input.originalLanguage.trim().toLowerCase(),
        originalTitle: input.originalTitle.trim(),
        description: input.description.trim(),
        productionDetail: input.productionDetail?.trim() || null,
        unit: input.unit as HotSaleUnit,
        customUnit: input.unit === "OTHER" ? input.customUnit!.trim() : null,
        priceCents: input.priceCents,
        quantity: input.quantity,
        producedAt: input.producedAt,
        availableAtFarm: input.availableAtFarm,
        imageName: input.imageName,
        imageMimeType: input.imageMimeType,
        imageData: image,
        status: input.quantity === 0 ? HotSaleStatus.SOLD_OUT : HotSaleStatus.ACTIVE,
        rekoRings: { create: input.rekoRingIds.map((rekoRingId) => ({ rekoRingId })) },
        translations: {
          create: this.pendingTranslations(input),
        },
      },
      include,
    });
    await this.translateAndSave(sale.id, input);
    return this.view(await this.prisma.hotSale.findUniqueOrThrow({ where: { id: sale.id }, include }));
  }

  async update(user: User, input: UpdateHotSaleInput) {
    this.requireSeller(user);
    this.validateUnit(input);
    await this.owned(user, input.id);
    const image = this.image(input);
    await this.validateAvailability(input.availableAtFarm, input.rekoRingIds);
    const sale = await this.prisma.hotSale.update({
      where: { id: input.id },
      data: {
        categoryKey: "other",
        originalLanguage: input.originalLanguage.trim().toLowerCase(),
        detectedLanguage: null,
        originalTitle: input.originalTitle.trim(),
        description: input.description.trim(),
        productionDetail: input.productionDetail?.trim() || null,
        unit: input.unit as HotSaleUnit,
        customUnit: input.unit === "OTHER" ? input.customUnit!.trim() : null,
        priceCents: input.priceCents,
        quantity: input.quantity,
        producedAt: input.producedAt,
        availableAtFarm: input.availableAtFarm,
        imageName: input.imageName,
        imageMimeType: input.imageMimeType,
        imageData: image,
        status: input.quantity === 0 ? HotSaleStatus.SOLD_OUT : HotSaleStatus.ACTIVE,
        rekoRings: { deleteMany: {}, create: input.rekoRingIds.map((rekoRingId) => ({ rekoRingId })) },
        translations: {
          deleteMany: {},
          create: this.pendingTranslations(input),
        },
      },
      include,
    });
    await this.translateAndSave(sale.id, input);
    return this.view(await this.prisma.hotSale.findUniqueOrThrow({ where: { id: sale.id }, include }));
  }

  async setQuantity(user: User, input: HotSaleQuantityInput) {
    await this.owned(user, input.id);
    const current = await this.prisma.hotSale.findUniqueOrThrow({
      where: { id: input.id },
      select: { status: true },
    });
    const sale = await this.prisma.hotSale.update({
      where: { id: input.id },
      data: {
        quantity: input.quantity,
        status:
          current.status === HotSaleStatus.PAUSED
            ? HotSaleStatus.PAUSED
            : input.quantity === 0
              ? HotSaleStatus.SOLD_OUT
              : HotSaleStatus.ACTIVE,
      },
      include,
    });
    return this.view(sale);
  }

  async setAvailability(user: User, input: HotSaleAvailabilityInput) {
    await this.owned(user, input.id);
    const current = await this.prisma.hotSale.findUniqueOrThrow({
      where: { id: input.id },
      select: { quantity: true },
    });
    const sale = await this.prisma.hotSale.update({
      where: { id: input.id },
      data: {
        status: input.available
          ? current.quantity > 0
            ? HotSaleStatus.ACTIVE
            : HotSaleStatus.SOLD_OUT
          : HotSaleStatus.PAUSED,
      },
      include,
    });
    return this.view(sale);
  }

  async archive(user: User, id: string) {
    await this.owned(user, id);
    await this.prisma.hotSale.update({ where: { id }, data: { status: HotSaleStatus.ARCHIVED } });
    return true;
  }

  private async owned(user: User, id: string) {
    this.requireSeller(user);
    const sale = await this.prisma.hotSale.findUnique({ where: { id }, select: { sellerId: true } });
    if (!sale) throw new NotFoundException("Hot Sale not found");
    if (sale.sellerId !== user.id) throw new ForbiddenException();
  }

  private image(input: CreateHotSaleInput) {
    const image = Buffer.from(input.imageBase64, "base64");
    if (!image.length || image.length > 5 * 1024 * 1024) throw new BadRequestException("Photo must be 5 MB or smaller");
    return image;
  }

  private validateUnit(input: CreateHotSaleInput) {
    if (input.unit === "OTHER" && !input.customUnit?.trim()) {
      throw new BadRequestException("Enter a custom selling unit");
    }
  }

  private async validateAvailability(atFarm: boolean, ids: string[]) {
    const unique = [...new Set(ids)];
    if (!atFarm && unique.length === 0) throw new BadRequestException("Select farm pickup or at least one REKO ring");
    if (unique.length !== ids.length) throw new BadRequestException("A REKO ring was selected more than once");
    if (!unique.length) return;
    const count = await this.prisma.rekoRing.count({ where: { id: { in: unique }, active: true, schedule: { is: { active: true } } } });
    if (count !== unique.length) throw new BadRequestException("One or more REKO rings are unavailable");
  }

  private pendingTranslations(input: CreateHotSaleInput) {
    return ["en", "fi", "sv"].map((locale) => ({
      locale,
      title: input.originalTitle.trim(),
      description: input.description.trim(),
      productionDetail: input.productionDetail?.trim() || null,
      status: HotSaleTranslationStatus.PENDING,
    }));
  }

  private async translateAndSave(hotSaleId: string, input: CreateHotSaleInput) {
    try {
      const result = await this.translator.translate({
        languageHint: input.originalLanguage,
        title: input.originalTitle.trim(),
        description: input.description.trim(),
        productionDetail: input.productionDetail?.trim(),
      });
      if (!result) {
        await this.prisma.hotSaleTranslation.updateMany({
          where: { hotSaleId },
          data: {
            status: HotSaleTranslationStatus.FAILED,
            errorMessage: "Translation service is not configured",
          },
        });
        return;
      }
      await this.prisma.$transaction([
        this.prisma.hotSale.update({
          where: { id: hotSaleId },
          data: {
            detectedLanguage: result.detectedLanguage.toLowerCase(),
            categoryKey: result.categoryKey,
          },
        }),
        ...(["en", "fi", "sv"] as const).map((locale) =>
          this.prisma.hotSaleTranslation.update({
            where: { hotSaleId_locale: { hotSaleId, locale } },
            data: {
              ...result.translations[locale],
              status: HotSaleTranslationStatus.COMPLETED,
              provider: result.provider,
              model: result.model,
              errorMessage: null,
            },
          }),
        ),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Translation failed";
      this.logger.error(`Hot Sale ${hotSaleId} translation failed: ${message}`);
      await this.prisma.hotSaleTranslation.updateMany({
        where: { hotSaleId },
        data: {
          status: HotSaleTranslationStatus.FAILED,
          errorMessage: message.slice(0, 500),
        },
      });
    }
  }

  private view(sale: any) {
    return {
      ...sale,
      imageBase64: Buffer.from(sale.imageData).toString("base64"),
      rekoRings: sale.rekoRings.map(({ rekoRing }: any) => ({ ...rekoRing, priority: 2 })),
    };
  }
}
