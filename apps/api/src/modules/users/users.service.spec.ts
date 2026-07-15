import { UsersService } from "./users.service";

describe("UsersService role selection", () => {
  const update = jest.fn(({ data }) => ({ id: "user-1", ...data }));
  const service = new UsersService({ user: { update } } as never, {} as never);
  const user = { id: "user-1" } as never;

  beforeEach(() => update.mockClear());

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
