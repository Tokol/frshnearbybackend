import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { HotSaleStatus, HotSaleUnit, User, UserRole } from "@frsh/database";
import { PrismaService } from "../../prisma.module";
import { CreateHotSaleInput, HotSaleQuantityInput, UpdateHotSaleInput } from "./hot-sales.types";

const include = { rekoRings: { include: { rekoRing: { include: { schedule: true } } } } } as const;

@Injectable()
export class HotSalesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async create(user: User, input: CreateHotSaleInput) {
    this.requireSeller(user);
    const image = this.image(input);
    await this.validateAvailability(input.availableAtFarm, input.rekoRingIds);
    const sale = await this.prisma.hotSale.create({
      data: {
        sellerId: user.id,
        productKey: input.productKey,
        variantKey: input.variantKey,
        description: input.description.trim(),
        productionDetail: input.productionDetail?.trim() || null,
        unit: input.unit as HotSaleUnit,
        priceCents: input.priceCents,
        quantity: input.quantity,
        producedAt: input.producedAt,
        availableAtFarm: input.availableAtFarm,
        imageName: input.imageName,
        imageMimeType: input.imageMimeType,
        imageData: image,
        status: input.quantity === 0 ? HotSaleStatus.SOLD_OUT : HotSaleStatus.ACTIVE,
        rekoRings: { create: input.rekoRingIds.map((rekoRingId) => ({ rekoRingId })) },
      },
      include,
    });
    return this.view(sale);
  }

  async update(user: User, input: UpdateHotSaleInput) {
    this.requireSeller(user);
    await this.owned(user, input.id);
    const image = this.image(input);
    await this.validateAvailability(input.availableAtFarm, input.rekoRingIds);
    const sale = await this.prisma.hotSale.update({
      where: { id: input.id },
      data: {
        productKey: input.productKey,
        variantKey: input.variantKey,
        description: input.description.trim(),
        productionDetail: input.productionDetail?.trim() || null,
        unit: input.unit as HotSaleUnit,
        priceCents: input.priceCents,
        quantity: input.quantity,
        producedAt: input.producedAt,
        availableAtFarm: input.availableAtFarm,
        imageName: input.imageName,
        imageMimeType: input.imageMimeType,
        imageData: image,
        status: input.quantity === 0 ? HotSaleStatus.SOLD_OUT : HotSaleStatus.ACTIVE,
        rekoRings: { deleteMany: {}, create: input.rekoRingIds.map((rekoRingId) => ({ rekoRingId })) },
      },
      include,
    });
    return this.view(sale);
  }

  async setQuantity(user: User, input: HotSaleQuantityInput) {
    await this.owned(user, input.id);
    const sale = await this.prisma.hotSale.update({
      where: { id: input.id },
      data: { quantity: input.quantity, status: input.quantity === 0 ? HotSaleStatus.SOLD_OUT : HotSaleStatus.ACTIVE },
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

  private async validateAvailability(atFarm: boolean, ids: string[]) {
    const unique = [...new Set(ids)];
    if (!atFarm && unique.length === 0) throw new BadRequestException("Select farm pickup or at least one REKO ring");
    if (unique.length !== ids.length) throw new BadRequestException("A REKO ring was selected more than once");
    if (!unique.length) return;
    const count = await this.prisma.rekoRing.count({ where: { id: { in: unique }, active: true, schedule: { is: { active: true } } } });
    if (count !== unique.length) throw new BadRequestException("One or more REKO rings are unavailable");
  }

  private view(sale: any) {
    return {
      ...sale,
      imageBase64: Buffer.from(sale.imageData).toString("base64"),
      rekoRings: sale.rekoRings.map(({ rekoRing }: any) => ({ ...rekoRing, priority: 2 })),
    };
  }
}
