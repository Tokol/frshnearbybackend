import { UsersService } from "./users.service";

describe("UsersService role selection", () => {
  const update = jest.fn(({ data }) => ({ id: "user-1", ...data }));
  const findFirst = jest.fn();
  const service = new UsersService(
    { user: { update, findFirst } } as never,
    {} as never,
  );
  const user = { id: "user-1" } as never;

  beforeEach(() => {
    update.mockClear();
    findFirst.mockReset();
  });

  it("reports a phone as available when no other user owns it", async () => {
    findFirst.mockResolvedValue(null);
    await expect(
      service.phoneAvailable(user, "+358401234567"),
    ).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalledWith({
      where: { phone: "+358401234567", id: { not: "user-1" } },
      select: { id: true },
    });
  });

  it("reports a phone as unavailable when another user owns it", async () => {
    findFirst.mockResolvedValue({ id: "user-2" });
    await expect(
      service.phoneAvailable(user, "+358401234567"),
    ).resolves.toBe(false);
  });

  it("keeps consumer as the only role for a consumer account", async () => {
    await service.selectType(user, "CONSUMER");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roles: ["CONSUMER"],
          onboardingStep: "PROFILE_REQUIRED",
        }),
      }),
    );
  });

  it("allows consumption while making seller types mutually exclusive", async () => {
    await service.selectType(user, "BUSINESS");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roles: ["CONSUMER", "BUSINESS"],
          onboardingStep: "BUSINESS_DETAILS_REQUIRED",
        }),
      }),
    );
    expect(update.mock.calls[0][0].data.roles).not.toContain("SIDE_HUSTLER");
  });
});
